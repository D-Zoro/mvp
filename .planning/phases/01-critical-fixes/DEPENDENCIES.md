# Phase 1 Task Dependency Diagram

**Created:** 2026-04-18  
**Purpose:** Visual reference for task sequencing and parallelization opportunities

---

## Overall Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PHASE 1: CRITICAL FIXES                        │
│                     (4 Requirements, 4 Waves, 9 Tasks)               │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
                 CRIT-04       CRIT-01       CRIT-02       CRIT-03
              (Rate Limit)  (Race Cond.)  (Webhook)    (JWT Rotate)
                    │             │             │             │
                 Wave 1        Wave 2        Wave 3        Wave 4
                    │             │             │             │
                    ▼             ▼             ▼             ▼
              [3 tasks]      [2 tasks]     [2 tasks]     [2 tasks]
```

---

## Detailed Wave Flow

### Wave 1: Rate Limiting (CRIT-04)

```
┌──────────────────────────────────────────────┐
│ WAVE 1: Rate Limiting (4-6 hours)            │
├──────────────────────────────────────────────┤
│                                              │
│ Task 1-1: Create Dependency                  │
│   dependencies.py                            │
│   + require_rate_limit() function            │
│   │                                          │
│   ▼                                          │
│ Task 1-2: Apply to Endpoints                 │
│   auth.py                                    │
│   + Add dependency to /login, /signup, etc   │
│   │                                          │
│   ▼                                          │
│ Task 1-3: Add Tests                          │
│   test_rate_limiting.py (NEW)                │
│   + 6+ test cases                            │
│                                              │
│ Result: Rate limiting enforced               │
│ Status: ✓ Ready to proceed to Wave 2         │
└──────────────────────────────────────────────┘
```

**Sequential:** 1-1 → 1-2 → 1-3 (hard dependencies)

---

### Wave 2: Race Condition Fix (CRIT-01)

```
┌──────────────────────────────────────────────┐
│ WAVE 2: Race Condition (4-6 hours)           │
├──────────────────────────────────────────────┤
│                                              │
│ Task 2-1: Add Database Lock                  │
│   order.py repository                        │
│   + .with_for_update() on book fetch         │
│   │                                          │
│   ▼                                          │
│ Task 2-2: Error Handling                     │
│   order_service.py + main.py                 │
│   + Catch IntegrityError → 409 Conflict      │
│                                              │
│ Result: No overselling on concurrent orders  │
│ Status: ✓ Ready to proceed to Wave 3         │
└──────────────────────────────────────────────┘
```

**Sequential:** 2-1 → 2-2 (hard dependency)

---

### Wave 3: Webhook Deduplication (CRIT-02)

```
┌──────────────────────────────────────────────┐
│ WAVE 3: Webhook Dedup (2.5-3.5 hours)        │
├──────────────────────────────────────────────┤
│                                              │
│ Task 3-1: Dedup Methods                      │
│   payment_service.py                         │
│   + _check_webhook_dedup() method            │
│   + _cache_webhook_result() method           │
│   │                                          │
│   ▼                                          │
│ Task 3-2: Webhook Integration                │
│   payment_service.py                         │
│   + Integrate dedup into handle_webhook()    │
│                                              │
│ Result: Idempotent webhook handling          │
│ Status: ✓ Ready to proceed to Wave 4         │
└──────────────────────────────────────────────┘
```

**Sequential:** 3-1 → 3-2 (hard dependency)

---

### Wave 4: JWT Secret Rotation (CRIT-03)

```
┌──────────────────────────────────────────────┐
│ WAVE 4: JWT Rotation (4-6 hours)             │
├──────────────────────────────────────────────┤
│                                              │
│ Task 4-1: Key Management System              │
│   keys.py (NEW)                              │
│   + KEYS dict, versions, TTL config          │
│   + get_active_key() function                │
│   + get_key_for_verification() function      │
│   │                                          │
│   ▼                                          │
│ Task 4-2: Token Integration                  │
│   security.py                                │
│   + Add key_version to payload               │
│   + Check key_version on verify              │
│                                              │
│ Result: Multi-version JWT support            │
│ Status: ✓ Phase 1 complete                   │
└──────────────────────────────────────────────┘
```

**Sequential:** 4-1 → 4-2 (hard dependency)

---

## Cross-Wave Dependencies

```
Wave 1 (Rate Limit)
│
├─ No hard code dependency on Waves 2, 3, 4
├─ Logical order: Auth security first
│
▼
Wave 2 (Race Condition)
│
├─ No hard code dependency on Waves 3, 4
├─ Logical: Core business logic must be solid
│
▼
Wave 3 (Webhook Dedup)
│
├─ No hard code dependency on Wave 4
├─ Logical: Payments before auth rotation
│
▼
Wave 4 (JWT Rotation)
│
└─ All previous waves must complete
```

**Waves MUST execute sequentially (1 → 2 → 3 → 4)**

---

## Parallelization Opportunities

### Within Waves

**Wave 1:**
- Task 1-1 (dependency creation) and Task 1-2 (endpoint application) are sequential
- No parallelization possible (1-1 creates function, 1-2 uses it)

**Wave 2:**
- Task 2-1 (repository fix) and Task 2-2 (error handling) are sequential
- No parallelization possible (2-1 must complete before 2-2 can be tested)

**Wave 3:**
- Task 3-1 (dedup logic) and Task 3-2 (webhook integration) are sequential
- No parallelization possible (3-1 creates methods, 3-2 calls them)

**Wave 4:**
- Task 4-1 (key management) and Task 4-2 (token integration) are sequential
- No parallelization possible (4-1 must be available for 4-2 to import)

### Across Waves

**Cannot parallelize:** Waves have logical dependencies
- Wave 1 (auth security) should be first
- Wave 2 (core business) should be second
- Wave 3 (payments) should be third
- Wave 4 (auth rotation) should be fourth

**Reason:** Earlier waves improve system stability; later waves depend on earlier stability

---

## Critical Path Analysis

```
Start
│
├─ Wave 1 (4-6h): Rate Limiting
│  └─ Task 1-1 (2h): Create dependency
│     └─ Task 1-2 (2h): Apply to endpoints
│        └─ Task 1-3 (1-2h): Add tests
│
├─ Wave 2 (4-6h): Race Condition
│  └─ Task 2-1 (2-3h): Add lock
│     └─ Task 2-2 (2-3h): Error handling
│
├─ Wave 3 (2.5-3.5h): Webhook Dedup
│  └─ Task 3-1 (1-1.5h): Dedup logic
│     └─ Task 3-2 (1.5-2h): Webhook integration
│
├─ Wave 4 (4-6h): JWT Rotation
│  └─ Task 4-1 (2-3h): Key management
│     └─ Task 4-2 (2-3h): Token integration
│
└─ Testing & Verification (2-3h)
   └─ All tests pass
      └─ Code quality checks pass
         └─ Phase 1 complete ✓

Total: 13-20 hours
```

---

## File Dependency Map

```
dependencies.py (Task 1-1)
   │
   ├─ Used by: auth.py (Task 1-2)
   │
   └─ Tested by: test_rate_limiting.py (Task 1-3)

order.py (Task 2-1)
   │
   └─ Called by: order_service.py (Task 2-2)
      │
      └─ Tested by: test_orders_api.py (existing)

payment_service.py (Tasks 3-1, 3-2)
   │
   └─ Tested by: test_payments_api.py (existing)

keys.py (Task 4-1 - NEW)
   │
   └─ Imported by: security.py (Task 4-2)
      │
      └─ Called by: dependencies.py > get_current_user()
         │
         └─ Tested by: test_security.py (existing)
```

---

## Testing Waterfall

```
Wave 1 Complete
└─ Run: pytest backend/tests/integration/test_rate_limiting.py -v
   └─ Result: ✓ (or ✗ → fix before Wave 2)

Wave 2 Complete
└─ Run: pytest backend/tests/integration/test_orders_api.py -k concurrent -v
   └─ Result: ✓ (or ✗ → fix before Wave 3)

Wave 3 Complete
└─ Run: pytest backend/tests/integration/test_payments_api.py -k webhook -v
   └─ Result: ✓ (or ✗ → fix before Wave 4)

Wave 4 Complete
└─ Run: pytest backend/tests/unit/test_security.py -k rotation -v
   └─ Result: ✓ (or ✗ → fix before merge)

All Waves Complete
└─ Run: pytest backend/tests/ -v
   └─ Run: black --check backend/app/ && isort --check && flake8 && mypy
      └─ Result: ✓ ALL TESTS PASS → Phase 1 Success
```

---

## Timeline Estimate

```
Day 1 (6-8 hours)
├─ Wave 1: Rate Limiting (4-6h)
│  └─ Done: Rate limiting enforced on auth endpoints
│
└─ Start Wave 2: Race Condition (begin 2-1)

Day 2 (6-8 hours)
├─ Wave 2: Race Condition (complete, 4-6h)
│  └─ Done: No overselling on concurrent orders
│
└─ Wave 3: Webhook Dedup (complete, 2.5-3.5h)
   └─ Done: Webhook idempotency guaranteed

Day 3 (6-8 hours)
├─ Wave 4: JWT Rotation (4-6h)
│  └─ Done: Multi-version JWT support active
│
└─ Testing & Verification (2-3h)
   └─ Done: All tests pass, code quality gates pass

Result: Phase 1 complete in 3 days (full-time developer)
```

---

## Success Indicators

### After Each Wave

**Wave 1:** 
- ✓ `pytest backend/tests/integration/test_rate_limiting.py` passes
- ✓ Manual test: Send 6 login attempts, 6th gets 429
- ✓ Code review: 3 tasks approved

**Wave 2:**
- ✓ `pytest backend/tests/integration/test_orders_api.py -k concurrent` passes
- ✓ Manual test: 50+ concurrent orders on same book, no negative quantities
- ✓ Code review: 2 tasks approved

**Wave 3:**
- ✓ `pytest backend/tests/integration/test_payments_api.py -k webhook` passes
- ✓ Manual test: Send same webhook twice, idempotent handling
- ✓ Code review: 2 tasks approved

**Wave 4:**
- ✓ `pytest backend/tests/unit/test_security.py -k rotation` passes
- ✓ Manual test: Old token accepted for 30 days, rejected after
- ✓ Code review: 2 tasks approved

### Phase Complete

- ✓ All 9 tasks committed
- ✓ `pytest backend/tests/` — 100% pass
- ✓ `black`, `isort`, `flake8`, `mypy` — all pass
- ✓ 9 commits on feature branch
- ✓ Ready for merge to main

---

*Diagram created: 2026-04-18*  
*All dependencies mapped*  
*Parallel opportunities identified: NONE (all sequential)*  
*Recommended execution: Wave 1 → 2 → 3 → 4 (no parallelization)*
