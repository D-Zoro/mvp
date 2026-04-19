---
wave: 0
depends_on:
  - "Phase 2 SUMMARY (service layer verified, 1 critical bug fixed)"
files_modified:
  - "backend/app/repositories/*.py"
  - "backend/app/core/database.py"
  - "backend/app/core/dependencies.py"
  - "backend/app/services/exceptions.py"
  - "backend/app/main.py"
  - "backend/tests/**/*.py"
autonomous: false
---

# Phase 3: Backend Foundations — Master Plan

**Phase:** 3 of 7  
**Status:** Planning complete, ready for execution  
**Requirements:** 13 (REPO-01 to REPO-05, ASYNC-01 to ASYNC-04, ERROR-01 to ERROR-04)  
**Duration:** 3 waves  
**Goal:** Audit repository layer, validate async patterns, ensure error handling consistency  

---

## Executive Summary

Phase 3 is the **foundation audit phase**. Phase 2 verified that the service layer correctly:
- ✅ Raises typed exceptions
- ✅ Calls `.commit()` at the right time
- ✅ Maps exceptions to HTTP status codes
- ✅ Fixes the Phase 1 critical issues (race condition, webhook dedup, JWT versioning, rate limiting)

**Phase 3 must validate what Phase 2 didn't touch:**
- ✅ Repository layer query patterns (soft delete filtering, pagination, N+1 queries)
- ✅ Async/await correctness throughout the stack
- ✅ Session lifecycle management (no leaks)
- ✅ Transaction boundaries for critical operations
- ✅ Connection pooling and concurrency handling
- ✅ Error response security (no information leaks)
- ✅ Edge case error handling

---

## Wave Structure & Dependencies

```
Wave 1: Repository Audit (REPO-01 to REPO-05)
├─ Task 1-1: UserRepository query audit
├─ Task 1-2: BookRepository query audit (critical: search_count fix from Phase 2)
├─ Task 1-3: OrderRepository query audit (critical: row-level locks)
├─ Task 1-4: PaymentRepository query audit
├─ Task 1-5: Cross-repo async/await validation
└─ Task 1-6: Repository test suite audit & gaps
    Duration: ~2-3 hours
    Runs in parallel with other work but feeds Wave 2
    Critical findings: soft delete filtering, pagination, locks

Wave 2: Async Patterns & Session Lifecycle (ASYNC-01 to ASYNC-04)
├─ Task 2-1: SQLAlchemy 2.0 async configuration (ASYNC-01)
├─ Task 2-2: Session lifecycle management (ASYNC-02)
├─ Task 2-3: Transaction boundaries (ASYNC-03)
├─ Task 2-4: Connection pooling & concurrency (ASYNC-04)
├─ Task 2-5: Async pattern automated checks
└─ Task 2-6: Async pattern test suite
    Duration: ~2 hours
    Can start after Wave 1 understanding, but depends on Wave 1 findings
    Critical: must verify no race conditions, proper commits/rollbacks

Wave 3: Error Handling Consistency (ERROR-01 to ERROR-04)
├─ Task 3-1: Typed exception validation (ERROR-01)
├─ Task 3-2: Error response security & no information leaks (ERROR-02)
├─ Task 3-3: HTTP status code mapping validation (ERROR-03)
├─ Task 3-4: Edge case error handling (ERROR-04)
├─ Task 3-5: Error response format & validation
└─ Task 3-6: Error handling integration tests
    Duration: ~1.5-2 hours
    Depends on Waves 1 & 2 understanding
    Critical: must ensure no security leaks, proper status codes
```

**Timeline:**
- Start all 3 waves in parallel (some independence, but ordered)
- Wave 1: 2-3 hours → unblocks Wave 2 findings
- Wave 2: 2 hours (overlaps with Wave 1) → unblocks Wave 3
- Wave 3: 1.5-2 hours (overlaps with Wave 2) → final validation
- **Total: 5-7 hours wall-clock time** (or ~5-6 hours if parallelized)

---

## What Each Wave Validates

### Wave 1: Repository Audit

**User Repository (REPO-01):**
- ✅ All queries use `select()` constructor (SQLAlchemy 2.0)
- ✅ All `.execute()` calls are `await`ed
- ✅ Soft delete filtering: `deleted_at.is_(None)` on all reads
- ✅ Password hashing via `hash_password()` from security
- ✅ `.flush()` used, not `.commit()`

**Book Repository (REPO-02) — CRITICAL:**
- ✅ `search_count()` uses SQL COUNT (not Python `len()` — Phase 2 bug fix)
- ✅ Soft delete filtering on all queries
- ✅ Pagination: `skip = (page - 1) * page_size`, `limit = page_size`
- ✅ Soft delete implementation: `delete()` sets `deleted_at`
- ✅ Stock deduction uses `.with_for_update()` row-level lock (Phase 1 integration)
- ✅ No orphaned books (FK constraint enforced)

**Order Repository (REPO-03) — CRITICAL:**
- ✅ `create_with_items()` atomic (all-or-nothing)
- ✅ Row-level locks with `.with_for_update()` (Phase 1 race condition integration)
- ✅ Stock check happens INSIDE lock
- ✅ `count_orders_for_seller()` method uses SQL COUNT (Phase 2 fix)
- ✅ Pagination with correct count method
- ✅ Relationship loading explicit (selectinload, no N+1)

**Payment Repository (REPO-04):**
- ✅ Payment state updates idempotent
- ✅ `stripe_payment_id` indexed/unique (fast lookup)
- ✅ No state regressions (PAID → PENDING not allowed)
- ✅ Webhook dedup via Redis (Phase 2 integration)

**Async/Await Validation (REPO-05):**
- ✅ All `.execute()` calls awaited
- ✅ All `.flush()` calls awaited
- ✅ AsyncSession used throughout (no sync Session)
- ✅ No blocking I/O in async functions
- ✅ No N+1 queries via lazy loading

### Wave 2: Async Patterns & Session Lifecycle

**SQLAlchemy 2.0 Configuration (ASYNC-01):**
- ✅ `DATABASE_URL` uses `postgresql+asyncpg://` (async driver)
- ✅ Engine: `create_async_engine()` (not `create_engine()`)
- ✅ Pool configuration: `pool_size=20`, `max_overflow=10`, `pool_pre_ping=True`
- ✅ Session factory: `async_sessionmaker` with `AsyncSession` class
- ✅ All queries use `select()` constructor
- ✅ Result extraction: `.scalar()`, `.scalar_one_or_none()` (not `.first()`)

**Session Lifecycle (ASYNC-02):**
- ✅ `get_db()` uses `async with async_session_maker() as session:`
- ✅ `finally` block ensures `await session.close()`
- ✅ Type: `AsyncGenerator[AsyncSession, None]`
- ✅ Endpoints receive `db: DBSession` from `Depends(get_db)`
- ✅ Services receive session in `__init__`, never create it
- ✅ Repositories never create sessions
- ✅ Services call `await self.db.commit()` after logic
- ✅ Repositories call `await self.db.flush()` (not commit)
- ✅ Exception handlers don't double-rollback

**Transaction Boundaries (ASYNC-03):**
- ✅ Order creation: all changes in single `await db.commit()`
- ✅ Payment updates: idempotent (safe to call multiple times)
- ✅ Exceptions propagate: no catch-and-hide
- ✅ Commit only on success: rollback automatic on error
- ✅ Locks acquired before stock checks
- ✅ Lock duration: minimal (released at commit)

**Connection Pooling (ASYNC-04):**
- ✅ Pool configuration reasonable for load
- ✅ Pre-ping enabled (catches stale connections)
- ✅ Pool recycling configured (prevents PostgreSQL timeout)
- ✅ Concurrent requests handled without exhaustion
- ✅ Stress test passes (50+ concurrent orders on limited stock)
- ✅ No connection leaks

### Wave 3: Error Handling Consistency

**Typed Exceptions (ERROR-01):**
- ✅ All 17 exceptions defined in `exceptions.py`
- ✅ All inherit from `ServiceError`
- ✅ All have descriptive docstrings
- ✅ All mapped in `_SERVICE_EXCEPTION_MAP` in `main.py`
- ✅ No bare `ValueError` or `RuntimeError` in service layer
- ✅ Phase 2 verification: 17 exceptions → 17 HTTP status codes

**No Information Leaks (ERROR-02):**
- ✅ Login: same error for email-not-found AND wrong-password (protected email enumeration)
- ✅ Password reset: silent success for non-existent emails
- ✅ Authorization: 403 for "not authorized", 404 for "doesn't exist"
- ✅ Error messages: generic, no SQL/paths/stack traces
- ✅ Exception handler catches all ServiceError
- ✅ Debug mode: error details never exposed to clients

**HTTP Status Codes (ERROR-03):**
- ✅ 200 OK: successful GET/PATCH
- ✅ 201 Created: POST endpoints
- ✅ 400 Bad Request: malformed input
- ✅ 401 Unauthorized: authentication failed
- ✅ 402 Payment Required: payment error
- ✅ 403 Forbidden: authorization failed
- ✅ 404 Not Found: resource doesn't exist
- ✅ 409 Conflict: state conflict (duplicate email, insufficient stock)
- ✅ 422 Unprocessable Entity: validation failed (invalid enum, missing field)
- ✅ 429 Too Many Requests: rate limited
- ✅ 500 Internal Server Error: unhandled bug
- ✅ 502 Bad Gateway: external API error (OAuth)
- ✅ 503 Service Unavailable: service not configured

**Edge Case Handling (ERROR-04):**
- ✅ Concurrent deletion: resource deleted during operation → 404
- ✅ Invalid state transition: PAID → CANCELLED → 422
- ✅ Refund non-PAID order → 402
- ✅ Invalid UUID in URL → 422
- ✅ Missing required field → 422 with field name
- ✅ Invalid enum value → 422
- ✅ Expired token → 401
- ✅ Wrong token type → 400
- ✅ Invalid signature → 401
- ✅ Page 0 (invalid) → 422
- ✅ Page beyond data → 200 with empty list
- ✅ per_page > 100 → 422 or capped
- ✅ Rate limit exceeded → 429 with Retry-After

---

## Critical Integration Points with Phase 1 & 2

### Phase 1 Critical Fixes (Already Verified in Phase 2)

**CRIT-01: Race Condition (Verified in OrderService)**
- Wave 1 validates: Repository `create_with_items()` uses `.with_for_update()` lock
- Wave 2 validates: Lock acquired before stock check, deduction inside transaction
- Must verify: No negative quantity possible even with 50+ concurrent orders

**CRIT-02: Webhook Deduplication (Verified in PaymentService)**
- Wave 1 validates: Repository idempotency for payment state updates
- Wave 2 validates: Webhook dedup via Redis + DB state both idempotent
- Must verify: Duplicate webhooks return cached result without reprocessing

**CRIT-03: JWT Secret Rotation (Already verified in Phase 2)**
- Wave 3 validates: Expired tokens return 401 correctly
- No additional work needed (Phase 2 did this)

**CRIT-04: Rate Limiting (Already verified in Phase 2)**
- Wave 3 validates: Rate limit errors return 429 with Retry-After
- No additional work needed (Phase 2 did this)

### Phase 2 Bug Fix (Seller Order Pagination)

**REPO-02 / SVCL-02 Bug Fix:**
- Phase 2 added: `count_orders_for_seller()` method to OrderRepository
- Phase 2 fixed: BookService.search() to use proper COUNT query
- Wave 1 validates: Both methods use SQL COUNT, not Python `len()`
- Wave 2 validates: Pagination correctness under concurrent load

---

## Success Criteria

### All 13 Requirements Met
- ✅ REPO-01: UserRepository audited
- ✅ REPO-02: BookRepository audited (Phase 2 bug fix verified)
- ✅ REPO-03: OrderRepository audited (Phase 1 lock integration verified)
- ✅ REPO-04: PaymentRepository audited (Phase 1 webhook dedup verified)
- ✅ REPO-05: Async/await validation complete
- ✅ ASYNC-01: SQLAlchemy 2.0 patterns correct
- ✅ ASYNC-02: Session lifecycle correct
- ✅ ASYNC-03: Transaction boundaries correct
- ✅ ASYNC-04: Connection pooling verified
- ✅ ERROR-01: 17 typed exceptions validated
- ✅ ERROR-02: No information leaks
- ✅ ERROR-03: 13 HTTP status codes correct
- ✅ ERROR-04: Edge cases handled

### Test Coverage
- ✅ Unit tests: 75%+ coverage
- ✅ DB tests: constraint validation (UNIQUE, FK, CHECK)
- ✅ Integration tests: error handling, concurrent load, edge cases
- ✅ No critical issues
- ✅ No breaking changes

### Must-Haves for Phase Goal Backward Verification
- ✅ **No overselling:** Phase 1 race condition verified in Wave 2
- ✅ **Pagination works:** Phase 2 bug fix verified in Wave 1
- ✅ **Soft deletes hidden:** Wave 1 verifies all queries filter `deleted_at`
- ✅ **No orphaned records:** Wave 1 verifies FK constraints
- ✅ **Async/await correct:** Wave 2 verifies all DB calls awaited
- ✅ **Error system secure:** Wave 3 verifies no leaks
- ✅ **Status codes correct:** Wave 3 verifies all 13 HTTP codes

---

## Known Risks & Mitigations

| Risk | Mitigation | Wave |
|------|-----------|------|
| Soft delete filtering missed | Grep validation: `deleted_at.is_(None)` on all selects | Wave 1 |
| N+1 queries via lazy loading | Manual code review + integration test perf checks | Wave 1/2 |
| Session leaks on exception | Test exception paths with finally block validation | Wave 2 |
| Race condition reintroduction | Concurrent stress test (50+ orders on 5 items) | Wave 2 |
| Information leak (email enum) | Integration test comparing error messages | Wave 3 |
| Wrong HTTP status code | Integration test for all 13 status codes | Wave 3 |
| Edge case crashes | Edge case test coverage (15+ cases) | Wave 3 |

---

## Execution Path

### Day 1: Planning Complete (This Document)
- ✅ Wave 1 plan: PLAN-WAVE-1.md (6 tasks)
- ✅ Wave 2 plan: PLAN-WAVE-2.md (6 tasks)
- ✅ Wave 3 plan: PLAN-WAVE-3.md (6 tasks)

### Day 2: Execute Wave 1 (Repository Audit)
```bash
# Run Wave 1 tasks 1-1 through 1-6
/gsd-execute-phase --wave 1 --plan PLAN-WAVE-1.md

# Expected output:
# ✅ All repositories audited
# ✅ Soft delete filtering validated
# ✅ Pagination calculations correct
# ✅ Row-level locks in place
# ✅ Async/await patterns identified
# ✅ Test suite gaps identified
```

### Day 2-3: Execute Wave 2 (Async Patterns) — Overlaps with Wave 1
```bash
# Run Wave 2 tasks 2-1 through 2-6
/gsd-execute-phase --wave 2 --plan PLAN-WAVE-2.md

# Expected output:
# ✅ Engine configured for async
# ✅ Session lifecycle validated
# ✅ Transaction boundaries correct
# ✅ Pool handles 50+ concurrent requests
# ✅ Stress tests pass
# ✅ No async/await antipatterns
```

### Day 3-4: Execute Wave 3 (Error Handling) — Overlaps with Wave 2
```bash
# Run Wave 3 tasks 3-1 through 3-6
/gsd-execute-phase --wave 3 --plan PLAN-WAVE-3.md

# Expected output:
# ✅ 17 exceptions validated
# ✅ No information leaks
# ✅ All HTTP status codes correct
# ✅ Edge cases handled
# ✅ Tests comprehensive
```

### Final: Quality Checks & Handoff to Phase 4
```bash
# Full test suite
pytest backend/tests/ -v --cov=app --cov-report=term-missing

# Code quality
black app tests
isort app tests
flake8 app
mypy app --strict

# Handoff
# Phase 3 COMPLETE → Ready for Phase 4: Frontend Components & API Integration
```

---

## How to Use These Plans

1. **Start here:** Read this master plan (PHASE-3-OVERVIEW.md)
2. **Then read:** PLAN-WAVE-1.md, PLAN-WAVE-2.md, PLAN-WAVE-3.md in order
3. **Execute:** Use `/gsd-execute-phase --wave 1` (then 2, then 3)
4. **Verify:** Each wave has acceptance criteria (grep commands, test runs)
5. **Record:** Use code_log/ to document changes and learnings

---

## Files Modified Across Phase 3

### Wave 1 (Repository Audit)
- `backend/app/repositories/user_repository.py` — verify patterns
- `backend/app/repositories/book_repository.py` — verify patterns
- `backend/app/repositories/order_repository.py` — verify patterns
- `backend/tests/unit/test_repositories.py` — extend test coverage
- `backend/tests/DB/test_repositories_db.py` — extend DB tests

### Wave 2 (Async Patterns)
- `backend/app/core/database.py` — verify configuration
- `backend/app/core/dependencies.py` — verify get_db lifecycle
- `backend/app/repositories/*.py` — verify async/await patterns
- `backend/tests/DB/test_session_lifecycle.py` — new tests
- `backend/tests/integration/test_async_patterns.py` — new tests

### Wave 3 (Error Handling)
- `backend/app/services/exceptions.py` — verify exception definitions
- `backend/app/main.py` — verify exception handler mapping
- `backend/tests/integration/test_error_handling.py` — new tests
- `backend/tests/integration/test_status_codes.py` — new tests

---

## Next Phase (Phase 4)

**Phase 4: Frontend Components & API Integration**
- Fix React components (rendering, state, props)
- Audit form validation and error display
- Ensure TypeScript strict mode
- Validate API client integration
- Test network error handling

**Dependencies:** Phase 3 must be 100% complete before Phase 4 starts

---

**Phase 3 Master Plan Status:** ✅ COMPLETE & READY FOR EXECUTION

Created: 2026-04-18  
Author: /gsd-plan-phase 3  
Next: Execute Wave 1 with `/gsd-execute-phase --wave 1`
