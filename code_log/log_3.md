# Log 3 - Core Security & Authentication System

**Date:** December 9, 2025

---

## What I Did

### 1. Enhanced Configuration (`backend/app/core/config.py`)

Complete rewrite with comprehensive settings:

- **Application settings**: `APP_NAME`, `APP_VERSION`, `DEBUG`, `ENVIRONMENT`
- **Database settings**: `DATABASE_URL` (async), `DATABASE_POOL_SIZE`, `DATABASE_MAX_OVERFLOW`, `DATABASE_ECHO`
- **Redis settings**: `REDIS_URL`, `REDIS_PASSWORD`
- **JWT settings**: `SECRET_KEY`, `JWT_ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES` (15 min), `REFRESH_TOKEN_EXPIRE_DAYS` (7 days)
- **Password hashing**: `BCRYPT_ROUNDS`
- **CORS settings**: `CORS_ORIGINS`, `CORS_ALLOW_CREDENTIALS`, `CORS_ALLOW_METHODS`, `CORS_ALLOW_HEADERS`
- **OAuth settings**: Google & GitHub (`CLIENT_ID`, `CLIENT_SECRET`, `REDIRECT_URI`)
- **Rate limiting**: `RATE_LIMIT_ENABLED`, `RATE_LIMIT_DEFAULT_CALLS/PERIOD`, `RATE_LIMIT_LOGIN_CALLS/PERIOD`
- **File upload**: `MAX_UPLOAD_SIZE`, `ALLOWED_IMAGE_TYPES`

**Features:**
- Field validators for CORS origins parsing
- Property helpers: `is_production`, `is_development`, `google_oauth_enabled`, `github_oauth_enabled`
- `@lru_cache` for singleton settings

---

### 2. Security Module (`backend/app/core/security.py`)

**Password Hashing:**
- `hash_password(password)` - bcrypt hashing
- `verify_password(plain, hashed)` - password verification

**JWT Tokens:**
- `create_access_token(user_id, role)` - 15 min expiry
- `create_refresh_token(user_id, role)` - 7 days expiry
- `create_token_pair(user_id, role)` - returns both tokens
- `verify_access_token(token)` - returns `TokenPayload` or `None`
- `verify_refresh_token(token)` - returns `TokenPayload` or `None`

**Token Payload:**
```python
class TokenPayload:
    sub: str       # user_id
    role: str      # buyer/seller/admin
    type: str      # access/refresh
    exp: datetime  # expiration
    iat: datetime  # issued at
    jti: str       # JWT ID (optional)
```

**Special Tokens:**
- `generate_password_reset_token(email)` - 1 hour expiry
- `verify_password_reset_token(token)` - returns email or None
- `generate_email_verification_token(email)` - 24 hour expiry
- `verify_email_verification_token(token)` - returns email or None

---

### 3. Dependencies (`backend/app/core/dependencies.py`)

**Database Session:**
- `get_db()` - async session with auto commit/rollback
- `DBSession` - type alias for dependency injection

**Authentication:**
- `get_token_payload(credentials)` - extracts & verifies JWT
- `get_current_user(db, token)` - fetches user from DB
- `get_current_active_user(user)` - ensures user is active
- `get_current_verified_user(user)` - ensures email verified
- `get_optional_user(db, credentials)` - returns user or None

**Type Aliases:**
```python
CurrentUser = Annotated[User, Depends(get_current_user)]
ActiveUser = Annotated[User, Depends(get_current_active_user)]
VerifiedUser = Annotated[User, Depends(get_current_verified_user)]
OptionalUser = Annotated[Optional[User], Depends(get_optional_user)]
```

**Role-Based Access Control:**
```python
def require_role(*allowed_roles: UserRole) -> Callable:
    """Factory for role checking dependency."""

# Convenience:
RequireAdmin = Depends(require_role(UserRole.ADMIN))
RequireSeller = Depends(require_role(UserRole.SELLER, UserRole.ADMIN))
```

**Pagination:**
```python
class PaginationParams:
    page: int      # 1-indexed
    per_page: int  # max 100
    skip: int      # calculated offset
```

---

### 4. Database Module (`backend/app/core/database.py`)

- `create_engine()` - async SQLAlchemy engine with pooling
- `async_session_maker` - session factory
- `get_session()` - context manager for sessions
- `check_database_health()` - connectivity check
- `init_database()` / `drop_database()` - for testing

---

### 5. Rate Limiter (`backend/app/core/rate_limiter.py`)

**RateLimiter Class:**
- Redis-based sliding window algorithm
- `is_rate_limited(identifier, endpoint, max_calls, period)`
- Returns: `(is_limited, remaining, retry_after)`

**Decorators:**
```python
@rate_limit(calls=100, period=60)  # General API
@rate_limit(calls=5, period=900)   # Login attempts

# Convenience decorators:
@login_rate_limit()   # 5 calls per 15 min
@api_rate_limit()     # 100 calls per minute
@strict_rate_limit()  # 10 calls per minute
```

**Middleware:**
- `RateLimitMiddleware` - global rate limiting
- Adds headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- Returns 429 with `Retry-After` header

---

### 6. Updated Files

- `backend/app/core/__init__.py` - exports all modules
- `backend/requirements.txt` - added async SQLAlchemy, bcrypt, redis[hiredis]
- `backend/.env.example` - all new settings documented

---

## What You Should Do (Test & Review)

### 1. Review Security Module
```bash
cat backend/app/core/security.py | head -100
```

### 2. Review Dependencies
```bash
cat backend/app/core/dependencies.py | head -100
```

### 3. Review Rate Limiter
```bash
cat backend/app/core/rate_limiter.py | head -100
```

### 4. Test Imports
```bash
cd backend
python -c "
from app.core import (
    settings,
    hash_password,
    verify_password,
    create_token_pair,
    verify_access_token,
    rate_limit,
)
print('Settings:', settings.APP_NAME)
print('Hash test:', hash_password('test')[:20] + '...')
print('All core imports OK!')
"
```

### 5. Test Password Hashing
```bash
cd backend
python -c "
from app.core.security import hash_password, verify_password
hashed = hash_password('mypassword')
print('Hashed:', hashed[:30] + '...')
print('Verify (correct):', verify_password('mypassword', hashed))
print('Verify (wrong):', verify_password('wrongpassword', hashed))
"
```

### 6. Test JWT Token Creation
```bash
cd backend
python -c "
from uuid import uuid4
from app.core.security import create_token_pair, verify_access_token

user_id = uuid4()
tokens = create_token_pair(user_id, 'buyer')
print('Access Token:', tokens.access_token[:50] + '...')
print('Refresh Token:', tokens.refresh_token[:50] + '...')
print('Expires In:', tokens.expires_in, 'seconds')

payload = verify_access_token(tokens.access_token)
print('Verified User ID:', payload.sub)
print('Verified Role:', payload.role)
"
```

### 7. Copy New .env.example
```bash
cp backend/.env.example backend/.env
# Edit with your actual values
```

---

## Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `backend/app/core/config.py` | Modified | Comprehensive settings |
| `backend/app/core/security.py` | Modified | Password hashing + JWT |
| `backend/app/core/database.py` | Modified | Async SQLAlchemy setup |
| `backend/app/core/dependencies.py` | Created | DI + RBAC |
| `backend/app/core/rate_limiter.py` | Created | Redis rate limiting |
| `backend/app/core/__init__.py` | Modified | Module exports |
| `backend/requirements.txt` | Modified | Updated dependencies |
| `backend/.env.example` | Modified | All settings documented |

---

## API Usage Examples

### Password Hashing
```python
from app.core.security import hash_password, verify_password

# During registration
hashed = hash_password(user_password)

# During login
if verify_password(submitted_password, user.password_hash):
    # Login successful
```

### JWT Authentication
```python
from app.core.security import create_token_pair, verify_access_token

# After successful login
tokens = create_token_pair(user.id, user.role.value)
return tokens  # {access_token, refresh_token, token_type, expires_in}

# Verify token
payload = verify_access_token(token)
if payload:
    user_id = payload.sub
```

### Protected Endpoints
```python
from app.core.dependencies import CurrentUser, require_role
from app.models.user import UserRole

@router.get("/me")
async def get_profile(current_user: CurrentUser):
    return current_user

@router.delete("/admin/users/{id}")
async def delete_user(
    id: UUID,
    admin: User = Depends(require_role(UserRole.ADMIN))
):
    # Only admins can access
    pass
```

### Rate Limiting
```python
from app.core.rate_limiter import rate_limit, login_rate_limit

@router.post("/login")
@login_rate_limit()  # 5 attempts per 15 minutes
async def login(credentials: LoginRequest):
    pass

@router.get("/books")
@rate_limit(calls=100, period=60)
async def list_books():
    pass
```

---

**Status:** ✅ Complete - Awaiting your review
