# Books4All Codebase: Technical Debt, Security & Architecture Concerns

**Document Date:** 2026-04-18  
**Scope:** Backend (Python/FastAPI + SQLAlchemy) & Frontend (Next.js)  
**Status:** Active Issues Documented

---

## 🔴 CRITICAL ISSUES

### 1. **bcrypt Version Pinned at 4.1.2 (Breaking Compatibility Risk)**

**Severity:** CRITICAL  
**File:** `backend/pyproject.toml:10`, `backend/requirements.txt:10`  
**Issue:**  
- bcrypt 4.1.2 is pinned explicitly in project dependencies
- passlib 1.7.4 (pinned at `backend/pyproject.toml:17`) is known to break with bcrypt 5.x+
- If bcrypt is accidentally upgraded, password hashing will fail: `ValueError: invalid hash version`
- No automation to detect this incompatibility at build/CI time

**Risk:**  
- Production incident if dependency is auto-upgraded
- Undetected in CI unless explicitly tested
- CLAUDE.md warns about this but adds no guardrails

**Mitigation:**
- [ ] Add pre-commit hook to validate `bcrypt==4.1.2` is pinned
- [ ] Add constraint test in CI that tries to upgrade and catches the error
- [ ] Document in README as "DO NOT upgrade bcrypt" with reasoning
- [ ] Consider migrating to newer passlib or alternative hashing library

**Timeline:** Refactor required before scaling to production

---

### 2. **Stripe Webhook Signature Verification Has Limited Coverage**

**Severity:** CRITICAL  
**File:** `backend/app/services/payment_service.py:197-216`  
**Issue:**  
```python
try:
    event = stripe.Webhook.construct_event(payload, stripe_signature, webhook_secret)
except stripe.error.SignatureVerificationError as exc:
    raise StripeWebhookError(...)
except Exception as exc:
    raise StripeWebhookError(f"Webhook payload parsing failed: {exc}")
```

- Catches generic `Exception` after signature check fails
- No replay attack protection (no idempotency key tracking)
- No webhook event deduplication — same webhook can be processed twice if network retries occur
- Database-level unique constraints on `stripe_payment_id` & `stripe_session_id` provide partial protection but inconsistent UX

**Risk:**  
- Duplicate order marking as PAID if webhook is replayed
- Silent duplicate payments processed (only caught by Stripe account review)
- Financial reconciliation issues between database and Stripe

**Mitigation:**
- [ ] Implement webhook event ID deduplication (store processed event IDs in Redis with TTL)
- [ ] Add idempotency key to payment operations
- [ ] Log ALL webhook events with hash of payload for audit trail
- [ ] Add test for webhook replay scenarios

**Timeline:** Implement before first production payment

---

### 3. **JWT Secret Key Has Weak Default & No Rotation Strategy**

**Severity:** CRITICAL  
**File:** `backend/app/core/config.py:75-79`  
**Issue:**  
```python
SECRET_KEY: str = Field(
    default="change-this-in-production-use-openssl-rand-hex-32",
    min_length=32,
    description="Secret key for JWT signing"
)
```

- Default secret is publicly visible in docs
- No secret rotation mechanism (tokens valid indefinitely with old secret)
- No key version in JWT header for rotation scenarios
- If secret is compromised, all tokens become compromised
- No audit trail of secret changes

**Risk:**  
- Token forgery if secret is leaked
- No ability to invalidate all tokens in case of breach
- Unclear how to safely rotate secret without invalidating all sessions

**Mitigation:**
- [ ] Implement JWT key versioning (`kid` claim in header)
- [ ] Add Redis blacklist for invalidated tokens (if rotation needed)
- [ ] Document secret rotation procedure
- [ ] Add `jti` (JWT ID) claim for per-token revocation if needed
- [ ] Implement token versioning to support gradual rollout of new secret

**Timeline:** Required for production

---

### 4. **Order Quantity Deduction Race Condition (Weak Concurrency Safety)**

**Severity:** CRITICAL  
**File:** `backend/app/repositories/order.py:62-157`  
**Issue:**  
```python
# In create_with_items:
if book.quantity < item.quantity:
    raise ValueError(...)

# Later:
book.quantity -= item.quantity
```

- Race condition: read-check-then-modify pattern
- Two concurrent requests can both pass the stock check, then both decrement
- Result: oversell books (quantity goes negative, violates CHECK constraint)
- CLAUDE.md mentions "DB-level CHECK constraint (quantity >= 0) is the ultimate guard" but this is insufficient
- On constraint violation, transaction fails with cryptic database error instead of clean UX

**Risk:**  
- Overselling books to multiple buyers simultaneously
- Customers receive "database error" instead of "out of stock"
- Inventory corruption until manual fix
- No API-level handling of constraint violation

**Mitigation:**
- [ ] Use database-level `SELECT ... FOR UPDATE` in transaction to lock row
- [ ] Implement optimistic locking with version field on Book model
- [ ] Add test for concurrent order creation on same book
- [ ] Catch constraint violation and return 409 CONFLICT with clear message
- [ ] Log all inventory anomalies

**Timeline:** Fix immediately (blocks production)

---

## 🟠 HIGH PRIORITY ISSUES

### 5. **Bare Exception Handlers (Poor Error Observability)**

**Severity:** HIGH  
**File:** `backend/app/core/database.py:101`, `backend/app/core/dependencies.py` (line not shown)  
**Issue:**  
```python
except Exception:  # Too broad!
    return False
```

- Silently swallows database errors during health checks
- Makes it hard to diagnose connection pool issues
- No logging or metrics when database goes down
- Health endpoint returns false without context

**Mitigation:**
- [ ] Catch specific exceptions (asyncpg exceptions, SQLAlchemy errors)
- [ ] Log stack trace at WARNING level
- [ ] Return health object with error detail in health endpoint

**Timeline:** Improve observability within 1 sprint

---

### 6. **Order Status Transitions Not Enforced Consistently**

**Severity:** HIGH  
**File:** `backend/app/services/order_service.py:39-61`  
**Issue:**  
```python
_ALLOWED_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.PENDING: { OrderStatus.PAYMENT_PROCESSING, OrderStatus.CANCELLED },
    ...
}

# But order.cancel_order() delegates to update_order_status()
# which can bypass transitions if called directly on repository
```

- Service layer enforces state machine, but repository doesn't
- If code calls `order_repo.update_status(order_id, status)` directly, bypasses validation
- PAID → CANCELLED not in allowed transitions but should be blocked at API layer anyway
- No database constraint preventing invalid transitions

**Risk:**  
- Inconsistent order state if repository is called directly
- Silent data corruption if business logic is bypassed

**Mitigation:**
- [ ] Add CHECK constraint on database to prevent invalid status values (already exists)
- [ ] Make repository methods private or require transition validation
- [ ] Add integration test for invalid transitions at all layers
- [ ] Add audit log to all status changes

**Timeline:** Refactor within 2 sprints

---

### 7. **Insufficient Logging & Audit Trail for Financial Operations**

**Severity:** HIGH  
**File:** `backend/app/services/payment_service.py`, `backend/app/services/order_service.py`  
**Issue:**  
- Payment operations logged with `logger.info()` only
- No structured logging with correlation IDs
- No audit trail for sensitive operations (refunds, status changes)
- Difficult to trace a payment through system (no request ID propagation)
- No retention policy for logs (infrastructure concern but matters here)

**Risk:**  
- Cannot debug payment disputes
- No audit trail for compliance/PCI audits
- Difficult to detect fraud patterns

**Mitigation:**
- [ ] Add request ID propagation via middleware
- [ ] Use structured logging with JSON output (user_id, order_id, action, status_before, status_after)
- [ ] Add audit table to database for sensitive operations
- [ ] Implement log retention policy (90 days minimum for payments)

**Timeline:** Implement before accepting real payments

---

### 8. **Stripe Webhook Secret Not Validated at Startup**

**Severity:** HIGH  
**File:** `backend/app/main.py:104-112`  
**Issue:**  
- Redis connection failure only logs WARNING, allows app to start
- Stripe webhook secret checked at runtime, not at startup
- App can start but webhooks silently fail

```python
try:
    redis = await rate_limiter.get_redis()
    await redis.ping()
except Exception as exc:
    logger.warning("Redis unavailable — rate limiting will be disabled: %s", exc)
```

- Same issue with Stripe secret — no validation at startup
- Leads to "works in dev, breaks in prod" scenarios

**Risk:**  
- Silent webhook failures in production
- Payments marked as pending indefinitely
- No alerting because app is "healthy"

**Mitigation:**
- [ ] Validate STRIPE_WEBHOOK_SECRET is set at startup
- [ ] Make Redis mandatory in production (fail startup if unavailable)
- [ ] Add startup check for all required external services based on config
- [ ] Add health check for Stripe API connectivity

**Timeline:** Add to startup validation now

---

### 9. **Email Verification Token Never Actually Verified**

**Severity:** HIGH  
**File:** `backend/app/services/auth_service.py:129-131`  
**Issue:**  
```python
# NOTE: In production you'd send an email verification link here.
# token = generate_email_verification_token(user.email)
# email_service.send_verification_email(user.email, token)
```

- Email verification is incomplete TODO
- `email_verified` field on User is always False
- No API endpoint to verify email
- Allows any email address without validation

**Risk:**  
- Invalid email addresses in system
- Users can register with typos and never receive messages
- Seller listings could have unreachable contact info
- Spam/bot registrations with fake emails

**Mitigation:**
- [ ] Implement email verification endpoint
- [ ] Send verification email on registration
- [ ] Require email verification for seller status
- [ ] Test email validation flow in integration tests

**Timeline:** Implement before seller features go live

---

### 10. **Rate Limiting Decorator Ineffective for FastAPI Endpoints**

**Severity:** HIGH  
**File:** `backend/app/core/rate_limiter.py:183-266`  
**Issue:**  
```python
def rate_limit(calls: int = ..., period: int = ..., ...):
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Find request object in args/kwargs
            request: Optional[Request] = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
```

- Finding `Request` in `*args` by type checking is fragile
- Dependency injection order changes → Request not found
- Falls back to no rate limiting silently
- Decorator applied but doesn't actually limit (silent failure)

**Risk:**  
- Rate limiting advertised but not working
- No indication to user that they're not actually rate-limited
- Security: login endpoints should have strict rate limiting but don't

**Mitigation:**
- [ ] Use FastAPI Depends to inject request properly
- [ ] Add error if request not found (fail fast)
- [ ] Use middleware-based rate limiting for all endpoints instead of decorators
- [ ] Add test that verifies rate limiting works (with actual requests)

**Timeline:** Fix before exposing login endpoint to internet

---

## 🟡 MEDIUM PRIORITY ISSUES

### 11. **Order Repository Total Count Query Missing for Seller Orders**

**Severity:** MEDIUM  
**File:** `backend/app/services/order_service.py:223-225`  
**Issue:**  
```python
# In get_seller_orders():
items = [OrderResponse.model_validate(o) for o in orders]
return OrderListResponse.create(
    items=items, total=len(items), page=page, page_size=page_size
)
# Uses len(items) as total, not actual count!
```

- Pagination broken: total count is wrong if limit is smaller than actual total
- Frontend pagination UI will show incorrect page count
- Seller views only up to `limit` items and thinks that's the total

**Mitigation:**
- [ ] Add `count_orders_for_seller()` method to repository
- [ ] Use actual total in OrderListResponse
- [ ] Test pagination with more items than page size

**Timeline:** Fix within 1 sprint

---

### 12. **Shipping Address Schema Mismatch (JSON vs Dict)**

**Severity:** MEDIUM  
**File:** `backend/app/models/order.py:94-98`, `backend/app/repositories/order.py:129`  
**Issue:**  
```python
# Model:
shipping_address: Mapped[Optional[dict]] = mapped_column(JSON, ...)

# Repository:
shipping_address=shipping_address,  # dict passed directly
```

- Stored as JSON in database but accessed as dict in Python
- No schema validation for shipping address fields
- Can store any arbitrary data structure
- Causes problems if structure changes (e.g., missing `zip_code` field)

**Risk:**  
- Shipping service receives malformed data
- No type safety for address fields

**Mitigation:**
- [ ] Create Pydantic schema for ShippingAddress with required fields
- [ ] Validate in OrderCreate schema
- [ ] Store with validated schema
- [ ] Add migration to validate existing data

**Timeline:** Refactor before shipping integration

---

### 13. **OrderItem Book Reference Can Be None (Orphaned References)**

**Severity:** MEDIUM  
**File:** `backend/app/models/order.py:173-174`  
**Issue:**  
```python
book_id: Mapped[uuid.UUID] = mapped_column(
    UUID(as_uuid=True),
    ForeignKey("books.id", ondelete="SET NULL"),  # ← SET NULL on deletion!
    nullable=True,  # ← Can be NULL
)
```

- If book is deleted, order items have NULL book_id
- Order displays "Unknown Book" instead of historical title
- But `book_title` field exists on OrderItem (redundant data)

**Risk:**  
- Order history shows incomplete/confusing info
- Frontend must handle NULL book relationship
- Database design has redundancy

**Mitigation:**
- [ ] Change ondelete to "RESTRICT" to prevent book deletion with active orders
- [ ] Or: use soft deletes (is_deleted flag) on Book
- [ ] Remove book relationship entirely since book_title/author captured at purchase

**Timeline:** Fix before historical order migrations

---

### 14. **No Input Sanitization for User Display Fields**

**Severity:** MEDIUM  
**File:** Backend schemas and frontend display  
**Issue:**  
- User names (`first_name`, `last_name`) have no length validation
- Book titles/descriptions no length limits in some schemas
- Review text can be very large or contain problematic content
- No HTML/script injection protection (if displayed as HTML)

**Risk:**  
- XSS if user-generated content displayed without escaping
- UI layout broken by very long names
- Storage bloat from huge review texts

**Mitigation:**
- [ ] Add max_length to all string fields in schemas
- [ ] Sanitize/truncate display fields in frontend
- [ ] Escape user content when rendering (Next.js does this by default)
- [ ] Add content filtering for reviews (profanity, URLs)

**Timeline:** Implement before UGC features go live

---

### 15. **Database Pool Configuration Not Environment-Aware**

**Severity:** MEDIUM  
**File:** `backend/app/core/config.py:63-64`  
**Issue:**  
```python
DATABASE_POOL_SIZE: int = Field(default=5, ...)
DATABASE_MAX_OVERFLOW: int = Field(default=10, ...)
```

- Same pool size for dev, staging, and production
- No guidance on what values should be used for production load
- Connection pool exhaustion possible under load

**Risk:**  
- `too many clients for database` errors under production traffic
- Unclear how to tune for actual workload

**Mitigation:**
- [ ] Document recommended pool sizes per environment
- [ ] Set different defaults based on ENVIRONMENT variable
- [ ] Add test that validates pool configuration
- [ ] Monitor connection pool metrics (count, idle, waiting)

**Timeline:** Document before production deployment

---

### 16. **Frontend Build Configuration Missing Security Headers**

**Severity:** MEDIUM  
**File:** Frontend configuration (not in Next.js repo visible)  
**Issue:**  
- No `next.config.js` visible (or not showing relevant security configs)
- Likely missing security headers (CSP, X-Frame-Options, etc.)
- No rate limiting at CDN/reverse proxy level (only in app)

**Risk:**  
- XSS attacks possible if headers not set
- Clickjacking attacks
- Missing HSTS/other security headers

**Mitigation:**
- [ ] Add security headers middleware in Next.js
- [ ] Implement CSP with appropriate directives
- [ ] Add HSTS, X-Frame-Options, X-Content-Type-Options
- [ ] Test headers with security scanning tool

**Timeline:** Add before production

---

### 17. **Pagination Cursor Not Validated**

**Severity:** MEDIUM  
**File:** `backend/app/services/order_service.py:184`  
**Issue:**  
```python
page_size = min(page_size, 100)
skip = (page - 1) * page_size
```

- No validation that `page >= 1`
- Negative page numbers create negative skip values → return all records
- No validation that `page_size > 0`

**Risk:**  
- Page 0 or negative pages bypass pagination
- Possible DoS if very large page_size passed
- Unexpected results for callers

**Mitigation:**
- [ ] Validate `page >= 1` and `page_size > 0` in schema
- [ ] Add integration test for edge cases (page=0, page=-1, page_size=0)

**Timeline:** Quick fix within this sprint

---

## 🟢 LOW PRIORITY / TECHNICAL DEBT

### 18. **Unused OAuth Provider (Facebook)**

**Severity:** LOW  
**File:** `backend/app/models/user.py:32-34`  
**Issue:**  
```python
class OAuthProvider(str, enum.Enum):
    GOOGLE = "google"
    FACEBOOK = "facebook"  # ← Never implemented
    GITHUB = "github"
```

- Facebook OAuth defined but no implementation exists
- Creates confusion about what's supported
- Adds to maintenance burden

**Mitigation:**
- [ ] Remove FACEBOOK from enum or implement it
- [ ] Document which OAuth providers are supported

**Timeline:** Cleanup during refactoring

---

### 19. **No Comprehensive Error Mapping Documentation**

**Severity:** LOW  
**File:** `backend/app/main.py:54-72`  
**Issue:**  
```python
_SERVICE_EXCEPTION_MAP: dict[type[ServiceError], int] = {
    EmailAlreadyExistsError: status.HTTP_409_CONFLICT,
    ...
}
```

- Exception map is comprehensive but unmaintained as new exceptions added
- No guarantee all exceptions are covered
- If new exception missing from map, defaults to 500 Internal Server Error

**Mitigation:**
- [ ] Add comment reminder to update map when adding exceptions
- [ ] Add test that verifies all ServiceError subclasses are mapped
- [ ] Set default to 400 Bad Request instead of 500 (safer default)

**Timeline:** Add test during test improvement sprint

---

### 20. **Celery Dependency Unused**

**Severity:** LOW  
**File:** `backend/pyproject.toml:11`  
**Issue:**  
```python
"celery>=5.6.0",
```

- Celery listed as dependency but no async task queue used
- No background jobs for email, image processing, etc.
- Dead code that will confuse future developers

**Mitigation:**
- [ ] Remove Celery if truly not needed
- [ ] Or: implement async tasks for email, stripe webhooks, etc.
- [ ] Document decision in README

**Timeline:** Cleanup before 1.0 release

---

### 21. **No Request/Response Logging Middleware**

**Severity:** LOW  
**File:** Backend middleware stack  
**Issue:**  
- No request ID propagation
- No structured request/response logging
- Difficult to correlate logs across services if microservices added later
- No performance metrics on endpoint response times

**Mitigation:**
- [ ] Add request ID generation and propagation middleware
- [ ] Log all requests/responses in structured format
- [ ] Measure and record endpoint latency

**Timeline:** Add monitoring infrastructure before production

---

### 22. **Frontend: No Error Boundary or Global Error Handler**

**Severity:** LOW  
**File:** Frontend application  
**Issue:**  
- React app likely lacks error boundaries
- Unhandled errors crash entire app
- No user-friendly error messages for API failures
- No error logging to observability platform

**Mitigation:**
- [ ] Add React Error Boundary component
- [ ] Implement global error handler for API calls
- [ ] Log errors to Sentry or similar
- [ ] Show user-friendly error messages instead of stack traces

**Timeline:** Add during frontend hardening sprint

---

### 23. **No Database Connection Retry Logic**

**Severity:** LOW  
**File:** `backend/app/core/database.py`  
**Issue:**  
- No exponential backoff for connection retries
- No circuit breaker pattern for database failures
- App starts even if database is temporarily unavailable

**Mitigation:**
- [ ] Implement connection retry with exponential backoff
- [ ] Add circuit breaker to prevent thundering herd
- [ ] Fail startup if database unavailable in production

**Timeline:** Add resilience before production

---

### 24. **Alembic Migrations Not Tested**

**Severity:** LOW  
**File:** `backend/alembic/`  
**Issue:**  
- No automated testing of migrations (upgrade/downgrade)
- Risk of data loss on migration failures
- No easy rollback if migration fails in production

**Mitigation:**
- [ ] Add test database that runs all migrations
- [ ] Test upgrade and downgrade paths
- [ ] Add migration dry-run command

**Timeline:** Implement in CI/CD setup

---

### 25. **Environment Variable Validation Incomplete**

**Severity:** LOW  
**File:** `backend/app/core/config.py`  
**Issue:**  
- No validation that required variables are set
- Some variables optional but should be required in production
- No enforcement of format (e.g., DATABASE_URL must be valid PostgreSQL URL)

**Mitigation:**
- [ ] Add startup validation that all required vars are set based on ENVIRONMENT
- [ ] Validate format of URLs (DATABASE_URL, REDIS_URL, etc.)
- [ ] Test startup with missing variables

**Timeline:** Add to startup validation

---

## 📋 SUMMARY TABLE

| ID | Issue | Severity | Impact | Timeline |
|----|-------|----------|--------|----------|
| 1 | bcrypt version pinning fragility | CRITICAL | Product downtime | Before prod |
| 2 | Stripe webhook replay attacks | CRITICAL | Financial loss | Before payments |
| 3 | JWT secret rotation missing | CRITICAL | Security breach | Before prod |
| 4 | Order quantity race condition | CRITICAL | Overselling | Immediate |
| 5 | Bare exception handlers | HIGH | Poor observability | 1 sprint |
| 6 | Inconsistent order transitions | HIGH | Data corruption | 2 sprints |
| 7 | Insufficient audit logging | HIGH | Compliance issue | Before payments |
| 8 | Stripe secret not validated at startup | HIGH | Silent failures | Now |
| 9 | Email verification incomplete | HIGH | Spam/invalid data | Before sellers |
| 10 | Rate limiting decorator broken | HIGH | Security gap | Before login |
| 11 | Seller order pagination broken | MEDIUM | UX issue | 1 sprint |
| 12 | Shipping address schema mismatch | MEDIUM | Data corruption | Before shipping |
| 13 | OrderItem book reference orphaning | MEDIUM | Data loss | 1 sprint |
| 14 | No input sanitization | MEDIUM | XSS risk | Before UGC |
| 15 | Pool config not environment-aware | MEDIUM | Production scaling | Before prod |
| 16 | Missing security headers | MEDIUM | XSS/clickjacking | Before prod |
| 17 | Pagination not validated | MEDIUM | Edge cases | 1 sprint |
| 18 | Unused OAuth provider | LOW | Maintenance burden | Cleanup |
| 19 | No error mapping documentation | LOW | Silent failures | Test sprint |
| 20 | Celery dependency unused | LOW | Confusion | Before 1.0 |
| 21 | No request/response logging | LOW | Observability gap | Before prod |
| 22 | No frontend error boundary | LOW | UX degradation | Frontend sprint |
| 23 | No DB retry logic | LOW | Resilience gap | Before prod |
| 24 | Migrations not tested | LOW | Risky deployments | CI/CD sprint |
| 25 | Env validation incomplete | LOW | Startup issues | Validation sprint |

---

## 🎯 IMMEDIATE ACTION ITEMS (Must do before first user)

1. ✅ **Fix order quantity race condition** (Issue #4)
   - Add `SELECT ... FOR UPDATE` lock or optimistic locking
   - Add integration test for concurrent orders

2. ✅ **Validate Stripe webhook secret at startup** (Issue #8)
   - Check secret exists before app starts in production

3. ✅ **Implement webhook deduplication** (Issue #2)
   - Store event IDs in Redis to prevent replays

4. ✅ **Fix rate limiting decorator** (Issue #10)
   - Use proper dependency injection or middleware instead

5. ✅ **Add startup validation for Stripe config** (Issue #8)
   - Fail fast if STRIPE_WEBHOOK_SECRET missing in production

6. ✅ **Protect against bcrypt upgrade** (Issue #1)
   - Add CI check that prevents bcrypt version bump without passing tests

---

## 📚 RELATED DOCUMENTATION

- **CLAUDE.md**: Known gotchas (bcrypt, JWT, async sessions, Stripe webhooks)
- **PROGRESS.md**: Recent changes and roadmap
- **Architecture**: See CLAUDE.md for three-layer backend design

---

**Last Updated:** 2026-04-18  
**Next Review:** After each major feature addition or before production deployment
