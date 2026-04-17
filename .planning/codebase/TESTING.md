# Books4All — Testing Standards & Practices

**Last Updated:** 2026-04-18  
**Scope:** Backend test framework, structure, mocking, and coverage guidelines

---

## Overview

The Books4All test suite is organized into three tiers, each with specific responsibilities and isolation guarantees. This document outlines the testing strategy, fixture architecture, and best practices to maintain high code quality and fast feedback loops.

---

## Test Tiers

### 1. Unit Tests (`tests/unit/`)

**Purpose:** Test business logic in isolation, with zero external dependencies.

**Characteristics:**
- No database access
- No HTTP requests
- No network calls
- Fast execution (milliseconds)
- Pure Python — test functions, methods, validators
- 100% deterministic

**What to Test:**
- Service layer business logic (e.g., order status transitions)
- Access control checks (e.g., "can user modify this order?")
- Validation logic
- Helper functions
- Exception scenarios

**Example: Order Status Transitions**
```python
# tests/unit/test_services.py

from types import SimpleNamespace
from uuid import uuid4
import pytest

from app.models.order import OrderStatus
from app.models.user import UserRole
from app.services.exceptions import InvalidStatusTransitionError
from app.services.order_service import OrderService


def _make_user(role: UserRole = UserRole.BUYER) -> SimpleNamespace:
    """Build a lightweight fake user for testing."""
    return SimpleNamespace(id=uuid4(), role=role, is_active=True)


def _make_order(buyer_id=None, status: OrderStatus = OrderStatus.PENDING) -> SimpleNamespace:
    """Build a lightweight fake order."""
    return SimpleNamespace(
        id=uuid4(),
        buyer_id=buyer_id or uuid4(),
        status=status,
        items=[],
    )


class TestOrderStatusTransitions:
    """Validates the _ALLOWED_TRANSITIONS map enforced by OrderService."""

    def test_pending_to_payment_processing_allowed(self):
        """PENDING → PAYMENT_PROCESSING is valid."""
        # Should not raise
        OrderService._assert_valid_transition(
            OrderStatus.PENDING, OrderStatus.PAYMENT_PROCESSING
        )

    def test_pending_to_paid_forbidden(self):
        """PENDING → PAID skips PAYMENT_PROCESSING and must be rejected."""
        with pytest.raises(InvalidStatusTransitionError, match="pending"):
            OrderService._assert_valid_transition(
                OrderStatus.PENDING, OrderStatus.PAID
            )
```

**Key Patterns:**
- Use `SimpleNamespace` to create lightweight fake objects (avoids SQLAlchemy instrumentation)
- Don't use `User.__new__()` — SQLAlchemy requires mapper initialization
- Mock async functions with `AsyncMock` from `unittest.mock`
- Focus on "happy path" and error cases, not every code branch

---

### 2. Database Tests (`tests/DB/`)

**Purpose:** Validate ORM models, constraints, migrations, and relationships.

**Characteristics:**
- Real PostgreSQL database (test instance)
- Real SQLAlchemy ORM
- Per-test rollback isolation (Alembic migrations run once per session)
- Each test runs inside a transaction that rolls back after completion
- Moderate speed (seconds per test)
- Tests database schema, constraints, and ORM behavior

**What to Test:**
- Column constraints (unique, not null, defaults)
- Relationships (foreign keys, cascades)
- Indexes
- Enum values
- Soft delete behavior
- Timestamp auto-updates
- Database migrations

**Example: User Model Constraints**
```python
# tests/DB/test_users.py

import pytest
from sqlalchemy.exc import IntegrityError

from app.models.user import User, UserRole


@pytest.mark.asyncio
async def test_create_user(db_session):
    """User table exists, UUID primary key works, enum works."""
    user = User(
        email="test@example.com",
        role=UserRole.BUYER,
        is_active=True,
        email_verified=False,
    )

    db_session.add(user)
    await db_session.commit()

    assert user.id is not None


@pytest.mark.asyncio
async def test_unique_email_constraint(db_session):
    """UNIQUE(email) constraint is enforced."""
    user1 = User(
        email="unique@example.com",
        role=UserRole.BUYER,
        is_active=True,
        email_verified=False,
    )

    user2 = User(
        email="unique@example.com",  # duplicate
        role=UserRole.SELLER,
        is_active=True,
        email_verified=False,
    )

    db_session.add(user1)
    await db_session.commit()

    db_session.add(user2)

    with pytest.raises(Exception):  # IntegrityError
        await db_session.commit()

    await db_session.rollback()
```

**Key Patterns:**
- Use the `db_session` fixture (function-scoped, rolled back after each test)
- Verify constraints by attempting violations
- Test cascade behavior (e.g., delete seller → delete their books)
- Focus on schema properties, not business logic

---

### 3. Integration Tests (`tests/integration/`)

**Purpose:** Test API endpoints end-to-end with a real database and HTTP layer.

**Characteristics:**
- Real FastAPI app (via `AsyncClient` + `ASGITransport`)
- Real database with per-test rollback
- Full request/response cycle
- HTTP status codes, headers, and body validation
- Slower than unit tests (seconds per test)
- Tests business logic through the API

**What to Test:**
- Endpoint status codes and response bodies
- Authentication and authorization flows
- Multi-step workflows (e.g., register → login → create book → order)
- Error responses and validation messages
- Pagination and filtering
- Rate limiting behavior

**Example: Authentication API**
```python
# tests/integration/test_auth_api.py

import pytest
from httpx import AsyncClient

from tests.conftest import create_test_user, make_auth_headers
from app.models.user import UserRole


BASE = "/api/v1/auth"


async def test_register_success(async_client: AsyncClient):
    """Valid registration returns 201 with tokens and user details."""
    resp = await async_client.post(f"{BASE}/register", json={
        "email": "newuser@example.com",
        "password": "Secure1234",
        "role": "buyer",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert "access_token" in body
    assert body["user"]["email"] == "newuser@example.com"


async def test_register_duplicate_email(async_client: AsyncClient, db_session):
    """Duplicate email returns 409 Conflict."""
    await create_test_user(db_session, email="taken@example.com")

    resp = await async_client.post(f"{BASE}/register", json={
        "email": "taken@example.com",
        "password": "Secure1234",
    })
    assert resp.status_code == 409


async def test_login_success(async_client: AsyncClient, db_session):
    """Valid login returns 200 with tokens."""
    user = await create_test_user(
        db_session,
        email="user@example.com",
        password="Test1234!"
    )

    resp = await async_client.post(f"{BASE}/login", json={
        "email": "user@example.com",
        "password": "Test1234!",
    })
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert body["user"]["id"] == str(user.id)


async def test_me_authenticated(async_client: AsyncClient, buyer_user, buyer_headers):
    """GET /me with valid token returns user profile."""
    resp = await async_client.get(
        f"{BASE}/me",
        headers=buyer_headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == buyer_user.email
    assert body["role"] == "buyer"


async def test_me_unauthenticated(async_client: AsyncClient):
    """GET /me without token returns 401 Unauthorized."""
    resp = await async_client.get(f"{BASE}/me")
    assert resp.status_code == 401
```

**Key Patterns:**
- Use the `async_client` fixture (injects `db_session` via dependency override)
- Use pre-built fixtures: `buyer_user`, `seller_user`, `admin_user`
- Use `buyer_headers`, `seller_headers`, `admin_headers` for authenticated requests
- Test both success and failure paths
- Validate exact response structures

---

## Fixture Architecture

### Session-Level Setup

The test suite uses a **session-scoped engine** with per-function rollback for isolation:

```python
@pytest_asyncio.fixture(scope="session")
async def async_engine():
    """
    Session-scoped async engine.
    Runs Alembic migrations once for the entire test session.
    """
    engine = create_async_engine(settings.DATABASE_URL)

    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
    command.upgrade(alembic_cfg, "head")  # Run migrations

    yield engine
    await engine.dispose()
```

**Benefit:** Migrations run once per session (fast), not per test (slow).

### Function-Level Database Session

Each test gets a fresh, isolated view via transaction rollback:

```python
@pytest_asyncio.fixture(scope="function")
async def db_session(async_engine) -> AsyncGenerator[AsyncSession, None]:
    """
    Function-scoped DB session that is rolled back after each test.
    Guarantees test isolation without cleanup.
    """
    async with async_engine.connect() as conn:
        trans = await conn.begin()

        Session = async_sessionmaker(bind=conn, expire_on_commit=False)
        session = Session()

        yield session

        await session.close()
        await trans.rollback()  # ← all changes discarded
```

**How it works:**
1. Begin a transaction at the connection level
2. Create a session bound to that transaction
3. Test runs (make DB changes)
4. After test: rollback the transaction (all changes discarded)
5. Next test: clean database again

**Benefit:** Hermetic tests (no cleanup code needed), fast (rollback is instant).

### HTTP Client with Dependency Override

Integration tests use `AsyncClient` with overridden dependencies:

```python
@pytest_asyncio.fixture(scope="function")
async def async_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    FastAPI AsyncClient with test DB session injected.
    Overrides get_db dependency so all routes use the rollback session.
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

**How it works:**
1. Override `get_db` dependency to return the test session
2. All routes that `Depends(get_db)` now use the test session
3. Requests go through full FastAPI stack (middleware, authentication, etc.)
4. After test: clear overrides

**Benefit:** Full end-to-end testing with real app logic and isolation.

---

## Mocking Strategy

### External Services (Redis, Stripe)

#### Redis Rate Limiter
Mock globally with `autouse=True` fixture:

```python
@pytest.fixture(autouse=True)
def mock_redis():
    """
    Automatically patches Redis rate limiter for every test.
    This ensures rate limiting never blocks test requests.
    """
    with patch(
        "app.core.rate_limiter.rate_limiter.is_rate_limited",
        new_callable=AsyncMock,
        return_value=(False, 100, 0),  # is_limited, remaining, reset_time
    ):
        yield
```

**Effect:** Every test's rate limiter always allows requests.

#### Stripe Payment Processing
Mock on-demand with optional fixture:

```python
@pytest.fixture()
def mock_stripe():
    """
    Patches Stripe SDK calls used by PaymentService.
    Returns a mock checkout session object.
    """
    fake_session = MagicMock()
    fake_session.id = "cs_test_fake_session_id"
    fake_session.url = "https://checkout.stripe.com/fake"

    with patch("stripe.checkout.Session.create", return_value=fake_session) as mock_create, \
         patch("stripe.Webhook.construct_event") as mock_webhook:
        yield {
            "create": mock_create,
            "webhook": mock_webhook,
            "session": fake_session,
        }
```

**Usage:**
```python
async def test_create_checkout_session(async_client: AsyncClient, mock_stripe):
    """Stripe is mocked, returns predictable session."""
    resp = await async_client.post("/api/v1/orders/123/checkout")
    assert resp.status_code == 200
    # mock_stripe["create"] was called with the order details
```

### Test Data Factories

Use helper functions to create consistent test data:

```python
# tests/conftest.py

async def create_test_user(
    db: AsyncSession,
    *,
    email: str | None = None,
    password: str = "Test1234!",
    role: UserRole = UserRole.BUYER,
    is_active: bool = True,
    email_verified: bool = True,
) -> User:
    """Create and persist a test user."""
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


async def create_test_book(
    db: AsyncSession,
    *,
    seller: User,
    title: str = "Test Book",
    price: float = 9.99,
    quantity: int = 5,
    status: BookStatus = BookStatus.ACTIVE,
) -> Book:
    """Create and persist a test book listing."""
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

**Benefits:**
- Consistent test data across tests
- Reduces boilerplate in test functions
- Easy to override defaults for specific scenarios

---

## Pre-Built Fixtures

### User Fixtures

```python
@pytest_asyncio.fixture()
async def buyer_user(db_session: AsyncSession) -> User:
    """Ready-to-use buyer user."""
    return await create_test_user(db_session, role=UserRole.BUYER, email="buyer@test.com")


@pytest_asyncio.fixture()
async def seller_user(db_session: AsyncSession) -> User:
    """Ready-to-use seller user."""
    return await create_test_user(db_session, role=UserRole.SELLER, email="seller@test.com")


@pytest_asyncio.fixture()
async def admin_user(db_session: AsyncSession) -> User:
    """Ready-to-use admin user."""
    return await create_test_user(db_session, role=UserRole.ADMIN, email="admin@test.com")
```

### Auth Header Fixtures

```python
@pytest.fixture()
def buyer_headers(buyer_user: User) -> dict[str, str]:
    """Auth headers for the buyer fixture user."""
    return make_auth_headers(buyer_user)


@pytest.fixture()
def seller_headers(seller_user: User) -> dict[str, str]:
    """Auth headers for the seller fixture user."""
    return make_auth_headers(seller_user)
```

**Usage in Tests:**
```python
async def test_get_my_books(async_client: AsyncClient, seller_headers):
    """Seller can retrieve their own books."""
    resp = await async_client.get(
        "/api/v1/books/my-listings",
        headers=seller_headers,
    )
    assert resp.status_code == 200
```

---

## Best Practices

### General Principles

1. **Test one thing per test** — clear, descriptive test name
   ```python
   # ✓ Good: tests a single scenario
   async def test_register_duplicate_email_returns_409(async_client, db_session):
       ...

   # ✗ Wrong: tests multiple scenarios
   async def test_register(async_client, db_session):
       # Test success
       # Test duplicate email
       # Test weak password
       # ...
   ```

2. **Use descriptive test names** — name explains the scenario
   ```python
   # ✓ Good
   def test_pending_order_can_transition_to_payment_processing():
       ...

   # ✗ Wrong: name doesn't explain what's being tested
   def test_order_transition():
       ...
   ```

3. **Arrange → Act → Assert pattern**
   ```python
   async def test_create_order_deducts_stock(async_client, db_session, seller_user):
       # Arrange
       book = await create_test_book(db_session, seller=seller_user, quantity=5)
       initial_quantity = book.quantity

       # Act
       resp = await async_client.post(
           "/api/v1/orders",
           json={"book_id": str(book.id), "quantity": 2},
           headers=make_auth_headers(...),
       )

       # Assert
       assert resp.status_code == 201
       book_after = await db_session.get(Book, book.id)
       assert book_after.quantity == initial_quantity - 2
   ```

4. **Test error cases, not just success** — especially permission checks
   ```python
   # ✓ Good: test both success and error
   async def test_seller_can_update_own_book(async_client, db_session, seller_user):
       book = await create_test_book(db_session, seller=seller_user)
       resp = await async_client.put(
           f"/api/v1/books/{book.id}",
           json={"price": 19.99},
           headers=make_auth_headers(seller_user),
       )
       assert resp.status_code == 200

   async def test_seller_cannot_update_other_seller_book(async_client, db_session, seller_user, seller_user_2):
       book = await create_test_book(db_session, seller=seller_user_2)
       resp = await async_client.put(
           f"/api/v1/books/{book.id}",
           json={"price": 19.99},
           headers=make_auth_headers(seller_user),
       )
       assert resp.status_code == 403  # Forbidden
   ```

5. **Don't test framework code** — trust FastAPI, SQLAlchemy, etc.
   ```python
   # ✗ Wrong: testing Pydantic, not your code
   def test_pydantic_validation():
       from app.schemas.book import BookCreate
       with pytest.raises(ValidationError):
           BookCreate(title="", author="")

   # ✓ Right: test your validation logic in business rules
   async def test_create_book_rejects_negative_price(async_client, seller_headers):
       resp = await async_client.post(
           "/api/v1/books",
           json={"title": "Book", "price": -5},
           headers=seller_headers,
       )
       assert resp.status_code == 422  # Validation error
   ```

### Unit Testing Patterns

1. **Use SimpleNamespace for fake objects**
   ```python
   # ✓ Good: lightweight, no SQLAlchemy instrumentation
   from types import SimpleNamespace
   user = SimpleNamespace(id=uuid4(), role=UserRole.BUYER, is_active=True)

   # ✗ Wrong: SQLAlchemy mapper initialization issues
   user = User.__new__(User)
   user.id = uuid4()
   ```

2. **Mock async functions with AsyncMock**
   ```python
   # ✓ Good
   from unittest.mock import AsyncMock
   mock_repo = AsyncMock()
   mock_repo.get_by_email.return_value = SimpleNamespace(id=uuid4(), email="user@example.com")

   # Test
   result = await auth_service.login(email="user@example.com", password="pass")
   ```

3. **Test pure functions, not integration**
   ```python
   # ✓ Good: tests the actual business logic
   def test_assert_valid_transition():
       OrderService._assert_valid_transition(OrderStatus.PENDING, OrderStatus.PAYMENT_PROCESSING)
       # Should not raise

   # ✗ Wrong: indirectly testing through integration
   async def test_update_order_status(async_client, db_session, order):
       resp = await async_client.patch(f"/api/v1/orders/{order.id}/status", ...)
       # Too many layers of indirection
   ```

### Integration Testing Patterns

1. **Use fixtures to set up data**
   ```python
   async def test_buyer_can_review_purchased_book(
       async_client: AsyncClient,
       db_session: AsyncSession,
       buyer_user: User,
       seller_user: User,
   ):
       # Data setup via fixtures
       book = await create_test_book(db_session, seller=seller_user)
       order = await create_test_order(db_session, buyer=buyer_user, book=book)
       order.status = OrderStatus.DELIVERED
       await db_session.commit()

       # Test
       resp = await async_client.post(
           f"/api/v1/books/{book.id}/reviews",
           json={"rating": 5, "text": "Great book!"},
           headers=make_auth_headers(buyer_user),
       )
       assert resp.status_code == 201
   ```

2. **Verify response structure and content**
   ```python
   async def test_get_books_list(async_client: AsyncClient):
       resp = await async_client.get("/api/v1/books")
       assert resp.status_code == 200
       body = resp.json()

       # Verify structure
       assert "items" in body
       assert "total" in body
       assert "page" in body
       assert isinstance(body["items"], list)

       # Verify item structure
       if body["items"]:
           book = body["items"][0]
           assert "id" in book
           assert "title" in book
           assert "price" in book
   ```

3. **Test authentication and authorization**
   ```python
   async def test_unauthorized_request(async_client: AsyncClient):
       """Request without token returns 401."""
       resp = await async_client.get("/api/v1/books/my-listings")
       assert resp.status_code == 401

   async def test_buyer_cannot_access_seller_endpoint(
       async_client: AsyncClient,
       buyer_headers: dict[str, str],
   ):
       """Buyer trying seller-only endpoint returns 403."""
       resp = await async_client.post(
           "/api/v1/books",
           json={"title": "Book", "price": 9.99, ...},
           headers=buyer_headers,
       )
       assert resp.status_code == 403
   ```

---

## Running Tests

### All Tests
```bash
cd backend
pytest tests/ -v
```

### By Tier
```bash
# Unit tests only (fast)
pytest tests/unit/ -v

# Database tests (medium)
pytest tests/DB/ -v

# Integration tests (slower)
pytest tests/integration/ -v
```

### With Coverage
```bash
pytest tests/unit/ tests/DB/ --cov=app --cov-report=term-missing
```

### Specific Test
```bash
pytest tests/integration/test_auth_api.py::test_register_success -v
```

### With Markers
```bash
# Run only fast tests (marked with @pytest.mark.fast)
pytest -m fast

# Run all except slow tests
pytest -m "not slow"
```

---

## Configuration

### pytest.ini Options (in pyproject.toml)

```toml
[tool.pytest.ini_options]
asyncio_mode = "auto"           # No @pytest.mark.asyncio needed
testpaths = ["tests"]
addopts = "-v --tb=short"

[tool.coverage.run]
source = ["app"]
omit = ["app/core/database.py", "*/migrations/*", "*/__pycache__/*"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "if TYPE_CHECKING:",
    "raise NotImplementedError",
    "if __name__ == .__main__.:",
]
```

---

## Known Issues & Gotchas

### 1. Password Hashing in Tests
bcrypt has a 72-byte limit. Passwords must be ≤ 72 bytes:
```python
# ✓ Good
hash_password("Secure1234")  # 10 bytes

# ✗ Wrong: will raise ValueError on hash detection
password = "x" * 100  # > 72 bytes
hash_password(password)
```

### 2. SQLAlchemy Async Sessions
Always use `await`:
```python
# ✓ Good
result = await session.execute(select(User))

# ✗ Wrong: coroutine not awaited
result = session.execute(select(User))
```

### 3. ORM Refresh in Tests
After commit, refresh to get updated timestamps:
```python
# In fixture
await db_session.commit()
await db_session.refresh(user)  # ← get updated created_at, etc.
```

### 4. Alembic & Test Database
Alembic migrations run once per session:
- If you add a migration during test development, restart pytest
- Session-scoped fixture ensures fast re-runs

### 5. Redis Mocking
Redis is mocked globally via `autouse=True` fixture. To test Redis behavior explicitly:
```python
# Temporarily disable the mock
def test_redis_failure():
    with patch.object(rate_limiter, "is_rate_limited", side_effect=Exception("Redis down")):
        # Test behavior when Redis is down
        pass
```

---

## Coverage Goals

| Tier | Target | Rationale |
|------|--------|-----------|
| Unit | 80%+ | Fast feedback, catches logic errors early |
| DB | 70%+ | Models are straightforward; cover edge cases |
| Integration | 60%+ | More expensive; focus on critical paths |
| **Overall** | **75%+** | High confidence in code quality |

**Critical paths to prioritize:**
- Authentication (login, token refresh)
- Payment processing (order creation, checkout)
- Authorization checks (ownership, role-based access)
- Error handling (validation, not found, permission denied)

---

## Summary Checklist

- [ ] Unit tests: no DB, pure logic, SimpleNamespace for mocks
- [ ] DB tests: schema, constraints, relationships, real DB with rollback
- [ ] Integration tests: end-to-end API flows, auth, authorization
- [ ] Use fixtures to set up data (user_user, seller_user, auth headers)
- [ ] Mock external services (Redis, Stripe) globally or per-test
- [ ] Test error cases, not just success
- [ ] Use descriptive test names
- [ ] Arrange → Act → Assert pattern
- [ ] Verify both status codes and response structure
- [ ] Don't test framework code (FastAPI, Pydantic, SQLAlchemy)
- [ ] Run tests frequently during development (`pytest -v`)

---

## See Also

- [CONVENTIONS.md](./CONVENTIONS.md) — Code style and patterns
- `tests/conftest.py` — Fixture definitions and test helpers
- `tests/unit/test_services.py` — Unit test examples
- `tests/DB/test_users.py` — Database test examples
- `tests/integration/test_auth_api.py` — Integration test examples
- `pyproject.toml` — pytest configuration
