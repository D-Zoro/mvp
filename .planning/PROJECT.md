# Books4All Project Charter

**Project:** Books4All - Peer-to-Peer Used Book Marketplace
**Status:** Active Development (Security & Stability Focus)
**Last Updated:** 2026-04-24

---

## 📋 Project Overview

**Books4All** is a full-stack web application for buying and selling used books between peers. The platform facilitates peer-to-peer transactions with integrated payment processing, user authentication, and book discovery features.

### Current Tech Stack

**Frontend:**
- Next.js 16 + React 19 + TypeScript
- Zustand for state management
- TailwindCSS for styling

**Backend:**
- FastAPI (Python 3.12+)
- PostgreSQL 16+ (database)
- Redis 7+ (caching, rate limiting)
- SQLAlchemy ORM + Alembic (migrations)

**External Services:**
- Stripe (payments)
- Google OAuth & GitHub OAuth (authentication)
- S3/MinIO (image storage)

---

## 🎯 Current Initiative: Security & Technical Debt Remediation

### Objective
Address critical security vulnerabilities, performance bottlenecks, and technical debt identified in the initial codebase audit. Target completion in **1-2 weeks** with solo development.

### Priority Issues (from CONCERNS.md)

**🔴 CRITICAL SECURITY (Must fix)**
1. Hardcoded secrets and API keys in configuration
2. JWT stored in localStorage (vulnerable to XSS)
3. OAuth state parameter not validated
4. Rate limiting not implemented
5. CORS configuration overpermissive

**🟠 HIGH PRIORITY (Should fix)**
1. N+1 query problems in book listings
2. No application-level caching strategy
3. Session fixation vulnerabilities
4. Stock race conditions (concurrent orders)

**🟡 MEDIUM PRIORITY (Will fix)**
1. Email verification workflow incomplete
2. Database connection pooling limits
3. Print statements instead of logging
4. Missing input validation on several endpoints
5. Password reset tokens reusable (should be one-time use)

### Success Criteria

- ✅ No hardcoded secrets in code
- ✅ JWT moved to secure HTTP-only cookies
- ✅ OAuth state validation implemented
- ✅ Rate limiting on all public endpoints
- ✅ N+1 queries resolved (critical paths)
- ✅ Caching strategy implemented for hot reads
- ✅ Stock race condition fixed with transactions
- ✅ All tests passing (80%+ coverage)

---

## 📊 Key Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Security Issues | 9 | 0 | 🔴 In Progress |
| N+1 Query Instances | 5+ | 0 | 🔴 To Start |
| Test Coverage | 65% | 80%+ | 🟡 Partial |
| Response Times (avg) | 200-400ms | <200ms | 🟡 Needs Optimization |
| Rate Limiting | None | Full | 🔴 Not Implemented |

---

## 👤 Team & Roles

**Solo Developer** (you)
- Backend services & security fixes
- Database optimization & migrations
- Testing & validation
- Deployment & monitoring

---

## 📅 Timeline: 1-2 Weeks

### Week 1: Security Hardening
- Days 1-2: Secrets management & environment variables
- Days 3-4: Authentication security (JWT, OAuth fixes)
- Day 5: Rate limiting & CORS configuration

### Week 2: Performance & Stability
- Days 1-2: N+1 query resolution
- Days 3-4: Caching strategy implementation
- Day 5: Race condition fixes & testing

---

## 📁 Related Documents

- **REQUIREMENTS.md** — Detailed requirements and acceptance criteria
- **ROADMAP.md** — Phase breakdown and dependencies
- **STACK.md** — Technology details and versions
- **ARCHITECTURE.md** — System design and layering
- **CONCERNS.md** — Identified issues and mitigation strategies
- **STATE.md** — Current project state and assumptions

---

## 🚀 Next Steps

1. **Review REQUIREMENTS.md** — Understand detailed requirements for each security issue
2. **Review ROADMAP.md** — See phase breakdown and execution order
3. **Run /gsd-plan-phase 1** — Start Phase 1: Security Hardening
4. **Execute tasks** — Follow the plan, commit after each logical change
5. **Run tests** — Validate all changes with test suite

---

## ✍️ Project Management

- **Command:** `/gsd-plan-phase <phase-number>` — Plan a specific phase
- **Graph Query:** `/gsd-graphify query "security"` — Find related components
- **Memory:** All decisions and learnings stored in `.claude-flow/data/`
- **Version Control:** Commit each logical change with clear messages

---

## 📞 Support & Documentation

- **Codebase Map:** `.planning/codebase/` — 7 comprehensive documents
- **Knowledge Graph:** `.planning/graphs/` — 1,497-node architecture map
- **Memory System:** Persistent context across sessions via `.claude-flow/`
- **API Docs:** `http://localhost:8000/api/v1/docs` (when running)
