# Books4All — Production MVP

## What This Is

Books4All is a second-hand book marketplace where sellers list used books, buyers browse and order them, and payments are processed through Stripe. The goal is to ship a production-grade MVP with all layers working correctly — backend services, repositories, and frontend components.

## Core Value

**All backend and frontend components work correctly with zero breaking changes, delivering a production-ready marketplace MVP.**

## Requirements

### Validated

✓ FastAPI backend with async SQLAlchemy (0.109, Python 3.12)  
✓ Next.js 15 frontend with TypeScript and Tailwind CSS  
✓ PostgreSQL database with Alembic migrations  
✓ JWT authentication with bcrypt password hashing  
✓ Stripe payment integration with webhooks  
✓ Redis for rate limiting and session management  
✓ Three-layer architecture: API → Service → Repository  
✓ Comprehensive test suite (unit, DB, integration)  

### Active

- [ ] **CRITICAL-01**: Fix order quantity race condition (prevent overselling)
- [ ] **CRITICAL-02**: Fix Stripe webhook deduplication for financial integrity
- [ ] **CRITICAL-03**: Implement JWT secret rotation mechanism
- [ ] **CRITICAL-04**: Validate rate limiting on all auth endpoints
- [ ] **BACKEND-01**: Audit and fix all service layer logic (auth, book, order, payment)
- [ ] **BACKEND-02**: Audit and fix all repository layer queries and constraints
- [ ] **BACKEND-03**: Audit and fix book picture/image handling logic
- [ ] **BACKEND-04**: Ensure all exception handling is correct and properly mapped
- [ ] **BACKEND-05**: Validate all async/await patterns throughout backend
- [ ] **FRONTEND-01**: Fix all component rendering logic
- [ ] **FRONTEND-02**: Audit form validation and error handling
- [ ] **FRONTEND-03**: Ensure all API client calls are correct
- [ ] **FRONTEND-04**: Test all user workflows end-to-end
- [ ] **INTEGRATION-01**: Test full order flow (create → pay → ship → deliver)
- [ ] **INTEGRATION-02**: Test payment failure and retry logic
- [ ] **INTEGRATION-03**: Validate seller order fulfillment workflows
- [ ] **INTEGRATION-04**: Ensure no data integrity issues across the system

### Out of Scope

- DevOps automation (scrum cycles, CI/CD, container orchestration) — planned for post-MVP
- OAuth 2.0 social login — future feature
- Advanced analytics and metrics — post-MVP
- Email notifications — basic stubs only for MVP
- Mobile-specific optimizations — web-first for MVP

## Context

**Current State:**
- Codebase is mature with good architecture patterns
- 25 identified issues across backend and frontend (4 critical, 6 high, 7 medium, 5 low)
- Technology stack is modern and well-integrated
- Test coverage is comprehensive but needs validation

**Critical Issues (from CONCERNS.md):**
1. Order quantity race condition — overselling risk
2. Stripe webhook deduplication — payment integrity
3. JWT secret rotation — security compliance
4. Rate limiting validation — auth security

**Known Gotchas (from CONVENTIONS.md):**
- bcrypt 4.1.2 pinned (5.x breaks passlib 1.7.4)
- SQLAlchemy async sessions require proper await usage
- Stripe webhooks need raw request body, not parsed JSON
- Password hashing limited to 72 bytes

## Constraints

- **Tech Stack**: FastAPI 0.109, Python 3.12, PostgreSQL, Redis, Next.js 15 — locked for MVP
- **Database**: PostgreSQL async driver (asyncpg), sync driver for Alembic migrations
- **Authentication**: JWT tokens with bcrypt — no OAuth for MVP
- **Timeline**: Ship production MVP with zero known critical issues
- **Quality Bar**: All requirements must pass end-to-end testing before release

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Fix critical issues first | 4 blockers for production | — In Progress |
| Three-phase approach: critical → backend → frontend | Logical dependency order | — Pending |
| End-to-end testing after all phases | Validate entire system | — Pending |
| No major refactoring — focus on correctness | Time-boxed MVP | — Pending |

---

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

*Last updated: 2026-04-18 after initialization*
