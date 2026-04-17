# Phase 1 Wave Manifest

**Created:** 2026-04-18  
**Purpose:** Quick reference for executor agents; one wave manifest per sheet

---

## Wave 1: Rate Limiting Validation (CRIT-04)

**Goal:** Ensure rate limiting actually enforced on auth endpoints

**Tasks:** 3  
**Dependencies:** None (can start immediately)  
**Estimated Time:** 4-6 hours  

### Task 1-1: Create Rate Limit Dependency
- **UUID:** `1-1-rate-limit-dependency`
- **File:** `backend/app/core/dependencies.py`
- **Changes:** Add function `require_rate_limit(request, endpoint_name, calls=5, period=900)`
- **Key Pattern:** Redis key `rate_limit:{endpoint}:{ip}:{bucket}`, TTL per period
- **Acceptance:** 8 criteria (function signature, Redis pattern, 429 response, Retry-After header, logging, error handling, no test data, mypy passes)

### Task 1-2: Apply to Auth Endpoints
- **UUID:** `1-2-rate-limit-endpoints`
- **File:** `backend/app/api/v1/endpoints/auth.py`
- **Changes:** Add `require_rate_limit` dependency to `/login`, `/signup`, `/reset-password`
- **Key Pattern:** `Depends(lambda req: require_rate_limit(req, "endpoint_name", calls, period))`
- **Acceptance:** 8 criteria (3 endpoints protected, correct calls/periods, Request parameter, docstrings, mypy)

### Task 1-3: Add Integration Tests
- **UUID:** `1-3-rate-limit-tests`
- **File:** `backend/tests/integration/test_rate_limiting.py` (NEW)
- **Changes:** 6+ test cases covering basic limit, reset, concurrent, different IPs, signup limit, password reset limit
- **Key Pattern:** AsyncClient, test with N+1 requests, verify 429 on limit, check Retry-After header
- **Acceptance:** 8 criteria (6+ tests exist, all use grep-verifiable patterns, all pass locally)

**Wave 1 Done When:** All 3 tasks committed, `pytest backend/tests/integration/test_rate_limiting.py -v` passes

---

## Wave 2: Order Quantity Race Condition (CRIT-01)

**Goal:** Prevent concurrent orders from overselling books

**Tasks:** 2  
**Dependencies:** Wave 1 (logically—no hard code dependency, but rate limiting helps auth security)  
**Estimated Time:** 4-6 hours  

### Task 2-1: Fix Race Condition in Repository
- **UUID:** `2-1-order-race-condition`
- **File:** `backend/app/repositories/order.py`
- **Changes:** Add `.with_for_update()` to book fetch in `create_with_items()` method
- **Key Pattern:** `select(Book).where(...).with_for_update()`
- **Acceptance:** 8 criteria (with_for_update present, logger.debug call, validation still present, no other changes, Black passes, mypy passes)

### Task 2-2: Add Error Handling for Constraints
- **UUID:** `2-2-race-condition-error-handling`
- **Files:** `backend/app/services/order_service.py`, `backend/app/main.py`
- **Changes:** 
  - OrderService: Catch `IntegrityError`, map to `InsufficientStockError`
  - main.py: Add exception handler for `InsufficientStockError` → 409 Conflict
- **Key Pattern:** `except IntegrityError as exc: raise InsufficientStockError(...) from exc`
- **Acceptance:** 8 criteria (IntegrityError import, try-except block present, InsufficientStockError handler in main.py, 409 status returned, logging, no bare exceptions)

**Wave 2 Done When:** Both tasks committed, concurrent order tests pass (5+ concurrent orders on same book)

---

## Wave 3: Stripe Webhook Deduplication (CRIT-02)

**Goal:** Ensure webhook events processed idempotently

**Tasks:** 2  
**Dependencies:** Wave 2 (order creation must be solid first)  
**Estimated Time:** 2.5-3.5 hours  

### Task 3-1: Implement Deduplication Logic
- **UUID:** `3-1-webhook-dedup-logic`
- **File:** `backend/app/services/payment_service.py`
- **Changes:** Add 2 methods: `_check_webhook_dedup(event_id)` and `_cache_webhook_result(event_id, result)`
- **Key Pattern:** Redis `webhook_event:{event_id}` key, TTL=86400 (24 hours)
- **Acceptance:** 8 criteria (both methods present, Redis key format, TTL=86400, JSON serialization, error handling, logging, no test data, async/awaitable)

### Task 3-2: Integrate into Webhook Handler
- **UUID:** `3-2-webhook-handler-integration`
- **File:** `backend/app/services/payment_service.py`
- **Changes:** Modify `handle_webhook()` to call dedup methods, return cached result on duplicate
- **Key Pattern:** Extract event_id, check dedup before processing, cache after processing
- **Acceptance:** 8 criteria (event_id extracted, dedup check before processing, cached result returned, cache after processing, logging for duplicates, same error handling, return type unchanged)

**Wave 3 Done When:** Both tasks committed, webhook replay test passes (send same event 2x, verify idempotent)

---

## Wave 4: JWT Secret Rotation (CRIT-03)

**Goal:** Enable JWT secret key rotation with graceful deprecation

**Tasks:** 2  
**Dependencies:** Wave 3 (auth can work while payments are being fixed)  
**Estimated Time:** 4-6 hours  

### Task 4-1: Create Key Management System
- **UUID:** `4-1-key-management`
- **File:** `backend/app/core/keys.py` (NEW)
- **Changes:** Create key versioning module with configuration and verification functions
- **Key Pattern:** `KEYS: dict[int, str]`, `ACTIVE_KEY_VERSION: int`, `DEPRECATED_KEY_TTL_SECONDS=2592000`, functions `get_active_key()` and `get_key_for_verification()`
- **Acceptance:** 8 criteria (file exists, KEYS dict with version 1, ACTIVE_KEY_VERSION=1, TTL=2592000, both functions present, deprecation logic correct, logging, no hardcoded secrets)

### Task 4-2: Integrate into Token Operations
- **UUID:** `4-2-token-key-versioning`
- **File:** `backend/app/core/security.py`
- **Changes:** Modify `create_access_token()` to add `key_version` claim; modify `verify_token()` to check `key_version` and use correct key
- **Key Pattern:** Import from keys.py, add `key_version` to payload, check on verify, use `get_key_for_verification()`
- **Acceptance:** 8 criteria (keys.py imported, key_version in payload, verification logic checks key_version, backward compatible, logging present, same error types, type hints correct)

**Wave 4 Done When:** Both tasks committed, token rotation test passes (old tokens accepted for 30 days, then rejected)

---

## Execution Timeline

```
Start → [Wave 1: ~6h] → [Wave 2: ~6h] → [Wave 3: ~3.5h] → [Wave 4: ~6h] → Verification & Testing → Done

Total: 13-20 hours
Parallelization: Minimal (each wave depends on previous)
```

---

## Test Commands Reference

After each wave, run these:

**Wave 1 Complete:**
```bash
pytest backend/tests/integration/test_rate_limiting.py -v
```

**Wave 2 Complete:**
```bash
pytest backend/tests/integration/test_orders_api.py -k concurrent -v
pytest backend/tests/DB/test_orders.py -v  # If exists
```

**Wave 3 Complete:**
```bash
pytest backend/tests/integration/test_payments_api.py -k webhook -v
```

**Wave 4 Complete:**
```bash
pytest backend/tests/unit/test_security.py -k rotation -v
```

**All Waves Complete:**
```bash
pytest backend/tests/ -v --cov=app --cov-report=term-missing
black --check backend/app/
isort --check backend/app/
flake8 backend/app/
mypy backend/app/
```

---

## Critical Reminders

- ⚠️ **Task 2-1:** Do NOT commit without testing with 5+ concurrent orders
- ⚠️ **Task 3-1:** Redis connection errors should be handled gracefully (log warning, don't fail)
- ⚠️ **Task 4-1:** DEPRECATED_KEY_TTL_SECONDS must be 2592000 (exactly 30 days in seconds)
- ⚠️ **All tasks:** No hardcoded test data in production code
- ⚠️ **All tasks:** Every change must pass `black`, `isort`, `flake8`, `mypy`

---

## Commits Expected

```
[Phase 1, Task 1-1] Implement rate limit dependency in core/dependencies.py
[Phase 1, Task 1-2] Apply rate limiting to auth endpoints (login, signup, reset-password)
[Phase 1, Task 1-3] Add integration tests for rate limiting (6 test cases)
[Phase 1, Task 2-1] Fix order race condition with SELECT FOR UPDATE in repository
[Phase 1, Task 2-2] Add IntegrityError handling for insufficient stock (409 Conflict)
[Phase 1, Task 3-1] Implement webhook deduplication logic (Redis cache + methods)
[Phase 1, Task 3-2] Integrate webhook dedup into Stripe webhook handler
[Phase 1, Task 4-1] Create JWT key versioning system (core/keys.py)
[Phase 1, Task 4-2] Integrate key versioning into token creation/verification
```

9 commits total (1 per task)

---

## Success Criteria (Phase-Level)

- [ ] All 9 tasks committed
- [ ] All 9 commits pass pre-commit hooks
- [ ] `pytest backend/tests/ -v` passes (100% test suite)
- [ ] Code quality: Black, isort, flake8, mypy all pass
- [ ] Concurrency test: 50+ concurrent orders on same book → no oversells
- [ ] Webhook test: Duplicate events handled idempotently
- [ ] Rate limit test: 429 on 6th login attempt within 15 min
- [ ] Key rotation test: Old tokens accepted for 30 days

---

*Manifest created: 2026-04-18*  
*Reference guide for Phase 1 execution*  
*9 tasks across 4 waves*
