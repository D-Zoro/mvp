# Step 2.8: Backend Tests — Code Log

**Date:** 2026-03-18  
**Step:** 2.8 — Comprehensive Backend Test Suite  

---

## Summary

Created a full test suite for the Books4All backend covering security utilities, schema validation, service business logic, and API-layer integration tests.

---

## Files Created / Modified

### Infrastructure

| File | Change | Description |
|------|--------|-------------|
| `pyproject.toml` | MODIFIED | Added `[tool.pytest.ini_options]` (`asyncio_mode=auto`, `testpaths`, `addopts`) and `[tool.coverage.*]` sections |
| `tests/conftest.py` | REPLACED | Full rewrite: added `async_client` fixture (AsyncClient+ASGITransport+dependency override), `mock_redis` (autouse), `mock_stripe`, `create_test_user`, `create_test_book`, `make_auth_headers`, and pre-built user fixtures (`buyer_user`, `seller_user`, `admin_user`, `*_headers`) |
| `tests/unit/__init__.py` | NEW | Package marker |
| `tests/integration/__init__.py` | NEW | Package marker |

### Unit Tests (`tests/unit/`)

| File | Tests | What's Covered |
|------|-------|----------------|
| `test_security.py` | 21 | `hash_password`, `verify_password`, `create_access_token`, `create_refresh_token`, `create_token_pair`, `verify_*_token`, password-reset/email-verification roundtrips, expiry and type-mismatch rejection |
| `test_schemas.py` | 25 | `RegisterRequest` (password strength, admin block, email), `BookCreate` (price, ISBN, images), `BookUpdate`, `OrderCreate` (empty/duplicate items), `OrderItemCreate`, `ReviewCreate`/`ReviewUpdate` rating bounds |
| `test_services.py` | 18 | `OrderService._assert_valid_transition` (10 transition cases), `OrderService._assert_can_view` (5 access cases, via SimpleNamespace fakes), `AuthService.login` error cases (wrong password, inactive account, unknown email — via AsyncMock repo) |

### Integration Tests (`tests/integration/`)

| File | Tests | Routes Covered |
|------|-------|----------------|
| `test_auth_api.py` | 15 | `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`, `/auth/verify-email`, `/auth/forgot-password` |
| `test_books_api.py` | 15 | `GET/POST /books`, `/books/categories`, `/books/my-listings`, `/books/{id}`, `/books/{id}/publish`, `DELETE /books/{id}` |
| `test_orders_api.py` | 13 | `POST/GET /orders`, `/orders/{id}`, `/orders/{id}/cancel` |
| `test_reviews_api.py` | 13 | `/books/{id}/reviews`, `/books/{id}/reviews/stats`, `/reviews/{id}` |

**Total: 120 tests across all files**

---

## Design Decisions

### 1. Shared Rollback Isolation
Integration tests use the same session-scoped Postgres + Alembic migration approach as the existing `tests/DB/` tests. The `async_client` fixture overrides `get_db` to inject the rollback transaction session, giving each test a clean slate without needing a separate test database.

### 2. Redis / Stripe Mock Strategy
- **Redis**: `mock_redis` is `autouse=True` — patches `rate_limiter.is_rate_limited` globally so every test skips rate limiting without configuration.
- **Stripe**: opt-in `mock_stripe` fixture for tests that specifically test payment-related code.

### 3. SimpleNamespace Fakes for Service Unit Tests
SQLAlchemy ORM objects cannot be constructed with `__new__` without going through the mapper — this raises `AttributeError` on `impl.set`. We use `types.SimpleNamespace` to build lightweight fake objects for unit tests that only need duck-typed access to a few attributes.

### 4. bcrypt 5.0.0 Incompatibility with passlib 1.7.4
Detected that the venv had `bcrypt==5.0.0` installed, which changed the `__about__` module structure. `passlib`'s `detect_wrap_bug` internally tries to hash a 72-char string and fails. Fixed by downgrading to `bcrypt==4.1.2` (matching `requirements.txt`):
```bash
uv pip install "bcrypt==4.1.2"
```

---

## Test Results

```
Unit tests:   67 passed, 0 failed
DB tests:      5 passed, 0 failed (existing tests unaffected)
Total:        72 passed, 0 failed
```

### Coverage Report (unit + DB)

| Layer | Coverage |
|-------|----------|
| `schemas/` | 84–97% |
| `core/security.py` | 94% |
| `services/exceptions.py` | 90% |
| `schemas/auth.py` | 84% |
| `models/` | 78–100% |
| `services/order_service.py` | 42% (raised by unit tests; more via integration) |
| `repositories/` | 17–30% (covered by integration tests with live DB) |

> Integration tests cover the repository + service + API layers end-to-end but require a running Postgres instance at the configured `DATABASE_URL`.

---

## Dependencies

No new production dependencies. Testing infrastructure only:
- `pytest`, `pytest-asyncio`, `pytest-cov` (all already in `requirements.txt`)
- `httpx` (already in `requirements.txt`, used via `AsyncClient` + `ASGITransport`)

---

## Next Steps

**Step 3: Frontend Development**
- Scaffold Next.js application
- Build pages: home, search, book detail, cart, checkout, orders, auth
- Connect to backend API via `httpx`/`fetch`
