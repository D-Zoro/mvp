# Books4All Security & Quality Audit — Requirements

**Document Version:** 1.0  
**Date:** April 24, 2026  
**Phase:** Security & Quality Audit (GSD)  
**Status:** Active

---

## 1. GOAL

Audit and remediate critical security vulnerabilities, performance bottlenecks, and technical debt in the Books4All peer-to-peer book marketplace while maintaining full platform functionality and data integrity.

### Success Outcome
- ✅ All 7 identified critical security issues resolved
- ✅ Performance baseline established; measurable improvements in query time and throughput
- ✅ Test coverage meets 80%+ target with focus on security-critical paths
- ✅ Technical debt prioritized and remediation roadmap established
- ✅ Architecture aligned with Domain-Driven Design principles

---

## 2. SCOPE

### In Scope
**Security:**
- Secrets management and environment variable validation
- JWT token storage and authentication flow hardening
- OAuth state validation and CSRF protection
- Session management and token revocation
- Input validation and sanitization
- Password reset token security
- Rate limiting improvements

**Performance:**
- N+1 query pattern elimination via eager loading
- Application-level caching strategy with cache invalidation
- Async webhook processing implementation
- Image optimization pipeline
- Database connection pooling optimization
- Query monitoring and slow query detection

**Quality:**
- Test coverage gaps (target: 80%+)
- Logging improvements (structured logging, error tracking)
- Error handling consistency
- Input validation completeness
- Key management strategy
- Database migration safety

**Documentation:**
- API security best practices
- Deployment checklist for security
- Key rotation procedures
- Performance tuning guide

### Out of Scope
- **Frontend refactoring:** React component optimization (separate initiative)
- **Microservices migration:** Only plan, don't execute (future phase)
- **GDPR/CCPA compliance:** Document gaps, don't implement (legal initiative)
- **Infrastructure provisioning:** Assume PostgreSQL 13+, Redis 7+ available
- **Third-party integrations:** Beyond Stripe webhook security improvements

---

## 3. FUNCTIONAL REQUIREMENTS

### 3.1 SECURITY FIXES

#### FR-SEC-001: Secrets Management Validation
**Requirement:** Implement validation that prevents hardcoded secrets from being used in production.

**Details:**
- Add Pydantic field validators to `config.py`:
  - `SECRET_KEY`: Must be ≥32 characters, fail if "change-this" found in production
  - `STRIPE_SECRET_KEY`: Must start with `sk_live_` in production (not test keys)
  - `STRIPE_WEBHOOK_SECRET`: Must start with `whsec_` in production
  - `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`: Validate not MinIO defaults
- Fail application startup if validators detect hardcoded values in production
- Log clear error messages indicating which secrets need override
- Add `.env.example` template with placeholder values (no actual secrets)

**Success Criteria:**
- Production deployment fails immediately if `SECRET_KEY` is default
- Test deployment allows defaults with warning
- `.env` file never contains real secrets (validated via `.gitignore` + pre-commit hook)

---

#### FR-SEC-002: JWT Token Storage (HTTP-Only Cookies)
**Requirement:** Move JWT tokens from localStorage to HTTP-only, Secure cookies to prevent XSS theft.

**Details:**
- **Backend:**
  - Add `/auth/set-cookie-tokens` endpoint that returns tokens as HTTP-only Set-Cookie headers
  - Tokens: `AccessToken` (httponly, secure, samesite=Strict, 15min)
  - Tokens: `RefreshToken` (httponly, secure, samesite=Strict, 7days)
  - Domain: Match FRONTEND_URL domain
  - Path: `/` (accessible to all frontend routes)
  - Modify existing login/register/refresh endpoints to set cookies
  - Maintain backward compatibility: `localStorage` still supported but deprecated

- **Frontend:**
  - Remove `tokenStorage.ts` localStorage calls
  - Add `cookieStorage.ts` helper: read tokens from cookies (no JS access)
  - Update `useAuth()` hook to use cookie-based tokens
  - CSRF token: Send custom header `X-CSRF-Token` in non-GET requests (read from meta tag)
  - Add CSRF token generation to backend (include in response HTML)

**Success Criteria:**
- Tokens not visible in `localStorage` (DevTools check)
- Tokens sent automatically in cookie headers (no JS access)
- CSRF attacks prevented via SameSite=Strict
- XSS attacks cannot steal tokens (JS can't read httponly cookies)
- All authenticated endpoints work via cookies

---

#### FR-SEC-003: OAuth State Validation with PKCE
**Requirement:** Implement OAuth state validation and add PKCE flow for SPA security.

**Details:**
- **State Management:**
  - Generate 32-byte random state: `state = secrets.token_urlsafe(32)`
  - Store in Redis with 10-minute TTL: `oauth_state:{state} = user_session_id`
  - Validate on callback: verify state exists in Redis before token exchange
  - Delete state from Redis after validation (one-time use)
  - Return 400 Bad Request if state invalid/expired

- **PKCE Flow (Proof Key for Code Exchange):**
  - Generate code_challenge: `code_challenge = base64url(sha256(code_verifier))`
  - Include in authorization URL
  - Include code_verifier in token exchange request
  - OAuth providers (Google, GitHub) validate code_challenge/code_verifier match

- **Nonce Parameter (for OpenID Connect):**
  - Generate nonce if provider supports ID tokens
  - Store in session/Redis
  - Validate nonce in returned ID token

**Success Criteria:**
- OAuth callback without valid state returns 400 Bad Request
- State reuse prevents session fixation (first use invalidates)
- PKCE flow adds protection against authorization code interception
- All OAuth flows (Google, GitHub) include state + PKCE validation

---

#### FR-SEC-004: Session Revocation & Token Blacklist
**Requirement:** Implement token revocation mechanism to invalidate sessions on logout, password change, or account suspension.

**Details:**
- **Token Revocation:**
  - Add `jti` (JWT ID) claim to access tokens: `jti = uuid.uuid4()`
  - Add `revoked:{jti}` check before token validation
  - Store revoked tokens in Redis with TTL = remaining token lifetime
  - Logout endpoint: extract jti, revoke immediately
  - Password change: revoke all user's tokens
  - Account suspension: revoke all tokens

- **Implementation:**
  ```python
  async def revoke_token(jti: str, remaining_ttl_seconds: int):
      await redis.set(f"revoked:{jti}", "1", ex=remaining_ttl_seconds)
  
  async def is_token_revoked(jti: str) -> bool:
      return await redis.exists(f"revoked:{jti}")
  ```

**Success Criteria:**
- Logout immediately invalidates token (no 15-min grace period)
- Password change revokes all active sessions
- Deleted users' tokens immediately invalid
- Role changes reflected on next request (not old token's permission)

---

#### FR-SEC-005: Input Validation & Sanitization
**Requirement:** Comprehensive input validation at all API boundaries to prevent injection attacks and malformed requests.

**Details:**
- **File Upload Validation:**
  - Validate file extension against whitelist: `.jpg`, `.jpeg`, `.png`, `.webp` only
  - Validate MIME type against Content-Type header: image/jpeg, image/png, image/webp
  - Validate file size ≤5MB (configurable)
  - Prevent path traversal: strip directory separators from filename
  - Validate upload path: must be UUID-based folder (e.g., `/books/{uuid}/`)

- **String Input Validation:**
  - Email: Use `email-validator` library (already imported)
  - URLs: Validate protocol (https only), domain whitelist if needed
  - Book descriptions: Max 5000 characters, no script tags
  - Search queries: Max 100 characters, reject regex patterns

- **Numeric Input Validation:**
  - Prices: Pydantic validation (already done: `price > 0`)
  - Quantities: Must be positive integers
  - Page numbers: 1-based, max 1000 pages to prevent DoS

- **Enum Validation:**
  - Book status: restricted to predefined values (ACTIVE, ARCHIVED, DELISTED)
  - User roles: BUYER, SELLER, ADMIN only
  - Order status: PENDING, PAID, SHIPPED, DELIVERED, CANCELLED

**Success Criteria:**
- All file uploads validate extension + MIME type + size
- SQL injection attempts rejected (already handled by SQLAlchemy ORM)
- XSS attempts rejected in string inputs (sanitize output, validate input)
- Rate limiting prevents abuse of bulk queries

---

#### FR-SEC-006: Password Reset Token Security
**Requirement:** Enforce one-time-use password reset tokens with shortened TTL and revocation capability.

**Details:**
- **Token Generation:**
  - Generate reset token: `token = secrets.token_urlsafe(32)`
  - Hash token: `hash = sha256(token).hexdigest()`
  - Store in database: `PasswordResetToken(user_id, hash, created_at, expires_at, used_at=None)`
  - Expires in 30 minutes (not 24 hours)
  - Return token to user (not hash)

- **Token Validation:**
  - User clicks reset link with token
  - Hash token, query database for match
  - Check: not expired, not already used
  - On success: set `used_at = now()` to prevent reuse
  - Return 400 if token invalid, expired, or already used

- **Implementation:**
  ```python
  reset_token = PasswordResetToken(
      user_id=user.id,
      token_hash=hash_token(token),
      expires_at=now() + timedelta(minutes=30),
  )
  db.add(reset_token)
  await db.commit()
  ```

**Success Criteria:**
- Reset token expires after 30 minutes
- Reset token can only be used once
- Attacker cannot reuse intercepted token after first use
- Database audit log tracks all token uses

---

#### FR-SEC-007: CORS & CSRF Protection
**Requirement:** Enforce strict CORS configuration and add CSRF token validation.

**Details:**
- **CORS Configuration:**
  - Production: CORS_ORIGINS must be HTTPS only (validate in __init__)
  - Fail startup if HTTP origin in production
  - CORS_ALLOW_CREDENTIALS = true (allow cookies)
  - CORS_ALLOW_METHODS: Explicit list, not wildcard
    - Default: GET, POST, PUT, DELETE, PATCH, OPTIONS
  - CORS_ALLOW_HEADERS: Explicit list
    - Default: Content-Type, Authorization, X-CSRF-Token

- **CSRF Token:**
  - Generate per-session: `csrf_token = secrets.token_urlsafe(32)`
  - Send in response: HTML meta tag or GET endpoint
  - Validate on state-changing requests (POST, PUT, DELETE):
    - Extract from header `X-CSRF-Token`
    - Compare to session-stored token
    - Return 403 Forbidden if mismatch

**Success Criteria:**
- HTTP origins rejected in production
- GET requests allowed without CSRF token (safe)
- POST/PUT/DELETE require valid CSRF token
- Cross-origin requests without matching CSRF token fail

---

### 3.2 PERFORMANCE IMPROVEMENTS

#### FR-PERF-001: Eager Loading & N+1 Query Elimination
**Requirement:** Eliminate N+1 query patterns by eagerly loading related entities.

**Details:**
- **Affected Queries:**
  - Order listing: Load related OrderItems and Book details in single query
    ```python
    # Current (N+1): 1 query for orders + N queries for items
    # Fixed (eager): 1 query with selectinload
    query = select(Order).options(
        selectinload(Order.items).selectinload(OrderItem.book)
    )
    ```

  - Book search: Prefetch seller info and review counts
    ```python
    query = select(Book).options(
        selectinload(Book.seller),
        selectinload(Book.reviews),
    )
    ```

  - User profile: Load all related data (orders, books, reviews)
    ```python
    query = select(User).options(
        selectinload(User.orders),
        selectinload(User.books),
        selectinload(User.reviews),
    )
    ```

- **Implementation:**
  - Update all repository methods to use SQLAlchemy's `selectinload()` and `joinedload()`
  - Document eager loading strategy in docstrings
  - Add query monitoring to detect new N+1 patterns

**Success Criteria:**
- Order listing: 1 query instead of 1+N
- Book search with reviews: 1 query instead of 1+N
- User profile load: 1 query instead of 1+N
- Query count metrics reported in response headers

---

#### FR-PERF-002: Application-Level Caching
**Requirement:** Implement TTL-based caching for read-heavy endpoints using Redis.

**Details:**
- **Cache Targets (read-heavy, updated infrequently):**
  - Book catalog (by category): Cache 5 minutes
  - Book details: Cache 10 minutes
  - User profiles: Cache 5 minutes (invalidate on update)
  - Review aggregations (ratings, counts): Cache 1 hour
  - Search results: Cache 5 minutes (cache key includes query string)

- **Implementation:**
  ```python
  @cached_result(ttl=300)  # 5 minutes
  async def get_books_by_category(category: str):
      return await book_repo.search(category=category)
  
  # On book creation/update:
  @invalidates_cache(pattern="books:*")
  async def create_book(...):
      ...
  ```

- **Cache Key Structure:**
  - `books:category:{category_name}` for category listings
  - `book:{id}` for individual books
  - `user:{id}:profile` for user profiles
  - `search:{query_hash}` for search results

- **Cache Invalidation:**
  - On book create/update/delete: invalidate `books:*`
  - On user update: invalidate `user:{id}:*`
  - On review create/delete: invalidate `book:{id}` and review aggregations

**Success Criteria:**
- Repeated requests to same endpoint return from cache (verify X-Cache header)
- Cache TTL enforced (stale data after TTL expires)
- Cache invalidation immediate on data changes
- Cache reduces query count by 50%+ for read-heavy endpoints

---

#### FR-PERF-003: Async Webhook Processing
**Requirement:** Offload webhook processing to async task queue to prevent HTTP timeout.

**Details:**
- **Current Flow:**
  - Webhook received → HTTP request waits for DB operations → Risk of timeout (>3s)

- **New Flow:**
  - Webhook received → Validate signature → Queue task → Return 200 OK immediately
  - Celery task: Process webhook asynchronously
  - Task failure: Stripe retries webhook (exponential backoff)

- **Implementation:**
  ```python
  @app.post("/payments/webhook")
  async def stripe_webhook(request: Request):
      # Validate signature (fast)
      event = stripe.Webhook.construct_event(...)
      
      # Queue async task (non-blocking)
      process_stripe_webhook.delay(event.id, event.type, event.data)
      
      return {"received": True}  # Immediate response
  
  @celery_app.task
  def process_stripe_webhook(event_id: str, event_type: str, data: dict):
      # Long-running DB operations
      if event_type == "checkout.session.completed":
          # Find order, mark paid, send confirmation email
          ...
  ```

- **Queue Configuration:**
  - Broker: Redis (already available)
  - Backend: Redis (already available)
  - Workers: Run in separate process/container
  - Retry: Exponential backoff, max 3 retries

**Success Criteria:**
- Webhook HTTP response time < 100ms (no DB operations)
- Order marking happens within 5 seconds (async task)
- Failed tasks retried automatically
- Webhook deduplication still works (Redis cache)

---

#### FR-PERF-004: Image Optimization Pipeline
**Requirement:** Optimize images on upload before S3 storage to reduce bandwidth and storage costs.

**Details:**
- **Optimizations:**
  - Resize to max width 1200px (preserve aspect ratio)
  - Generate thumbnail: 200px width
  - Convert to optimized format (WebP with JPEG fallback)
  - Compress: 85% quality
  - Strip metadata (EXIF, color profiles)

- **Implementation:**
  ```python
  async def upload_book_image(file: UploadFile):
      # Validate file
      image = Image.open(file.file)
      
      # Resize original
      image.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
      
      # Generate thumbnail
      thumbnail = image.copy()
      thumbnail.thumbnail((200, 200), Image.Resampling.LANCZOS)
      
      # Convert to WebP
      webp_buffer = BytesIO()
      image.save(webp_buffer, format="WEBP", quality=85)
      
      # Upload to S3
      s3_client.put_object(
          Bucket=bucket,
          Key=f"books/{book_id}/image.webp",
          Body=webp_buffer.getvalue(),
          ContentType="image/webp"
      )
  ```

- **Async Processing:**
  - Offload image optimization to Celery task for large uploads
  - Return immediately with placeholder
  - Frontend polls for completion

**Success Criteria:**
- Original image: 1200px max width
- Thumbnail: 200px max width, <50KB
- File format: WebP (85% quality)
- Upload time: <5 seconds (async task)

---

#### FR-PERF-005: Database Connection Pooling & Monitoring
**Requirement:** Optimize connection pool settings and add monitoring for exhaustion.

**Details:**
- **Pool Configuration:**
  - Pool size: 10 (increase from default 5 for load)
  - Max overflow: 20 (increase from default 10)
  - Pool pre-ping: Enabled (verify connections before use)
  - Query timeout: 30 seconds (fail slow queries)

  ```python
  engine = create_async_engine(
      DATABASE_URL,
      pool_size=10,
      max_overflow=20,
      pool_pre_ping=True,
      connect_args={"timeout": 30},
  )
  ```

- **Query Timeout:**
  - Prevent slow queries from holding connections forever
  - Set timeout in connect_args or per-query

- **Monitoring:**
  - Track pool exhaustion events
  - Log when max overflow exceeded
  - Metrics endpoint: report pool stats
  - Alert if pool utilization > 80%

**Success Criteria:**
- Connection pool size optimized for expected load
- Slow queries killed after 30 seconds
- Pool exhaustion logged and alerted
- Metrics available for monitoring

---

### 3.3 QUALITY IMPROVEMENTS

#### FR-QUAL-001: Test Coverage Expansion (80%+ Target)
**Requirement:** Increase test coverage to 80%+ with focus on security-critical paths.

**Details:**
- **Coverage Targets:**
  - Security modules (auth, tokens, validation): 95%+
  - Service layer (business logic): 90%+
  - API endpoints: 85%+
  - Utilities: 80%+

- **High-Priority Coverage Gaps:**
  - OAuth state validation (currently untested)
  - Password reset token flow (currently untested)
  - CORS validation (needs additional tests)
  - Rate limiting edge cases
  - Error handling for all exception types
  - Webhook processing (async flow)

- **Testing Approach:**
  - Unit tests: Security functions, validators, utilities
  - Integration tests: OAuth flows, payment webhooks, API endpoints
  - Property-based tests: Input validation edge cases (hypothesis library)

**Success Criteria:**
- Overall coverage: 80%+
- Security modules: 95%+
- Coverage report generated with HTML output
- Coverage checks fail build if below 80%

---

#### FR-QUAL-002: Structured Logging & Error Tracking
**Requirement:** Replace print statements with structured logging for debugging and monitoring.

**Details:**
- **Logging Configuration:**
  - Format: JSON with timestamp, level, module, message, context
  - Levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
  - Handlers: Console (development), file (production), syslog (optional)

  ```python
  import structlog
  
  logger = structlog.get_logger()
  
  # Instead of: print(f"Error uploading file: {e}")
  logger.error("file_upload_failed", error=str(e), filename=filename)
  ```

- **Key Logging Points:**
  - Authentication attempts (success/failure)
  - OAuth state validation (success/failure)
  - Payment webhook processing
  - Database errors
  - File upload failures
  - Rate limit hits
  - Security violations (invalid tokens, CSRF failures)

- **Error Context:**
  - Include request ID for correlation
  - Include user ID for audit trails
  - Include operation name/duration
  - Include relevant business context

**Success Criteria:**
- No print() statements in production code
- Structured logging configured and active
- Log output includes timestamp, level, module, message
- Error logs captured for monitoring/alerting

---

#### FR-QUAL-003: Error Handling Consistency
**Requirement:** Standardize error response format across all endpoints.

**Details:**
- **Error Response Schema:**
  ```json
  {
    "error": {
      "code": "INVALID_REQUEST",
      "message": "Human-readable error message",
      "details": {
        "field": "email",
        "reason": "Email already registered"
      },
      "request_id": "uuid-for-correlation"
    }
  }
  ```

- **HTTP Status Codes:**
  - 400 Bad Request: Validation errors, invalid input
  - 401 Unauthorized: Missing/invalid authentication
  - 403 Forbidden: Valid auth but insufficient permissions
  - 404 Not Found: Resource doesn't exist
  - 409 Conflict: Resource state conflict (race conditions, stock)
  - 422 Unprocessable Entity: Semantic validation errors
  - 429 Too Many Requests: Rate limited
  - 500 Internal Server Error: Unhandled exceptions

- **Implementation:**
  - Custom exception classes for each error type
  - Exception handler middleware to format responses
  - Include request_id for correlation

**Success Criteria:**
- All error responses follow schema
- HTTP status codes match error semantics
- Field-level validation errors included in details
- Request IDs enable error tracking

---

#### FR-QUAL-004: Key Management & Rotation Strategy
**Requirement:** Implement key versioning and rotation procedure without invalidating existing tokens.

**Details:**
- **Key Versioning:**
  - Store multiple keys in database/Redis with version numbers
  - Current active key: used for signing new tokens
  - Previous keys: still accepted for validation (grace period)
  - Rotation: Add new key, wait grace period, remove old key

  ```python
  # Key storage in Redis:
  keys = {
    "v1": "old-key-content-...",  # Accepted until grace period expires
    "v2": "active-key-content-...",  # Current signing key
  }
  
  # On token signing:
  token = create_token(payload, key=keys["v2"])
  
  # On validation:
  for version, key in keys.items():
      try:
          return decode_token(token, key)
      except InvalidSignature:
          continue
  ```

- **Rotation Procedure:**
  - Generate new key
  - Store as inactive ("v3")
  - Wait 7 days (grace period)
  - Promote to active ("v2" → "v1", "v3" → "v2")
  - Remove oldest key after 30 days

**Success Criteria:**
- Multiple keys supported for validation
- Token signing uses current active key
- Key rotation without invalidating existing tokens
- Rotation procedure documented

---

---

## 4. NON-FUNCTIONAL REQUIREMENTS

### 4.1 PERFORMANCE TARGETS

| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| **Response Time (p95)** | <200ms | Unknown | Measure after optimization |
| **Database Query Time** | <100ms | Unknown | Optimize N+1, add indexes |
| **Cache Hit Rate** | >60% | N/A | Cache hot paths (books, profiles) |
| **Webhook Processing** | <100ms HTTP | >3s | Async via Celery |
| **Image Upload** | <5s | >5s | Async resizing/optimization |
| **Concurrent Users** | 1000+ | Unknown | Connection pool: 10, overflow: 20 |
| **Throughput** | 100 req/sec | Unknown | Measured with load test |

### 4.2 SECURITY STANDARDS

**Standards Compliance:**

| Standard | Requirement | Implementation |
|----------|-------------|-----------------|
| **OWASP Top 10** | Prevent injection, auth flaws, CSRF | Input validation, CSRF tokens, OAuth state |
| **OAuth 2.0 RFC 6749** | Authorization flow security | State validation, PKCE flow |
| **JWT RFC 7519** | Token format and signing | HS256, jti claim, exp claim |
| **NIST Password** | Password hashing | Bcrypt rounds: 12, salt: generated |
| **CSP (Content Security Policy)** | XSS prevention | CSP header with script-src restrictions |
| **CORS RFC 6454** | Cross-origin requests | Origin validation, credentials handling |

### 4.3 CODE QUALITY TARGETS

| Metric | Target | Current | Enforcement |
|--------|--------|---------|------------|
| **Test Coverage** | 80%+ | <80% | Fail build if below |
| **Security Tests** | 95%+ | Unknown | Focus on auth, tokens, validation |
| **File Size** | <500 lines | Some files exceed | Refactor large modules |
| **Cyclomatic Complexity** | <10 per function | Unknown | Review during code review |
| **Type Coverage** | 100% (Python) | ~85% | Add type hints to all functions |
| **Linting** | Zero warnings | Unknown | `black`, `flake8`, `mypy` strict mode |

### 4.4 AVAILABILITY & RELIABILITY

| Requirement | Target | Notes |
|------------|--------|-------|
| **Uptime** | 99.5% | Excludes planned maintenance |
| **MTTR** | <30 min | Mean time to recover from incident |
| **Backup** | Daily | Automated PostgreSQL backups |
| **Recovery** | <1 hour | RTO: Recovery time objective |

---

## 5. CONSTRAINTS

### 5.1 ARCHITECTURAL CONSTRAINTS

1. **No Monolithic Refactor:** Maintain current FastAPI + React architecture
   - Do not split services (payment service, book service) yet
   - Document service boundaries for future extraction

2. **Backward Compatibility:** Maintain API contracts
   - Deprecated endpoints must remain functional for 30 days
   - Version major breaking changes (e.g., `/api/v2`)
   - Document migration path for consumers

3. **Database Constraints:**
   - Must not modify existing schema incompatibly
   - Use Alembic migrations for all changes
   - Support zero-downtime deployments (backward-compatible columns first)

4. **OAuth Provider Constraints:**
   - Google OAuth: Callback URL must be HTTPS
   - GitHub OAuth: Client secret must remain server-side only
   - Support both providers simultaneously

### 5.2 IMPLEMENTATION CONSTRAINTS

1. **No Breaking Changes to Public APIs:**
   - Existing tokens must still be accepted (backward compatibility)
   - Deprecated endpoints return 301 Moved Permanently or warning header

2. **No Destruction of Existing Data:**
   - All migrations must be reversible
   - No data deletion without explicit user action (account deletion only)

3. **Technology Stack Fixed:**
   - Python 3.12, FastAPI 0.109.0, PostgreSQL, Redis (no alternatives)
   - React 19.2.0, Next.js 16.0.7 (no alternative frontends)
   - Stripe for payments (no alternative payment processor)

4. **Development Environment:**
   - Must run locally with Docker Compose
   - Development config allows test/default secrets
   - Production config enforces security constraints

### 5.3 TIMELINE & RESOURCE CONSTRAINTS

1. **Phased Delivery:** Must respect GSD phases
   - Phase 1: Security critical (weeks 1-2)
   - Phase 2: Performance (weeks 3-4)
   - Phase 3: Quality improvements (weeks 5-6)

2. **Testing Required:** All changes must include tests
   - No zero-test PRs
   - Security-critical paths: 95%+ coverage
   - Performance changes: benchmark before/after

---

## 6. SUCCESS CRITERIA

### 6.1 SECURITY SUCCESS CRITERIA

| Criterion | Measurable Success | Validation |
|-----------|-------------------|------------|
| **Secrets Not in Code** | 0 hardcoded secrets in repo | grep for hardcoded patterns |
| **Token Storage** | All tokens in httponly cookies, not localStorage | DevTools inspection, code audit |
| **OAuth State Validation** | 100% of OAuth flows validate state | Unit test coverage, manual test |
| **Session Revocation** | Logout invalidates token immediately | Integration test, manual test |
| **Input Validation** | All endpoints validate input types/formats | Security scanning tool |
| **Password Reset Security** | Tokens one-time use, 30min expiry | Unit test verification |
| **CORS Protection** | HTTP origins rejected in production | Startup validation test |
| **CSRF Protection** | POST/PUT/DELETE require valid CSRF token | Integration test |

### 6.2 PERFORMANCE SUCCESS CRITERIA

| Criterion | Measurable Success | Validation |
|-----------|-------------------|------------|
| **N+1 Elimination** | Order list: 1 query (not 1+N) | Query logging/APM |
| **Cache Effectiveness** | 60%+ cache hit rate on hot paths | Redis monitoring, response headers |
| **Webhook Speed** | <100ms HTTP response, <5s async processing | Monitoring dashboards |
| **Image Optimization** | Thumbnails <50KB, originals <500KB | File size measurement |
| **Connection Pool** | No "connection pool exhausted" errors | Production monitoring |

### 6.3 QUALITY SUCCESS CRITERIA

| Criterion | Measurable Success | Validation |
|-----------|-------------------|------------|
| **Test Coverage** | 80%+ overall, 95%+ security modules | Coverage report |
| **No Print Statements** | 0 print() in production code | Code audit, grep |
| **Error Standardization** | All 5xx errors follow error schema | Integration test |
| **Logging Completeness** | All security events logged | Log analysis |
| **Key Management** | Key rotation procedure documented & tested | Documentation + test |

### 6.4 DEFINITION OF DONE

A requirement is considered complete when:
1. ✅ Code implemented and committed
2. ✅ Unit tests written and passing (90%+ coverage for feature)
3. ✅ Integration tests passing
4. ✅ No security issues introduced (security scan clean)
5. ✅ Documentation updated (API docs, inline comments)
6. ✅ Performance impact measured (no regressions)
7. ✅ Code review approved (at least 2 reviewers)
8. ✅ Manual testing completed (checklist verified)
9. ✅ Deployed to staging and verified
10. ✅ Backward compatibility verified (if applicable)

---

## 7. RISK ASSESSMENT

### 7.1 HIGH-RISK AREAS

#### Risk 1: Token Migration (Cookie Storage)
**Severity:** HIGH | **Likelihood:** MEDIUM | **Impact:** Service unavailability, user lockout

**Description:**
Moving tokens from localStorage to httponly cookies could break existing sessions and lock out users mid-operation.

**Mitigation:**
- Implement gradual rollout: Support both storage methods for 2 weeks
- Feature flag: Enable cookie-based auth for beta users first
- Fallback: If cookie not present, accept token from Authorization header
- User notifications: Inform users of security upgrade
- Rollback plan: Can revert to localStorage support

**Monitoring:**
- Track authentication success rate during rollout
- Alert if logout/login failures exceed 1%
- Monitor token validation errors by type

---

#### Risk 2: Database Migration Safety
**Severity:** HIGH | **Likelihood:** LOW | **Impact:** Data loss, schema corruption

**Description:**
Schema changes (adding revocation columns, indexes) could cause downtime or data loss if not executed correctly.

**Mitigation:**
- Zero-downtime migration strategy: Add columns as nullable first, backfill, then make non-nullable
- Alembic reversibility: All migrations must be reversible for rollback
- Staging validation: Test migrations on production data clone
- Backup before migration: Automated backup before schema changes
- Small batch approach: Migrate in multiple small steps, not one large change

**Monitoring:**
- Monitor migration duration (alert if >5min)
- Monitor database disk usage (alert if approaching limit)
- Post-migration: Verify row counts, validate data integrity

---

#### Risk 3: Performance Regression from Eager Loading
**Severity:** MEDIUM | **Likelihood:** MEDIUM | **Impact:** Slower queries, higher memory usage

**Description:**
Adding eager loading with selectinload() could over-fetch data and make queries slower if not tuned properly.

**Mitigation:**
- Measure query time before/after eager loading
- Use query analysis tools (EXPLAIN ANALYZE)
- Add database indexes on foreign keys
- Lazy-load non-critical relationships (e.g., reviews)
- Feature flag: Enable eager loading per endpoint for gradual rollout

**Monitoring:**
- Query time metrics: Alert if p95 query time increases >20%
- Database CPU usage: Alert if increases >10%
- Memory usage: Monitor for unbounded growth

---

#### Risk 4: Cache Invalidation Gaps
**Severity:** MEDIUM | **Likelihood:** MEDIUM | **Impact:** Stale data served to users

**Description:**
Cache invalidation could fail to clear all related cache entries, serving stale data to users (e.g., old book prices).

**Mitigation:**
- Explicit cache keys: Use consistent, predictable key patterns
- Invalidation coverage: Every data-modifying operation must invalidate related caches
- Unit tests: Test cache invalidation logic
- Monitoring: Log cache hits vs. misses, detect anomalies
- Fallback: Allow users to force refresh (bypass cache)

**Monitoring:**
- Cache invalidation: Log every invalidation event
- Stale data detection: Monitor for cache hits after modifications
- User complaints: Track complaint tickets for stale data

---

#### Risk 5: Webhook Processing Delays
**Severity:** MEDIUM | **Likelihood:** LOW | **Impact:** Orders marked paid late, customer confusion

**Description:**
Async webhook processing could delay order confirmation if Celery workers are slow or backed up.

**Mitigation:**
- Worker scaling: Provision multiple Celery workers based on queue depth
- Priority queue: Process payment webhooks with higher priority than other tasks
- Timeout enforcement: Kill stuck tasks after 10 seconds
- Monitoring: Alert if task queue depth > 100 tasks
- Manual intervention: UI for admins to manually process stuck webhooks

**Monitoring:**
- Task queue depth: Alert if > 100 tasks waiting
- Task processing time: Alert if p95 > 5 seconds
- Webhook event logs: Audit trail of all webhook processing

---

### 7.2 MEDIUM-RISK AREAS

| Risk | Mitigation | Monitoring |
|------|-----------|-----------|
| **Rate Limit Bypass** | IP-based rate limiting for webhooks | Webhook request spike alerts |
| **OAuth State Collision** | Use cryptographically secure random (secrets library) | Monitor Redis state store size |
| **PKCE Code Verifier Leak** | HTTPS only, no logging of verifier | Code review for logging |
| **Password Reset Token Guessing** | 32-byte random tokens (2^256 entropy) | Monitor failed reset attempts |
| **Session Fixation Post-Login** | Token refresh on login, device fingerprinting | Monitor duplicate sessions |

---

### 7.3 MITIGATION STRATEGY SUMMARY

**Immediate Actions (Before Deployment):**
1. Code review by security team (OWASP checklist)
2. Penetration testing on auth flows
3. Database backup and recovery test
4. Staging deployment and full regression testing
5. Rollback plan documented and tested

**During Deployment:**
1. Feature flags for gradual rollout
2. Continuous monitoring (metrics, logs, errors)
3. On-call engineer available for incident response
4. Automated alerting for anomalies

**Post-Deployment:**
1. User communication (security upgrade notification)
2. Monitor for 48 hours post-deployment
3. Collect user feedback and complaints
4. Weekly security audit for first month

---

## 8. IMPLEMENTATION ROADMAP

### Phase 1: Critical Security (Week 1-2)
**Goal:** Eliminate 7 identified critical security issues

**Work Items:**
1. Secrets Management Validation
2. JWT Token Storage (HTTP-only Cookies)
3. OAuth State Validation
4. Session Revocation & Token Blacklist
5. Input Validation Hardening
6. CORS & CSRF Protection

**Deliverables:**
- All 6 security features implemented
- Integration tests covering auth flows
- Security audit checklist verified
- Deployment guide with rollback plan

### Phase 2: Performance Optimization (Week 3-4)
**Goal:** Improve query performance and reduce latency

**Work Items:**
1. Eager Loading & N+1 Elimination
2. Application-Level Caching
3. Async Webhook Processing
4. Image Optimization Pipeline
5. Connection Pool Optimization

**Deliverables:**
- Query performance baselines
- Cache strategy documented
- Performance benchmarks (before/after)
- Monitoring dashboards

### Phase 3: Quality & Documentation (Week 5-6)
**Goal:** Improve code quality and maintainability

**Work Items:**
1. Test Coverage Expansion (80%+ target)
2. Structured Logging Implementation
3. Error Handling Consistency
4. Key Management & Rotation
5. Password Reset Token Security

**Deliverables:**
- Coverage reports (80%+)
- Logging strategy documented
- Key rotation procedure
- Operational runbooks

---

## 9. TESTING STRATEGY

### 9.1 Unit Tests
**Coverage Target:** 95%+ for security modules

- Token creation, validation, revocation
- Password hashing and verification
- OAuth state generation and validation
- Input validation for all schemas
- Cache key generation and invalidation
- Error response formatting

### 9.2 Integration Tests
**Coverage Target:** 85%+ for API endpoints

- Authentication flows (login, register, logout, refresh)
- OAuth flows (Google, GitHub with state validation)
- Payment webhook processing (async task)
- Cookie-based authentication
- CSRF token validation
- Rate limiting

### 9.3 Security Tests
**Coverage Target:** 100% for security-critical paths

- XSS prevention (htmlescaping of user input)
- SQL injection (parameterized queries)
- CSRF prevention (token validation)
- CORS validation (origin matching)
- Authentication bypass (token expiration, revocation)
- Authorization checks (role-based access)

### 9.4 Performance Tests
**Validation Method:** Benchmark before/after

- Order listing query count: 1 (not 1+N)
- Cache hit rate: >60% on hot paths
- Image upload time: <5 seconds
- Webhook response time: <100ms HTTP

---

## 10. DEPLOYMENT STRATEGY

### 10.1 Phased Rollout

**Phase 1 (Day 1-3):** 10% of users → Feature flagged cookie auth
**Phase 2 (Day 4-7):** 50% of users → Gradual increase
**Phase 3 (Day 8+):** 100% of users → Full rollout, localStorage deprecated

### 10.2 Rollback Procedure

If major issues detected:
1. Disable feature flag (revert to localStorage-based auth)
2. Revoke compromised tokens (if security issue)
3. Restore from backup (if data corruption)
4. Notify users and apologize (if incident public)
5. Post-mortem and improvements

### 10.3 Monitoring Checklist

During deployment, monitor:
- [ ] Authentication success rate (maintain >99%)
- [ ] Token validation error rate (alert if >0.1%)
- [ ] HTTP response times (alert if p95 > 500ms)
- [ ] Database connection pool usage (alert if >80%)
- [ ] Error logs (review every error immediately)
- [ ] User complaints (support ticket volume)
- [ ] Webhook processing delays (alert if queue > 100)

---

## 11. DOCUMENTATION DELIVERABLES

### 11.1 Technical Documentation

1. **Security Architecture** - Token management, authentication flows, CSRF protection
2. **API Security Guide** - Input validation, CORS configuration, rate limiting
3. **Key Management Procedure** - Key generation, rotation, versioning
4. **Caching Strategy** - Cache keys, TTLs, invalidation rules
5. **Webhook Processing** - Async flow, retry logic, error handling
6. **Deployment Checklist** - Pre-deployment validation, rollback procedures
7. **Operations Runbook** - Common issues, troubleshooting, incident response

### 11.2 Code Documentation

1. **Inline Comments** - Complex security logic, non-obvious implementations
2. **Docstrings** - All public functions, parameter types, return values
3. **Type Hints** - Full type coverage (100% for Python)
4. **Test Documentation** - Test naming convention, test data setup

---

## 12. ACCEPTANCE CRITERIA

### 12.1 Overall Project Acceptance

The Security & Quality Audit is accepted when:

1. ✅ **All 7 security issues resolved**
   - Secrets management validated
   - Tokens in httponly cookies
   - OAuth state validated
   - Sessions revocable
   - Input validation comprehensive
   - Password reset tokens one-time use
   - CSRF protection enabled

2. ✅ **Performance improvements measurable**
   - Query count reduced (1 instead of 1+N)
   - Cache hit rate > 60%
   - Webhook response < 100ms
   - Image upload < 5 seconds

3. ✅ **Test coverage 80%+**
   - Security modules: 95%+
   - Service layer: 90%+
   - API endpoints: 85%+

4. ✅ **No new security issues introduced**
   - Security scan clean (zero critical/high issues)
   - Penetration test passed
   - Code review approved

5. ✅ **Documentation complete**
   - Security architecture documented
   - Deployment guide with runbooks
   - Key rotation procedure tested
   - API security guide published

6. ✅ **Zero regressions**
   - Existing functionality preserved
   - Backward compatibility verified
   - User acceptance testing passed

---

**Document Status:** ACTIVE | **Last Updated:** April 24, 2026 | **Next Review:** Completion of Phase 1
