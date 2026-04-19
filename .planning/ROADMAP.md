# Books4All MVP Roadmap

**Created:** 2026-04-18  
**Milestone:** Production MVP Release  
**Phases:** 7  
**Requirements:** 45 total v1 requirements  
**Coverage:** 100% (45/45 mapped)

---

## Phase Overview

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Critical Fixes | Eliminate 4 production blockers | CRIT-01 to CRIT-04 | 4 |
| 2 | Backend Services | 2/1 | Complete    | 2026-04-17 |
| 3 | Backend Foundations | Fix repos, async patterns, error handling | REPO-01 to REPO-05, ASYNC-01 to ASYNC-04, ERROR-01 to ERROR-04 | 13 |
| 4 | Frontend Components | Fix React components and API integration | COMP-01 to COMP-04, API-01 to API-04 | 8 |
| 5 | User Workflows | Test buyer, seller, and admin journeys | FLOW-01 to FLOW-04 | 4 |
| 6 | Integration & Quality | Full end-to-end testing and validation | INT-01 to INT-05, TEST-01 to TEST-04 | 9 |
| 7 | Deploy Ready | Prepare for production deployment | DEPLOY-01 to DEPLOY-04 | 4 |

---

## Phase Details

### Phase 1: Critical Fixes

**Goal:** Eliminate 4 production blockers (race conditions, webhooks, JWT, rate limiting) before any other work.

**Requirements:**
- CRIT-01: Fix order quantity race condition
- CRIT-02: Fix Stripe webhook deduplication
- CRIT-03: Implement JWT secret rotation
- CRIT-04: Validate rate limiting

**Success Criteria:**
1. Order quantity race condition fixed — concurrent purchases on same book don't oversell
2. Stripe webhooks are deduplicated — no double-charging on network retries
3. JWT secret rotation mechanism implemented and tested
4. Rate limiting enforced on all auth endpoints (/login, /signup, /reset-password)
5. All 4 critical issues verified fixed in integration tests

**Dependencies:** None (goes first)

**Depends on:** None

---

### Phase 2: Backend Service Layer

**Goal:** Audit and fix all service layer business logic (auth, books, orders, payments).

**Requirements:**
- SVCL-01: Audit UserService (login, signup, password reset, RBAC)
- SVCL-02: Audit BookService (list, filter, search, image handling)
- SVCL-03: Audit OrderService (create, state transitions, validation)
- SVCL-04: Audit PaymentService (Stripe, webhooks, refunds)
- SVCL-05: Ensure proper exception handling with typed exceptions

**Success Criteria:**
1. UserService logic audited and verified — all auth flows work correctly
2. BookService logic verified — list/filter/search correct, image handling solid
3. OrderService logic fixed — state machine transitions only valid paths
4. PaymentService verified — Stripe integration idempotent and correct
5. All services raise and handle typed exceptions properly — no generic errors

**Dependencies:** Phase 1 (critical fixes must be done first)

**Depends on:** Phase 1

---

### Phase 3: Backend Foundations

**Goal:** Fix repository layer, async patterns, and error handling throughout backend.

**Requirements:**
- REPO-01: Audit UserRepository queries
- REPO-02: Audit BookRepository soft deletes and orphaned references
- REPO-03: Audit OrderRepository state consistency
- REPO-04: Audit PaymentRepository transaction integrity
- REPO-05: Validate async/await patterns (no blocking)
- ASYNC-01: Validate SQLAlchemy 2.0 async patterns
- ASYNC-02: Ensure session lifecycle is correct (no leaks)
- ASYNC-03: Validate transaction boundaries for orders/payments
- ASYNC-04: Test connection pooling and concurrency
- ERROR-01: Validate all 14 typed exceptions correct
- ERROR-02: Ensure error responses don't leak information
- ERROR-03: Verify all endpoints return proper HTTP status codes
- ERROR-04: Test error handling with invalid inputs

**Success Criteria:**
1. All repositories audited — queries correct, constraints enforced
2. No async/await issues found — all sessions properly managed
3. Transaction boundaries correct for critical operations (orders, payments)
4. Connection pooling validated — handles concurrent load
5. Error handling comprehensive — all edges cases tested

**Dependencies:** Phase 2 (service layer must be correct first)

**Depends on:** Phase 2

---

### Phase 4: Frontend Components & API

**Goal:** Fix React components, validate API integration, ensure TypeScript strictness.

**Requirements:**
- COMP-01: Fix all component rendering logic
- COMP-02: Audit form validation and error display
- COMP-03: Audit layout components (responsiveness, accessibility)
- COMP-04: Fix TypeScript types (strict mode)
- API-01: Validate API client calls match backend
- API-02: Fix error handling for failed requests
- API-03: Ensure auth tokens handled correctly
- API-04: Test network timeout and offline scenarios

**Success Criteria:**
1. All React components render correctly — no state/prop issues
2. Forms validate correctly and display errors properly
3. Layouts responsive and accessible across devices
4. TypeScript strict mode passes — no `any` types in public APIs
5. API integration complete — all client calls match backend, error handling solid

**Dependencies:** Phase 3 (backend must be correct so frontend can rely on it)

**Depends on:** Phase 3

---

### Phase 5: User Workflows

**Goal:** Test and validate complete buyer, seller, and admin user journeys end-to-end.

**Requirements:**
- FLOW-01: Test buyer signup → login → browse → cart → checkout
- FLOW-02: Test buyer order history and tracking
- FLOW-03: Test seller listing creation → order fulfillment
- FLOW-04: Test admin user and content management

**Success Criteria:**
1. Buyer workflow end-to-end: signup to checkout works smoothly
2. Buyer can view order history and track status
3. Seller can list books and fulfill orders correctly
4. Admin can manage users and moderate content
5. All workflows pass manual testing with real data

**Dependencies:** Phase 4 (frontend/API must be correct)

**Depends on:** Phase 4

---

### Phase 6: Integration & Quality

**Goal:** Full end-to-end testing, concurrency validation, and comprehensive quality gates.

**Requirements:**
- INT-01: Full order flow (create → payment → confirmation → delivery)
- INT-02: Payment failure scenarios (declined, timeout, retry)
- INT-03: Seller fulfillment workflows
- INT-04: Data integrity (no orphaned records, constraints)
- INT-05: Concurrency testing (simultaneous orders, rate limiting)
- TEST-01: Unit test suite with 75%+ coverage
- TEST-02: Database tests with real PostgreSQL
- TEST-03: Integration tests with AsyncClient
- TEST-04: Manual end-to-end testing

**Success Criteria:**
1. Complete order flow verified end-to-end — from creation to delivery
2. Payment failures handled gracefully — retries work, no lost orders
3. Seller fulfillment accurate — orders marked shipped/delivered correctly
4. Data integrity perfect — no orphaned records, all constraints enforced
5. System handles concurrent load — rate limiting prevents abuse
6. Test coverage at 75%+ — all critical paths covered
7. All integration tests pass with real database
8. Manual testing confirms system ready for release

**Dependencies:** Phase 5 (workflows verified first)

**Depends on:** Phase 5

---

### Phase 7: Deploy Ready

**Goal:** Prepare all infrastructure, config, and dependencies for production deployment.

**Requirements:**
- DEPLOY-01: Database migrations tested and verified
- DEPLOY-02: Environment variables configured correctly
- DEPLOY-03: Docker Compose works for dev/staging/prod
- DEPLOY-04: All dependencies pinned (bcrypt 4.1.2, etc.)

**Success Criteria:**
1. All database migrations run correctly — schema matches code
2. Environment variables configured for dev/staging/prod
3. Docker Compose builds and runs all services
4. All dependencies pinned to specific versions
5. System can be deployed to production with confidence

**Dependencies:** Phase 6 (all code must be tested first)

**Depends on:** Phase 6

---

## Requirement Coverage

**Total v1 Requirements:** 45  
**Phases Created:** 7  
**Requirements Mapped:** 45  
**Unmapped:** 0 ✓

### By Category

| Category | Count | Phases |
|----------|-------|--------|
| Critical Fixes | 4 | Phase 1 |
| Backend Services | 5 | Phase 2 |
| Backend Repos & Async | 13 | Phase 3 |
| Frontend | 8 | Phase 4 |
| Workflows | 4 | Phase 5 |
| Integration & Quality | 9 | Phase 6 |
| Deployment | 4 | Phase 7 |

---

## Key Decisions

1. **Phase 1 First** — Critical blockers prevent production, must be fixed before anything else
2. **Logical Dependency Order** — Backend → Frontend → Integration (can't test frontend without working backend)
3. **Quality-First Approach** — Each phase verifies thoroughly before moving to next
4. **Parallel When Possible** — Services in Phase 2 can be audited in parallel
5. **Integration Last** — After all components work individually, verify they work together

---

## Next Steps

1. **Phase 1 Planning** — Gather details on critical fixes needed
2. **Execute Phase 1** — Fix all 4 blockers
3. **Continue Sequential** — Each phase depends on previous

---

*Roadmap created: 2026-04-18*
*All 45 requirements mapped to 7 phases*
*Ready for execution*
