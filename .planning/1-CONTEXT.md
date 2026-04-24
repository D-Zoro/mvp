# Phase 1: Critical Security Fixes — Implementation Context

**Phase:** 1 (Weeks 1-2)  
**Goal:** Resolve 7 critical security vulnerabilities  
**Status:** Context Finalized - Ready for Research & Planning  
**Decisions Made By:** Project Lead / Architect

---

## Executive Summary

Phase 1 focuses on hardening authentication, authorization, input validation, and session management. All decisions below are **locked** for this phase. Downstream agents (researcher, planner) should use these decisions to scope their work without re-asking the user.

---

## 1. AUTHENTICATION & TOKEN STRATEGY

### Decision: HTTP-Only Cookies Only

**What This Means:**
- Tokens (access + refresh) stored in HTTP-only, Secure cookies
- JavaScript cannot access tokens (prevents XSS theft)
- Browser automatically sends cookies with requests
- No localStorage; localStorage support deprecated but maintained for backward compatibility

**Token Lifetime Configuration:**
- **Access Token:** 15 minutes (short-lived)
  - Scope: Most API requests
  - Stored: HTTP-only cookie
  - Refresh: Automatic before expiry
- **Refresh Token:** 7 days (long-lived)
  - Scope: Only for obtaining new access token
  - Stored: HTTP-only cookie
  - Rotation: New refresh token issued on every refresh

**Cookie Security Attributes:**
- `HttpOnly: true` — No JS access (XSS protection)
- `Secure: true` — HTTPS only
- `SameSite: Strict` — No cross-site requests (CSRF protection)
- `Domain: books4all.com` — Frontend domain
- `Path: /` — All routes

**Backward Compatibility:**
- Keep localStorage token reading logic (deprecated, warn users)
- New clients use cookies automatically
- Migration window: 2 releases (inform users to clear localStorage)

**Implications for:**
- **Frontend:** Update `useAuth()` hook to read from cookies (no JS access, automatic)
- **Backend:** All login/register/refresh endpoints set cookies
- **Mobile Apps:** If supported, provide token endpoint for non-browser clients

---

## 2. OAUTH2 & PKCE IMPLEMENTATION

### Decision: Full PKCE + State Validation

**OAuth State Validation:**
- Generate random 32-byte state: `state = secrets.token_urlsafe(32)`
- Store in Redis with 10-minute TTL
- Validate on callback before token exchange
- One-time use: Delete from Redis after validation
- Error: Return 400 Bad Request if state invalid/expired

**PKCE (Proof Key for Code Exchange) - RFC 7636:**
- Generate code_verifier: `code_verifier = base64url(random_32_bytes)`
- Create code_challenge: `code_challenge = base64url(sha256(code_verifier))`
- Include code_challenge in authorization URL
- Include code_verifier in token exchange
- OAuth providers (Google, GitHub) validate match

**Nonce Parameter (OpenID Connect):**
- If provider supports ID tokens, include nonce
- Store nonce in Redis/session
- Validate nonce in returned ID token

**What This Prevents:**
- CSRF attacks (state validation)
- Authorization code interception (PKCE)
- Session fixation (state one-time use)
- Account hijacking (nonce validation)

**Providers Affected:**
- Google OAuth2 (supports PKCE, state, nonce)
- GitHub OAuth2 (supports PKCE, state)
- Any future OIDC provider

**Implications for:**
- **Backend:** Implement state/nonce generation, storage, validation
- **Frontend:** Include state/code_challenge in authorization request
- **Testing:** Security tests for invalid state, expired state, reused state

---

## 3. SESSION REVOCATION & TOKEN BLACKLIST

### Decision: Database Table for Revoked Tokens

**Token Revocation Mechanism:**
- Store revoked token metadata in `revoked_tokens` table
- Metadata: `jti` (JWT ID), `user_id`, `revoked_at`, `reason`
- TTL: Match token expiry time (clean up expired entries)
- Check on every authenticated request: Is JTI in revoked list?

**When Tokens Are Revoked:**
1. **Logout:** User explicitly logs out
   - Revoke all access + refresh tokens for that session
   - Invalidate refresh token immediately
2. **Password Change:** Security event
   - Revoke all active tokens for the user
   - Force re-authentication
3. **Account Suspension:** Admin action
   - Revoke all tokens for the user
4. **Device Logout:** User logs out on one device
   - Revoke only that session's tokens (if session tracking exists)

**Performance Optimization:**
- Cache revocation list in Redis (short TTL: 5 minutes)
- Check Redis first, fall back to DB on cache miss
- Async job: Clean up expired entries from DB (nightly)

**Implications for:**
- **Backend:** Add JTI claim to JWT, implement revocation check
- **Database:** Create `revoked_tokens` table with indexes
- **Caching:** Redis cache for revocation list
- **Testing:** Verify revoked tokens are rejected, cleanup works

---

## 4. INPUT VALIDATION & SANITIZATION

### Decision: Schema Validation (Current Approach)

**Validation Method:**
- Continue using Pydantic schemas for request validation
- Each endpoint defines input schema: `POST /books/create` uses `CreateBookSchema`
- Pydantic validators handle type coercion, range checking, format validation
- Custom validators for business logic (e.g., "stock > 0")

**What Gets Validated:**
- Type correctness (string, int, email format)
- Range/length (1-500 chars, age 13+)
- Enum values (status in ["draft", "published", "archived"])
- Custom patterns (ISBN format, username alphanumeric)
- Required vs optional fields
- Nested objects and arrays

**Error Handling:**
- Return 422 Unprocessable Entity on validation failure
- Include field-level error messages in response
- Log validation errors for monitoring
- Never expose internal validation logic in error messages

**What This Does NOT Cover (Phase 2):**
- SQL injection protection (parameterized queries already in place)
- XSS prevention (sanitize on frontend, set CSP headers)
- Rate limiting (separate concern, also Phase 1 but independent)

**Implications for:**
- **Backend:** Audit existing Pydantic schemas, add missing validators
- **Frontend:** Mirror validation on client-side for UX (not security)
- **Testing:** Unit tests for each validator, edge cases

---

## 5. SECRETS MANAGEMENT VALIDATION

### Decision: Validate + Warn (Gradual Migration)

**Validation Approach:**
- Add Pydantic field validators in `config.py`
- On application startup, validate all secrets
- If hardcoded detected in production: **WARN in logs, do not fail startup**
- If hardcoded in development/test: **WARN in logs, allow startup**

**Secrets to Validate:**
1. `SECRET_KEY` — FastAPI secret key
   - Check: ≥32 characters
   - Check: Not "change-this" or default values
   - Warn: Log if default detected
2. `STRIPE_SECRET_KEY` — Stripe API key
   - Check: Must start with `sk_live_` in production
   - Check: Not `sk_test_` in production
   - Warn: Log if test key in production
3. `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret
   - Check: Must start with `whsec_` in production
   - Warn: Log if missing
4. `DATABASE_URL` — PostgreSQL connection
   - Check: Not using default password
   - Check: Uses `postgresql://`, not hardcoded
   - Warn: Log if password visible in URL
5. `AWS_SECRET_ACCESS_KEY` / `AWS_ACCESS_KEY_ID` — S3/MinIO
   - Check: Not MinIO default values
   - Check: Not hardcoded in code
   - Warn: Log if using defaults

**Migration Strategy:**
- Phase 1: Validate + warn (log clearly which secrets need updating)
- Phase 1.5: Operators update environment variables
- Phase 2: Optional: Switch to strict mode (fail on hardcoded)

**Implementation:**
```python
@root_validator
def validate_secrets(cls, values):
    if values.get('environment') == 'production':
        if values.get('SECRET_KEY') == 'change-this':
            logger.warning("SECRET_KEY is still default. Set via env var.")
        if values.get('STRIPE_SECRET_KEY', '').startswith('sk_test'):
            logger.warning("STRIPE_SECRET_KEY is test key in production!")
    return values
```

**What's NOT in Scope (Defer to Phase 2):**
- Key rotation procedure (operational, not in Phase 1 code)
- Secrets manager integration (e.g., HashiCorp Vault)
- Audit logging of secrets access (observability concern)

**Implications for:**
- **Deployment:** Require all secrets in environment variables
- **Documentation:** Update `.env.example` with descriptions (no real values)
- **CI/CD:** Pre-commit hook to prevent secrets in git
- **Testing:** Test that validation catches hardcoded values

---

## 6. RATE LIMITING

### Decision: Per-Endpoint Limits

**Rate Limit Tiers:**

| Endpoint | Limit | Window | Protection |
|---|---|---|---|
| `/auth/login` | 5 | 1 minute | Brute force |
| `/auth/register` | 3 | 1 minute | Account creation spam |
| `/auth/request-password-reset` | 3 | 1 minute | Email spam |
| `/api/search` | 10 | 1 minute | Scraping |
| `/api/books` (write) | 50 | 1 hour | Spam listings |
| `/api/orders` | 20 | 1 hour | Payment spam |
| Default (other endpoints) | 100 | 1 minute | General protection |

**Implementation:**
- Use Redis for distributed rate limiting (supports horizontal scaling)
- Key: `rate_limit:{endpoint}:{user_id_or_ip}`
- Check limit on each request
- Return 429 Too Many Requests if exceeded
- Include headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

**Scope:**
- Authenticated endpoints: Limit per user_id
- Public endpoints: Limit per IP address
- Mobile apps: Can request higher limits (future expansion)

**What's NOT Included (Phase 2):**
- Adaptive rate limiting (based on bot detection)
- User-facing UI for rate limit info
- Exceptions for trusted partners

**Implications for:**
- **Backend:** Implement rate limit middleware/decorator
- **Testing:** Load testing to verify limits work
- **Ops:** Monitor rate limit hits, adjust if needed

---

## 7. CSRF PROTECTION

### Decision: SameSite=Strict + CSRF Token Headers

**CSRF Protection Layers:**

**Layer 1: SameSite Cookie Attribute**
- `SameSite: Strict` on all authentication cookies
- Browser prevents sending cookies on cross-site requests
- Protects against CSRF automatically for modern browsers

**Layer 2: CSRF Token Header**
- Generate CSRF token: `token = secrets.token_urlsafe(32)`
- Include in response HTML as meta tag: `<meta name="csrf-token">`
- Frontend reads token from meta tag
- Frontend sends token in request header: `X-CSRF-Token: {token}`
- Backend verifies token matches session/user

**When CSRF Token is Required:**
- All state-changing requests (POST, PUT, DELETE, PATCH)
- Except login/register (CORS-preflight handles CSRF for new sessions)
- GET requests: No CSRF token needed (read-only)

**Implementation:**
```python
# Backend: Generate token on form render
@app.get("/books/create")  # Form page
async def create_book_form():
    csrf_token = generate_csrf_token()
    return {"csrf_token": csrf_token}

# Backend: Verify token on submission
@app.post("/books")
async def create_book(request: Request):
    token = request.headers.get("X-CSRF-Token")
    if not verify_csrf_token(token):
        raise HTTPException(403, "CSRF token invalid")
    # Process request
```

**Defense-in-Depth Rationale:**
- SameSite covers modern browsers (99%+)
- CSRF token covers legacy browsers + edge cases
- Together: Near-100% protection against CSRF

**Implications for:**
- **Frontend:** Read CSRF token from meta tag, send in headers
- **Backend:** Generate, store, and validate tokens
- **Testing:** Test CSRF protection with invalid/missing tokens

---

## 8. STOCK RACE CONDITION PREVENTION

### Decision: Hybrid Approach (Both Pessimistic + Optimistic)

**Strategy:**

**Primary (for critical purchases):** Pessimistic Locking
- When buyer attempts to purchase: `SELECT * FROM books FOR UPDATE WHERE id = ?`
- Row is locked, other requests wait
- Check: `if stock > 0: stock -= 1`
- Unlock: Transaction commits
- Prevents double-selling
- Cost: Slight latency, but safe for rare items

**Secondary (for bulk operations):** Optimistic Locking
- Store `version` on Books row
- When updating: `UPDATE books SET stock = ?, version = version + 1 WHERE id = ? AND version = ?`
- If row's version changed, UPDATE fails (0 rows affected)
- Retry logic: Ask user to refresh and try again

**Use Cases:**
- **Pessimistic:** Checkout flow, last item in stock, high-value books
- **Optimistic:** Bulk uploads, admin operations, low-contention updates

**Implementation:**
```python
# Pessimistic for checkout
async def checkout_book(book_id: int, user_id: int):
    async with db.transaction():
        book = await db.query(Book).with_for_update().filter(Book.id == book_id).first()
        if book.stock <= 0:
            raise OutOfStock()
        book.stock -= 1
        # Transaction auto-commits when exiting context

# Optimistic for admin updates
async def bulk_update_books(updates: List[BookUpdate]):
    for update in updates:
        result = await db.execute(
            update(Book)
            .where(Book.id == update.id)
            .where(Book.version == update.version)
            .values(stock=update.stock, version=Book.version + 1)
        )
        if result.rowcount == 0:
            raise OptimisticLockFailure()
```

**Implications for:**
- **Backend:** Add `version` column to Books table, implement locking logic
- **Database:** Index on `(id, version)` for optimistic locking
- **Frontend:** Handle OptimisticLockFailure with user-friendly message
- **Testing:** Concurrent purchase tests, simulate race conditions

---

## Deferred Ideas (Not Phase 1)

- **Key rotation procedure:** Operational process, not code
- **Secrets manager integration:** Phase 2 improvement (Vault, AWS Secrets Manager)
- **Advanced CORS:** Currently using allowlist; CORS origin validation handled
- **IP whitelisting:** Can add later if needed for API keys
- **Bot detection / adaptive rate limiting:** Phase 2 feature
- **OAuth provider rotation:** Out of scope for this project

---

## Testing & Validation Strategy

**Security Tests (Unit):**
- [ ] OAuth state validation rejects invalid state
- [ ] PKCE code_challenge/code_verifier validation works
- [ ] Revoked tokens are rejected
- [ ] CSRF token validation works
- [ ] Rate limits are enforced
- [ ] Input validation catches invalid data
- [ ] Password reset tokens are one-time use

**Integration Tests:**
- [ ] Full OAuth flow (state → code → token exchange)
- [ ] Login → token in cookie → authenticated request → logout
- [ ] Stock purchase with concurrent requests
- [ ] Rate limit across distributed systems (Redis)

**Security Code Review:**
- [ ] No secrets in code or logs
- [ ] All user input validated
- [ ] All state-changing requests protected with CSRF
- [ ] Password reset tokens use JWTs with expiry
- [ ] Error messages don't leak sensitive info

---

## Success Criteria for Phase 1

✅ All 7 security fixes implemented  
✅ 100% of authenticated endpoints use HTTP-only cookies  
✅ OAuth validates state + PKCE  
✅ Token revocation works on logout/password-change  
✅ All input validated via Pydantic schemas  
✅ Secrets validated + warnings logged (not enforced)  
✅ Rate limiting deployed on sensitive endpoints  
✅ CSRF protection: SameSite + token headers  
✅ Stock race conditions prevented (pessimistic + optimistic)  
✅ Security test coverage ≥90%  
✅ Code review sign-off from security team  
✅ All documented in deployment guide  

---

## What Downstream Agents Should Do

**gsd-phase-researcher:**
- Research implementation patterns for HTTP-only cookies in FastAPI
- Research PKCE flow with Python libraries
- Research Redis-based rate limiting
- Research SQL row locking patterns in SQLAlchemy

**gsd-planner:**
- Create task breakdown for each of 7 security fixes
- Identify dependencies (e.g., DB migration for revoked_tokens table before code)
- Estimate effort per task
- Plan testing & code review workflow
- Create validation gates for each fix

**Critical Path:**
1. Database migrations (revoked_tokens table, Books.version column)
2. Authentication system (cookies, token generation, refresh)
3. Input validation (Pydantic schemas)
4. OAuth improvements (state, PKCE)
5. Session revocation logic
6. Rate limiting
7. CSRF protection
8. Stock race condition fix
9. Testing & integration

---

## Sign-Off

**Phase:** 1 - Critical Security Fixes  
**Date:** 2026-04-24  
**Approved By:** Project Lead / Architect  
**Status:** Ready for Research & Planning  

Ready for `/gsd-plan-phase 1` execution planning.
