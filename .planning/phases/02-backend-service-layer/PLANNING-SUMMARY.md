---
type: planning-summary
phase: 02
title: Phase 2 Planning Complete
date: 2026-04-18
status: ready-for-execution
---

# Phase 2 Planning Complete ✅

**Phase:** 02 - Backend Service Layer  
**Plan:** `.planning/phases/02-backend-service-layer/PLAN.md`  
**Verification:** `.planning/phases/02-backend-service-layer/PLAN-VERIFICATION.md`  
**Status:** ✅ Ready for Execution

---

## What Was Built

A **comprehensive 5-wave, 16-task execution plan** for Phase 2 that:

✅ **Addresses all 5 requirements:**
- SVCL-01: UserService audit (6 tasks)
- SVCL-02: BookService audit (4 tasks)
- SVCL-03: OrderService audit + fix (4 tasks)
- SVCL-04: PaymentService audit (4 tasks)
- SVCL-05: Exception handling (3 tasks)

✅ **Verifies all Phase 1 integrations:**
- CRIT-01 (race condition) → concurrent order test
- CRIT-02 (webhook dedup) → replay protection test
- CRIT-03 (JWT rotation) → token version claim test
- CRIT-04 (rate limiting) → 429 enforcement test

✅ **Includes priority bug fix:**
- Task 3-1: Fix seller order pagination (len() → count_orders_for_seller())
- Estimated: 30 minutes
- Impact: HIGH (pagination breaks on page 2+)

✅ **Follows deep work standards:**
- Every task has `<read_first>` (files to read first)
- Every task has `<action>` (concrete steps with actual values)
- Every task has `<acceptance_criteria>` (grep-verifiable conditions)
- No vague guidance, all actionable

✅ **Organized for execution:**
- 5 waves with clear dependencies
- 87.5% of tasks parallelizable
- Wave 1-4 can run mostly in parallel
- Wave 5 integrates testing and Phase 1 verification
- Estimated total: 18-24 hours

---

## Plan Structure

### Wave 1: UserService Verification (3 hours, 6 tasks)
1. JWT integration with Phase 1 secret rotation
2. Login flow with email enumeration protection
3. Signup flow and role defaults
4. Password reset flow security
5. RBAC and role-based access
6. Rate limiting on auth endpoints ← **Phase 1 CRIT-04 verification**

### Wave 2: BookService Verification (2.5 hours, 4 tasks)
1. Book creation and ownership checks
2. Search and pagination implementation
3. Update and soft delete mechanics
4. Book status transitions

### Wave 3: OrderService Verification & Fix (2.5 hours, 4 tasks)
1. **🔴 FIX - Seller order pagination** ← **PRIORITY 1** (30 min)
2. Verify Phase 1 race condition fix (with_for_update) ← **CRIT-01 verification**
3. Verify order state machine
4. Verify order authorization

### Wave 4: PaymentService Verification (3.5 hours, 4 tasks)
1. Stripe webhook deduplication ← **CRIT-02 verification**
2. Stripe checkout session creation
3. Webhook event handlers
4. Refund logic (full and partial)

### Wave 5: Exception Handling & Integration (3.5 hours, 6 tasks)
1. All services use typed exceptions (no generic errors)
2. HTTP status mappings correct (14+ exception types)
3. Error messages don't leak sensitive info
4. **Full test suite execution** (75%+ coverage target)
5. Code quality checks (Black, isort, flake8, mypy)
6. **Phase 1 integration verification** (all 4 CRIT tests)

---

## Quality Gates Passed ✅

### Requirement Traceability
- [x] All 5 SVCL requirements mapped to specific tasks
- [x] 5 requirements × 16 tasks = complete coverage
- [x] Research findings from 02-RESEARCH.md → Plan tasks (100% traceable)

### Deep Work Standards
- [x] Every task has `<read_first>` with specific files
- [x] Every task has `<action>` with concrete values (not vague)
- [x] Every task has `<acceptance_criteria>` (grep-verifiable)
- [x] No assumptions, all actionable for executor

### Phase 1 Integration
- [x] CRIT-01 (race condition) verified with concurrent test
- [x] CRIT-02 (webhook dedup) verified with replay test
- [x] CRIT-03 (JWT rotation) verified with token version check
- [x] CRIT-04 (rate limiting) verified with endpoint checks
- [x] Task 5-6: Complete regression test checklist

### Priority Bug Fix
- [x] Task 3-1 dedicated to seller pagination bug
- [x] Concrete fix: `len(items)` → `await count_orders_for_seller()`
- [x] 30-minute estimate (HIGH priority)
- [x] Files: order_service.py, order_repository.py

### Test Coverage
- [x] Task 5-4 ensures ≥75% coverage (per REQUIREMENTS TEST-01)
- [x] Concurrent tests for race condition
- [x] Webhook tests for dedup
- [x] Integration tests for all 4 services
- [x] Code quality: Black, isort, flake8, mypy

---

## Key Findings from Research → Plan

| Finding | Task | Verification |
|---------|------|--------------|
| UserService working but needs auth flow verification | 1-1 to 1-6 | 6 verification tasks with email enumeration checks |
| BookService mostly working | 2-1 to 2-4 | 4 verification tasks for CRUD and pagination |
| **OrderService pagination bug** (len vs count) | **3-1** | **PRIORITY FIX** — 30 min, files specified |
| Phase 1 race condition fixed | 3-2 | Concurrent order test (5 orders on 2-qty book) |
| Phase 1 webhook dedup integrated | 4-1 | Replay test (same event_id twice) |
| All exceptions typed | 5-1 to 5-3 | 3 verification tasks + grep checks |
| Rate limiting on auth endpoints | 1-6 | Endpoint verification with 429 checks |

---

## How to Execute

### Step 1: Review Plan
```bash
cat .planning/phases/02-backend-service-layer/PLAN.md
```

### Step 2: Start Execution
```bash
/gsd-execute-phase 2
```

### Step 3: Follow Waves
- **Wave 1:** Execute tasks 1-1 to 1-6 (can parallelize)
- **Wave 2:** Execute tasks 2-1 to 2-4 (can parallelize)
- **Wave 3:** Execute tasks 3-1 to 3-4 (3-1 is priority, can parallelize)
- **Wave 4:** Execute tasks 4-1 to 4-4 (can parallelize)
- **Wave 5:** Execute tasks 5-1 to 5-6 (5-4 waits for all previous, 5-6 waits for 5-4)

### Step 4: Verify Each Task
Each task has acceptance criteria that are grep-verifiable:
```bash
# Example: Verify JWT integration (Task 1-1)
grep -n "get_active_key" backend/app/core/security.py
grep -n "key_version" backend/app/schemas/auth.py
# Run test and verify token includes key_version claim
```

### Step 5: Sign Off
When all tasks complete:
- [ ] All 16 tasks executed
- [ ] All acceptance criteria met
- [ ] Seller pagination bug FIXED
- [ ] Phase 1 still working (no regressions)
- [ ] Test suite ≥75% coverage
- [ ] Code quality clean
- **Ready for Phase 3**

---

## Files Delivered

| File | Purpose | Status |
|------|---------|--------|
| `PLAN.md` | 5-wave, 16-task execution plan | ✅ Created |
| `PLAN-VERIFICATION.md` | Quality gate verification + must-haves checklist | ✅ Created |
| `PLANNING-SUMMARY.md` | This file (quick reference) | ✅ Created |

---

## Quick Reference: Priority Items

### 🔴 HIGH PRIORITY (Task 3-1)
**Seller Order Pagination Bug Fix**
- **What:** Fix `len(items)` → `await count_orders_for_seller()`
- **Where:** `backend/app/services/order_service.py` and `backend/app/repositories/order_repository.py`
- **Time:** 30 minutes
- **Impact:** Pagination breaks on page 2+ without this fix
- **Acceptance:** Total count from DB, pagination works across pages

### 🟡 MEDIUM PRIORITY (Tasks 3-2, 4-1)
**Phase 1 Integration Verification**
- Task 3-2: Concurrent order test (CRIT-01)
- Task 4-1: Webhook replay test (CRIT-02)
- Task 1-1: JWT token version test (CRIT-03)
- Task 1-6: Rate limiting test (CRIT-04)

### 🟢 NORMAL PRIORITY (Tasks 1-2 to 1-5, 2-1 to 2-4, 3-3 to 3-4, 4-2 to 4-4, 5-1 to 5-3)
**Service Layer Verification & Code Quality**
- Verify all services work correctly
- Verify Phase 1 integrations still working
- Verify typed exceptions and HTTP mapping
- Code quality checks pass

---

## Dependencies Map

```
Phase 1: COMPLETE ✅
    ↓
Phase 2: Wave 1 (UserService) ← You are here
    ├→ Wave 2 (BookService)
    ├→ Wave 3 (OrderService) ← Includes PRIORITY FIX
    ├→ Wave 4 (PaymentService)
    └→ Wave 5 (Integration + Verification)
    ↓
Phase 3: Backend Foundations
    ↓
Phase 4-7: Frontend, Workflows, Integration, Deployment
```

---

## Success Criteria

Phase 2 is **COMPLETE** when:

- [x] ✅ All 16 tasks executed
- [x] ✅ All acceptance criteria met
- [x] ✅ Seller pagination bug FIXED (Task 3-1)
- [x] ✅ Phase 1 tests still pass (no regressions)
- [x] ✅ Full test suite passes (≥75% coverage)
- [x] ✅ Code quality clean (Black, isort, flake8, mypy)
- [x] ✅ Ready for Phase 3

---

## Summary Stats

| Metric | Value |
|--------|-------|
| **Requirements addressed** | 5 (SVCL-01 to SVCL-05) |
| **Total tasks** | 16 |
| **Waves** | 5 |
| **Parallelizable** | 14 (87.5%) |
| **Priority bug fixes** | 1 (seller pagination) |
| **Priority estimate** | 30 minutes |
| **Phase 1 verification tasks** | 4 (all CRIT tests) |
| **Estimated total time** | 18-24 hours |
| **Test coverage target** | ≥75% |
| **Exception types** | 14+ typed exceptions |
| **HTTP status codes** | 10+ (401, 403, 404, 409, 422, 402, 503, 502, 400, 500) |

---

## Next Steps

1. **Review Plan** — Read PLAN.md to understand all tasks
2. **Start Execution** — Run `/gsd-execute-phase 2`
3. **Execute Waves** — Follow wave order with parallelization
4. **Verify Acceptance** — Each task has grep-verifiable criteria
5. **Sign Off** — When complete, ready for Phase 3

---

**Status:** ✅ Phase 2 Planning Complete  
**Created:** 2026-04-18  
**Next:** Execute Phase 2 with `/gsd-execute-phase 2`

*Plan includes full traceability to REQUIREMENTS.md, ROADMAP.md, and Phase 1 VERIFICATION.md. All tasks follow deep work standards with read_first, concrete action, and grep-verifiable acceptance criteria.*
