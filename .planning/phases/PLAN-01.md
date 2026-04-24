# Books4All Phase 1 Plan: Security Hardening

**Phase:** 1 - Security Hardening
**Duration:** 5 days (40-50 hours)
**Owner:** Solo Developer
**Status:** Ready for Execution
**Created:** 2026-04-24

---

## 🎯 Phase Goal

Fix all critical and high-priority security vulnerabilities in Books4All, addressing:
1. Hardcoded secrets and API keys
2. JWT tokens in localStorage (XSS vulnerable)
3. OAuth state parameter not validated (CSRF vulnerable)
4. Missing rate limiting (brute force, DoS vectors)
5. Overpermissive CORS configuration

**Success:** All 5 security requirements implemented and tested, zero hardcoded secrets, rate limiting active on all endpoints.

---

## 📋 Phase Overview

### Deliverables

- ✅ No hardcoded secrets in codebase
- ✅ JWT in HTTP-only, Secure cookies
- ✅ OAuth state validation implemented
- ✅ Rate limiting on all endpoints (5 req/min auth, 100 req/min API)
- ✅ CORS properly configured (restrictive, not wildcard)
- ✅ All security tests passing
- ✅ Security documentation updated

### Acceptance Criteria (Hard Gates)

- ✅ `git secrets scan` finds 0 issues
- ✅ `pytest tests/test_security.py` passes 100%
- ✅ Auth tests verify HTTP-only cookies
- ✅ OAuth tests verify state validation
- ✅ Rate limit tests verify enforcement
- ✅ CORS tests verify header correctness
- ✅ Code coverage 90%+ for security code

### Team & Timeline

| Aspect | Details |
|--------|---------|
| **Duration** | 5 calendar days |
| **Hours/Day** | 8-10 hours |
| **Team** | 1 solo developer |
| **Code Review** | Self-review + git history check |
| **Deployment** | Not in this phase (Phase 5) |

---

## 🗓️ Day-by-Day Breakdown

### DAY 1: Secrets Management & Environment Setup

**Duration:** 8 hours
**Goal:** Eliminate all hardcoded secrets, implement environment-based configuration

#### Task 1.1.1: Audit for Hardcoded Secrets
**Time:** 1.5 hours
**Description:** Scan codebase for hardcoded credentials

```bash
# Run secret scanning tools
git secrets install
git secrets scan

# Search for common patterns
grep -r "password\s*=" backend/app/ --include="*.py"
grep -r "api_key\s*=" backend/app/ --include="*.py"
grep -r "secret\s*=" backend/app/ --include="*.py"
grep -r "DATABASE_URL" backend/app/ --include="*.py"
grep -r "STRIPE_KEY" backend/app/ --include="*.py"
```

**Deliverables:**
- [ ] Scan completed, list of secrets found (if any)
- [ ] Document location and type of each secret

**Success Criteria:**
- ✅ All secrets identified
- ✅ Git hooks installed to prevent future commits

---

#### Task 1.1.2: Create/Update Configuration System
**Time:** 2 hours
**Description:** Implement Settings class reading from environment

**File:** `backend/app/core/config.py`

```python
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # App config
    APP_NAME: str = "Books4All API"
    DEBUG: bool = False
    
    # Database
    DATABASE_URL: str  # Read from env
    DATABASE_POOL_SIZE: int = 20
    DATABASE_POOL_TIMEOUT: int = 30
    
    # Redis
    REDIS_URL: str  # Read from env
    
    # Stripe
    STRIPE_SECRET_KEY: str  # Read from env
    STRIPE_PUBLISHABLE_KEY: str  # Read from env
    
    # OAuth
    GOOGLE_CLIENT_ID: str  # Read from env
    GOOGLE_CLIENT_SECRET: str  # Read from env
    GITHUB_CLIENT_ID: str  # Read from env
    GITHUB_CLIENT_SECRET: str  # Read from env
    
    # JWT
    JWT_SECRET_KEY: str  # Read from env
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24
    
    # CORS
    CORS_ORIGINS: list = ["http://localhost:3000"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
```

**Tasks:**
1. Review current `config.py` (if exists)
2. Create new Settings class with all required vars
3. Add validation for required vars at startup
4. Update imports in `app/main.py` to use settings
5. Remove any hardcoded values

**Deliverables:**
- [ ] New `config.py` with Settings class
- [ ] All secrets use `os.getenv()` or pydantic defaults
- [ ] Startup validates all required env vars present
- [ ] Tests verify config reads from environment

**Success Criteria:**
- ✅ `from app.core.config import settings` works
- ✅ `pytest tests/test_config.py` passes

---

#### Task 1.1.3: Update .env.example
**Time:** 1 hour
**Description:** Create/update `.env.example` with placeholder values

**File:** `backend/.env.example`

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/books4all

# Redis
REDIS_URL=redis://localhost:6379

# Stripe (Test Keys)
STRIPE_SECRET_KEY=sk_test_YOUR_TEST_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_TEST_KEY_HERE

# OAuth - Google
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET

# OAuth - GitHub
GITHUB_CLIENT_ID=YOUR_GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET=YOUR_GITHUB_CLIENT_SECRET

# JWT
JWT_SECRET_KEY=your-secret-key-change-in-production

# CORS
CORS_ORIGINS=["http://localhost:3000"]

# Debug
DEBUG=True
```

**Tasks:**
1. Create `.env.example` if not exists
2. Add all required environment variables
3. Use clear placeholder values (no real secrets)
4. Add comments explaining each var
5. Ensure `.env` is in `.gitignore`

**Deliverables:**
- [ ] `.env.example` with all required vars
- [ ] `.env` in `.gitignore`
- [ ] Clear instructions in file

**Success Criteria:**
- ✅ `.env.example` has no real credentials
- ✅ All vars documented with comments

---

#### Task 1.1.4: Configure Services via Environment
**Time:** 2 hours
**Description:** Update database, Redis, and external service configs

**Files to Update:**
- `backend/app/core/database.py` — PostgreSQL connection
- `backend/app/core/cache.py` — Redis connection (if exists)
- `backend/app/services/` — Stripe, OAuth service configs

```python
# database.py example
from app.core.config import settings

DATABASE_URL = settings.DATABASE_URL
SQLALCHEMY_POOL_SIZE = settings.DATABASE_POOL_SIZE
SQLALCHEMY_POOL_TIMEOUT = settings.DATABASE_POOL_TIMEOUT
```

**Tasks:**
1. Update database connection to use `settings.DATABASE_URL`
2. Update Redis connection to use `settings.REDIS_URL`
3. Update Stripe client to use `settings.STRIPE_SECRET_KEY`
4. Update OAuth configs to use environment vars
5. Test all connections with actual services

**Deliverables:**
- [ ] All service configs use environment variables
- [ ] No hardcoded URLs or keys remain
- [ ] Connections tested

**Success Criteria:**
- ✅ App starts with valid `.env` file
- ✅ All services connect successfully

---

#### Task 1.1.5: Install Git Hooks
**Time:** 0.5 hours
**Description:** Prevent accidental secret commits

```bash
# Install git-secrets
brew install git-secrets  # macOS
# or: apt-get install git-secrets  # Linux

# Configure for this repo
cd /path/to/Books4All
git secrets --install
git secrets --add -a '.*[Ss]ecret.*'
git secrets --add -a '.*[Pp]assword.*'
git secrets --add -a '.*api_?key.*'
git secrets --add -a 'STRIPE_KEY'
git secrets --add -a 'OAUTH.*SECRET'
```

**Tasks:**
1. Install `git-secrets` tool
2. Initialize in repo: `git secrets --install`
3. Add patterns for common secrets
4. Test with a fake secret (should fail commit)

**Deliverables:**
- [ ] Git hooks installed
- [ ] Patterns configured
- [ ] Test commit blocked

**Success Criteria:**
- ✅ `git commit` fails with secret in message
- ✅ Hooks can't be bypassed (unless explicitly removed)

---

#### Task 1.1.6: Documentation & Testing
**Time:** 1 hour
**Description:** Document all env vars and add config tests

**New File:** `backend/docs/SECURITY.md`

```markdown
# Security Configuration

## Environment Variables

All sensitive data is configured via environment variables. Never commit real values to the repository.

### Required Variables

#### Database
- `DATABASE_URL`: PostgreSQL connection string

#### Redis
- `REDIS_URL`: Redis connection string

#### Stripe
- `STRIPE_SECRET_KEY`: Stripe API secret key (starts with `sk_`)
- `STRIPE_PUBLISHABLE_KEY`: Stripe publishable key (starts with `pk_`)

#### OAuth
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
- `GITHUB_CLIENT_ID`: GitHub OAuth app ID
- `GITHUB_CLIENT_SECRET`: GitHub OAuth app secret

#### Authentication
- `JWT_SECRET_KEY`: Secret key for JWT signing (strong random string)

## Configuration at Startup

The app validates all required environment variables when it starts.
If any are missing, startup will fail with a clear error message.

## Testing Secrets

Never use real API keys for testing. Always use test/sandbox credentials:
- Stripe: Use `sk_test_*` keys
- OAuth: Use test applications configured in provider dashboards
```

**Tests:** `backend/tests/test_config.py`

```python
import pytest
from app.core.config import settings, get_settings

def test_settings_from_env(monkeypatch):
    """Test that settings read from environment variables"""
    monkeypatch.setenv("DATABASE_URL", "postgresql://test:test@localhost/test")
    settings_obj = get_settings()
    assert settings_obj.DATABASE_URL == "postgresql://test:test@localhost/test"

def test_required_env_vars():
    """Test that app validates required env vars"""
    # This test checks startup behavior
    # Should pass with valid .env
    assert settings.DATABASE_URL
    assert settings.REDIS_URL
    assert settings.JWT_SECRET_KEY

def test_no_hardcoded_secrets():
    """Test that common hardcoded patterns don't exist"""
    import os
    backend_path = "backend/app"
    
    # Search for patterns
    for root, dirs, files in os.walk(backend_path):
        for file in files:
            if file.endswith(".py"):
                filepath = os.path.join(root, file)
                with open(filepath) as f:
                    content = f.read()
                    # Should not have these patterns
                    assert "sk_live_" not in content
                    assert "sk_test_" not in content
                    assert "DATABASE_URL=" not in content
```

**Tasks:**
1. Create `docs/SECURITY.md` documenting all env vars
2. Write unit tests for config system
3. Write integration tests for startup validation

**Deliverables:**
- [ ] `docs/SECURITY.md` complete
- [ ] `tests/test_config.py` with 100% coverage
- [ ] All tests passing

**Success Criteria:**
- ✅ Documentation clear and complete
- ✅ `pytest tests/test_config.py` passes
- ✅ Startup validation working

---

### DAY 1 SUMMARY

**Completed:**
- ✅ No hardcoded secrets in codebase
- ✅ Environment-based configuration system
- ✅ `.env.example` with placeholders
- ✅ Git hooks preventing secret commits
- ✅ Security documentation
- ✅ Configuration tests passing

**Time Used:** ~8 hours
**Tests Passing:** 100%

**Commit:**
```bash
git commit -m "feat: implement environment-based secret management

- Create Settings class reading from environment variables
- Update all service configs (DB, Redis, Stripe, OAuth)
- Add .env.example with placeholder values
- Install git-secrets hooks to prevent accidental commits
- Add security documentation for env vars
- Add comprehensive config tests

No hardcoded secrets remain in codebase.
All required env vars documented."
```

---

### DAY 2: Continue Secrets + JWT Foundation

**Duration:** 8 hours
**Goal:** Complete secrets audit, start JWT security refactoring

#### Task 1.1.7: Production Deployment Configuration
**Time:** 2 hours
**Description:** Document production deployment of secrets

**Files:**
- `docs/DEPLOYMENT.md` (new section)
- `docker-compose.yml` (review/update)
- `Dockerfile` (review/update)

**Tasks:**
1. Document production secret management (environment, secrets manager, etc.)
2. Review Dockerfile for secret leaks
3. Update docker-compose for dev (uses .env)
4. Document CI/CD secret handling

---

#### Task 1.2.1: JWT Security Architecture Review
**Time:** 1.5 hours
**Description:** Plan JWT refactoring for HTTP-only cookies

**Analysis:**
- Current JWT storage: localStorage (vulnerable)
- New approach: HTTP-only cookie (secure)
- CSRF token needed: Yes (for state-changing operations)
- Refresh token rotation: Yes (new token each refresh)

**Design:**
- Access token: 15 min, HTTP-only cookie
- Refresh token: 7 days, HTTP-only cookie (separate)
- CSRF token: Generated per session, stored in cookie
- Logout: Clear all cookies

---

#### Task 1.2.2: Create JWT Test Suite
**Time:** 2 hours
**Description:** Write tests before implementation (TDD)

**File:** `backend/tests/test_jwt_security.py`

```python
import pytest
from app.core.security import create_access_token, create_refresh_token
from fastapi.testclient import TestClient

def test_jwt_in_http_only_cookie(client: TestClient):
    """Test that JWT is in HTTP-only cookie, not body"""
    response = client.post("/api/v1/auth/login", json={
        "email": "test@example.com",
        "password": "test_password"
    })
    
    assert response.status_code == 200
    # Should NOT have token in body
    assert "access_token" not in response.json()
    # Should have Set-Cookie header
    assert "Set-Cookie" in response.headers
    # Cookie should be HTTP-only
    cookie = response.headers["Set-Cookie"]
    assert "HttpOnly" in cookie
    assert "Secure" in cookie  # Only in HTTPS
    assert "SameSite=Strict" in cookie

def test_csrf_token_required(client: TestClient):
    """Test that POST/PUT/DELETE require CSRF token"""
    # Login first
    response = client.post("/api/v1/auth/login", ...)
    
    # Try POST without CSRF token (should fail)
    response = client.post("/api/v1/books", json={...})
    assert response.status_code == 403  # Forbidden
    
    # Try POST with CSRF token (should succeed)
    csrf_token = response.headers["X-CSRF-Token"]
    response = client.post("/api/v1/books", 
        json={...},
        headers={"X-CSRF-Token": csrf_token}
    )
    assert response.status_code == 201

def test_refresh_token_rotation(client: TestClient):
    """Test that refresh token creates new access token"""
    # Login
    response = client.post("/api/v1/auth/login", ...)
    
    # Use refresh token
    response = client.post("/api/v1/auth/refresh")
    assert response.status_code == 200
    
    # Should get new access token in cookie
    assert "Set-Cookie" in response.headers

def test_logout_clears_cookies(client: TestClient):
    """Test that logout clears all auth cookies"""
    # Login
    client.post("/api/v1/auth/login", ...)
    
    # Logout
    response = client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    
    # Cookies should be cleared (Set-Cookie with Max-Age=0)
    assert "Max-Age=0" in response.headers["Set-Cookie"]

def test_token_expiry(client: TestClient):
    """Test that expired tokens are rejected"""
    # Create expired token
    expired_token = create_access_token(
        data={"sub": "test@example.com"},
        expires_delta=timedelta(seconds=-1)
    )
    
    # Try to use it
    response = client.get("/api/v1/books", 
        headers={"Authorization": f"Bearer {expired_token}"}
    )
    assert response.status_code == 401
```

**Deliverables:**
- [ ] Comprehensive JWT security test suite
- [ ] Tests document expected behavior
- [ ] All tests currently failing (red phase)

---

#### Task 1.2.3: Security Code Review
**Time:** 2 hours
**Description:** Review current JWT implementation

**Files to Review:**
- `backend/app/core/security.py` — JWT functions
- `backend/app/api/v1/endpoints/auth.py` — Auth endpoints
- `backend/app/dependencies.py` — Auth dependency

**Tasks:**
1. Review JWT creation and validation logic
2. Document current token storage mechanism
3. Identify all places where token is used/stored
4. Plan migration path (backward compatibility if needed)

---

#### Task 1.2.4: Baseline Metrics
**Time:** 0.5 hours
**Description:** Capture current state for before/after comparison

```bash
# Count tokens in localStorage references
grep -r "localStorage" frontend/ | grep -i token | wc -l

# Count JWT-related code
grep -r "JWT\|jwt\|token" backend/app/ | grep -E "\.py:" | wc -l

# Current test coverage for auth
pytest tests/ -k "auth" --cov=app.api.v1.endpoints.auth
```

---

### DAY 2 SUMMARY

**Completed:**
- ✅ Production deployment configuration documented
- ✅ JWT refactoring plan created
- ✅ Comprehensive test suite written (TDD approach)
- ✅ Current implementation reviewed
- ✅ Baseline metrics captured

**Time Used:** ~8 hours
**Next:** Implement JWT changes (Days 3+)

**Commit:**
```bash
git commit -m "test: add JWT security test suite (TDD)

Tests for:
- HTTP-only cookie storage (not response body)
- CSRF token requirement for state changes
- Refresh token rotation
- Logout clears cookies
- Token expiration handling

All tests currently failing (red phase).
Implementation follows in next iteration."
```

---

### DAY 3: JWT Security Implementation

**Duration:** 8 hours
**Goal:** Implement HTTP-only cookies, CSRF tokens, refresh token rotation

[Continues with implementation tasks...]

---

### DAY 4: OAuth State Validation

**Duration:** 8 hours
**Goal:** Implement OAuth state parameter validation

[Implementation tasks...]

---

### DAY 5: Rate Limiting & CORS

**Duration:** 8 hours
**Goal:** Implement rate limiting and finalize CORS configuration

[Implementation tasks...]

---

## 🧪 Testing Strategy

### Unit Tests
- Config system: 10+ tests
- JWT security: 15+ tests
- OAuth state: 8+ tests
- Rate limiting: 10+ tests
- CORS: 5+ tests

### Integration Tests
- Auth flow (login, register, logout): 5 tests
- OAuth flow (Google, GitHub): 4 tests
- Refresh token: 3 tests
- Rate limit enforcement: 5 tests

### Security Tests
- Secret scanning: `git secrets scan`
- Static analysis: `bandit app/`
- Dependency check: `pip audit`

### Test Coverage Target
- Overall: 80%+
- Security code: 90%+
- Auth endpoints: 90%+

---

## ✅ Definition of Done

For Phase 1 to be complete:

1. **Code Complete**
   - All 5 security requirements implemented
   - Code follows project conventions
   - No hardcoded secrets
   - No security warnings in code scan

2. **Tests Complete**
   - All new tests passing
   - 90%+ coverage for security code
   - No test regressions
   - Integration tests pass

3. **Documentation**
   - Security documentation updated
   - Code comments explain security choices
   - Deployment docs updated
   - API docs updated if endpoints changed

4. **Review & Commit**
   - Self-reviewed all changes
   - Commits have clear messages
   - Git history is clean

5. **Validation**
   - All acceptance criteria met
   - Manual security checklist completed
   - Performance baseline captured

---

## 🎯 Success Criteria (Phase Gate)

### Hard Requirements (Must Pass)

- ✅ `git secrets scan` returns 0 issues
- ✅ `pytest tests/test_security.py -v` passes 100%
- ✅ `pytest tests/test_config.py -v` passes 100%
- ✅ No `print()` statements in auth code
- ✅ All docstrings present
- ✅ Coverage report shows 90%+ for security code

### Soft Requirements (Should Pass)

- ✅ Code is readable and maintainable
- ✅ Error messages are user-friendly
- ✅ Performance impact <5%
- ✅ No new dependencies added (or justified)

### Phase Review

After Day 5, verify:
- [ ] All deliverables complete
- [ ] All acceptance criteria met
- [ ] All tests passing
- [ ] Ready to move to Phase 2

**If not complete:** Extend 1-2 days max, then move forward (can refine in later phases)

---

## 📊 Metrics & Tracking

### Daily Standup (Track These)

| Metric | Target | Day 1 | Day 2 | Day 3 | Day 4 | Day 5 |
|--------|--------|-------|-------|-------|-------|-------|
| Hardcoded Secrets | 0 | TBD | TBD | 0 | 0 | 0 |
| Tests Passing | 100% | 70% | 80% | 90% | 95% | 100% |
| Code Coverage | 90% | 50% | 60% | 75% | 85% | 90% |
| Security Scan | Clean | TBD | TBD | TBD | TBD | Clean |

### Burn Down

```
8 hours ├─ Day 1: Secrets Management
        │
8 hours ├─ Day 2: JWT Foundation + Tests  
        │
8 hours ├─ Day 3: JWT Implementation
        │
8 hours ├─ Day 4: OAuth State Validation
        │
8 hours └─ Day 5: Rate Limiting + CORS + Testing
```

---

## 🚀 Execution Commands

```bash
# Day 1: Start
cd /path/to/Books4All
python -m pytest tests/test_config.py -v

# Day 1-5: Regular testing
pytest tests/test_security.py -v --cov=app.api.v1.endpoints.auth

# Day 5: Final validation
pytest tests/ -k "security or auth" --cov=app --cov-report=html
git secrets scan
bandit -r backend/app/

# After Phase 1: Commit and prepare for Phase 2
git log --oneline | head -20
/gsd-plan-phase 2
```

---

## 📚 Reference Documents

- **REQUIREMENTS.md** — Detailed acceptance criteria
- **ROADMAP.md** — Overall roadmap context
- **STACK.md** — Technology stack details
- **ARCHITECTURE.md** — System architecture
- **CONCERNS.md** — Issues being addressed

---

## 🔄 Phase Progression

**After Phase 1 Complete:**
1. Validate all acceptance criteria
2. Commit changes with clear message
3. Update STATE.md with completion status
4. Run `/gsd-plan-phase 2` for Phase 2

**If Blocked:**
- Check CONCERNS.md for similar issues
- Query knowledge graph: `/gsd-graphify query "security"`
- Search memory for solutions: `node ~/.claude/get-shit-done/bin/gsd-tools.cjs memory search --query "JWT cookies"`

---

**Ready to execute. Start with Day 1 tasks above.**
