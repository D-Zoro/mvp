# Books4All - Codebase Concerns Analysis

**Date:** April 24, 2026 | **Version:** 1.0

## Executive Summary

Books4All is a peer-to-peer used-book marketplace with FastAPI backend and Next.js frontend. This document identifies critical security, performance, scalability, and technical debt concerns that should be addressed to ensure production readiness and maintainability.

---

## 🔐 SECURITY CONCERNS

### 1. **Secrets Management & Environment Variables**
**Severity:** 🔴 CRITICAL

**Issues:**
- Default secrets hardcoded in `config.py` (e.g., `SECRET_KEY = "change-this-in-production-use-openssl-rand-hex-32"`)
- `.env` file may be committed to version control
- AWS credentials hardcoded with default MinIO values in `storage.py`
- Stripe API keys transmitted in plaintext through environment variables

**Impact:**
- Token signing uses predictable secret key if not overridden
- Production deployment could accidentally use development credentials
- S3/MinIO access compromised if defaults not changed

**Mitigation:**
```python
# Add validation in settings
@field_validator("SECRET_KEY")
def validate_secret_key(v: str) -> str:
    if "change-this" in v and settings.is_production:
        raise ValueError("SECRET_KEY must be changed in production")
    if len(v) < 32:
        raise ValueError("SECRET_KEY must be at least 32 characters")
    return v
```

---

### 2. **Token Storage (Frontend)**
**Severity:** 🔴 CRITICAL

**Issues:**
- JWT tokens stored in `localStorage` (in `tokenStorage.ts`)
- localStorage vulnerable to XSS attacks
- No HTTP-only cookie implementation
- Refresh token stored in same vulnerable location

**Current Code:**
```typescript
// Vulnerable: localStorage accessible to JS
localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
```

**Impact:**
- Malicious scripts can steal tokens via XSS
- No protection against CSRF attacks
- Token compromise affects entire session

**Mitigation:**
- Implement HTTP-only, Secure cookies via backend
- Use sameSite=Strict for CSRF protection
- Add optional sessionStorage for temporary tokens

---

### 3. **OAuth State Validation**
**Severity:** 🟡 HIGH

**Issues:**
- OAuth state token generated but never validated
- State stored only in request params, not in session/database
- Vulnerable to CSRF attacks on OAuth callbacks
- No nonce parameter for ID token validation

**Current Code:**
```python
# State generated but never persisted/validated
state = secrets.token_urlsafe(32)
params = {..., "state": state, ...}
# No validation on callback
```

**Impact:**
- Attacker can trick user into authorizing arbitrary OAuth tokens
- User account could be hijacked during OAuth flow

**Mitigation:**
- Store state in Redis with TTL (5-10 minutes)
- Validate state on callback before token exchange
- Add PKCE flow for SPA security

---

### 4. **SQL Injection Prevention**
**Severity:** 🟢 LOW (Mitigated)

**Status:** ✅ GOOD
- Using SQLAlchemy ORM with parameterized queries
- No raw SQL vulnerable patterns found

---

### 5. **Rate Limiting Bypass**
**Severity:** 🟡 HIGH

**Issues:**
- Stripe webhook endpoint excluded from rate limiting (intentional, but risky)
- No IP-based rate limiting for webhook verification
- Login endpoint has separate rate limit but no exponential backoff

**Current Code:**
```python
exclude_paths=[
    "/health",
    "/metrics",
    "/payments/webhook",  # No rate limit = vulnerability
]
```

**Impact:**
- Webhook endpoint could be flooded with fake events
- Brute force attacks on login possible (though limited to 5 attempts/900s)

**Mitigation:**
- Keep webhook excluded but add signature verification requirement
- Implement exponential backoff for failed login attempts
- Add IP-based rate limiting for authentication endpoints

---

### 6. **Stripe Webhook Signature Verification**
**Severity:** 🟢 LOW (Mitigated)

**Status:** ✅ GOOD
- Signature verified with `stripe.Webhook.construct_event()`
- Proper error handling for verification failures
- Webhook deduplication implemented via Redis cache

---

### 7. **CORS Configuration**
**Severity:** 🟡 MEDIUM

**Issues:**
- Default CORS allows `*` in methods and headers
- In production, CORS_ORIGINS defaults to `http://localhost:3000`
- No validation that CORS_ORIGINS are HTTPS in production

**Current Code:**
```python
CORS_ALLOW_METHODS: list[str] = Field(default=["*"], ...)
CORS_ALLOW_HEADERS: list[str] = Field(default=["*"], ...)
```

**Impact:**
- Overly permissive CORS could allow unexpected origins
- Development defaults not suitable for production

**Mitigation:**
```python
@field_validator("CORS_ORIGINS")
def validate_cors_origins(cls, v: list[str], info) -> list[str]:
    if info.data.get("is_production"):
        for origin in v:
            if not origin.startswith("https://"):
                raise ValueError(f"CORS origin must be HTTPS in production: {origin}")
    return v
```

---

### 8. **Password Reset Token Security**
**Severity:** 🟡 MEDIUM

**Issues:**
- Password reset tokens use same SECRET_KEY as access tokens
- No separate expiration validation (relies on JWT exp)
- No way to revoke a password reset token mid-flow
- Token reuse not prevented (one-time token not enforced)

**Mitigation:**
- Add `used_at` timestamp to password reset tokens
- Store hashed tokens in database for revocation capability
- Reduce reset token lifetime to 30 minutes

---

### 9. **S3/MinIO Bucket Policy**
**Severity:** 🟡 MEDIUM

**Issues:**
- Bucket policy allows public read (`Principal: "*"`)
- Hardcoded MinIO credentials in development
- No signed URLs for private content
- Public URL construction vulnerable to path traversal

**Current Code:**
```python
policy = {
    "Principal": "*",  # Public to entire internet
    "Action": ["s3:GetObject"],
}
```

**Impact:**
- All uploaded book images publicly readable (may be acceptable)
- No access control for sensitive uploads
- Book cover URLs predictable if using sequential UUIDs

**Mitigation:**
- Implement signed URLs for sensitive content
- Use random UUIDs (already implemented: `uuid.uuid4()`)
- Validate file extensions before upload

---

## ⚡ PERFORMANCE CONCERNS

### 1. **Database Connection Pooling**
**Severity:** 🟡 MEDIUM

**Issues:**
- Default pool size: 5 connections, max overflow: 10
- No monitoring of pool exhaustion
- No query timeout configured
- Async queries could stack if slow

**Current Config:**
```python
DATABASE_POOL_SIZE: int = Field(default=5, ge=1, le=20)
DATABASE_MAX_OVERFLOW: int = Field(default=10, ge=0, le=50)
```

**Impact:**
- Under heavy load, connections could exhaust
- Slow queries block the pool indefinitely
- No visibility into connection utilization

**Mitigation:**
- Set query timeout: `asyncio_connect_timeout=10`
- Add connection pool monitoring
- Implement query logging with slow query detection

---

### 2. **N+1 Query Problems**
**Severity:** 🟡 MEDIUM

**Issues:**
- Order retrieval loads items separately (potential N+1)
- No eager loading strategy defined
- Book search doesn't prefetch review counts

**Example Concern:**
```python
# In payment_service.py:
order = await self.order_repo.get_with_items(order_id)
# Unclear if items are eager-loaded
```

**Impact:**
- Order listing could trigger 100+ queries (100 orders = 100 item queries)
- Search results slow with large datasets

**Mitigation:**
- Use SQLAlchemy's `selectinload()` for relationships
- Add query monitoring to detect N+1 patterns
- Index frequently filtered columns (book.category, order.status)

---

### 3. **Caching Strategy**
**Severity:** 🟡 MEDIUM

**Issues:**
- No application-level caching implemented
- Redis only used for rate limiting and webhook dedup
- Book catalog changes not cached
- User permissions computed on each request

**Impact:**
- Every book search hits database
- User role checks repeated across requests
- No cache busting strategy defined

**Mitigation:**
```python
# Add caching for books
@cached(cache=TTLCache(maxsize=1000, ttl=300))
async def get_books_by_category(category: str):
    return await book_repo.search(category=category)

# Invalidate on update
async def create_book(...):
    book = await book_repo.create(...)
    cache.clear()
    return book
```

---

### 4. **Webhook Event Processing**
**Severity:** 🟡 MEDIUM

**Issues:**
- Webhook handling blocks HTTP response (synchronous DB commit)
- No async task queue (Celery imported but not used for webhooks)
- Stripe event processing could timeout if order lookup slow

**Current Code:**
```python
async def _handle_checkout_completed(self, session_data: dict) -> None:
    # Direct DB operations - could be slow
    order = await self.order_repo.get(order_id)
    await self.order_repo.mark_paid(order_id, ...)
    await self.db.commit()  # Blocks webhook response
```

**Impact:**
- Stripe might retry webhook if processing > 3 seconds
- Duplicate webhook processing more likely
- User payment confirmation delayed

**Mitigation:**
- Defer webhook processing to Celery task queue
- Return 200 OK immediately, process asynchronously
- Add webhook processing priority queue

---

### 5. **Image Upload Processing**
**Severity:** 🟡 MEDIUM

**Issues:**
- No image resizing/optimization before upload
- File size limit only enforced on upload (5MB)
- S3 upload blocks request (synchronous)
- No background job for thumbnail generation

**Impact:**
- Large images slow down page load
- Storage costs high without optimization
- Frontend must resize images (extra client load)

**Mitigation:**
- Use Pillow to resize on backend before S3 upload
- Generate thumbnails asynchronously with Celery
- Implement image optimization (WebP conversion)

---

## 📈 SCALABILITY CONCERNS

### 1. **Monolithic Architecture**
**Severity:** 🟡 MEDIUM

**Issues:**
- Single FastAPI instance handles all concerns
- No service separation (auth, payments, books, orders all in one app)
- Rate limiting shared across all endpoints

**Current Structure:**
```
app/
  ├── api/v1/
  ├── services/        # Mixed responsibilities
  ├── repositories/
```

**Impact:**
- Scaling any feature requires scaling entire app
- Database contention across unrelated features
- Difficult to scale payment processing independently

**Mitigation:**
- Plan microservices migration (payments → separate service)
- Implement API gateway for service routing
- Use event-driven architecture for order → payment flow

---

### 2. **Database as Bottleneck**
**Severity:** 🟡 MEDIUM

**Issues:**
- All reads/writes go through single PostgreSQL instance
- No read replicas configured
- No database sharding strategy

**Impact:**
- Database CPU/memory is single point of failure
- Write-heavy operations (orders, payments) could saturate DB
- Search queries compete with transaction processing

**Mitigation:**
- Add PostgreSQL read replicas for searches
- Implement CQRS pattern for read model separation
- Use connection pooling service (PgBouncer)

---

### 3. **Session Management**
**Severity:** 🟡 MEDIUM

**Issues:**
- Session state stored in JWT (stateless)
- No way to revoke tokens without expiration
- User deletions don't invalidate tokens

**Current Implementation:**
- Token payload includes user ID + role
- No blacklist/revocation mechanism

**Impact:**
- Deleted users' tokens still valid until expiration
- Deactivated accounts still accessible via old tokens
- Role changes not immediately reflected

**Mitigation:**
```python
# Add token revocation
async def logout(user_id: UUID, jti: str):
    await redis.set(f"revoked:{jti}", "1", ex=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)

# Check on verify
async def verify_access_token(token: str):
    payload = decode_token(token)
    if await redis.exists(f"revoked:{payload['jti']}"):
        raise InvalidTokenError("Token has been revoked")
```

---

### 4. **Celery Task Queue Configuration**
**Severity:** 🟡 MEDIUM

**Issues:**
- Celery imported in requirements but never configured
- No async task processing for long-running operations
- Email notifications (password reset, order confirmation) not implemented
- No background job monitoring

**Impact:**
- Long operations block HTTP requests
- User notifications not sent
- Webhook processing synchronous (risk of timeouts)

**Mitigation:**
```python
# In main.py
from celery import Celery

celery_app = Celery(
    "books4all",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

@celery_app.task
async def send_order_confirmation(order_id: UUID):
    # Async email sending
    pass
```

---

## 🧠 TECHNICAL DEBT

### 1. **Email Verification Not Implemented**
**Severity:** 🟡 MEDIUM

**Code Comment:**
```python
# app/services/auth_service.py:129-131
# NOTE: In production you'd send an email verification link here.
# token = generate_email_verification_token(user.email)
# email_service.send_verification_email(user.email, token)
```

**Impact:**
- Users can register with fake emails
- No account recovery via email
- Spam accounts possible

**Timeline:** Should implement before MVP release

---

### 2. **Print Statements Instead of Logging**
**Severity:** 🟢 LOW

**Issues:**
- `storage.py` uses `print()` instead of logging
- No structured logging for debugging
- Can't control log levels in production

**Current Code:**
```python
except ClientError as e:
    print(f"Error uploading file: {e}")  # Should use logger.error()
```

---

### 3. **Inconsistent Error Handling**
**Severity:** 🟡 MEDIUM

**Issues:**
- `storage.py` raises exceptions but doesn't return error codes
- Some endpoints return different error structures
- Validation errors in different formats

**Impact:**
- Frontend must handle multiple error response types
- Difficult to implement consistent error handling

---

### 4. **Missing Input Validation**
**Severity:** 🟡 MEDIUM

**Issues:**
- File paths in `storage.py` not validated for traversal
- No max request size limit on uploads
- Book descriptions not length-validated in schema
- No regex validation for email format (pydantic does basic check)

**Example Concern:**
```python
# storage.py - vulnerable to path traversal
ext = os.path.splitext(file.filename)[1]  # User controls filename
filename = f"{folder}/{datetime.now().strftime('%Y/%m')}/{uuid.uuid4()}{ext}"
```

---

### 5. **Key Management**
**Severity:** 🟡 MEDIUM

**Issues:**
- `app/core/keys.py` mentioned in security code but not found
- Key rotation strategy undefined
- No key versioning for old tokens

**Current Code:**
```python
from app.core.keys import get_active_key, get_key_for_verification
# But keys.py doesn't exist?
```

**Impact:**
- Can't rotate secrets without invalidating all tokens
- Key version mechanism incomplete

---

### 6. **No Database Migrations Script**
**Severity:** 🟡 MEDIUM

**Issues:**
- Alembic imported but no migrations directory found
- `init_database()` uses SQLAlchemy's `create_all()` (not production-ready)
- No schema versioning for deployments

**Impact:**
- Database schema changes not tracked
- Rollback strategy unclear
- Production deployments at risk

---

### 7. **Test Coverage Gaps**
**Severity:** 🟡 MEDIUM

**Issues:**
- `pytest` configured but coverage omits `database.py`
- No integration tests for OAuth flows
- Payment webhook handling not fully tested
- E2E tests only for frontend

**Coverage Config:**
```python
omit = ["app/core/database.py", "*/migrations/*"]
```

---

### 8. **Documentation Gaps**
**Severity:** 🟡 MEDIUM

**Issues:**
- No API documentation for payment flows
- OAuth state validation not documented
- Webhook retry strategy not documented
- Rate limit values not explained

---

## ⚠️ RISKS & KNOWN LIMITATIONS

### 1. **Stock Race Condition**
**Severity:** 🟡 MEDIUM

**Noted in Code:**
```python
# app/services/order_service.py:8-11
# "Concurrency safety note: quantity deduction happens inside the
# OrderRepository's transactional create_with_items; a DB-level
# CHECK constraint (quantity >= 0) is the ultimate guard."
```

**Risk:**
- Two concurrent orders for same book could both succeed
- DB constraint prevents negative quantity but causes order failure
- User gets error instead of "out of stock" message

**Mitigation:**
- Use `SELECT ... FOR UPDATE` to lock inventory rows
- Implement optimistic locking with version numbers

---

### 2. **Stripe Payment Intent Orphaning**
**Severity:** 🟡 MEDIUM

**Risk:**
- If order creation fails after Stripe checkout session created, payment intent orphaned
- Customer charged but no order in database
- Recovery requires manual intervention

**Mitigation:**
- Wrap both operations in transaction
- Implement idempotency keys for Stripe operations

---

### 3. **OAuth Account Linking**
**Severity:** 🟡 MEDIUM

**Current Behavior:**
```python
# app/services/auth_service.py:517-520
# If email matches existing account, link OAuth provider
if user is not None:
    user.oauth_provider = provider
    user.oauth_provider_id = provider_id
```

**Risk:**
- Attacker with access to victim's email can link OAuth provider
- Allows account hijacking if OAuth provider compromised

**Mitigation:**
- Require explicit user confirmation to link OAuth
- Send verification email before linking

---

### 4. **Session Fixation Risk**
**Severity:** 🟡 MEDIUM

**Risk:**
- After login, same token used throughout session
- If token leaked, attacker has full session access
- No way to invalidate token except wait for expiration

**Mitigation:**
- Implement token rotation on sensitive operations
- Add device fingerprinting for anomaly detection

---

## 📊 PRIORITY MATRIX

| Concern | Severity | Effort | Priority |
|---------|----------|--------|----------|
| Secrets Management | 🔴 CRITICAL | Medium | P0 |
| Token Storage (localStorage) | 🔴 CRITICAL | High | P0 |
| OAuth State Validation | 🟡 HIGH | Medium | P1 |
| Email Verification | 🟡 MEDIUM | Medium | P2 |
| Database Caching | 🟡 MEDIUM | High | P2 |
| Webhook Async Processing | 🟡 MEDIUM | High | P2 |
| Rate Limit Improvements | 🟡 MEDIUM | Low | P2 |

---

## 🛠️ RECOMMENDED ACTIONS

### Immediate (Before MVP)
1. ✅ Implement proper secret management with validation
2. ✅ Move JWT tokens to HTTP-only cookies
3. ✅ Add OAuth state validation with Redis
4. ✅ Implement email verification flow
5. ✅ Add database query monitoring

### Short-term (Sprint 2-3)
1. Add webhook deduplication verification
2. Implement async task processing with Celery
3. Add database read replicas and connection pooling
4. Improve CORS configuration for production
5. Add comprehensive test coverage

### Medium-term (Sprint 4+)
1. Plan microservices migration (payments service)
2. Implement CQRS for read model separation
3. Add token revocation mechanism
4. Implement image optimization pipeline
5. Set up structured logging and monitoring

---

## 📋 COMPLIANCE & STANDARDS

**Areas Needing Attention:**
- PCI-DSS compliance for payment data (currently relying on Stripe)
- GDPR compliance for user data (no data export/deletion endpoints)
- SOC2 readiness (no audit logging)

---

**Document Maintained By:** Code Analysis System  
**Last Updated:** April 24, 2026
