# Books4All Requirements: Security & Technical Debt Remediation

**Phase:** Initial Release (Security Focus)
**Timeline:** 1-2 weeks
**Scope:** Address critical security vulnerabilities, performance issues, and technical debt
**Team:** Solo developer

---

## ✅ Requirements Overview

### Summary

Fix 9 critical/high security issues, 5 performance bottlenecks, and 8 areas of technical debt identified in the codebase audit. This is not a feature release—it's a stability and security hardening pass.

---

## 🔐 SECURITY REQUIREMENTS

### S1: Secrets Management
**Status:** Critical
**Requirement:** No hardcoded API keys, database passwords, or secrets in source code.

**Current State:**
- Secrets stored in `.env` files (not committed, good)
- Config may reference secrets directly in some places

**Acceptance Criteria:**
- [ ] All secrets use environment variables via Python `os.getenv()`
- [ ] No secrets appear in `.env.example` (only placeholder values like `your-api-key-here`)
- [ ] Config system reads from `config.py` (Settings class) validated at startup
- [ ] Dockerfile uses multi-stage builds and doesn't expose secrets in layers
- [ ] Git hooks prevent accidental secret commits (run `git secrets install`)

**Files to Audit:**
- `app/core/config.py` — Settings class
- `alembic.ini` — Database connection string
- `Dockerfile` — Build secrets
- `docker-compose.yml` — Service credentials

**Tests:**
- Unit tests verify all secrets come from environment
- `pytest` includes secret scanning

---

### S2: JWT Security
**Status:** Critical
**Requirement:** JWT tokens must NOT be stored in localStorage (XSS vulnerable).

**Current State:**
- Tokens currently in localStorage
- Vulnerable to XSS attacks
- No HTTP-only cookie mechanism

**Acceptance Criteria:**
- [ ] JWT moved to HTTP-only, Secure cookies
- [ ] `sameSite=Strict` set on all cookies
- [ ] Refresh token in separate HTTP-only cookie
- [ ] Frontend removes localStorage token code
- [ ] CSRF token mechanism implemented for state-changing operations
- [ ] Cookie expiry: Access token 15 min, Refresh token 7 days

**Files to Modify:**
- `backend/app/api/v1/endpoints/auth.py` — Token generation
- `backend/app/core/security.py` — JWT creation logic
- `frontend/src/hooks/useAuth.ts` — Token handling
- `frontend/src/services/api.ts` — Request interceptors

**Tests:**
- Auth tests verify cookies are HTTP-only
- Integration tests confirm no localStorage tokens
- Session tests verify refresh token rotation

---

### S3: OAuth State Validation
**Status:** Critical
**Requirement:** OAuth state parameter MUST be validated to prevent CSRF in OAuth flows.

**Current State:**
- OAuth state parameter may not be validated
- Vulnerability: attacker could hijack OAuth callback

**Acceptance Criteria:**
- [ ] State parameter generated as cryptographically secure random string
- [ ] State stored in session (Redis) with 10-minute TTL
- [ ] OAuth callback validates state matches stored value
- [ ] Invalid state returns 400 Bad Request
- [ ] State parameter cleared after validation

**Files to Modify:**
- `backend/app/services/auth_service.py` — OAuth flow methods
- `backend/app/api/v1/endpoints/auth.py` — OAuth callback endpoint

**Tests:**
- Unit tests for state generation and validation
- Integration tests simulate OAuth callback with invalid state
- Tests verify state is cleared after use

---

### S4: Rate Limiting
**Status:** High
**Requirement:** All public endpoints must have rate limiting to prevent abuse.

**Current State:**
- No rate limiting implemented
- Brute force attacks possible on auth endpoints
- Spam/DoS vectors open

**Acceptance Criteria:**
- [ ] Redis-based rate limiting using `slowapi` or similar
- [ ] Auth endpoints: 5 requests per minute per IP
- [ ] API endpoints: 100 requests per minute per user (authenticated), 30 per IP (unauthenticated)
- [ ] Rate limit headers in responses (X-RateLimit-*)
- [ ] 429 Too Many Requests response on limit exceeded

**Files to Modify:**
- `backend/app/core/config.py` — Rate limit configuration
- `backend/app/main.py` — Add rate limiter middleware
- `backend/app/api/v1/endpoints/*.py` — Apply limiters to endpoints

**Tests:**
- Tests verify rate limit enforcement
- Tests confirm 429 response code
- Tests check rate limit reset behavior

---

### S5: CORS Configuration
**Status:** High
**Requirement:** CORS must be restrictive and explicitly configured.

**Current State:**
- CORS may be overpermissive or missing

**Acceptance Criteria:**
- [ ] CORS allows only specific origins (not wildcard `*`)
- [ ] Allowed origins: `https://localhost:3000` (dev), `https://books4all.com` (prod)
- [ ] Credentials allowed: `true` (for cookies)
- [ ] Methods: `GET`, `POST`, `PUT`, `DELETE` only
- [ ] Headers: standard only (Content-Type, Authorization)
- [ ] Preflight cache: 600 seconds

**Files to Modify:**
- `backend/app/main.py` — CORS middleware configuration
- `backend/app/core/config.py` — CORS settings

**Tests:**
- Unit tests verify CORS headers
- Integration tests test preflight requests
- Tests confirm wildcard origins are rejected

---

### S6: Input Validation
**Status:** High
**Requirement:** All user inputs must be validated before processing.

**Current State:**
- Pydantic schemas exist but may have gaps
- Some endpoints may skip validation

**Acceptance Criteria:**
- [ ] All request bodies validated via Pydantic schemas
- [ ] All query/path parameters validated
- [ ] File uploads validated (size, mime type, dimensions for images)
- [ ] String inputs sanitized (no HTML injection)
- [ ] Email format validated
- [ ] Phone numbers validated where required

**Files to Modify:**
- `backend/app/schemas/` — Review and enhance all schemas
- `backend/app/api/v1/endpoints/` — Ensure validation is applied

**Tests:**
- Unit tests for all schema validators
- Integration tests with invalid inputs
- Security tests for injection attacks

---

## ⚡ PERFORMANCE REQUIREMENTS

### P1: N+1 Query Resolution
**Status:** High
**Requirement:** Eliminate N+1 query patterns in book listings and order summaries.

**Current State:**
- Book listing endpoint may load seller info per book
- Order listing may load user/book info per order
- Results in 1 + N database queries

**Acceptance Criteria:**
- [ ] Book listings use eager loading (SQLAlchemy `joinedload`)
- [ ] Order queries use `selectinload` for relationships
- [ ] Search endpoint optimized with indexes
- [ ] Query count validated in tests

**Files to Modify:**
- `backend/app/repositories/book.py` — Book queries
- `backend/app/repositories/order.py` — Order queries
- `backend/app/models/` — Add indexes where needed

**Tests:**
- Query count tests using SQLAlchemy query logger
- Performance benchmarks before/after
- Integration tests confirm correct data returned

---

### P2: Caching Strategy
**Status:** High
**Requirement:** Implement caching for hot reads (book listings, categories).

**Current State:**
- No application-level caching
- Database queried for every request

**Acceptance Criteria:**
- [ ] Redis caching for book listings (5-minute TTL)
- [ ] Cache invalidation on book updates
- [ ] ETag/Last-Modified headers for HTTP caching
- [ ] Cache key strategy: `books:search:{query}:{filters}:{page}`
- [ ] Cache hit ratio target: >60% for GET requests

**Files to Modify:**
- `backend/app/services/book_service.py` — Add caching layer
- `backend/app/core/cache.py` — Cache utility functions
- `backend/app/api/v1/endpoints/books.py` — Add ETag support

**Tests:**
- Cache behavior tests (hit/miss, expiry)
- Invalidation tests (cache cleared on updates)
- HTTP cache header tests

---

### P3: Database Optimization
**Status:** Medium
**Requirement:** Optimize database connection pooling and query performance.

**Current State:**
- Connection pooling may have low limits
- Migrations may be missing indexes

**Acceptance Criteria:**
- [ ] Connection pool size: 20 (prod), 10 (dev)
- [ ] Idle timeout: 30 seconds
- [ ] Query timeout: 30 seconds
- [ ] Indexes on frequently queried columns (user_id, created_at, status)
- [ ] Slow query logs enabled in PostgreSQL
- [ ] Query plans analyzed and optimized

**Files to Modify:**
- `backend/app/core/database.py` — Connection pool config
- `backend/alembic/versions/` — New migration for indexes

**Tests:**
- Integration tests verify connection pooling
- Performance tests on large datasets

---

## 🛠️ TECHNICAL DEBT REQUIREMENTS

### T1: Logging Standards
**Status:** Medium
**Requirement:** Replace print statements with proper logging.

**Current State:**
- Print statements scattered in code
- No structured logging
- Difficult to debug in production

**Acceptance Criteria:**
- [ ] All print statements replaced with `logger.info()`, `logger.error()`, etc.
- [ ] Logging configured with appropriate levels (DEBUG, INFO, WARNING, ERROR)
- [ ] Log format includes: timestamp, level, module, message
- [ ] Sensitive data (passwords, tokens) never logged

**Files to Modify:**
- All Python files — Replace `print()` with logging

**Tests:**
- Linting rules enforce no print statements
- Code review checks for logging best practices

---

### T2: Error Handling
**Status:** Medium
**Requirement:** Consistent error handling and response format.

**Current State:**
- Error responses may be inconsistent
- Missing structured error codes

**Acceptance Criteria:**
- [ ] All errors return JSON with structure: `{ error_code, message, details }`
- [ ] HTTP status codes match error type
- [ ] Custom exceptions map to HTTP status codes
- [ ] Error messages are user-friendly (no stack traces in API)

**Files to Modify:**
- `backend/app/main.py` — Exception handlers
- `backend/app/services/exceptions.py` — Custom exception hierarchy

**Tests:**
- Tests verify error response format
- Tests confirm correct HTTP status codes
- Tests for error message clarity

---

### T3: Testing Gaps
**Status:** Medium
**Requirement:** Improve test coverage to 80%+, especially for critical paths.

**Current State:**
- Coverage: ~65%
- Gaps in service layer and security-critical code

**Acceptance Criteria:**
- [ ] Unit test coverage: 80%+ overall
- [ ] Critical paths (auth, payments): 90%+
- [ ] Integration tests for payment flows
- [ ] Security tests for CORS, rate limiting, input validation
- [ ] All tests pass locally and in CI/CD

**Files to Modify:**
- `backend/tests/` — Add missing test cases
- `pytest.ini` — Coverage targets

**Tests:**
- `pytest --cov` shows 80%+ coverage
- CI/CD blocks merge if coverage drops

---

### T4: Documentation
**Status:** Low
**Requirement:** Code documentation and README completeness.

**Current State:**
- Docstrings may be missing
- README could be more detailed

**Acceptance Criteria:**
- [ ] All functions have docstrings (Google format)
- [ ] Complex logic explained with comments
- [ ] README includes: setup, running, testing, deployment
- [ ] API endpoints documented (or use FastAPI auto-docs)

**Files to Modify:**
- All Python files — Add docstrings
- `backend/README.md` — Expand documentation

**Tests:**
- Docstring completeness checked (pydocstyle)

---

## 📋 Acceptance Criteria Summary

All requirements MUST be met for this phase to be considered complete:

- ✅ 0 hardcoded secrets in repository
- ✅ JWT in HTTP-only cookies
- ✅ OAuth state validated
- ✅ Rate limiting on all endpoints
- ✅ CORS properly configured
- ✅ Input validation complete
- ✅ N+1 queries resolved
- ✅ Caching implemented
- ✅ 80%+ test coverage
- ✅ All security tests passing
- ✅ All performance tests show improvement

---

## 📊 Definition of Done

For each requirement to be considered "done":

1. **Code complete** — Implementation follows acceptance criteria
2. **Tests written** — Unit and integration tests added
3. **Tests passing** — All new tests pass, no regressions
4. **Code review** — Self-reviewed or peer-reviewed
5. **Documentation** — Code documented, README updated
6. **Committed** — Changes committed with clear message

---

## 🔄 Change Management

- **Change Request:** File issue or comment in `.planning/` docs
- **Approval:** Solo approval (you decide)
- **Priority:** Adjust in ROADMAP.md and re-plan with `/gsd-plan-phase`
- **Blocking Issues:** Document in CONCERNS.md

---

## 📞 Dependencies & Risks

**External Dependencies:**
- Stripe API (payments) — No changes needed
- OAuth providers (Google, GitHub) — Using their test keys

**Risks:**
- Breaking changes in API if security fixes require client updates
- Migration testing crucial (can't break existing data)
- Performance changes may affect user experience temporarily

**Mitigation:**
- Test all changes in dev environment first
- Keep database backups before migrations
- Monitor performance metrics before/after
