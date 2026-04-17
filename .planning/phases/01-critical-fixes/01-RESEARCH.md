# Phase 1: Critical Fixes — Research & Planning

**Created:** 2026-04-18  
**Phase:** 1 of 7  
**Status:** Research Complete  
**Requirements:** CRIT-01, CRIT-02, CRIT-03, CRIT-04

---

## Executive Summary

Phase 1 addresses 4 production-critical blockers that prevent Books4All from going live:

1. **CRIT-01: Order Quantity Race Condition** — Concurrent orders can oversell books
2. **CRIT-02: Stripe Webhook Deduplication** — Network retries can double-charge customers
3. **CRIT-03: JWT Secret Rotation** — No mechanism to rotate compromised secrets
4. **CRIT-04: Rate Limiting Validation** — Decorator pattern is broken; login endpoints unprotected

All four must be fixed and verified before any other phase work begins.

---

## Requirement-by-Requirement Analysis

### CRIT-01: Order Quantity Race Condition

**Objective:** Prevent overselling when multiple buyers purchase the same book simultaneously.

#### Current Implementation (Vulnerable)

**Location:** `backend/app/repositories/order.py:62-157` (`create_with_items`)

```python
# Line 104-108 (race condition)
if book.quantity < item.quantity:
    raise ValueError(f"Insufficient quantity for {book.title}...")

# Line 147 (quantity deduction)
book.quantity -= item.quantity
```

**Problem:** Classic read-check-then-modify race condition:
1. Thread A reads `Book(id=1).quantity = 2`
2. Thread B reads `Book(id=1).quantity = 2` (before A's update)
3. Both threads pass the `< item.quantity` check
4. Thread A sets `quantity = 2 - 2 = 0`
5. Thread B sets `quantity = 0 - 2 = -2` ← **Violates CHECK constraint**
6. On constraint violation, transaction fails with cryptic DB error (no clean API response)

**Data Model Guard:** `backend/app/models/order.py` has `CHECK (quantity >= 0)` constraint, but:
- Only catches violations *after* the race (too late)
- Returns database error instead of user-friendly "out of stock" message
- No idempotency guarantees

#### Solutions & Trade-offs

| Approach | Pros | Cons | Complexity |
|----------|------|------|-----------|
| **SELECT FOR UPDATE** | DB-level lock, true mutual exclusion, simple | Serializes order creation, potential deadlocks | Low ✓ |
| **Optimistic Locking** | Concurrent-friendly, uses version field | Requires retries on conflict, new field | Medium |
| **Event Sourcing** | Audit trail, time travel possible | Significant architecture change | High |
| **Distributed Lock (Redis)** | Works across replicas, explicit control | Adds complexity, potential race in lock acquire | Medium |

**Recommendation:** Use **SELECT FOR UPDATE** because:
1. Simplest to implement (one-line SQLAlchemy change)
2. Strong consistency guarantee (true mutual exclusion at DB level)
3. Order creation is not high-frequency (typical marketplace 10-50 orders/min)
4. Serialization only affects the *same book* (different books still concurrent)
5. Easiest to verify and test

#### Implementation Plan

1. **Modify `OrderRepository.create_with_items()`:**
   - Change book fetch to use `with_for_update()`
   - Lock row during stock validation & deduction
   - Transaction ensures atomicity

2. **Add error handling:**
   - Catch SQLAlchemy `IntegrityError` if CHECK constraint violated
   - Return 409 Conflict with message: `"Out of stock for 'Book Title'"`

3. **Add integration test:**
   - Spawn 3+ concurrent tasks creating orders for same book
   - Verify total quantity deducted equals sum of order quantities
   - Verify no overselling (quantity never goes negative)

4. **Verify in production-like scenario:**
   - Load test with 10+ concurrent orders on same book
   - Monitor for deadlocks in PostgreSQL logs

#### Code Location & Files to Modify

```
backend/app/repositories/order.py           # create_with_items() logic
backend/app/services/order_service.py       # Error handling (map exception to 409)
backend/app/main.py                         # Exception map (IntegrityError → 409)
backend/tests/integration/test_orders_api.py  # Add concurrent order test
backend/tests/DB/test_orders.py             # Add DB-level race condition test (if exists)
```

---

### CRIT-02: Stripe Webhook Deduplication

**Objective:** Ensure Stripe webhook events are processed idempotently (same webhook = same result, even on retries).

#### Current Implementation (Vulnerable)

**Location:** `backend/app/services/payment_service.py:173-231` (`handle_webhook`)

```python
# Line 206-216 (no replay protection)
try:
    event = stripe.Webhook.construct_event(payload, stripe_signature, webhook_secret)
except stripe.error.SignatureVerificationError as exc:
    raise StripeWebhookError(...)
except Exception as exc:
    raise StripeWebhookError(f"Webhook payload parsing failed: {exc}")

# Line 223-226 (no deduplication)
if event_type == "checkout.session.completed":
    await self._handle_checkout_completed(event_data)  # ← May be called multiple times!
```

**Problem:** Stripe webhook events can be retried by Stripe on network failures:
1. `checkout.session.completed` fires, mark order PAID ✓
2. Network error before returning 200 to Stripe
3. Stripe retries webhook with **same event**
4. Order marked PAID **again** (idempotent in this case, but creates audit confusion)
5. **Payment success email sent twice** (in v2 with email service)
6. Financial reconciliation difficult between database and Stripe

**Unique Event ID:** Stripe events include `event.id` (e.g., `evt_1ABC123...`), but code doesn't track it.

#### Solutions & Trade-offs

| Approach | Pros | Cons | Complexity |
|----------|------|------|-----------|
| **Redis Event Cache** | Simple, distributed-friendly, TTL auto-cleanup | Requires Redis (already in stack) | Low ✓ |
| **Database Event Log** | Persistent audit trail, queryable | Adds table schema, requires migration | Medium |
| **Idempotency Keys** | Standard REST practice, explicit | Requires new infrastructure | Medium |
| **Stripe API Verification** | Lean (no new storage), trusts Stripe | API latency, potential bugs in Stripe SDK | Low-Medium |

**Recommendation:** Use **Redis Event Cache** because:
1. Redis already required for rate limiting (no new dependency)
2. Simple pattern: check cache before processing, add after success
3. TTL on keys (e.g., 24 hours) auto-cleans old entries
4. Works across replicas (stateless design requirement)
5. Can add database audit log later without changing webhook logic

#### Implementation Plan

1. **Create webhook event deduplication helper:**
   - New function in `app.services.payment_service` or separate module
   - Check Redis for `webhook_event:{event_id}` key
   - If exists, return cached result; if not, process and cache

2. **Modify `handle_webhook()`:**
   - Extract `event.id` from Stripe event
   - Check dedup cache before processing
   - On success, store `{event_id: result}` in Redis with 24-hour TTL

3. **Add logging:**
   - Log all webhook events with event ID and status (new, duplicate, unhandled)
   - Include in structured logs for audit trail

4. **Add integration test:**
   - Simulate webhook retry: send same event twice
   - Verify order state unchanged on second webhook
   - Verify only one success log entry (or marked as duplicate)

5. **Add monitoring:**
   - Alert if webhook dedup cache hit rate >10% (indicates Stripe retries)

#### Code Location & Files to Modify

```
backend/app/services/payment_service.py     # handle_webhook() + dedup logic
backend/app/core/rate_limiter.py            # Possibly add generic Redis cache methods
backend/tests/integration/test_payments_api.py  # Add webhook replay test
backend/app/main.py                         # Log webhook stats at shutdown
```

---

### CRIT-03: JWT Secret Rotation

**Objective:** Implement mechanism to rotate JWT signing key without invalidating all active tokens.

#### Current Implementation (Vulnerable)

**Location:** `backend/app/core/config.py:75-79` (config) + `backend/app/core/security.py` (token generation)

```python
# Config
SECRET_KEY: str = Field(
    default="change-this-in-production-use-openssl-rand-hex-32",  # ← Obvious default!
    min_length=32,
)

# Token usage (inferred from python-jose patterns)
# Create: token = create_access_token(data={...}, expires_delta=...)
# Verify: payload = verify_token(token)  # Uses SECRET_KEY
```

**Problem:**
1. **Default secret is public** in docs/code repositories
2. **No key versioning** — if secret is compromised, all tokens become invalid
3. **No rotation strategy** — changing `SECRET_KEY` immediately invalidates all sessions
4. **No audit trail** — when/why secret was changed, who has old secrets
5. **All tokens signed with same secret** — can't gradually migrate

**Compliance Gap:** Production systems should support key rotation (e.g., annual security audit).

#### Solutions & Trade-offs

| Approach | Pros | Cons | Complexity |
|----------|------|------|-----------|
| **JWT Key ID (kid) Header** | Standard JWT practice, gradual rollout | Requires storing multiple keys, versioning logic | Medium ✓ |
| **Token Blacklist (Redis)** | Revokes all tokens immediately on key change | Performance hit on every verification, memory usage | Medium |
| **Time-Based Key Rotation** | Automatic, scheduled rotations | Complex scheduling, multiple secrets in circulation | Medium |
| **Graceful Deprecation Window** | Accept both old + new secrets for period | Requires coordination, potential confusion | Medium |

**Recommendation:** Use **JWT Key ID (kid) + Graceful Deprecation** because:
1. Standard JWT practice (`kid` is JWT RFC standard)
2. Allows gradual migration (accept 2 keys for overlap period)
3. Easy to implement: add `kid` claim in token header, check version on verify
4. Clear audit trail: when each key was active
5. Can be done without breaking existing tokens
6. Simple secret rotation procedure:
   - Generate new secret, add as version 2
   - Update config to use version 2 for signing
   - Accept both versions for 30 days (deprecation window)
   - Remove version 1 after expiration

#### Implementation Plan

1. **Add key versioning config:**
   - Create `app/core/keys.py` with:
     - `ACTIVE_KEY_VERSION: int` (current version)
     - `KEYS: dict[int, str]` (version → secret mapping)
     - `DEPRECATED_KEY_TTL: int` (how long to accept old keys, e.g., 2592000 = 30 days)

2. **Modify token creation:**
   - Add `kid` claim to token header (JWT header, not payload)
   - Include `key_version` in payload claims

3. **Modify token verification:**
   - Check `kid` or `key_version` claim
   - Verify against current + deprecated keys (within TTL)
   - Reject tokens from keys older than TTL

4. **Add rotation procedure (documented, not automated):**
   - Admin generates new secret via CLI command
   - Adds to `KEYS` dict with new version
   - Sets `ACTIVE_KEY_VERSION` to new version
   - Logs rotation event with timestamp + reason
   - After 30 days, manually remove old key version

5. **Add integration test:**
   - Create token with version 1
   - Rotate to version 2
   - Verify version 1 token still valid (within window)
   - Verify version 1 token rejected after window expires

6. **Add monitoring:**
   - Alert on successful token verification with deprecated key
   - Alert if any token created with invalid key version

#### Code Location & Files to Modify

```
backend/app/core/keys.py                    # NEW: Key management
backend/app/core/security.py                # Token create/verify logic
backend/app/core/config.py                  # Add key versioning settings
backend/app/core/dependencies.py            # get_current_user() verification
backend/app/api/v1/endpoints/auth.py        # Possibly: admin endpoint to rotate keys
backend/tests/unit/test_security.py         # Add key rotation tests
backend/management_scripts/                 # NEW (optional): CLI for key rotation
```

---

### CRIT-04: Rate Limiting Validation

**Objective:** Ensure rate limiting is actually enforced on all auth endpoints (login, signup, password reset).

#### Current Implementation (Broken)

**Location:** `backend/app/core/rate_limiter.py:183-266` (decorator pattern)

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
            # ← PROBLEM: Request might not be in args!
            # FastAPI dependency injection doesn't guarantee order.
```

**Problem:**
1. **Fragile dependency extraction** — relies on `Request` being in `*args`
2. **Silent failure** — if Request not found, decorator silently does nothing (no rate limiting)
3. **Not tested** — unclear if decorator actually limits requests
4. **Not applied** — unclear which endpoints actually use the decorator
5. **Decorator antipattern for FastAPI** — FastAPI dependencies are cleaner

#### Current Usage (Inferred from codebase)

Search for `@rate_limit` or `rate_limit(` in endpoints to see actual usage.

#### Solutions & Trade-offs

| Approach | Pros | Cons | Complexity |
|----------|------|------|-----------|
| **Middleware** | Global, always works, no per-endpoint config | Less granular, harder to customize per endpoint | Low ✓ |
| **Dependency Injection** | FastAPI idiomatic, per-endpoint granular | Requires changes to all auth endpoints | Medium |
| **Hybrid (both)** | Flexible, defaults + overrides | More code, harder to reason about | Medium |
| **Fix decorator + test** | Minimal code change | Doesn't fix fragile pattern | Low |

**Recommendation:** Use **Dependency Injection + Middleware** approach:
1. Create FastAPI `Depends()` for rate limiting
2. Apply to auth endpoints explicitly
3. Add middleware as fallback (catch any missed endpoints)
4. Makes it obvious which endpoints are rate-limited
5. Clear error message on rate limit: `"Too many login attempts. Try again in X seconds."`

#### Implementation Plan

1. **Create rate limit dependency:**
   - New function `require_rate_limit(endpoint_name, calls, period)` in `app.core.dependencies`
   - Receives `Request` via FastAPI dependency injection (guaranteed)
   - Returns `Request` if not limited, raises `HTTPException(429)` if limited

2. **Apply to auth endpoints:**
   - `POST /auth/login` — 5 calls per 15 minutes (per IP)
   - `POST /auth/signup` — 3 calls per hour (per IP)
   - `POST /auth/reset-password` — 3 calls per hour (per email)

3. **Add middleware as safety net:**
   - Check if endpoint matched rate limit rules
   - Log warning if endpoint has no explicit rate limit (maintenance note)

4. **Add clear error response:**
   - `429 Too Many Requests`
   - Body: `{"status_code": 429, "detail": "Too many login attempts. Try again in 45 seconds."}`
   - Header: `Retry-After: 45`

5. **Add comprehensive tests:**
   - Unit test: rate limit dependency with mock Request
   - Integration test: send N+1 requests to login endpoint, verify 429 on N+1
   - Integration test: send requests from different IPs, verify independent limits
   - Integration test: wait for period to elapse, verify limit resets

6. **Add monitoring:**
   - Log rate limit hits with endpoint + IP + count
   - Alert if any IP exceeds limits 10+ times in 1 hour (potential attack)

#### Code Location & Files to Modify

```
backend/app/core/dependencies.py            # Add require_rate_limit() dependency
backend/app/core/rate_limiter.py            # Add middleware logic, keep decorator for legacy
backend/app/api/v1/endpoints/auth.py        # Apply rate limit dependency to endpoints
backend/tests/integration/test_auth_api.py  # Add rate limit tests
backend/tests/unit/test_rate_limiter.py     # NEW: Unit tests for rate limit logic
```

---

## Cross-Cutting Concerns

### Error Handling Strategy

Each fix requires clean error handling:

| Fix | Error Type | HTTP Status | Message | Logging Level |
|-----|-----------|------------|---------|-------------|
| CRIT-01 | IntegrityError (quantity < 0) | 409 Conflict | `"Out of stock for 'Book Title'"` | INFO |
| CRIT-02 | (None on dedup) | 200 OK | (cached response) | INFO (dedup marker) |
| CRIT-03 | InvalidTokenError | 401 Unauthorized | `"Token invalid or expired"` | INFO |
| CRIT-04 | RateLimitExceeded | 429 Too Many Requests | `"Too many requests. Retry in X seconds."` | INFO |

**Global exception handler changes:**
- Add mapping for new exception types
- Return 409 Conflict for IntegrityError on quantity checks
- Return 429 for rate limit errors

### Testing Strategy

Each fix must have:

1. **Unit tests** — Service logic in isolation (no DB, no HTTP)
2. **DB tests** — Real PostgreSQL with transaction rollback
3. **Integration tests** — Full HTTP request flow with `AsyncClient`
4. **Load tests** — Concurrency verification (at least 3+ concurrent operations)

**Test file locations:**
- `backend/tests/unit/` — Pure logic tests
- `backend/tests/DB/` — Database constraint tests
- `backend/tests/integration/` — API endpoint tests
- `backend/tests/load/` — NEW (optional): Concurrency/load tests

### Deployment Considerations

| Fix | Backward Compat | Database Migration | Config Changes | Hotpatch? |
|-----|-----------------|-------------------|------------------|-----------|
| CRIT-01 | ✓ (no breaking changes) | None | None | ✓ Code-only |
| CRIT-02 | ✓ (no breaking changes) | None | None | ✓ Code-only |
| CRIT-03 | ✓ (gradual deprecation) | None | Add `ACTIVE_KEY_VERSION` env | × (requires config) |
| CRIT-04 | ✓ (no breaking changes) | None | None | ✓ Code-only |

---

## Success Criteria

Each requirement must pass:

1. **CRIT-01 Race Condition Fixed:**
   - [ ] Concurrent order creation on same book never oversells
   - [ ] Quantity deducted exactly = sum of order quantities
   - [ ] User receives 409 Conflict on insufficient stock (not database error)
   - [ ] Integration test passes with 5+ concurrent orders

2. **CRIT-02 Webhook Deduplication Fixed:**
   - [ ] Webhook event processed idempotently
   - [ ] Duplicate webhook (same event ID) handled correctly
   - [ ] Order state unchanged on duplicate webhook
   - [ ] Integration test passes with replayed webhook

3. **CRIT-03 JWT Secret Rotation Fixed:**
   - [ ] New secret can be added as new key version
   - [ ] Old key version accepted for deprecation period
   - [ ] Old key version rejected after TTL expires
   - [ ] Rotation procedure documented
   - [ ] Integration test verifies key versioning

4. **CRIT-04 Rate Limiting Fixed:**
   - [ ] Rate limiting actually limits (not silently bypassed)
   - [ ] Login endpoint enforces 5 attempts per 15 minutes per IP
   - [ ] Signup endpoint enforces 3 attempts per hour per IP
   - [ ] 429 response on rate limit with Retry-After header
   - [ ] Integration tests pass with concurrent requests

---

## Dependencies & Blockers

### Internal Dependencies
- None (Phase 1 is first; no upstream dependencies)

### External Dependencies
- PostgreSQL 16+ (for `SELECT ... FOR UPDATE` support) ✓
- Redis 7+ (for webhook dedup + rate limiting) ✓
- Stripe SDK 7.11+ (already in deps) ✓

### Blocker Checklist
- [ ] Codebase compiles/lints without errors
- [ ] Test environment set up (DB, Redis running)
- [ ] Branch created for Phase 1 work
- [ ] Baseline metrics captured (current oversell/webhook/rate limit behavior)

---

## Effort Estimation

| Fix | Complexity | Dev Time | Test Time | Review Time | Total |
|-----|-----------|----------|-----------|------------|-------|
| CRIT-01 | Medium | 2-3h | 1-2h | 1h | 4-6h |
| CRIT-02 | Low-Medium | 1-2h | 1h | 0.5h | 2.5-3.5h |
| CRIT-03 | Medium | 2-3h | 1-2h | 1h | 4-6h |
| CRIT-04 | Low | 1-2h | 1-2h | 0.5h | 2.5-4.5h |
| **Total** | — | **6-10h** | **4-7h** | **3h** | **13-20h** |

**Parallel execution:** All 4 fixes are independent; can work on 2-3 in parallel if needed.

---

## Execution Order

Recommended sequence:

1. **CRIT-04 (Rate Limiting)** — Simplest, no DB changes, improves security immediately
2. **CRIT-01 (Race Condition)** — Core business logic, affects order creation
3. **CRIT-02 (Webhook Dedup)** — Financial safeguard, depends on stable order creation
4. **CRIT-03 (JWT Rotation)** — Infrastructure, depends on auth working correctly

**Rationale:** Fix security & auth first (CRIT-04, CRIT-03), then core business logic (CRIT-01, CRIT-02).

---

## Verification Plan (Post-Implementation)

### Pre-Deployment Checklist

- [ ] All 4 fixes implemented and merged
- [ ] All unit tests pass (100% of test suite)
- [ ] All integration tests pass (including new concurrency tests)
- [ ] Load test: 50+ concurrent orders on same book → no oversells
- [ ] Load test: 100+ webhook events with 10% duplication → no double charges
- [ ] Security audit: key rotation procedure documented and tested
- [ ] Rate limit audit: verify all auth endpoints protected
- [ ] Code review: 2+ reviewers signed off on critical paths

### Post-Deployment Monitoring

- [ ] Monitor for IntegrityError on order creation (should be zero)
- [ ] Monitor for webhook dedup cache hit rate (expect <5%)
- [ ] Monitor for 429 responses on auth endpoints (expect <1%)
- [ ] Monitor for expired token errors (expect ~2% on old clients)

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Race condition still exists | Low | Critical | Load test with 50+ concurrent orders |
| Webhook dedup breaks idempotency | Low | High | Test replay 5x before merge |
| Key rotation breaks existing tokens | Low | High | Test deprecation window thoroughly |
| Rate limiting breaks all requests | Low | Critical | Test with curl before deploy |

---

## Documentation Needs

Post-implementation, create/update:

1. **Operational Runbook** (RUNBOOK.md)
   - How to rotate JWT secret
   - How to monitor webhook dedup cache
   - How to adjust rate limits per endpoint

2. **Deployment Guide** (DEPLOY.md)
   - Checklist before deploying Phase 1
   - Rollback procedure if issues detected

3. **Architecture Decision Record** (ADR-001-phase1-fixes.md)
   - Why each fix was chosen over alternatives
   - Trade-offs and constraints

---

## Related Documentation

- **ROADMAP.md** — 7-phase release plan
- **CONCERNS.md** — Issues #1-25 (critical issues covered by Phase 1)
- **ARCHITECTURE.md** — Three-layer backend design (relevant for error handling)
- **TESTING.md** — Test patterns and conventions
- **CLAUDE.md** — Project tech stack and known gotchas (bcrypt, JWT, async sessions, Stripe)

---

## Key Questions for Planning Session

1. **CRIT-01 (Race Condition):**
   - Is `SELECT ... FOR UPDATE` acceptable for potential serialization on high-traffic books?
   - Should we also implement optimistic locking as fallback?

2. **CRIT-02 (Webhook Dedup):**
   - Should dedup cache entries include order state for audit trail?
   - How long should dedup TTL be (24h, 7d, 30d)?

3. **CRIT-03 (JWT Rotation):**
   - Should old key versions be versioned in database for audit trail?
   - What's the deprecation window (30d, 60d)?

4. **CRIT-04 (Rate Limiting):**
   - Should rate limits be per-IP (current) or per-user (if authenticated)?
   - Should signup have different limits per email domain (to prevent bulk registration)?

5. **General:**
   - Which fix should we tackle first if doing sequentially?
   - Should Phase 1 include any documentation tasks (runbooks, ADRs)?

---

**Status:** ✓ Research Complete — Ready for Planning Session

*Last updated: 2026-04-18*
*Next step: `/gsd-plan-phase 1` (detailed execution plan)*
