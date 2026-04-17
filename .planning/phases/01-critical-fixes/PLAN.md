# Phase 1: Critical Fixes — Execution Plans

**Created:** 2026-04-18  
**Phase:** 1 of 7  
**Requirements:** CRIT-01, CRIT-02, CRIT-03, CRIT-04  
**Status:** Ready for Execution

---

## Overview

Phase 1 fixes 4 production-critical blockers through 4 independent task waves. Each wave contains tasks that can be parallelized; wave dependencies are sequential.

| Wave | Requirements | Goal | Parallel Tasks |
|------|--------------|------|-----------------|
| 1 | CRIT-04 | Fix rate limiting (auth endpoints) | 3 tasks (dependency, middleware, tests) |
| 2 | CRIT-01 | Fix race condition (order creation) | 2 tasks (repository, error handling) |
| 3 | CRIT-02 | Fix webhook deduplication (payments) | 2 tasks (dedup logic, webhook handler) |
| 4 | CRIT-03 | Fix JWT secret rotation (auth) | 2 tasks (key management, verification) |

**Total Tasks:** 9  
**Critical Path:** Sequential (waves 1→2→3→4)  
**Estimated Total Time:** 13–20 hours  

---

## Wave 1: Rate Limiting Validation (CRIT-04)

### Goal
Ensure rate limiting is actually enforced on auth endpoints (`/login`, `/signup`, `/reset-password`).

### Requirements Met
- CRIT-04: Validate rate limiting

### Success Criteria (Post-Wave)
- [ ] Rate limit dependency properly extracts `Request` from FastAPI dependencies
- [ ] All 3 auth endpoints have rate limit applied via dependency
- [ ] 429 response returned on rate limit with `Retry-After` header
- [ ] All 5+ integration tests pass (basic, concurrent, different IPs, after reset)

---

## Wave 1, Task 1: Create Rate Limit Dependency

**UUID:** `1-1-rate-limit-dependency`  
**Wave:** 1  
**Depends on:** None  
**Autonomous:** Yes

### Action

Create a new rate-limit dependency function in `backend/app/core/dependencies.py` that:

1. **Function signature:**
   ```python
   async def require_rate_limit(
       request: Request,
       endpoint_name: str,
       calls: int = 5,
       period: int = 900,
   ) -> Request:
       """
       Rate limit check using Redis. Returns request if not limited, raises HTTPException(429) if limited.
       """
   ```

2. **Implementation details:**
   - Use `request.client.host` as IP address key
   - Build Redis key: `rate_limit:{endpoint_name}:{ip_address}:{hour_bucket}`
   - Use `redis.incr()` with `EX={period}` TTL
   - If counter > `calls`, raise `HTTPException(429, detail="Too many requests. Try again in X seconds.")`
   - Include `Retry-After` header in exception with seconds remaining
   - Log each rate limit hit at INFO level with endpoint, IP, and remaining time

3. **Default rate limits (hard-coded as defaults):**
   - Login: 5 calls per 900 seconds (15 minutes)
   - Signup: 3 calls per 3600 seconds (1 hour)
   - Password reset: 3 calls per 3600 seconds (1 hour)

4. **Integration with Redis:**
   - Reuse existing Redis connection from `settings.REDIS_URL`
   - Use `aioredis` client pattern already in project
   - Handle Redis connection errors gracefully (log warning, don't block request)

### Read First

- `backend/app/core/dependencies.py` — See current dependency patterns, imports, how `Request` is used
- `backend/app/core/config.py` — Understand Redis URL configuration
- `backend/app/core/rate_limiter.py` — Understand existing rate limiter implementation, Redis client pattern
- `backend/app/api/v1/endpoints/auth.py` — See endpoint signatures to understand where to apply dependency

### Acceptance Criteria

- [ ] File `backend/app/core/dependencies.py` contains function `require_rate_limit(request, endpoint_name, calls=5, period=900)` with correct signature
- [ ] Function returns `Request` on success and raises `HTTPException(429)` on rate limit
- [ ] Function includes `Retry-After` header in 429 response
- [ ] Redis key format is `rate_limit:{endpoint_name}:{ip_address}:{hour_bucket}` (can grep for this pattern)
- [ ] Logging present at `logger.info()` for rate limit hits (search for `logger.info` and rate limit)
- [ ] Redis connection error handling present (search for `except` and Redis error handling)
- [ ] No hardcoded IP addresses or test data left in production code
- [ ] Function passes mypy type checking (no `Any` types in signature)

---

## Wave 1, Task 2: Apply Rate Limit to Auth Endpoints

**UUID:** `1-2-rate-limit-endpoints`  
**Wave:** 1  
**Depends on:** 1-1-rate-limit-dependency  
**Autonomous:** Yes

### Action

Apply the `require_rate_limit` dependency to the 3 auth endpoints in `backend/app/api/v1/endpoints/auth.py`:

1. **Endpoint: POST /login**
   - Add dependency: `require_rate_limit(request, "login", calls=5, period=900)`
   - Inline in endpoint signature: `rate_limit_check: Request = Depends(require_rate_limit("login", 5, 900))`

2. **Endpoint: POST /signup**
   - Add dependency: `require_rate_limit(request, "signup", calls=3, period=3600)`

3. **Endpoint: POST /reset-password (or similar password reset endpoint)**
   - Add dependency: `require_rate_limit(request, "password-reset", calls=3, period=3600)`

4. **Implementation pattern (copy-paste for all 3):**
   ```python
   @router.post("/login", response_model=TokenResponse)
   async def login(
       request: Request,  # Add this
       form_data: OAuth2PasswordRequestForm = Depends(),
       rate_limit_check: Request = Depends(lambda req: require_rate_limit(req, "login", 5, 900)),  # Add this
       db: AsyncSession = Depends(get_db),
   ) -> TokenResponse:
       """Login endpoint with rate limiting."""
       # Existing logic unchanged
   ```

5. **Verify endpoints:**
   - Search codebase for exact endpoint names and HTTP methods
   - Ensure no duplicate rate-limiting (remove old @rate_limit decorators if present)
   - Update endpoint docstrings to mention rate limiting

### Read First

- `backend/app/api/v1/endpoints/auth.py` — Current endpoint implementations
- `backend/app/core/dependencies.py` — See how other dependencies are applied
- `backend/app/main.py` — Understand exception handling for HTTPException(429)

### Acceptance Criteria

- [ ] File `backend/app/api/v1/endpoints/auth.py` has 3 endpoints with rate_limit dependency applied
- [ ] Login endpoint has `require_rate_limit(..., "login", 5, 900)` in Depends()
- [ ] Signup endpoint has `require_rate_limit(..., "signup", 3, 3600)` in Depends()
- [ ] Password reset endpoint has `require_rate_limit(..., "password-reset", 3, 3600)` in Depends()
- [ ] No old `@rate_limit` decorators remain on these endpoints
- [ ] All endpoints have `Request` parameter with correct type hint
- [ ] Endpoint docstrings updated to mention rate limiting
- [ ] Code passes mypy type checking

---

## Wave 1, Task 3: Add Rate Limit Integration Tests

**UUID:** `1-3-rate-limit-tests`  
**Wave:** 1  
**Depends on:** 1-2-rate-limit-endpoints  
**Autonomous:** Yes

### Action

Add comprehensive integration tests in `backend/tests/integration/test_rate_limiting.py` (new file):

1. **Test: Basic rate limit on login**
   - Send 6 requests to `/login` within 15 minutes
   - First 5 succeed, 6th returns 429
   - Response includes `Retry-After` header with seconds

2. **Test: Rate limit resets after period**
   - Send 5 requests to `/login` (hit limit)
   - Wait period + 1 second
   - Send 1 more request, verify succeeds (rate limit reset)

3. **Test: Concurrent requests from same IP**
   - Send 10 concurrent requests to `/login` from same client IP
   - Verify only 5 succeed, rest return 429
   - Verify rate limit counter accurate

4. **Test: Different IPs have independent limits**
   - Send 5 requests from IP A to `/login` (hit limit)
   - Send 1 request from IP B to `/login`, verify succeeds
   - Verify each IP has independent rate limit counter

5. **Test: Signup endpoint rate limit (3 per hour)**
   - Send 4 requests to `/signup` within 1 hour
   - First 3 succeed, 4th returns 429

6. **Test: Password reset endpoint rate limit (3 per hour)**
   - Send 4 requests to `/reset-password` within 1 hour
   - First 3 succeed, 4th returns 429

7. **Test Utilities:**
   - Helper function to make N requests in sequence to endpoint
   - Helper function to extract IP from request in test
   - Use `AsyncClient` with custom headers to simulate different IPs

8. **Test Configuration:**
   - Use `override_settings()` or fixture to set rate limit values for tests (e.g., 2 calls per 10 seconds)
   - Mock Redis if needed (use existing `mock_redis` fixture from conftest)
   - Use transaction rollback pattern for test isolation

### Read First

- `backend/tests/integration/` — Existing integration test structure
- `backend/tests/conftest.py` — Redis mocking setup and AsyncClient usage
- `backend/app/core/rate_limiter.py` — Understand Redis key format and TTL logic
- `backend/app/api/v1/endpoints/auth.py` — Exact endpoint URLs and HTTP methods

### Acceptance Criteria

- [ ] File `backend/tests/integration/test_rate_limiting.py` exists with 6+ test functions
- [ ] Test names follow pattern: `test_rate_limit_*` (grep finds all tests)
- [ ] Each test has clear arrange-act-assert structure
- [ ] Tests verify 429 status code on rate limit (search for `status_code == 429`)
- [ ] Tests verify `Retry-After` header present (search for `retry_after` or `Retry-After`)
- [ ] Tests verify independent IP rate limits (search for IP address mocking)
- [ ] All tests use `AsyncClient` from existing test infrastructure
- [ ] Tests pass locally: `pytest backend/tests/integration/test_rate_limiting.py -v`
- [ ] No hardcoded test data left in production code paths

---

## Wave 2: Order Quantity Race Condition Fix (CRIT-01)

### Goal
Prevent concurrent orders from overselling books using database-level locking.

### Requirements Met
- CRIT-01: Fix order quantity race condition

### Success Criteria (Post-Wave)
- [ ] `SELECT ... FOR UPDATE` applied to book fetch in order creation
- [ ] Concurrent order creation on same book never results in negative quantity
- [ ] User receives 409 Conflict (not database error) on insufficient stock
- [ ] Integration test with 5+ concurrent orders passes

---

## Wave 2, Task 1: Fix Race Condition in OrderRepository

**UUID:** `2-1-order-race-condition`  
**Wave:** 2  
**Depends on:** Wave 1 complete  
**Autonomous:** Yes

### Action

Modify `backend/app/repositories/order.py` `create_with_items()` method to use database-level locking:

1. **Current vulnerable code location:** Lines 62–157 (per RESEARCH.md)

2. **Change book fetch to use `with_for_update()`:**
   ```python
   # OLD (vulnerable):
   book_query = select(Book).where(
       Book.id == item.book_id,
       Book.deleted_at.is_(None),
   )
   
   # NEW (locked):
   book_query = select(Book).where(
       Book.id == item.book_id,
       Book.deleted_at.is_(None),
   ).with_for_update()  # Add this line
   ```

3. **Ensure transaction atomicity:**
   - All book fetches, validations, and quantity deductions happen within same transaction
   - Use `await self.db.flush()` to persist within transaction (not commit—caller owns commit)
   - Any constraint violation (e.g., quantity < 0) rolls back entire transaction

4. **Error handling:**
   - Keep existing validation: `if book.quantity < item.quantity: raise ValueError(...)`
   - Let CHECK constraint violation (quantity < 0) bubble up as `IntegrityError`
   - Don't catch IntegrityError here—let service layer catch it

5. **Logging:**
   - Add `logger.debug()` when `with_for_update()` acquired lock for book
   - Log book ID, item quantity, and available quantity

6. **Code structure:**
   - No other changes to method logic
   - Same error messages and validation rules
   - Same flush pattern (no commit)

### Read First

- `backend/app/repositories/order.py` — Entire `create_with_items()` method (lines 62–157)
- `backend/app/models/book.py` — `Book` model definition, `quantity` field, CHECK constraint
- `backend/app/models/order.py` — `Order` and `OrderItem` models
- `sqlalchemy.orm` documentation (check imports at top for `with_for_update` availability)

### Acceptance Criteria

- [ ] File `backend/app/repositories/order.py` line with book fetch contains `.with_for_update()`
- [ ] Grep finds `.with_for_update()` in `create_with_items()` method
- [ ] No other changes to transaction structure or flush calls
- [ ] `logger.debug()` call present when lock acquired (search for `logger.debug`)
- [ ] Existing validation `if book.quantity < item.quantity` still present
- [ ] Method signature and docstring unchanged
- [ ] Code passes Black formatting check
- [ ] Type hints unchanged (no `Any` types introduced)

---

## Wave 2, Task 2: Add Race Condition Error Handling

**UUID:** `2-2-race-condition-error-handling`  
**Wave:** 2  
**Depends on:** 2-1-order-race-condition  
**Autonomous:** Yes

### Action

Update error handling in 2 files to catch and properly map quantity constraint violations:

**File 1: `backend/app/services/order_service.py`**

1. **Catch `IntegrityError` in `create_order()` method:**
   - Import `from sqlalchemy.exc import IntegrityError`
   - Wrap `self.order_repo.create_with_items()` call in try-except
   - Pattern:
     ```python
     try:
         order = await self.order_repo.create_with_items(...)
     except IntegrityError as exc:
         # Check if it's quantity constraint violation
         if "quantity" in str(exc).lower() or "check" in str(exc).lower():
             raise InsufficientStockError("Out of stock for requested item") from exc
         raise  # Re-raise if different IntegrityError
     ```

2. **Error message strategy:**
   - Extract book title from order items if possible
   - Message: `"Out of stock for '{book_title}'"`
   - Or generic: `"Insufficient stock for one or more items. Please try again."`

3. **Logging:**
   - Log at WARNING level: "Order creation failed due to stock exhaustion"
   - Include order ID, buyer ID, and items in log context

**File 2: `backend/app/main.py` (exception handler map)**

1. **Add `InsufficientStockError` mapping (if not already present):**
   - Ensure `InsufficientStockError` maps to 409 Conflict
   - Pattern:
     ```python
     @app.exception_handler(InsufficientStockError)
     async def insufficient_stock_exception_handler(request: Request, exc: InsufficientStockError):
         return JSONResponse(
             status_code=status.HTTP_409_CONFLICT,
             content={"detail": exc.message or "Out of stock"},
         )
     ```

### Read First

- `backend/app/services/order_service.py` — `create_order()` method logic
- `backend/app/services/exceptions.py` — `InsufficientStockError` definition and other exceptions
- `backend/app/main.py` — Existing exception handler map and patterns
- `backend/app/schemas/order.py` — OrderCreate schema to understand items structure

### Acceptance Criteria

- [ ] File `backend/app/services/order_service.py` imports `IntegrityError` from sqlalchemy.exc
- [ ] Try-except block present around `create_with_items()` call (search for `except IntegrityError`)
- [ ] `IntegrityError` mapped to `InsufficientStockError` with meaningful message
- [ ] `backend/app/main.py` has exception handler for `InsufficientStockError` returning 409 status
- [ ] Logging present at WARNING level (search for `logger.warning`)
- [ ] No bare `except Exception` blocks
- [ ] Code passes Black formatting check
- [ ] Type hints correct (no `Any` introduced)

---

## Wave 3: Stripe Webhook Deduplication (CRIT-02)

### Goal
Ensure Stripe webhook events are processed idempotently (same event ID = same result).

### Requirements Met
- CRIT-02: Fix Stripe webhook deduplication

### Success Criteria (Post-Wave)
- [ ] Webhook event processed exactly once (deduplication via Redis)
- [ ] Duplicate webhook with same event_id returns cached result
- [ ] Order state unchanged on duplicate webhook
- [ ] Integration test with webhook replay passes

---

## Wave 3, Task 1: Implement Webhook Deduplication Logic

**UUID:** `3-1-webhook-dedup-logic`  
**Wave:** 3  
**Depends on:** Wave 2 complete  
**Autonomous:** Yes

### Action

Create new webhook deduplication helper in `backend/app/services/payment_service.py`:

1. **New method in `PaymentService` class:**
   ```python
   async def _check_webhook_dedup(self, event_id: str) -> Optional[dict]:
       """
       Check if webhook event already processed. Returns cached result or None.
       
       Args:
           event_id: Stripe event ID (e.g., 'evt_1ABC...')
           
       Returns:
           Cached event result if found, None if new event
       """
   ```

2. **Implementation details:**
   - Build Redis key: `webhook_event:{event_id}`
   - Use `redis.get(key)` to check if exists
   - If exists, return JSON.loads of cached value (the processed event data)
   - If not exists, return None
   - Handle Redis connection errors gracefully (log warning, continue without dedup)

3. **New method in `PaymentService` class:**
   ```python
   async def _cache_webhook_result(self, event_id: str, result: dict) -> None:
       """
       Cache webhook event result in Redis for deduplication.
       TTL = 24 hours (86400 seconds).
       """
   ```

4. **Implementation details:**
   - Use `redis.setex(key, 86400, json.dumps(result))`
   - Key format: `webhook_event:{event_id}`
   - TTL: 86400 seconds (24 hours)
   - Log at DEBUG level: "Cached webhook event for 24 hours"

5. **Redis client pattern:**
   - Reuse existing Redis connection from config/dependencies
   - Follow existing aioredis patterns in codebase
   - Handle connection errors with try-except (log warning, don't fail webhook)

6. **Logging strategy:**
   - Log at INFO level on webhook dedup hit: `"Webhook duplicate detected: event_id={event_id}"`
   - Log at DEBUG level on new webhook: `"Processing new webhook event: event_id={event_id}"`

### Read First

- `backend/app/services/payment_service.py` — `handle_webhook()` method and PaymentService structure
- `backend/app/core/rate_limiter.py` — Existing Redis usage pattern in project
- `backend/app/core/config.py` — Redis URL configuration
- `backend/app/services/exceptions.py` — Stripe-related exceptions

### Acceptance Criteria

- [ ] File `backend/app/services/payment_service.py` contains `_check_webhook_dedup(event_id)` method
- [ ] File contains `_cache_webhook_result(event_id, result)` method
- [ ] Both methods use Redis key format `webhook_event:{event_id}` (grep verifies)
- [ ] TTL set to 86400 seconds (24 hours) (grep finds `86400`)
- [ ] Redis connection error handling present (search for `except` and Redis errors)
- [ ] Logging at INFO and DEBUG levels present (search for `logger.info` and `logger.debug`)
- [ ] JSON serialization/deserialization used (search for `json.dumps` and `json.loads`)
- [ ] No hardcoded event IDs or test data in production code
- [ ] Methods are async and awaitable
- [ ] Type hints correct (no `Any` types)

---

## Wave 3, Task 2: Integrate Deduplication into Webhook Handler

**UUID:** `3-2-webhook-handler-integration`  
**Wave:** 3  
**Depends on:** 3-1-webhook-dedup-logic  
**Autonomous:** Yes

### Action

Modify `backend/app/services/payment_service.py` `handle_webhook()` method to use deduplication:

1. **Locate `handle_webhook()` method** (approximately line 173-231 per RESEARCH.md)

2. **Add deduplication check at start of method:**
   ```python
   async def handle_webhook(self, payload: bytes, stripe_signature: str) -> OrderResponse:
       """Handle Stripe webhook events with deduplication."""
       
       # Step 1: Parse and verify webhook signature
       stripe = _get_stripe()
       try:
           event = stripe.Webhook.construct_event(payload, stripe_signature, webhook_secret)
       except stripe.error.SignatureVerificationError as exc:
           raise StripeWebhookError(...) from exc
       
       event_id = event.get("id")  # Extract event ID
       
       # Step 2: Check if already processed (dedup)
       cached_result = await self._check_webhook_dedup(event_id)
       if cached_result:
           logger.info(f"Webhook duplicate detected: event_id={event_id}")
           return OrderResponse.model_validate(cached_result)
       
       # Step 3: Process event (existing logic)
       event_type = event.get("type")
       event_data = event.get("data", {}).get("object", {})
       
       if event_type == "checkout.session.completed":
           result = await self._handle_checkout_completed(event_data)
       elif event_type == "charge.refunded":
           result = await self._handle_charge_refunded(event_data)
       else:
           logger.warning(f"Unhandled webhook type: {event_type}")
           result = None
       
       # Step 4: Cache result
       if result:
           await self._cache_webhook_result(event_id, result.model_dump())
       
       return result
   ```

3. **Key changes:**
   - Extract `event_id` from Stripe event
   - Call `_check_webhook_dedup()` before processing
   - Return cached result if found
   - Cache result after processing
   - Log duplicate hits clearly

4. **Maintain backward compatibility:**
   - Same error handling and exception behavior
   - Same return type (OrderResponse)
   - Same endpoint signature (no changes to API)

5. **Logging clarity:**
   - INFO: "Webhook duplicate detected: event_id={event_id}"
   - DEBUG: "Processing new webhook event: event_id={event_id}"
   - INFO: "Cached webhook result: event_id={event_id}"

### Read First

- `backend/app/services/payment_service.py` — Full `handle_webhook()` method
- `backend/app/services/payment_service.py` — `_handle_checkout_completed()` and other event handlers
- `backend/app/schemas/order.py` — `OrderResponse` model for serialization
- `backend/app/models/order.py` — `Order` model for validation

### Acceptance Criteria

- [ ] File `backend/app/services/payment_service.py` `handle_webhook()` method extracts event_id from Stripe event
- [ ] Dedup check (`_check_webhook_dedup()`) called before processing (search for method call)
- [ ] Early return on cached result (search for `if cached_result:`)
- [ ] Result cached after processing (search for `_cache_webhook_result()`)
- [ ] Logging at INFO level for duplicates (search for `logger.info` and `duplicate`)
- [ ] Same error handling and exception types as before
- [ ] Return type still `OrderResponse` (check type hints)
- [ ] All existing event handlers (`_handle_checkout_completed`, etc.) unchanged
- [ ] Code passes Black formatting
- [ ] No hardcoded event IDs or test data

---

## Wave 4: JWT Secret Rotation (CRIT-03)

### Goal
Implement JWT secret key versioning and graceful deprecation window for rotation.

### Requirements Met
- CRIT-03: Implement JWT secret rotation

### Success Criteria (Post-Wave)
- [ ] Key versioning system with multiple active keys supported
- [ ] New key version can be activated
- [ ] Old key versions accepted within deprecation window (30 days)
- [ ] Old key versions rejected after TTL expires
- [ ] Integration test verifies key versioning lifecycle

---

## Wave 4, Task 1: Create Key Management System

**UUID:** `4-1-key-management`  
**Wave:** 4  
**Depends on:** Wave 3 complete  
**Autonomous:** Yes

### Action

Create new file `backend/app/core/keys.py` for JWT key versioning:

1. **File structure:**
   ```python
   """
   JWT Key Management with versioning and deprecation.
   
   Supports multiple key versions for gradual secret rotation.
   """
   
   import logging
   from typing import Optional
   from datetime import datetime, timedelta
   
   logger = logging.getLogger(__name__)
   
   # Key configuration (set via environment variables or hardcoded for now)
   ACTIVE_KEY_VERSION: int = 1  # Current version for signing new tokens
   
   KEYS: dict[int, str] = {
       1: "your-secret-key-version-1-min-32-chars-required-for-jwt",
       # 2: "your-secret-key-version-2-min-32-chars-required-for-jwt",  # Uncomment after rotation
   }
   
   # Deprecation window: old keys accepted for this many seconds (30 days = 2592000)
   DEPRECATED_KEY_TTL_SECONDS: int = 2592000  # 30 days
   
   # Track when each key was activated (for deprecation window calculation)
   KEY_ACTIVATION_TIMESTAMPS: dict[int, datetime] = {
       1: datetime.utcnow(),  # Key 1 activated now
       # 2: datetime.utcnow() - timedelta(days=1),  # Key 2 activated 1 day ago (example)
   }
   ```

2. **Key functions:**
   ```python
   def get_active_key() -> tuple[int, str]:
       """Get the currently active key for signing new tokens."""
       version = ACTIVE_KEY_VERSION
       secret = KEYS.get(version)
       if not secret:
           raise KeyError(f"Active key version {version} not found in KEYS dict")
       return version, secret
   
   def get_key_for_verification(key_version: int) -> Optional[str]:
       """Get key for verification. Returns key if active or within deprecation window."""
       if key_version not in KEYS:
           return None  # Key version not found
       
       activated_at = KEY_ACTIVATION_TIMESTAMPS.get(key_version)
       if not activated_at:
           return None  # No activation timestamp
       
       age_seconds = (datetime.utcnow() - activated_at).total_seconds()
       
       if key_version == ACTIVE_KEY_VERSION:
           # Current key always valid
           return KEYS[key_version]
       
       if age_seconds < DEPRECATED_KEY_TTL_SECONDS:
           # Deprecated key still within window
           logger.debug(f"Using deprecated key version {key_version} (age: {age_seconds}s)")
           return KEYS[key_version]
       
       # Key too old
       return None
   ```

3. **Integration points:**
   - Import in `backend/app/core/security.py`
   - Use `get_active_key()` when creating tokens (add `kid` claim)
   - Use `get_key_for_verification()` when verifying tokens (check `key_version` claim)

4. **Configuration strategy:**
   - For now, hardcode KEYS in file
   - Later, can load from environment: `ACTIVE_KEY_VERSION`, `JWT_KEYS_JSON`
   - Add comments explaining rotation procedure

5. **Logging:**
   - DEBUG: When using deprecated key (include age and TTL)
   - WARNING: When key version not found or expired
   - INFO: When new key activated (if you add rotation endpoint later)

### Read First

- `backend/app/core/security.py` — JWT token creation/verification logic
- `backend/app/core/config.py` — Configuration patterns used in project
- Backend CLAUDE.md — JWT patterns and `python-jose` usage
- `backend/app/models/user.py` — User model for token claims

### Acceptance Criteria

- [ ] File `backend/app/core/keys.py` created with key management functions
- [ ] `KEYS` dict with at least one key (version 1)
- [ ] `ACTIVE_KEY_VERSION` set to 1
- [ ] `DEPRECATED_KEY_TTL_SECONDS` set to 2592000 (30 days) (grep verifies)
- [ ] `KEY_ACTIVATION_TIMESTAMPS` dict tracks activation times
- [ ] Function `get_active_key()` returns `tuple[int, str]` (version, secret)
- [ ] Function `get_key_for_verification(key_version)` returns `Optional[str]`
- [ ] Logic checks if key is current or within deprecation window
- [ ] Logging at DEBUG and WARNING levels (search for `logger.debug` and `logger.warning`)
- [ ] No hardcoded sensitive data leaks in logs
- [ ] Type hints on all functions (no `Any`)
- [ ] Comments explain rotation procedure

---

## Wave 4, Task 2: Integrate Key Versioning into Token Operations

**UUID:** `4-2-token-key-versioning`  
**Wave:** 4  
**Depends on:** 4-1-key-management  
**Autonomous:** Yes

### Action

Modify `backend/app/core/security.py` to use key versioning in token creation and verification:

1. **Token Creation (add `kid` and `key_version` claims):**
   ```python
   def create_access_token(
       data: dict[str, Any],
       expires_delta: Optional[timedelta] = None,
   ) -> str:
       """Create JWT access token with key versioning."""
       from app.core.keys import get_active_key
       
       key_version, secret = get_active_key()
       
       to_encode = data.copy()
       to_encode.update({
           "type": "access",
           "key_version": key_version,  # Add this
           "exp": datetime.utcnow() + (expires_delta or timedelta(minutes=15)),
       })
       
       # Note: python-jose doesn't support 'kid' in header directly,
       # so we use 'key_version' in payload instead
       
       encoded_jwt = jose.JWTClaims(to_encode).serialize(secret, algorithm="HS256")
       return encoded_jwt
   ```

2. **Token Verification (check `key_version` claim):**
   ```python
   def verify_token(token: str, token_type: str = "access") -> dict[str, Any]:
       """Verify JWT token, checking both current and deprecated keys."""
       from app.core.keys import get_key_for_verification
       
       try:
           # First try with current key
           payload = jose.parse_unverified_claims(token)
           key_version = payload.get("key_version", 1)  # Default to version 1 for old tokens
           
           # Get the appropriate key
           secret = get_key_for_verification(key_version)
           if not secret:
               raise InvalidTokenError(f"Invalid or expired key version: {key_version}")
           
           # Verify with the correct key
           payload = jose.JWTClaims(token).verify(secret, algorithms=["HS256"])
           
           # Check token type
           if payload.get("type") != token_type:
               raise InvalidTokenError(f"Invalid token type. Expected {token_type}, got {payload.get('type')}")
           
           return payload
       except (JWTError, JWTClaimsError) as exc:
           raise InvalidTokenError("Invalid token") from exc
   ```

3. **Changes summary:**
   - Import from `app.core.keys`
   - Add `key_version` to token payload during creation
   - Check `key_version` during verification
   - Use `get_key_for_verification()` to get appropriate key
   - Raise `InvalidTokenError` if key version invalid/expired

4. **Backward compatibility:**
   - Old tokens without `key_version` default to version 1
   - Verify against current key first, then check deprecated keys
   - Same exception types and error messages

5. **Integration points:**
   - `create_access_token()` — Called by AuthService
   - `verify_token()` — Called by `get_current_user()` dependency
   - Used in login, token refresh, password reset flows

### Read First

- `backend/app/core/security.py` — Complete token creation/verification implementation
- `backend/app/core/dependencies.py` — `get_current_user()` function that calls `verify_token()`
- `backend/app/services/auth_service.py` — Where tokens are created
- Backend CLAUDE.md — JWT token patterns and `python-jose` library

### Acceptance Criteria

- [ ] File `backend/app/core/security.py` imports from `app.core.keys`
- [ ] `create_access_token()` adds `key_version` to token payload (search for `key_version`)
- [ ] `verify_token()` checks `key_version` from payload (search for `get_key_for_verification`)
- [ ] Logic defaults to key version 1 for old tokens (search for default value)
- [ ] `InvalidTokenError` raised if key version invalid (search for `InvalidTokenError`)
- [ ] Same error handling and exception types as before
- [ ] Type hints on all functions (no `Any`)
- [ ] Logging present for key version checks (optional DEBUG level)
- [ ] Code passes Black formatting
- [ ] All calls to `verify_token()` in dependencies unchanged

---

## Integration & Verification

### Post-Phase 1 Checklist

After all 4 waves complete, verify:

- [ ] **Wave 1:** Run `pytest backend/tests/integration/test_rate_limiting.py -v` — all tests pass
- [ ] **Wave 2:** Run concurrent order tests: `pytest backend/tests/integration/test_orders_api.py -k concurrent -v`
- [ ] **Wave 3:** Run webhook dedup test: `pytest backend/tests/integration/test_payments_api.py -k webhook -v`
- [ ] **Wave 4:** Run key rotation test: `pytest backend/tests/unit/test_security.py -k rotation -v`
- [ ] **All waves:** Run full test suite: `pytest backend/tests/ -v --cov=app --cov-report=term-missing`
- [ ] **Codebase:** No lint errors: `black --check backend/app/` && `isort --check backend/app/` && `flake8 backend/app/`
- [ ] **Security:** No hardcoded secrets in code (search for test keys/passwords)

### Deployment Considerations

- **CRIT-01 (Race Condition):** No database migration needed; code-only fix
- **CRIT-02 (Webhook Dedup):** No database changes; requires Redis; TTL cleanup automatic
- **CRIT-03 (JWT Rotation):** No database changes; `ACTIVE_KEY_VERSION` set in config; backward compatible
- **CRIT-04 (Rate Limiting):** No database changes; Redis required; automatically cleans up after TTL

### Must Haves for Phase 1 Success

1. **Race Condition:** Concurrent orders on same book never oversell
2. **Webhook Dedup:** Duplicate webhook events don't double-charge
3. **Rate Limiting:** Auth endpoints actually enforce limits (tested)
4. **JWT Rotation:** Multiple key versions accepted within deprecation window
5. **All tests pass:** 100% of test suite runs without errors
6. **Code quality:** No lint/format errors; mypy passes
7. **Documentation:** Each task has clear inline comments; commits reference requirement IDs

---

## Files Modified Summary

| File | Purpose | Wave | Task |
|------|---------|------|------|
| `backend/app/core/dependencies.py` | Add rate_limit dependency | 1 | 1 |
| `backend/app/api/v1/endpoints/auth.py` | Apply rate_limit to endpoints | 1 | 2 |
| `backend/tests/integration/test_rate_limiting.py` | NEW: Rate limit tests | 1 | 3 |
| `backend/app/repositories/order.py` | Add `with_for_update()` lock | 2 | 1 |
| `backend/app/services/order_service.py` | Catch IntegrityError | 2 | 2 |
| `backend/app/main.py` | Exception handler for 409 | 2 | 2 |
| `backend/app/services/payment_service.py` | Add dedup methods + webhook integration | 3 | 1+2 |
| `backend/app/core/keys.py` | NEW: Key management | 4 | 1 |
| `backend/app/core/security.py` | Token versioning integration | 4 | 2 |

---

## Dependencies & Ordering

```
Wave 1 (Rate Limiting)
├─ Task 1-1: Create dependency
├─ Task 1-2: Apply to endpoints (depends on 1-1)
└─ Task 1-3: Tests (depends on 1-2)

Wave 2 (Race Condition)
├─ Task 2-1: Fix repository
└─ Task 2-2: Error handling (depends on 2-1)

Wave 3 (Webhook Dedup)
├─ Task 3-1: Dedup logic
└─ Task 3-2: Webhook handler (depends on 3-1)

Wave 4 (JWT Rotation)
├─ Task 4-1: Key management
└─ Task 4-2: Token integration (depends on 4-1)

Execution: Waves sequential (1→2→3→4), but tasks within each wave can be parallel
```

---

## Status

- [ ] Wave 1 tasks assigned
- [ ] Wave 1 tasks completed
- [ ] Wave 2 tasks assigned
- [ ] Wave 2 tasks completed
- [ ] Wave 3 tasks assigned
- [ ] Wave 3 tasks completed
- [ ] Wave 4 tasks assigned
- [ ] Wave 4 tasks completed
- [ ] Integration testing complete
- [ ] All tests passing
- [ ] Phase 1 verification sign-off

---

*Plan created: 2026-04-18*  
*Ready for execution via `/gsd-execute-phase 1`*
