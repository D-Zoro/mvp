# Books4All Roadmap: Security & Technical Debt Remediation

**Timeline:** 1-2 weeks | **Team:** Solo | **Status:** Planning Phase

---

## 🗺️ Roadmap Overview

This roadmap breaks down the security and technical debt remediation into **5 executable phases**, each with clear goals, deliverables, and success criteria.

```
PHASE 1: Security Hardening (Days 1-5)
├─ Secrets Management & Environment Variables
├─ JWT Security (HTTP-only Cookies)
├─ OAuth State Validation
├─ Rate Limiting Implementation
└─ CORS Configuration

PHASE 2: Performance Optimization (Days 1-4)
├─ N+1 Query Resolution
├─ Caching Strategy Implementation
├─ Database Optimization
└─ Performance Testing & Validation

PHASE 3: Code Quality & Testing (Days 1-3)
├─ Test Coverage Improvement (to 80%+)
├─ Security-Specific Tests
├─ Integration Tests
└─ CI/CD Verification

PHASE 4: Technical Debt Cleanup (Days 1-2)
├─ Logging Standards
├─ Error Handling Consistency
├─ Code Documentation
└─ README & Setup Instructions

PHASE 5: Final Validation & Deployment (Days 1-2)
├─ End-to-End Testing
├─ Performance Benchmarking
├─ Security Audit
└─ Deployment Readiness

Total: ~14 working days = 2 weeks
```

---

## 📍 PHASE 1: Security Hardening

**Duration:** 5 days
**Owner:** Solo Developer (You)
**Goal:** Fix all critical and high-priority security vulnerabilities.

### Phase 1.1: Secrets Management (Days 1-2)

**Objective:** Ensure no hardcoded secrets in codebase.

**Tasks:**
1. Audit config files and source code for hardcoded secrets
2. Create/update `config.py` with Settings class reading from environment
3. Update `.env.example` with placeholder values (no real secrets)
4. Configure all services (DB, Redis, Stripe, OAuth) via environment variables
5. Add git hooks to prevent secret commits: `git secrets install`
6. Update deployment docs with required environment variables

**Deliverables:**
- [ ] No hardcoded secrets found in code scan
- [ ] `.env.example` updated with placeholders
- [ ] `config.py` uses `os.getenv()` with validation
- [ ] Git hooks installed and working
- [ ] Documentation: `docs/SECURITY.md` lists all required env vars

**Tests:**
- Unit tests verify config reads from environment
- Linting rules prevent hardcoded credentials

**Acceptance Criteria:**
- ✅ `pytest tests/test_config.py` passes
- ✅ `git secrets scan` finds no issues
- ✅ All env vars documented

---

### Phase 1.2: JWT Security (Days 2-3)

**Objective:** Move JWT to HTTP-only cookies, implement refresh token rotation.

**Tasks:**
1. Modify `app/core/security.py` to create HTTP-only cookies
2. Update auth endpoints to set cookies instead of returning tokens
3. Add CSRF token mechanism for POST/PUT/DELETE requests
4. Remove localStorage token code from frontend
5. Implement refresh token rotation (new token on each refresh)
6. Add logout endpoint that clears cookies
7. Test with Postman/curl to verify cookies are HTTP-only

**Deliverables:**
- [ ] Auth endpoints set HTTP-only, Secure cookies
- [ ] Access token: 15 min expiry, Refresh token: 7 days
- [ ] CSRF token implemented for state-changing operations
- [ ] Frontend uses cookie-based auth
- [ ] Logout endpoint clears all auth cookies

**Tests:**
- Auth tests verify cookies have `httpOnly=True`
- Integration tests confirm no localStorage token
- Tests for refresh token rotation and expiry
- CSRF tests verify token validation

**Acceptance Criteria:**
- ✅ `curl -v http://localhost:8000/api/v1/auth/login` shows `Set-Cookie: access_token=...`
- ✅ Frontend localStorage.getItem('token') returns null
- ✅ Auth tests pass with 90%+ coverage

---

### Phase 1.3: OAuth State Validation (Days 3-4)

**Objective:** Implement proper OAuth state validation to prevent CSRF attacks.

**Tasks:**
1. Generate random state in OAuth initiation endpoint
2. Store state in Redis with 10-minute TTL
3. Validate state on OAuth callback
4. Clear state after successful validation
5. Return 400 Bad Request for invalid/missing state
6. Add logging for OAuth events
7. Test OAuth flow end-to-end with test credentials

**Deliverables:**
- [ ] OAuth state generation in `auth_service.py`
- [ ] State validation in callback endpoint
- [ ] Redis storage for state tracking
- [ ] Proper error handling for invalid state

**Tests:**
- Unit tests for state generation
- Integration tests with invalid state (should fail)
- Integration tests with valid state (should succeed)
- Tests verify state is cleared after use

**Acceptance Criteria:**
- ✅ OAuth callback with invalid state returns 400
- ✅ OAuth callback with valid state succeeds
- ✅ All OAuth tests pass

---

### Phase 1.4: Rate Limiting (Days 4-5)

**Objective:** Implement rate limiting on all public endpoints.

**Tasks:**
1. Install and configure `slowapi` (FastAPI rate limiter)
2. Configure Redis as rate limit backend
3. Define rate limit policies:
   - Auth endpoints: 5 req/min per IP
   - Authenticated endpoints: 100 req/min per user
   - Public endpoints: 30 req/min per IP
4. Apply rate limiters to all endpoints
5. Test rate limit headers and responses
6. Document rate limits in API docs

**Deliverables:**
- [ ] Rate limiting middleware configured
- [ ] All endpoints protected with appropriate limits
- [ ] 429 Too Many Requests response on limit exceeded
- [ ] Rate limit headers in responses (X-RateLimit-*)

**Tests:**
- Test hitting rate limit and getting 429
- Test rate limit reset behavior
- Test different limits for different endpoints
- Performance test (limit enforcement overhead)

**Acceptance Criteria:**
- ✅ Auth endpoint returns 429 after 5 requests/min
- ✅ API endpoint returns 429 after 100 requests/min (authenticated)
- ✅ Rate limit headers present in response

---

### Phase 1.5: CORS Configuration (Days 5)

**Objective:** Implement proper CORS configuration.

**Tasks:**
1. Remove wildcard CORS if present
2. Configure allowed origins (dev and prod)
3. Set credentials=true for cookie-based auth
4. Restrict HTTP methods and headers
5. Set preflight cache (600 seconds)
6. Test CORS with curl and browser

**Deliverables:**
- [ ] CORS middleware configured in `app/main.py`
- [ ] Allowed origins list in config
- [ ] Proper headers and methods allowed

**Tests:**
- Preflight request tests (OPTIONS)
- CORS header validation
- Rejected origin tests (wildcard should fail)

**Acceptance Criteria:**
- ✅ Preflight request returns correct headers
- ✅ Wildcard origin request is rejected
- ✅ Same-origin request succeeds

---

## 📍 PHASE 2: Performance Optimization

**Duration:** 4 days
**Owner:** Solo Developer (You)
**Goal:** Eliminate N+1 queries, implement caching, optimize database.

### Phase 2.1: N+1 Query Resolution (Days 1-2)

**Objective:** Fix N+1 query patterns in critical paths.

**Tasks:**
1. Identify N+1 patterns using SQLAlchemy query logging
2. Refactor book listing queries to use `joinedload` or `selectinload`
3. Refactor order queries to load related data efficiently
4. Add query count assertions in tests
5. Benchmark before/after query performance
6. Document query optimization patterns

**Deliverables:**
- [ ] Book queries optimized (1 query instead of 1+N)
- [ ] Order queries optimized
- [ ] Search endpoint optimized
- [ ] Query count tests added

**Tests:**
- Query logger tests verify reduced queries
- Performance benchmarks show improvement
- Integration tests verify correct data returned

**Acceptance Criteria:**
- ✅ Book listing query count: 1 (was 1+N)
- ✅ Order query count: 1-2 (was 1+N)
- ✅ Performance improvement >50%

---

### Phase 2.2: Caching Strategy (Days 2-3)

**Objective:** Implement Redis caching for hot reads.

**Tasks:**
1. Design cache key strategy
2. Implement cache decorator for service methods
3. Cache book listings (5-min TTL)
4. Cache category listings (10-min TTL)
5. Implement cache invalidation on data changes
6. Add HTTP ETag/Last-Modified headers
7. Monitor cache hit rate

**Deliverables:**
- [ ] Cache service utility in `app/core/cache.py`
- [ ] Cache decorators on hot reads
- [ ] Cache invalidation on updates
- [ ] HTTP cache headers implemented

**Tests:**
- Cache hit/miss tests
- Cache expiry tests
- Invalidation tests (cache cleared on updates)
- HTTP cache header tests
- Performance tests (cache vs no-cache)

**Acceptance Criteria:**
- ✅ Cache hit ratio: >60% for GET requests
- ✅ Cache TTL properly respected
- ✅ Cache invalidated on updates
- ✅ HTTP cache headers present

---

### Phase 2.3: Database Optimization (Days 3-4)

**Objective:** Optimize database configuration and queries.

**Tasks:**
1. Review and optimize connection pool settings
2. Create Alembic migration for missing indexes
3. Add indexes on frequently queried columns:
   - `users.email` (auth)
   - `books.user_id` (seller books)
   - `orders.user_id` (order history)
   - `orders.created_at` (recent orders)
4. Analyze slow queries and optimize
5. Test with realistic data volumes
6. Document performance metrics

**Deliverables:**
- [ ] Connection pool optimized (20 max, 30s idle timeout)
- [ ] Indexes created in migration
- [ ] Slow queries identified and optimized
- [ ] Performance metrics documented

**Tests:**
- Integration tests with >1000 records
- Query performance benchmarks
- Connection pool stress tests

**Acceptance Criteria:**
- ✅ Query response time: <200ms avg
- ✅ No full table scans in slow query log
- ✅ Indexes used in query plans

---

## 📍 PHASE 3: Code Quality & Testing

**Duration:** 3 days
**Owner:** Solo Developer (You)
**Goal:** Achieve 80%+ test coverage with focus on critical paths.

### Phase 3.1: Unit Test Coverage (Days 1-2)

**Objective:** Write unit tests for all service and security-critical code.

**Tasks:**
1. Audit current test coverage with `pytest --cov`
2. Write unit tests for:
   - Auth service (login, register, OAuth, token refresh)
   - Security functions (password hashing, JWT generation)
   - Validation schemas (Pydantic)
   - Exception handling
3. Write security tests:
   - Rate limit enforcement
   - CORS headers
   - Input validation
4. Achieve 80%+ overall coverage, 90%+ for critical paths

**Deliverables:**
- [ ] Unit test coverage: 80%+
- [ ] Critical path coverage: 90%+
- [ ] Security tests passing
- [ ] Coverage report generated

**Tests:**
- `pytest --cov tests/` shows 80%+
- `pytest tests/test_security.py` shows all security tests pass

**Acceptance Criteria:**
- ✅ `pytest --cov` shows 80%+ coverage
- ✅ All critical functions have unit tests
- ✅ Zero coverage regressions

---

### Phase 3.2: Integration & End-to-End Tests (Days 2-3)

**Objective:** Write integration tests for complete user flows.

**Tasks:**
1. Write integration tests for:
   - User registration and login
   - OAuth flows (with test credentials)
   - Book listing and search
   - Order creation and payment
   - Review submission
2. Set up test database (isolated from dev/prod)
3. Mock external services (Stripe, OAuth providers)
4. Test error scenarios and edge cases

**Deliverables:**
- [ ] Integration tests for all major flows
- [ ] Test database setup
- [ ] External service mocks
- [ ] All tests passing

**Tests:**
- `pytest tests/integration/` passes
- Test coverage includes happy paths and error paths

**Acceptance Criteria:**
- ✅ All major user flows tested
- ✅ Tests pass with mocked external services
- ✅ Error handling tests included

---

## 📍 PHASE 4: Technical Debt Cleanup

**Duration:** 2 days
**Owner:** Solo Developer (You)
**Goal:** Clean up logging, error handling, and documentation.

### Phase 4.1: Logging Standards (Day 1)

**Objective:** Replace print statements with proper logging.

**Tasks:**
1. Replace all `print()` statements with `logger.info()`, `logger.error()`, etc.
2. Configure logging level (DEBUG in dev, WARNING in prod)
3. Ensure sensitive data (passwords, tokens) never logged
4. Add linting rule to prevent future print statements

**Deliverables:**
- [ ] No print statements in codebase
- [ ] Logging configured with levels
- [ ] Linting rule prevents print statements

**Tests:**
- Linting: `flake8` checks no print statements

**Acceptance Criteria:**
- ✅ `grep -r "print(" app/` returns nothing
- ✅ `flake8 app/` passes

---

### Phase 4.2: Error Handling & Documentation (Day 2)

**Objective:** Consistent error handling and code documentation.

**Tasks:**
1. Review and standardize error response format
2. Ensure all functions have docstrings (Google format)
3. Update README with:
   - Setup instructions
   - Running the app
   - Testing
   - Deployment
4. Document API endpoints (or verify FastAPI auto-docs)

**Deliverables:**
- [ ] All functions have docstrings
- [ ] Error response format consistent
- [ ] README comprehensive
- [ ] API documentation accessible

**Tests:**
- Docstring check: `pydocstyle app/`
- Documentation review (manual)

**Acceptance Criteria:**
- ✅ `pydocstyle app/` shows no missing docstrings
- ✅ README covers setup, testing, deployment
- ✅ API docs accessible at `/docs`

---

## 📍 PHASE 5: Final Validation & Deployment

**Duration:** 2 days
**Owner:** Solo Developer (You)
**Goal:** Ensure all changes are tested, documented, and ready for deployment.

### Phase 5.1: End-to-End Testing (Day 1)

**Objective:** Run complete test suite and validate all requirements met.

**Tasks:**
1. Run full test suite: `pytest tests/`
2. Verify coverage: `pytest --cov` shows 80%+
3. Run security scanner (e.g., `bandit app/`)
4. Test all security requirements:
   - Secrets not exposed
   - Rate limiting works
   - CORS configured
   - OAuth state validated
   - Input validation complete
5. Test performance improvements:
   - Query count reduced
   - Cache hit rate >60%
   - Response times <200ms avg
6. Manual testing:
   - User signup and login
   - Book listing and search
   - Order creation
   - Payment processing (test mode)

**Deliverables:**
- [ ] All tests passing
- [ ] Coverage report: 80%+
- [ ] Security scan: no high-severity issues
- [ ] Performance metrics documented
- [ ] Manual testing checklist completed

**Tests:**
- `pytest tests/ --tb=short` passes
- `pytest --cov` shows 80%+
- `bandit -r app/` shows no critical issues

**Acceptance Criteria:**
- ✅ All tests pass
- ✅ Coverage 80%+
- ✅ No critical security issues
- ✅ Performance metrics show improvement

---

### Phase 5.2: Deployment Readiness (Day 2)

**Objective:** Prepare for production deployment.

**Tasks:**
1. Review all commits for quality
2. Create deployment checklist:
   - Database migrations tested
   - Env vars documented
   - Build passes
   - Tests pass
   - Security scan passes
3. Update CHANGELOG with all changes
4. Tag release: `git tag -a v1.0.0-security -m "Security hardening release"`
5. Create deployment runbook

**Deliverables:**
- [ ] CHANGELOG updated
- [ ] Release tagged
- [ ] Deployment runbook created
- [ ] All requirements met

**Documentation:**
- CHANGELOG.md
- DEPLOYMENT.md
- SECURITY.md (new)

**Acceptance Criteria:**
- ✅ CHANGELOG documents all changes
- ✅ Release tagged in git
- ✅ Deployment runbook created
- ✅ Ready for production deployment

---

## 📊 Success Metrics

### Security Metrics
- ✅ 0 hardcoded secrets
- ✅ JWT in HTTP-only cookies
- ✅ OAuth state validated
- ✅ Rate limiting enforced on all endpoints
- ✅ CORS properly configured
- ✅ All input validation in place

### Performance Metrics
- ✅ N+1 queries eliminated (1 query per endpoint)
- ✅ Cache hit rate >60%
- ✅ Response time <200ms avg
- ✅ Database connection pool optimized

### Quality Metrics
- ✅ Test coverage 80%+
- ✅ Critical path coverage 90%+
- ✅ All tests passing
- ✅ Zero linting errors
- ✅ Security scan: no high-severity issues

### Process Metrics
- ✅ Timeline: 1-2 weeks (14 days)
- ✅ All requirements met
- ✅ All acceptance criteria satisfied
- ✅ Code reviewed and documented
- ✅ Deployment ready

---

## 📅 Execution Calendar

```
WEEK 1 (Days 1-5)
├─ Day 1-2: Phase 1.1 (Secrets Management)
├─ Day 2-3: Phase 1.2 (JWT Security)
├─ Day 3-4: Phase 1.3 (OAuth State)
├─ Day 4-5: Phase 1.4 (Rate Limiting)
└─ Day 5: Phase 1.5 (CORS)

WEEK 2 (Days 1-4)
├─ Day 1-2: Phase 2.1 (N+1 Queries)
├─ Day 2-3: Phase 2.2 (Caching)
├─ Day 3-4: Phase 2.3 (Database)
└─ Day 5: Phase 3.1 (Testing)

WEEK 2 (Days 1-2) [continued]
├─ Day 1: Phase 3.2 (Integration Tests)
├─ Day 2: Phase 4 (Technical Debt)
└─ Day 3-4: Phase 5 (Validation & Deployment)
```

---

## 🔄 Phase Progression

**How to Use This Roadmap:**

1. **Review** — Read through the phases and understand the flow
2. **Plan** — Run `/gsd-plan-phase 1` to create detailed tasks for Phase 1
3. **Execute** — Follow the tasks, commit changes, run tests
4. **Validate** — Check acceptance criteria before moving to next phase
5. **Progress** — Run `/gsd-plan-phase 2` after Phase 1 completion

**Commands:**
```bash
/gsd-plan-phase 1        # Plan Phase 1: Security Hardening
/gsd-plan-phase 2        # Plan Phase 2: Performance
/gsd-plan-phase 3        # Plan Phase 3: Testing
# ... etc
```

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Breaking API changes | High | Comprehensive testing before deployment |
| Database migration failures | High | Test migrations in dev, backup before prod |
| Performance regression | Medium | Benchmark before/after changes |
| Security oversight | High | Security review and scan before deployment |
| Incomplete coverage | Medium | Focus on critical paths first (90%+) |

---

## 📞 Next Steps

1. **Review this roadmap** — Understand the phase breakdown
2. **Run Phase 1 plan** — `/gsd-plan-phase 1`
3. **Execute Phase 1 tasks** — Follow the detailed tasks
4. **Complete Phase 1** — All acceptance criteria met
5. **Move to Phase 2** — `/gsd-plan-phase 2`
6. **Repeat** — Until all 5 phases complete

**Estimated Time to Completion:** 2 weeks with solo developer
**Go/No-Go Decision:** After Phase 1 (Day 5)

---

## 📋 Related Documents

- **PROJECT.md** — Project charter and context
- **REQUIREMENTS.md** — Detailed acceptance criteria
- **STACK.md** — Technology details
- **ARCHITECTURE.md** — System design
- **CONCERNS.md** — Issues being addressed
