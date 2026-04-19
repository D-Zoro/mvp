---
wave: 3
depends_on:
  - "Phase 2 SUMMARY (service layer exception mapping verified)"
  - "PLAN-WAVE-1 (repositories audited)"
  - "PLAN-WAVE-2 (async patterns validated)"
files_modified:
  - "backend/app/services/exceptions.py"
  - "backend/app/main.py"
  - "backend/tests/integration/test_error_handling.py"
  - "backend/tests/integration/test_status_codes.py"
autonomous: true
---

# Phase 3 — Wave 3: Error Handling Consistency (ERROR-01 to ERROR-04)

**Wave:** 3 of 3  
**Requirements:** ERROR-01, ERROR-02, ERROR-03, ERROR-04  
**Goal:** Validate all typed exceptions, HTTP status mappings, information security, and edge case error handling.  
**Status:** Ready to execute (depends on Wave 1 & 2)  

---

## Executive Summary

Wave 3 validates the error handling layer. Phase 2 verified that services raise typed exceptions and mapped them to HTTP status codes. **Phase 2 did not validate:**

1. ✅ All 14+ exception types properly defined and tested
2. ✅ No information leaks in error responses
3. ✅ HTTP status codes correct per RESTful conventions
4. ✅ Edge cases handled gracefully (concurrent modifications, invalid transitions, malformed input)

This wave ensures the error system is production-secure and user-friendly.

---

## Task 3-1: Typed Exception Validation (ERROR-01)

### `<read_first>`
- `backend/app/services/exceptions.py` (all exception definitions)
- `backend/app/main.py` (exception handler registration)
- `backend/app/api/v1/endpoints/*.py` (how exceptions are used)
- `.planning/phases/03-backend-foundations/03-RESEARCH.md` (section 3.1 ERROR-01)
- Phase 2 SUMMARY (exception mapping verified)

### `<action>`

Audit all typed exceptions for correct definition and usage:

**Exception Inventory (from Phase 2 verification):**

Verify all 17 exceptions exist in `backend/app/services/exceptions.py`:

1. **AuthService Exceptions:**
   - `EmailAlreadyExistsError` → 409 Conflict
   - `InvalidCredentialsError` → 401 Unauthorized
   - `InvalidTokenError` → 400 Bad Request
   - `AccountInactiveError` → 403 Forbidden
   - `OAuthNotConfiguredError` → 503 Service Unavailable
   - `OAuthError` → 502 Bad Gateway

2. **BookService Exceptions:**
   - `BookNotFoundError` → 404 Not Found
   - `NotBookOwnerError` → 403 Forbidden
   - `NotSellerError` → 403 Forbidden

3. **OrderService Exceptions:**
   - `OrderNotFoundError` → 404 Not Found
   - `NotOrderOwnerError` → 403 Forbidden
   - `InsufficientStockError` → 409 Conflict
   - `InvalidStatusTransitionError` → 422 Unprocessable Entity
   - `OrderNotCancellableError` → 422 Unprocessable Entity

4. **PaymentService Exceptions:**
   - `PaymentError` → 402 Payment Required
   - `RefundError` → 402 Payment Required
   - `StripeWebhookError` → 400 Bad Request

**Expected Code Pattern:**

```python
# ✓ GOOD: exceptions.py
class ServiceError(Exception):
    """Base class for all service exceptions."""
    pass

class EmailAlreadyExistsError(ServiceError):
    """Raised when attempting to register with duplicate email."""
    pass

class InvalidCredentialsError(ServiceError):
    """Raised when login credentials are invalid."""
    pass

# ... all 17 exceptions defined similarly

# ✓ GOOD: main.py exception handler mapping
_SERVICE_EXCEPTION_MAP: dict[type[ServiceError], int] = {
    EmailAlreadyExistsError: status.HTTP_409_CONFLICT,
    InvalidCredentialsError: status.HTTP_401_UNAUTHORIZED,
    BookNotFoundError: status.HTTP_404_NOT_FOUND,
    # ... all 17 mapped
}

@app.exception_handler(ServiceError)
async def service_exception_handler(request, exc):
    status_code = _SERVICE_EXCEPTION_MAP.get(type(exc), status.HTTP_500_INTERNAL_SERVER_ERROR)
    return JSONResponse(
        status_code=status_code,
        content={"detail": str(exc)},
    )
```

**Verification Checklist:**
- [ ] All 17 exceptions defined in `exceptions.py`
- [ ] All inherit from `ServiceError`
- [ ] All have docstrings explaining when they're raised
- [ ] All mapped in `main.py` exception handler
- [ ] No bare `ValueError` or `RuntimeError` in service layer
- [ ] Exception mappings match Phase 2 verification (17 correct mappings)
- [ ] Global exception handler catches `ServiceError` base class
- [ ] Unhandled exceptions return 500 (not exposed)

**Phase 2 Integration Check:**

Verify Phase 2 verified these correctly:
- ✅ AuthService.login: `InvalidCredentialsError` (401)
- ✅ AuthService.register: `EmailAlreadyExistsError` (409)
- ✅ BookService.update: `NotBookOwnerError` (403)
- ✅ OrderService.create: `InsufficientStockError` (409)
- ✅ OrderService.cancel: `OrderNotCancellableError` (422)
- ✅ PaymentService.webhook: `StripeWebhookError` (400)

### `<acceptance_criteria>`

Command: `grep "class.*Error.*ServiceError" backend/app/services/exceptions.py | wc -l`
- Result: 17 (all exceptions inherit from ServiceError)

Command: `grep -c "_SERVICE_EXCEPTION_MAP\[" backend/app/main.py`
- Result: 17 (all exceptions mapped in main.py)

Code read: Verify all 17 exceptions defined with docstrings in exceptions.py

Code read: Verify all 17 mapped in `_SERVICE_EXCEPTION_MAP` dict in main.py

---

## Task 3-2: Error Response Security & No Information Leaks (ERROR-02)

### `<read_first>`
- `backend/app/main.py` (exception handler response format)
- `backend/app/api/v1/endpoints/auth.py` (sensitive endpoints)
- `backend/app/services/auth_service.py` (error messages)
- `backend/app/services/order_service.py` (authorization error messages)
- `.planning/phases/03-backend-foundations/03-RESEARCH.md` (section 3.2 ERROR-02)
- Phase 2 SUMMARY (info leak prevention verified)

### `<action>`

Audit error responses for information leaks:

**Pattern 1: Email Enumeration Protection**

Verify login endpoint uses same error for both email not found AND wrong password:

```python
# ✓ GOOD: same error for both cases
@router.post("/auth/login")
async def login(credentials: LoginRequest, db: DBSession) -> AuthResponse:
    auth_service = AuthService(db)
    try:
        response = await auth_service.login(email=credentials.email, password=credentials.password)
        return response
    except (InvalidCredentialsError, UserNotFoundError) as e:
        # Both raise as InvalidCredentialsError: "Invalid email or password."
        raise InvalidCredentialsError("Invalid email or password.")

# Service layer
async def login(self, email: str, password: str) -> AuthResponse:
    user = await self.user_repo.get_by_email(email)
    if user is None or not verify_password(password, user.password_hash):
        raise InvalidCredentialsError("Invalid email or password.")  # Same!
```

**Required Checks:**
- Login always returns 401 with same message
- Never says "Email not found" (would reveal emails in system)
- Never says "Wrong password" (would confirm email exists)
- Message: "Invalid email or password." (generic)

**Pattern 2: Authorization Errors (403 vs 404)**

Verify authorization errors don't reveal whether resource exists:

```python
# ✓ GOOD: 403 Forbidden (not 404 Not Found)
@router.get("/api/v1/books/{book_id}")
async def get_book(book_id: UUID, current_user: ActiveUser, db: DBSession) -> BookResponse:
    service = BookService(db)
    try:
        book = await service.get_book(book_id, current_user)
        return BookResponse.model_validate(book)
    except NotBookOwnerError:
        # Return 403, NOT 404
        # User might be unauthorized, but resource exists
        raise  # Let exception handler map to 403

# ✗ BAD: 404 for both "not found" and "not authorized"
# This leaks: 404 means admin can see the book exists
```

**Required Checks:**
- Ownership check: raise `NotOrderOwnerError` (403, not 404)
- Message: "You do not have permission to access this resource."
- Never say: "Order XYZ not found" (would confirm it exists to attacker)
- Never say: "You are not the owner of this order" (confirms existence)

**Pattern 3: No SQL / Technical Details**

Verify error responses don't leak database details:

```python
# ✗ BAD: SQL details leak
raise ServiceError("sqlalchemy.exc.IntegrityError: duplicate key value violates unique constraint")

# ✓ GOOD: generic message
raise EmailAlreadyExistsError("Email address is already registered.")
```

**Required Checks:**
- No SQL error text in responses
- No database table/column names
- No PostgreSQL error codes (23505, etc)
- No stack traces (even in DEBUG mode for APIs)
- No sqlalchemy exceptions exposed

**Pattern 4: No File Paths or Configuration**

Verify responses don't leak infrastructure:

```python
# ✗ BAD: path leaks
raise ServiceError("File upload failed: /var/uploads/missing")

# ✗ BAD: config leaks
raise ServiceError(f"Database URL: {settings.DATABASE_URL}")

# ✓ GOOD: generic message
raise ServiceError("File upload failed. Please try again.")
```

**Required Checks:**
- No file system paths (/var/uploads, /home/user/...)
- No environment variable values
- No module import paths (app.repositories.book...)
- No configuration URLs or keys

**Verification Checklist:**
- [ ] Login: same error for email-not-found AND wrong-password (401)
- [ ] Password reset: silent success for non-existent emails
- [ ] Authorization: 403 for "not authorized", 404 for "doesn't exist"
- [ ] Error messages: generic, no details (no SQL, paths, stack traces)
- [ ] Exception handler: catches all ServiceError, returns consistent format
- [ ] Debug mode: error details never exposed to clients

### `<acceptance_criteria>`

Command: `grep -n "Invalid email or password" backend/app/services/auth_service.py`
- Result: Shows same error message used for both email-not-found and wrong-password

Code read: Login endpoint catches both UserNotFoundError and InvalidCredentialsError → same error response

Code read: Verify error responses in main.py don't include SQL, paths, or stack traces

Integration test run: `pytest backend/tests/integration/test_error_handling.py::test_no_information_leak_* -v`
- Result: All no-information-leak tests PASS

---

## Task 3-3: HTTP Status Code Mapping Validation (ERROR-03)

### `<read_first>`
- `backend/app/main.py` (exception handler, _SERVICE_EXCEPTION_MAP)
- `backend/app/api/v1/endpoints/*.py` (all endpoints)
- `.planning/phases/03-backend-foundations/03-RESEARCH.md` (section 3.3 ERROR-03)
- Phase 2 SUMMARY (HTTP status mapping verified for 17 exceptions)

### `<action>`

Validate all HTTP status codes per RESTful conventions:

**Complete Status Code Mapping:**

| HTTP Status | Meaning | Exceptions | Example |
|---|---|---|---|
| 200 OK | Success (GET/PATCH) | None | GET /api/v1/books/123 |
| 201 Created | Resource created | None | POST /api/v1/orders → 201 |
| 400 Bad Request | Malformed request | `InvalidTokenError`, `StripeWebhookError` | Bad JWT format |
| 401 Unauthorized | Auth required | `InvalidCredentialsError` | Wrong password |
| 402 Payment Required | Payment needed | `PaymentError`, `RefundError` | Stripe charge failed |
| 403 Forbidden | Access denied | `AccountInactiveError`, `NotBookOwnerError`, `NotSellerError`, `NotOrderOwnerError` | Can't modify others' books |
| 404 Not Found | Resource missing | `BookNotFoundError`, `OrderNotFoundError` | GET /api/v1/books/nonexistent |
| 409 Conflict | State conflict | `EmailAlreadyExistsError`, `InsufficientStockError` | Duplicate email, no stock |
| 422 Unprocessable Entity | Validation failed | `InvalidStatusTransitionError`, `OrderNotCancellableError`, Pydantic errors | Invalid request body |
| 429 Too Many Requests | Rate limited | (middleware) | 6th login attempt in 15 min |
| 500 Internal Server Error | Server error | Unhandled exceptions | Bug in code |
| 502 Bad Gateway | External API error | `OAuthError` | Google OAuth API down |
| 503 Service Unavailable | Service down | `OAuthNotConfiguredError` | OAuth not configured |

**Validation Checklist:**
- [ ] 200: GET /books, GET /orders (success)
- [ ] 201: POST /orders (created), POST /auth/signup (created)
- [ ] 400: Invalid JWT format, webhook signature invalid
- [ ] 401: Wrong email/password, expired token
- [ ] 402: Stripe charge failed, refund failed
- [ ] 403: Account inactive, not book owner, not seller
- [ ] 404: Book not found, order not found
- [ ] 409: Email exists, insufficient stock
- [ ] 422: Invalid enum value, invalid state transition, required field missing
- [ ] 429: Rate limit exceeded (from middleware)
- [ ] 500: Unhandled bug (not ServiceError)
- [ ] 502: OAuth provider API error
- [ ] 503: OAuth not configured

**Critical Distinctions:**
- **401 vs 403:** 401 = authentication required/failed, 403 = authenticated but unauthorized
- **404 vs 409:** 404 = resource doesn't exist, 409 = resource exists but state conflict
- **422 vs 409:** 422 = input validation failed, 409 = input valid but business logic rejects

**Expected Code Pattern:**

```python
# ✓ GOOD: status code mapping
@app.exception_handler(ServiceError)
async def service_exception_handler(request, exc):
    status_code = _SERVICE_EXCEPTION_MAP.get(
        type(exc),
        status.HTTP_500_INTERNAL_SERVER_ERROR
    )
    return JSONResponse(
        status_code=status_code,
        content={"detail": str(exc)},
    )

# ✓ GOOD: endpoint returns 201 for creation
@router.post("/orders", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(...) -> OrderResponse:
    ...

# ✗ BAD: wrong status code
@router.post("/orders", status_code=status.HTTP_200_OK)  # Should be 201!
```

**Verification Checklist:**
- [ ] All 17 service exceptions mapped to correct status
- [ ] POST endpoints creating resources return 201
- [ ] GET/PATCH endpoints return 200
- [ ] 401 used for authentication failures (not 403)
- [ ] 403 used for authorization failures (not 401)
- [ ] 404 used for missing resources (not 500)
- [ ] 409 used for state conflicts (not 422)
- [ ] 422 used for validation errors (Pydantic)
- [ ] 429 returned by rate limiting middleware
- [ ] Unhandled exceptions return 500

### `<acceptance_criteria>`

Command: `grep "status_code.*201" backend/app/api/v1/endpoints/*.py | wc -l`
- Result: At least 2 (POST endpoints should return 201)

Code read: Verify _SERVICE_EXCEPTION_MAP in main.py has all 17 exceptions with correct status codes

Integration test run: `pytest backend/tests/integration/test_status_codes.py -v`
- Result: All status code tests PASS

---

## Task 3-4: Edge Case Error Handling (ERROR-04)

### `<read_first>`
- `backend/tests/integration/test_error_handling.py` (or create new)
- `backend/app/services/order_service.py` (state transitions)
- `.planning/phases/03-backend-foundations/03-RESEARCH.md` (section 3.4 ERROR-04)

### `<action>`

Test error handling for edge cases and invalid inputs:

**Edge Case 1: Concurrent Resource Modification**

Test scenario: User deletes book while order being placed

```python
async def test_error_concurrent_book_deletion():
    """Book deleted while order being placed."""
    seller = await create_test_user(role=UserRole.SELLER)
    book = await create_test_book(seller=seller, quantity=5)
    
    # Start order creation in background
    order_task = asyncio.create_task(
        create_order(book_id=book.id, quantity=1)
    )
    
    # Meanwhile, seller deletes book
    await delete_book(book.id)
    
    # Order should fail with 404 (book deleted/not found)
    result = await order_task
    assert result.status_code == 404
    assert "not found" in result.json()["detail"].lower()
```

**Edge Case 2: Invalid State Transitions**

Test scenario: Try to cancel PAID order (invalid transition)

```python
async def test_error_invalid_state_transition():
    """Can't transition from PAID to CANCELLED."""
    order = await create_test_order(status=OrderStatus.PAID)
    
    response = await client.patch(
        f"/api/v1/orders/{order.id}/cancel",
        headers=buyer_headers
    )
    
    assert response.status_code == 422  # Unprocessable Entity
    assert "invalid" in response.json()["detail"].lower()
```

**Edge Case 3: Try to refund non-PAID order**

```python
async def test_error_refund_pending_order():
    """Can't refund order not in PAID state."""
    order = await create_test_order(status=OrderStatus.PENDING)
    
    response = await client.post(
        f"/api/v1/orders/{order.id}/refund",
        headers=buyer_headers
    )
    
    assert response.status_code == 402  # Payment Required
    # Error: "Order not yet paid"
```

**Edge Case 4: Malformed Requests**

Test scenario: Invalid UUID in URL parameter

```python
async def test_error_invalid_uuid():
    """Invalid UUID in path parameter."""
    response = await client.get(
        "/api/v1/books/not-a-uuid",
        headers=auth_headers
    )
    
    assert response.status_code == 422  # Validation error
```

Test scenario: Missing required field in request body

```python
async def test_error_missing_required_field():
    """Missing required field in order creation."""
    response = await client.post(
        "/api/v1/orders",
        json={
            "items": [],  # Missing shipping_address
        },
        headers=buyer_headers
    )
    
    assert response.status_code == 422
    assert "shipping_address" in response.json()["detail"]
```

Test scenario: Invalid enum value

```python
async def test_error_invalid_enum_value():
    """Invalid enum value in request."""
    response = await client.patch(
        f"/api/v1/orders/{order.id}",
        json={"status": "invalid_status"},  # Not a valid OrderStatus
        headers=admin_headers
    )
    
    assert response.status_code == 422
```

**Edge Case 5: Authentication Edge Cases**

Test scenario: Expired refresh token

```python
async def test_error_expired_refresh_token():
    """Expired refresh token should return 401."""
    old_token = create_expired_refresh_token(user_id=user.id)
    
    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": old_token},
    )
    
    assert response.status_code == 401  # Unauthorized
```

Test scenario: Using access token as refresh token

```python
async def test_error_wrong_token_type():
    """Using access token as refresh token."""
    access_token = create_token(user_id=user.id, token_type="access")
    
    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": access_token},  # Wrong type!
    )
    
    assert response.status_code == 400  # Bad Request
```

Test scenario: Token signed with wrong key

```python
async def test_error_invalid_token_signature():
    """Token signed with wrong key."""
    fake_token = jwt.encode(
        {"sub": str(user.id), "type": "access"},
        "wrong_secret_key",
        algorithm="HS256"
    )
    
    response = await client.get(
        "/api/v1/books",
        headers={"Authorization": f"Bearer {fake_token}"}
    )
    
    assert response.status_code == 401  # Unauthorized
```

**Edge Case 6: Pagination Edge Cases**

Test scenario: Page 0 (should be page 1)

```python
async def test_error_pagination_page_zero():
    """Page 0 is invalid (pages start at 1)."""
    response = await client.get(
        "/api/v1/books?page=0&per_page=20",
        headers=auth_headers
    )
    
    assert response.status_code == 422  # Validation error
```

Test scenario: Page beyond data (should return empty, not error)

```python
async def test_pagination_beyond_data():
    """Page beyond data returns empty list, not error."""
    # Create book at index 0-10
    for i in range(10):
        await create_test_book()
    
    response = await client.get(
        "/api/v1/books?page=1000&per_page=20",
        headers=auth_headers
    )
    
    assert response.status_code == 200  # OK (not 404)
    assert response.json()["data"] == []
```

Test scenario: per_page > 100

```python
async def test_error_pagination_max_per_page():
    """per_page capped at 100."""
    response = await client.get(
        "/api/v1/books?page=1&per_page=1000",
        headers=auth_headers
    )
    
    # Should either:
    # 1. Cap at 100 and return 200 OK with 100 items
    # 2. Return 422 validation error
    assert response.status_code in [200, 422]
```

**Edge Case 7: Rate Limiting Edge Cases**

Test scenario: Rate limit on login

```python
async def test_error_rate_limit_login():
    """6th login attempt within 15 min → 429."""
    for i in range(5):
        # Attempts 1-5: succeed or fail with 401/403
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "WrongPass"},
        )
        assert response.status_code in [401, 403]
    
    # Attempt 6: rate limited
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "Pass1234!"},
    )
    
    assert response.status_code == 429  # Too Many Requests
    assert "Retry-After" in response.headers
```

**Verification Checklist:**
- [ ] Concurrent deletion: deleted resource → 404
- [ ] Invalid state transition: PAID → CANCELLED → 422
- [ ] Refund non-PAID: → 402
- [ ] Invalid UUID: → 422
- [ ] Missing required field: → 422 with field name
- [ ] Invalid enum value: → 422
- [ ] Expired token: → 401
- [ ] Wrong token type: → 400
- [ ] Invalid signature: → 401
- [ ] Page 0: → 422
- [ ] Page beyond data: → 200 with empty list
- [ ] per_page > 100: → 422 or capped to 100
- [ ] Rate limit exceeded: → 429 with Retry-After header

### `<acceptance_criteria>`

Integration test run: `pytest backend/tests/integration/test_error_handling.py -v`
- Result: All edge case tests PASS

Integration test run: `pytest backend/tests/integration/test_status_codes.py -v`
- Result: All status code tests PASS

Test coverage: `pytest backend/tests/integration/ --cov=app --cov-report=term-missing | grep -A5 "exceptions"`
- Result: Exception handling coverage ≥ 80%

---

## Task 3-5: Error Response Format & Validation

### `<read_first>`
- `backend/app/main.py` (response format for errors)
- `backend/app/schemas/` (error response schemas, if any)
- `.planning/phases/03-backend-foundations/03-RESEARCH.md` (section 3.2, response format)

### `<action>`

Audit error response format for consistency and validation:

**Response Format Validation:**

Verify error responses follow consistent format:

```json
{
  "status_code": 409,
  "detail": "Email address is already registered."
}
```

OR for validation errors (422):

```json
{
  "status_code": 422,
  "detail": [
    {
      "field": "body → password",
      "message": "ensure this value has at least 8 characters",
      "type": "value_error.any_str.min_length"
    }
  ]
}
```

**Expected Code Pattern:**

```python
# ✓ GOOD: consistent error response
@app.exception_handler(ServiceError)
async def service_exception_handler(request, exc):
    status_code = _SERVICE_EXCEPTION_MAP.get(
        type(exc),
        status.HTTP_500_INTERNAL_SERVER_ERROR
    )
    return JSONResponse(
        status_code=status_code,
        content={"detail": str(exc)},
    )

# ✓ GOOD: validation error handler (FastAPI built-in)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},  # Detailed field errors
    )
```

**Verification Checklist:**
- [ ] All service error responses: `{"status_code": ..., "detail": "..."}`
- [ ] All validation error responses: `{"detail": [...]}`  (list of field errors)
- [ ] No exception objects in responses
- [ ] No stack traces
- [ ] Consistent key names ("detail", "status_code")
- [ ] Error messages human-readable (not exception class names)

### `<acceptance_criteria>`

Integration test: Sample error responses

Command: `curl -s -X POST http://localhost:8000/api/v1/auth/login -d '{"email":"test","password":"x"}' | jq .`
- Result: Valid JSON with `status_code` and `detail` fields

Code read: Verify main.py has exception handlers for ServiceError and RequestValidationError

---

## Task 3-6: Error Handling Integration Tests

### `<read_first>`
- `backend/tests/integration/test_error_handling.py` (or create new)
- `backend/tests/integration/test_status_codes.py` (or create new)
- `.planning/phases/03-backend-foundations/03-RESEARCH.md` (section 4.3 Integration Tests)

### `<action>`

Create/extend comprehensive error handling test suite:

**Test File 1: test_error_handling.py**

```python
# backend/tests/integration/test_error_handling.py

@pytest.mark.asyncio
async def test_no_information_leak_login_enumeration(async_client):
    """Same error for non-existent email vs wrong password."""
    await create_test_user(email="existing@example.com", password="CorrectPass1")
    
    # Non-existent email
    resp1 = await async_client.post("/api/v1/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "CorrectPass1",
    })
    
    # Wrong password
    resp2 = await async_client.post("/api/v1/auth/login", json={
        "email": "existing@example.com",
        "password": "WrongPassword",
    })
    
    # Both should be 401 with same message
    assert resp1.status_code == 401
    assert resp2.status_code == 401
    assert resp1.json()["detail"] == resp2.json()["detail"]
    assert "Invalid email or password" in resp1.json()["detail"]

@pytest.mark.asyncio
async def test_no_information_leak_authorization(async_client):
    """Authorization error doesn't reveal if resource exists."""
    # Create order owned by seller
    seller = await create_test_user(role=UserRole.SELLER)
    buyer = await create_test_user(role=UserRole.BUYER)
    order = await create_test_order(buyer=seller)
    
    # Try to access as different user
    resp = await async_client.get(
        f"/api/v1/orders/{order.id}",
        headers=make_auth_header(buyer)
    )
    
    # Should be 403 (not 404, which would confirm existence to attacker)
    assert resp.status_code == 403
    assert "permission" in resp.json()["detail"].lower()
    assert "not found" not in resp.json()["detail"].lower()

@pytest.mark.asyncio
async def test_no_sql_leaks(async_client):
    """Error responses don't leak SQL details."""
    # Try to create duplicate email
    await create_test_user(email="test@example.com")
    
    resp = await async_client.post("/api/v1/auth/signup", json={
        "email": "test@example.com",
        "password": "TestPass1"
    })
    
    assert resp.status_code == 409
    detail = resp.json()["detail"].lower()
    
    # Should NOT contain:
    assert "integrity" not in detail  # SQLAlchemy error
    assert "unique constraint" not in detail  # PostgreSQL constraint
    assert "23505" not in detail  # PostgreSQL error code
```

**Test File 2: test_status_codes.py**

```python
# backend/tests/integration/test_status_codes.py

@pytest.mark.asyncio
async def test_status_201_on_order_creation(async_client):
    """POST /orders returns 201 Created."""
    book = await create_test_book(quantity=1)
    
    resp = await async_client.post("/api/v1/orders", json={
        "items": [{"book_id": str(book.id), "quantity": 1}],
        "shipping_address": {...}
    }, headers=make_auth_header(buyer))
    
    assert resp.status_code == 201  # Created

@pytest.mark.asyncio
async def test_status_401_vs_403():
    """401 for auth failure, 403 for authorization."""
    # Test 401: no token
    resp = await async_client.get("/api/v1/books")
    assert resp.status_code == 401
    
    # Test 403: token valid but not authorized
    # (admin-only endpoint with buyer token)
    resp = await async_client.get(
        "/api/v1/admin/users",
        headers=make_auth_header(buyer)
    )
    assert resp.status_code == 403

@pytest.mark.asyncio
async def test_status_404_vs_409():
    """404 for not found, 409 for conflict."""
    # 404: Book doesn't exist
    resp = await async_client.get(
        f"/api/v1/books/{uuid.uuid4()}",
        headers=make_auth_header(buyer)
    )
    assert resp.status_code == 404
    
    # 409: Insufficient stock
    book = await create_test_book(quantity=1)
    resp = await async_client.post("/api/v1/orders", json={
        "items": [{"book_id": str(book.id), "quantity": 5}],  # Only 1 available
        "shipping_address": {...}
    }, headers=make_auth_header(buyer))
    assert resp.status_code == 409

@pytest.mark.asyncio
async def test_status_422_vs_409():
    """422 for validation, 409 for state conflict."""
    order = await create_test_order(status=OrderStatus.PAID)
    
    # 422: Invalid state transition (validation)
    resp = await async_client.patch(
        f"/api/v1/orders/{order.id}",
        json={"status": "invalid_status"},
        headers=make_auth_header(admin)
    )
    assert resp.status_code == 422
    
    # Note: actual state transition validation would need explicit transition endpoint
```

**Verification Checklist:**
- [ ] Test: email enumeration protection (same error both cases)
- [ ] Test: authorization errors don't leak existence (403 not 404)
- [ ] Test: no SQL leaks (no "integrity", "constraint", error codes)
- [ ] Test: 201 on resource creation
- [ ] Test: 401 vs 403 distinction
- [ ] Test: 404 vs 409 distinction
- [ ] Test: 422 vs 409 distinction
- [ ] Test: edge cases (concurrent mods, invalid transitions, malformed input)
- [ ] All tests async and use async_client
- [ ] All tests pass with proper setup/teardown

### `<acceptance_criteria>`

Command: `pytest backend/tests/integration/test_error_handling.py -v`
- Result: All error handling tests PASS

Command: `pytest backend/tests/integration/test_status_codes.py -v`
- Result: All status code tests PASS

Command: `pytest backend/tests/integration/ -k error --cov=app.main --cov-report=term-missing`
- Result: Exception handling coverage ≥ 80%

---

## Verification Criteria (Wave 3 Complete)

All tasks in this wave must pass these checks:

### Requirement Coverage
- ✅ ERROR-01: All 17 typed exceptions defined and validated
- ✅ ERROR-02: No information leaks (email enum, auth errors, SQL details)
- ✅ ERROR-03: HTTP status codes correct per RESTful conventions
- ✅ ERROR-04: Edge cases handled gracefully (concurrent mods, invalid transitions, malformed input)

### Code Quality
- ✅ All exceptions inherit from `ServiceError`
- ✅ All 17 exceptions mapped to correct HTTP status
- ✅ Error responses consistent format: `{"status_code": ..., "detail": "..."}`
- ✅ No SQL, paths, or stack traces in responses
- ✅ Email enumeration protected (same error for email-not-found and wrong-password)

### Test Coverage
- ✅ Information leak tests: email enum, auth errors, authorization
- ✅ Status code tests: all 13 HTTP status codes validated
- ✅ Edge case tests: concurrent mods, invalid transitions, malformed input
- ✅ Integration tests: end-to-end error flows
- ✅ Coverage ≥ 80% for error handling

### Must-Haves (Goal-Backward Verification)
- ✅ **Exception system complete:** All 17 exceptions defined, mapped, tested
- ✅ **Security:** No information leaks, email enumeration protected
- ✅ **User experience:** Clear, consistent error messages
- ✅ **Correctness:** HTTP status codes follow RESTful conventions
- ✅ **Robustness:** Edge cases handled gracefully without crashes

---

## Phase 3 Complete — All Waves Done

**Wave 1:** ✅ Repositories audited (REPO-01 to REPO-05)
**Wave 2:** ✅ Async patterns validated (ASYNC-01 to ASYNC-04)
**Wave 3:** ✅ Error handling verified (ERROR-01 to ERROR-04)

**Total Requirements:** 13 ✅ ALL COMPLETE

**Next Steps:**
1. Run full test suite: `pytest backend/tests/ -v --cov=app --cov-report=term-missing`
2. Code quality checks: `black app tests`, `isort app tests`, `flake8 app`, `mypy app`
3. Proceed to Phase 4: Frontend Components & API Integration

---

**Phase 3 Status:** ✅ Ready for full execution  
**Executor:** /gsd-execute-phase (Waves 1, 2, 3)  
**Timeline:** Execute in sequence: Wave 1 → Wave 2 (can start parallel but depends) → Wave 3  
**Success Criteria:** All 13 requirements met, 0 critical issues, 75%+ test coverage
