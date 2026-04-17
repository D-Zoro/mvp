# Phase 1: Critical Fixes — Quick Reference

**Created:** 2026-04-18  
**Status:** Research Complete ✓  
**Ready for Planning:** YES

---

## The 4 Production Blockers

### 1️⃣ CRIT-01: Order Quantity Race Condition
- **Problem:** Two concurrent orders on same book both pass stock check, causing oversell
- **Risk:** Inventory corrupted, customers promised unfulfillable orders
- **Fix:** Use `SELECT ... FOR UPDATE` to lock book row during order creation
- **Files:** `order.py` repository, order service error handling
- **Effort:** 4-6 hours
- **Test:** Concurrent order load test (5+ simultaneous orders on 1 book)

### 2️⃣ CRIT-02: Stripe Webhook Deduplication  
- **Problem:** Network retries deliver same webhook multiple times, potentially charging twice
- **Risk:** Double charges, customer complaints, refund overhead
- **Fix:** Cache processed webhook event IDs in Redis with 24-hour TTL
- **Files:** `payment_service.py`, Redis integration
- **Effort:** 2.5-3.5 hours
- **Test:** Send same webhook event twice, verify idempotent processing

### 3️⃣ CRIT-03: JWT Secret Rotation
- **Problem:** No mechanism to rotate compromised signing key without invalidating all sessions
- **Risk:** Security breach means all tokens compromised; can't be fixed gracefully
- **Fix:** Add JWT key versioning (`kid` header) + deprecation window (30 days)
- **Files:** `security.py`, new `keys.py` module, config updates
- **Effort:** 4-6 hours
- **Test:** Create token with old key, rotate to new key, verify both work for 30d then only new

### 4️⃣ CRIT-04: Rate Limiting Validation
- **Problem:** Decorator-based rate limiting silently fails; login endpoints unprotected
- **Risk:** Brute force attacks on credentials, account takeover
- **Fix:** Switch to FastAPI dependency injection for rate limiting
- **Files:** `dependencies.py`, auth endpoints, rate limiter middleware
- **Effort:** 2.5-4.5 hours
- **Test:** Send 6+ login requests in rapid succession, verify 429 on 6th

---

## Phase 1 Execution Strategy

### Recommended Order
1. **CRIT-04** (Rate Limiting) — Simplest, security win
2. **CRIT-01** (Race Condition) — Core business logic
3. **CRIT-02** (Webhook Dedup) — Financial safeguard
4. **CRIT-03** (JWT Rotation) — Infrastructure

### Parallelization
- All 4 are **independent** → can work 2-3 in parallel if needed
- Suggest: 2 developers, CRIT-04+CRIT-03 in parallel, then CRIT-01+CRIT-02

### Time Budget
- **Development:** 6-10 hours
- **Testing:** 4-7 hours
- **Code Review:** 3 hours
- **Total:** 13-20 hours (estimated 2-3 days for full team)

---

## Key Decisions Made in Research

| Issue | Decision | Rationale |
|-------|----------|-----------|
| CRIT-01 Race Condition | Use `SELECT FOR UPDATE` (not optimistic locking) | Simplest DB-level solution, low risk of deadlock for order creation |
| CRIT-02 Webhook Dedup | Use Redis cache (not DB log) | Aligns with existing infrastructure, simpler implementation |
| CRIT-03 JWT Rotation | Use `kid` header + 30-day deprecation | Standard JWT practice, allows graceful migration |
| CRIT-04 Rate Limiting | Use Depends() + middleware | FastAPI idiomatic, testable, explicit control |

---

## Success Criteria (All Must Pass)

✓ **CRIT-01:** No overselling with 5+ concurrent orders on same book  
✓ **CRIT-02:** Duplicate webhook handled idempotently, no state changes  
✓ **CRIT-03:** Key rotation tested, old keys work for 30 days then rejected  
✓ **CRIT-04:** 429 response after N login attempts per IP per time window

---

## Full Research Document

See: `.planning/phases/01-critical-fixes/01-RESEARCH.md`

Contains:
- Detailed analysis of each blocker
- Current implementation code review
- Multiple solution options with pros/cons
- Complete implementation plans with file locations
- Testing strategies
- Risk mitigation
- Key questions for planning session

---

## Next Steps

1. **Plan Phase 1** → `/gsd-plan-phase 1`
   - Creates detailed execution tasks
   - Assigns files to modify
   - Specifies test cases

2. **Execute Phase 1** → `/gsd-execute-phase 1`
   - Implement fixes
   - Run tests
   - Submit for review

3. **Verify & Deploy** → Proceed to Phase 2

---

*Ready to proceed to planning stage*
