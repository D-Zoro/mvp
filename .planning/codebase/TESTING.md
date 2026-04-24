# Testing Strategy - Books4All

This document outlines the testing frameworks, infrastructure, coverage targets, and testing practices used in the Books4All project.

---

## Testing Overview

Books4All uses a comprehensive testing strategy across both backend and frontend:

- **Backend**: Pytest with async support, unit and integration tests
- **Frontend**: Jest (configured but minimal tests) + Playwright for E2E
- **Database**: Transactional isolation with rollback per test
- **External Services**: Comprehensive mocking (Stripe, Redis, OAuth)

---

## Backend Testing

### Testing Framework: Pytest

**Version**: `7.4.4`

**Key Plugins**:
- `pytest-asyncio==0.23.3` - Async test support with automatic event loop
- `pytest-cov==4.1.0` - Coverage reporting

**Configuration** (`pyproject.toml`):
```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"           # Auto-detect and handle async tests
testpaths = ["tests"]           # Only run tests in tests/ directory
addopts = "-v --tb=short"       # Verbose output, short tracebacks
```

### Test Organization

```
tests/
├── conftest.py              # Shared fixtures and configuration
├── unit/                    # Fast, isolated unit tests
│   ├── __init__.py
│   ├── test_schemas.py      # Pydantic schema validation
│   ├── test_security.py     # JWT, hashing, token utilities
│   └── test_services.py     # Service layer business logic
├── integration/             # API + database integration tests
│   ├── __init__.py
│   ├── test_auth_api.py     # Authentication endpoints
│   ├── test_books_api.py    # Book listing endpoints
│   ├── test_orders_api.py   # Order management endpoints
│   ├── test_reviews_api.py  # Review endpoints
│   ├── test_payments_api.py # Stripe integration
│   ├── test_rate_limiting.py    # Rate limiter middleware
│   ├── test_error_handling.py    # Exception handlers
│   ├── test_status_codes.py      # HTTP status code accuracy
│   └── test_async_patterns.py    # Async/await patterns
└── DB/                      # Database-level fixtures
    └── conftest.py          # DB-specific configuration
```

### Fixture Architecture

**Hierarchy**:
```
async_engine (session scope)
    ↓
db_session (function scope, rollback)
    ↓
async_client (function scope, with overridden dependency)
    ↓
{buyer_user, seller_user, admin_user} (fixtures per test)
```

**Scope Explanation**:
- `session`: Runs Alembic migrations once for entire test suite
- `function`: Creates fresh, isolated test data per test case
- Rollback: Transaction rolled back after each test for hermetic isolation

### Core Fixtures (`conftest.py`)

#### Database Fixtures

**`async_engine`** (session-scoped)
```python
@pytest_asyncio.fixture(scope="session")
async def async_engine():
    """
    Creates async engine and runs Alembic migrations once.
    Used by all tests in the session.
    """
    engine = create_async_engine(settings.DATABASE_URL)
    alembic_cfg = Config("alembic.ini")
    command.upgrade(alembic_cfg, "head")  # Run migrations
    yield engine
    await engine.dispose()
```

**`db_session`** (function-scoped)
```python
@pytest_asyncio.fixture(scope="function")
async def db_session(async_engine) -> AsyncGenerator[AsyncSession, None]:
    """
    Creates a transactional session that's rolled back after each test.
    Ensures test isolation and fast cleanup.
    """
    async with async_engine.connect() as conn:
        trans = await conn.begin()
        Session = async_sessionmaker(bind=conn, expire_on_commit=False)
        session = Session()
        yield session
        await session.close()
        await trans.rollback()  # Revert all changes
```

#### HTTP Client Fixture

**`async_client`** (function-scoped)
```python
@pytest_asyncio.fixture(scope="function")
async def async_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    FastAPI AsyncClient with overridden get_db dependency.
    All routes receive the test db_session instead of production session.
    """
    async def _override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = _override_get_db
    
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client
    
    app.dependency_overrides.clear()
```

#### Mock Fixtures

**`mock_redis`** (auto-used)
```python
@pytest.fixture(autouse=True)
def mock_redis():
    """
    Automatically patches Redis rate limiter for every test.
    Prevents need for live Redis and ensures no rate-limiting blocks tests.
    """
    with patch(
        "app.core.rate_limiter.rate_limiter.is_rate_limited",
        new_callable=AsyncMock,
        return_value=(False, 100, 0),  # Never rate-limited, high quota
    ):
        yield
```

**`mock_stripe`** (optional per-test)
```python
@pytest.fixture()
def mock_stripe():
    """
    Patches Stripe SDK for payment testing.
    Returns mock session object with predictable test values.
    """
    fake_session = MagicMock()
    fake_session.id = "cs_test_fake_session_id"
    fake_session.url = "https://checkout.stripe.com/fake"
    
    with patch("stripe.checkout.Session.create", return_value=fake_session), \
         patch("stripe.Webhook.construct_event"), \
         patch("stripe.Refund.create"):
        yield {
            "create": mock_create,
            "webhook": mock_webhook,
            "refund": mock_refund,
            "session": fake_session,
        }
```

#### Test Data Factories

**`create_test_user()`** - Factory function
```python
async def create_test_user(
    db: AsyncSession,
    *,
    email: str | None = None,
    password: str = "Test1234!",
    role: UserRole = UserRole.BUYER,
    is_active: bool = True,
    email_verified: bool = True,
) -> User:
    """
    Create and persist a test user with hashed password.
    
    Args:
        db: Active async session
        email: Unique email (auto-generated if None)
        password: Plain-text password (auto-hashed)
        role: User role (BUYER, SELLER, ADMIN)
        is_active: Account active status
        email_verified: Email verification status
    
    Returns:
        Persisted User ORM instance
    """
    if email is None:
        email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    
    user = User(
        email=email.lower(),
        password_hash=hash_password(password),
        role=role,
        is_active=is_active,
        email_verified=email_verified,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user
```

**`create_test_book()`** - Factory function
```python
async def create_test_book(
    db: AsyncSession,
    *,
    seller: User,
    title: str = "Test Book",
    price: float = 9.99,
    quantity: int = 5,
    status: BookStatus = BookStatus.ACTIVE,
) -> Book:
    """
    Create and persist a test book listing.
    
    Args:
        db: Active async session
        seller: Owning seller user
        title: Book title
        price: Listing price
        quantity: Available stock
        status: Listing status
    
    Returns:
        Persisted Book ORM instance
    """
    book = Book(
        seller_id=seller.id,
        title=title,
        author="Test Author",
        condition=BookCondition.GOOD,
        price=price,
        quantity=quantity,
        status=status,
        language="English",
    )
    db.add(book)
    await db.flush()
    await db.refresh(book)
    return book
```

**`make_auth_headers()`** - Helper function
```python
def make_auth_headers(user: User) -> dict[str, str]:
    """
    Generate Bearer auth headers for a user without DB call.
    
    Args:
        user: User to generate token for
    
    Returns:
        Dict with Authorization header
    """
    token = create_access_token(user.id, user.role.value)
    return {"Authorization": f"Bearer {token}"}
```

#### Pre-built User Fixtures

```python
@pytest_asyncio.fixture()
async def buyer_user(db_session: AsyncSession) -> User:
    """Ready-to-use buyer user with email buyer@test.com"""
    return await create_test_user(db_session, role=UserRole.BUYER, email="buyer@test.com")

@pytest_asyncio.fixture()
async def seller_user(db_session: AsyncSession) -> User:
    """Ready-to-use seller user with email seller@test.com"""
    return await create_test_user(db_session, role=UserRole.SELLER, email="seller@test.com")

@pytest_asyncio.fixture()
async def admin_user(db_session: AsyncSession) -> User:
    """Ready-to-use admin user with email admin@test.com"""
    return await create_test_user(db_session, role=UserRole.ADMIN, email="admin@test.com")

@pytest.fixture()
def buyer_headers(buyer_user: User) -> dict[str, str]:
    """Auth headers for buyer fixture user"""
    return make_auth_headers(buyer_user)

@pytest.fixture()
def seller_headers(seller_user: User) -> dict[str, str]:
    """Auth headers for seller fixture user"""
    return make_auth_headers(seller_user)

@pytest.fixture()
def admin_headers(admin_user: User) -> dict[str, str]:
    """Auth headers for admin fixture user"""
    return make_auth_headers(admin_user)
```

### Unit Testing

**Purpose**: Fast, isolated tests of individual components without I/O

**Location**: `tests/unit/`

**Key Files**:

#### `test_schemas.py`
- Validates Pydantic request/response schema constraints
- Tests field validators and enum membership
- Synchronous tests (no database required)
- Example:
  ```python
  def test_book_create_invalid_price():
      """Price must be positive."""
      with pytest.raises(ValidationError) as exc_info:
          BookCreate(
              title="Test",
              author="Author",
              condition=BookCondition.GOOD,
              price=-5.0,  # Invalid: negative
              quantity=1,
          )
      assert "greater than 0" in str(exc_info.value)
  ```

#### `test_security.py`
- JWT token creation, validation, expiration
- Password hashing and verification
- Token refresh logic
- Async tests but no database
- Example:
  ```python
  async def test_create_access_token():
      """Token should encode user ID and role."""
      user_id = uuid4()
      token = create_access_token(user_id, "seller")
      
      payload = verify_access_token(token)
      assert payload["sub"] == str(user_id)
      assert payload["role"] == "seller"
  ```

#### `test_services.py`
- Business logic without database (mocked repositories)
- Service method behavior and error conditions
- Example:
  ```python
  async def test_order_service_insufficient_stock(mock_book_repo):
      """Service should raise error if stock insufficient."""
      mock_book_repo.get_by_id.return_value = Mock(quantity=1)
      
      service = OrderService(mock_book_repo)
      
      with pytest.raises(InsufficientStockError):
          await service.create_order(book_id, quantity=5)
  ```

### Integration Testing

**Purpose**: Test API endpoints, database interactions, error handling

**Location**: `tests/integration/`

**Key Files**:

#### `test_auth_api.py`
- Authentication endpoints (login, register, refresh, logout)
- OAuth flows (Google, GitHub)
- Email verification and password reset
- Token lifecycle
- Example:
  ```python
  async def test_login_success(async_client, buyer_user):
      """Successful login returns access and refresh tokens."""
      response = await async_client.post(
          "/auth/login",
          json={"email": "buyer@test.com", "password": "Test1234!"}
      )
      
      assert response.status_code == 200
      data = response.json()
      assert "access_token" in data
      assert "refresh_token" in data
      assert data["user"]["email"] == "buyer@test.com"
  ```

#### `test_books_api.py`
- Book listing, searching, filtering
- Create, update, delete book listings (seller role)
- Stock management
- Example:
  ```python
  async def test_list_books_with_pagination(async_client, seller_user):
      """Listing books should support pagination."""
      # Create multiple books
      for i in range(5):
          await async_client.post(
              "/books",
              json={"title": f"Book {i}", ...},
              headers=seller_headers(seller_user)
          )
      
      response = await async_client.get("/books?page=1&page_size=2")
      
      assert response.status_code == 200
      data = response.json()
      assert len(data["items"]) == 2
      assert data["total"] == 5
  ```

#### `test_orders_api.py`
- Order creation with items
- Order status transitions
- Cancellation and refunds
- Seller/buyer permission checks
- Example:
  ```python
  async def test_create_order(async_client, buyer_user, seller_user, seller_headers):
      """Order should be created with items."""
      # Create book first
      book_response = await async_client.post(
          "/books",
          json={"title": "Test Book", "price": 9.99, ...},
          headers=seller_headers
      )
      book_id = book_response.json()["id"]
      
      # Create order
      response = await async_client.post(
          "/orders",
          json={
              "items": [{"book_id": book_id, "quantity": 2}],
              "shipping_address": {...}
          },
          headers=buyer_headers(buyer_user)
      )
      
      assert response.status_code == 201
      assert response.json()["status"] == "pending"
  ```

#### `test_reviews_api.py`
- Create, update, delete reviews
- Verified-purchase requirement
- Rating constraints
- Example:
  ```python
  async def test_create_review_requires_purchase(async_client, buyer_user):
      """Review should require verified purchase."""
      response = await async_client.post(
          "/reviews",
          json={"book_id": some_book_id, "rating": 5, "text": "Great!"},
          headers=buyer_headers(buyer_user)
      )
      
      assert response.status_code == 403
      assert "purchase required" in response.json()["detail"].lower()
  ```

#### `test_error_handling.py`
- Exception handler behavior
- Error response format consistency
- Field-level validation error details
- 5xx error handling
- Example:
  ```python
  async def test_validation_error_format(async_client):
      """Validation errors should include field-level details."""
      response = await async_client.post(
          "/auth/register",
          json={"email": "invalid-email", "password": "short"}
      )
      
      assert response.status_code == 422
      data = response.json()
      assert "errors" in data
      errors = data["errors"]
      assert any(e["field"] == "email" for e in errors)
  ```

#### `test_status_codes.py`
- Comprehensive HTTP status code validation
- All error conditions mapped correctly
- Success status codes (200, 201, 204)
- Error status codes (400, 401, 403, 404, 409, 422, 500)
- Example:
  ```python
  async def test_not_found_returns_404(async_client):
      """Requesting non-existent book returns 404."""
      response = await async_client.get(f"/books/{uuid4()}")
      assert response.status_code == 404
  
  async def test_insufficient_stock_returns_409(async_client, buyer_user):
      """Creating order with insufficient stock returns 409."""
      # Create book with 1 unit
      # Attempt to order 2 units
      # Should get 409 Conflict
  ```

#### `test_rate_limiting.py`
- Rate limit enforcement
- Quota tracking
- Exempted endpoints (health, metrics)
- Example:
  ```python
  async def test_rate_limit_enforcement(async_client):
      """Requests exceeding limit should be rejected."""
      # Make requests up to limit (settings.RATE_LIMIT_DEFAULT_CALLS)
      # Each should succeed
      # Next request should be rejected with 429
      
      for i in range(settings.RATE_LIMIT_DEFAULT_CALLS):
          response = await async_client.get("/books")
          assert response.status_code == 200
      
      response = await async_client.get("/books")
      assert response.status_code == 429
  ```

#### `test_async_patterns.py`
- Async/await patterns validation
- Concurrent operations
- Connection pooling
- Event loop behavior
- Example:
  ```python
  async def test_concurrent_book_creation(async_client, seller_user):
      """Concurrent requests should work correctly."""
      import asyncio
      
      tasks = [
          async_client.post(
              "/books",
              json={"title": f"Book {i}", ...},
              headers=seller_headers(seller_user)
          )
          for i in range(10)
      ]
      
      responses = await asyncio.gather(*tasks)
      
      assert all(r.status_code == 201 for r in responses)
      assert len(responses) == 10
  ```

### Coverage Configuration

**Configuration** (`pyproject.toml`):
```toml
[tool.coverage.run]
source = ["app"]
omit = ["app/core/database.py", "*/migrations/*", "*/__pycache__/*"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",           # Explicitly marked
    "if TYPE_CHECKING:",          # Type-only imports
    "raise NotImplementedError",  # Abstract methods
    "if __name__ == .__main__.:", # Script guards
]
```

**Coverage Targets**:
- Target: 80%+ overall coverage
- Core business logic (services, repositories): 90%+
- API endpoints: 85%+
- Excluded: Database connection, migrations, type-only code

**Running Coverage**:
```bash
# Generate coverage report
pytest --cov=app --cov-report=html tests/

# View HTML report
open htmlcov/index.html
```

### Test Naming Convention

- Test functions: `test_{feature}_{scenario}` 
  - Example: `test_login_success`, `test_book_not_found_returns_404`
- Test classes: `Test{FeatureName}`
  - Example: `TestAuthService`, `TestBookRepository`
- Descriptive docstrings explaining the test purpose
- Example:
  ```python
  async def test_create_order_with_multiple_items():
      """Order should accept multiple items from different sellers."""
      # Arrange
      buyer = await create_test_user(db, role=UserRole.BUYER)
      seller1 = await create_test_user(db, role=UserRole.SELLER, email="seller1@test.com")
      seller2 = await create_test_user(db, role=UserRole.SELLER, email="seller2@test.com")
      book1 = await create_test_book(db, seller=seller1)
      book2 = await create_test_book(db, seller=seller2)
      
      # Act
      response = await async_client.post(
          "/orders",
          json={
              "items": [
                  {"book_id": str(book1.id), "quantity": 1},
                  {"book_id": str(book2.id), "quantity": 2},
              ],
              "shipping_address": {...}
          },
          headers=make_auth_headers(buyer)
      )
      
      # Assert
      assert response.status_code == 201
      order = response.json()
      assert len(order["items"]) == 2
  ```

---

## Frontend Testing

### Testing Framework: Jest

**Version**: `^30.3.0`

**Configuration**:
- Configured via `package.json` scripts
- TypeScript support via `ts-jest`
- Testing library for React component testing

**Scripts**:
```json
{
  "test": "jest --passWithNoTests",
  "test:e2e": "playwright test"
}
```

**Current Status**: Minimal test coverage in place

### E2E Testing: Playwright

**Version**: `^1.58.2`

**Scripts**:
- `test:e2e` - Run all E2E tests
- Supports headless and headed execution
- Test report generation

**Current Status**: E2E test framework configured, tests can be added

### Test Structure

```
frontend/
├── src/
│   ├── components/          # Component test examples TBD
│   ├── lib/
│   │   ├── api/            # API client tests TBD
│   │   └── hooks/          # Hook tests TBD
│   └── store/              # State management tests TBD
└── e2e/                    # E2E tests (Playwright)
    └── *.spec.ts
```

### Testing Best Practices (Frontend)

*To be implemented*:

1. **Component Tests** (Jest + React Testing Library)
   - Test user interactions, not implementation
   - Mock API calls and external dependencies
   - Test props, state, and conditional rendering
   - Example pattern:
     ```typescript
     import { render, screen, fireEvent } from "@testing-library/react";
     import { BookCard } from "@/components/BookCard";

     describe("BookCard", () => {
       it("should display book title", () => {
         const props = {
           id: "123",
           title: "Test Book",
           price: 9.99,
         };
         render(<BookCard {...props} />);
         
         expect(screen.getByText("Test Book")).toBeInTheDocument();
       });

       it("should call onClick handler when clicked", () => {
         const onClick = jest.fn();
         render(<BookCard {...props} onClick={onClick} />);
         
         fireEvent.click(screen.getByRole("button"));
         expect(onClick).toHaveBeenCalled();
       });
     });
     ```

2. **Hook Tests** (React Testing Library)
   - Test custom hook behavior
   - Mock external dependencies (API client, store)
   - Example pattern:
     ```typescript
     import { renderHook, act, waitFor } from "@testing-library/react";
     import { useBooks } from "@/lib/hooks/useBooks";

     describe("useBooks", () => {
       it("should load books on mount", async () => {
         const { result } = renderHook(() => useBooks());
         
         expect(result.current.isLoading).toBe(true);
         
         await waitFor(() => {
           expect(result.current.isLoading).toBe(false);
           expect(result.current.books.length).toBeGreaterThan(0);
         });
       });
     });
     ```

3. **E2E Tests** (Playwright)
   - Full user workflows
   - Cross-browser testing
   - Visual regression testing (optional)
   - Example pattern:
     ```typescript
     import { test, expect } from "@playwright/test";

     test("user should be able to login and view books", async ({ page }) => {
       await page.goto("http://localhost:3000/login");
       
       await page.fill('input[type="email"]', "buyer@test.com");
       await page.fill('input[type="password"]', "Test1234!");
       await page.click('button[type="submit"]');
       
       await expect(page).toHaveURL("/books");
       await expect(page.locator("text=Books")).toBeVisible();
     });
     ```

---

## Running Tests

### Backend

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run specific test file
pytest tests/unit/test_schemas.py

# Run specific test function
pytest tests/integration/test_auth_api.py::test_login_success

# Run with coverage
pytest --cov=app --cov-report=term-missing tests/

# Run only unit tests (fast)
pytest tests/unit/

# Run only integration tests
pytest tests/integration/

# Run with specific marker (when markers are defined)
pytest -m "not slow"

# Run in parallel (requires pytest-xdist)
pytest -n auto

# Run with custom timeout (prevents hanging tests)
pytest --timeout=30
```

### Frontend

```bash
# Run Jest tests
npm test

# Run Jest with watch mode
npm test -- --watch

# Run Jest with coverage
npm test -- --coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests in headed mode
npx playwright test --headed

# Run E2E tests for specific browser
npx playwright test --project=chromium
```

---

## Testing Checklist

### Before Submitting PR

- [ ] All new code has corresponding tests
- [ ] Unit tests pass: `pytest tests/unit/`
- [ ] Integration tests pass: `pytest tests/integration/`
- [ ] Coverage maintained above target (80%+)
- [ ] No test fixtures leaked between tests (rollback verified)
- [ ] Async patterns properly await
- [ ] Mock fixtures correctly patch external services

### Test Isolation

**Ensure Tests are Hermetic**:
- No shared test data between tests
- Database rollback after each test
- Fixtures are function-scoped (not module/session)
- Mock patches cleaned up via context manager
- No reliance on test execution order
- Environment variables reset after tests

### Debugging Tests

```bash
# Run test with print output visible
pytest -s tests/unit/test_schemas.py

# Run with full traceback
pytest --tb=long tests/integration/test_auth_api.py

# Run with pdb debugger on failure
pytest --pdb tests/unit/test_services.py

# Run with print debugging in async tests
pytest -s -v tests/integration/test_books_api.py
```

---

## CI/CD Testing

**Recommended CI Configuration**:
```yaml
# Example GitHub Actions workflow
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
      redis:
        image: redis:7
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: 3.12
      - run: pip install -r requirements.txt
      - run: pytest --cov=app tests/
      - run: black --check app/ tests/
      - run: isort --check-only app/ tests/
      - run: flake8 app/ tests/
      - run: mypy app/
```

---

## Coverage Reports

**Generate HTML Coverage Report**:
```bash
pytest --cov=app --cov-report=html tests/
open htmlcov/index.html
```

**Expected Report Contents**:
- Overall coverage percentage (target: 80%+)
- Per-module coverage breakdown
- Missing lines highlighted
- Excluded lines (type-checking, stubs)

---

## Test Maintenance

### Regular Tasks

1. **Update fixtures** when models change
2. **Review coverage** monthly for gaps
3. **Refactor tests** to reduce duplication
4. **Remove obsolete tests** when features retire
5. **Update mocks** when external APIs change

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| **Flaky async tests** | Add `await` explicitly, check race conditions |
| **Fixture not found** | Verify scope (session vs function), check import |
| **Database transaction timeout** | Increase timeout in `conftest.py` |
| **Mock not working** | Check patch path is correct, use `autospec=True` |
| **Coverage gaps** | Add unit test for uncovered logic, review exclusions |

---

## Summary

Books4All implements a **multi-layered testing strategy**:

1. **Unit Tests** - Fast, isolated, comprehensive coverage of business logic
2. **Integration Tests** - API endpoints, database interactions, error scenarios
3. **Fixtures & Factories** - Reusable, hermetic test data setup
4. **Mocking** - External services (Stripe, Redis, OAuth) fully mocked
5. **Coverage** - 80%+ target with automated reporting
6. **Frontend** - Jest + Playwright framework configured, ready for expansion

The testing infrastructure prioritizes:
- **Isolation** - Each test is independent, no side effects
- **Speed** - Unit tests fast (<100ms), integration tests under 1s
- **Clarity** - Descriptive test names, clear assertions
- **Maintainability** - DRY fixtures, reusable factories
- **Reliability** - Async-safe, proper mocking, no flakiness

