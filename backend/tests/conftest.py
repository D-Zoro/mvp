"""
Test configuration and shared fixtures for the Books4All test suite.

Fixture hierarchy:
    async_engine (session) → db_session (function, rollback) → async_client (function)

External services mocked:
    - Redis rate limiter (patched to always allow)
    - Stripe (patched via mock_stripe fixture)
"""

import uuid
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
import pytest_asyncio
from alembic import command
from alembic.config import Config
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.dependencies import get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models.book import Book, BookCondition, BookStatus
from app.models.user import User, UserRole


# ─────────────────────────────────────────────────────────────────────────────
# Database fixtures (extend existing session-scoped pattern)
# ─────────────────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture(scope="session")
async def async_engine():
    """
    Session-scoped async engine.
    Runs Alembic migrations once for the entire test session against the
    configured DATABASE_URL (same as the dev database — rollback isolation
    keeps tests hermetic).
    """
    engine = create_async_engine(settings.DATABASE_URL)

    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)
    command.upgrade(alembic_cfg, "head")

    yield engine

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(async_engine) -> AsyncGenerator[AsyncSession, None]:
    """
    Function-scoped DB session that is rolled back after each test.
    Each test gets a clean, isolated view of the database.
    """
    async with async_engine.connect() as conn:
        trans = await conn.begin()

        Session = async_sessionmaker(bind=conn, expire_on_commit=False)
        session = Session()

        yield session

        await session.close()
        await trans.rollback()


# ─────────────────────────────────────────────────────────────────────────────
# HTTP client fixture (integration tests)
# ─────────────────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture(scope="function")
async def async_client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    FastAPI AsyncClient with the test DB session injected.

    Overrides the `get_db` dependency so all routes use the rollback session,
    guaranteeing test isolation. Rate limiting is disabled globally.
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


# ─────────────────────────────────────────────────────────────────────────────
# Mock fixtures (external services)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def mock_redis():
    """
    Automatically patches Redis rate limiter for every test.
    This prevents tests from needing a live Redis instance and ensures
    rate limiting never blocks test requests.
    """
    with patch(
        "app.core.rate_limiter.rate_limiter.is_rate_limited",
        new_callable=AsyncMock,
        return_value=(False, 100, 0),
    ):
        yield


@pytest.fixture()
def mock_stripe():
    """
    Patches Stripe SDK calls used by PaymentService.
    Returns a mock checkout session object with predictable values.
    """
    fake_session = MagicMock()
    fake_session.id = "cs_test_fake_session_id"
    fake_session.url = "https://checkout.stripe.com/fake"
    fake_session.payment_intent = "pi_test_fake_intent"

    with patch("stripe.checkout.Session.create", return_value=fake_session) as mock_create, \
         patch("stripe.Webhook.construct_event") as mock_webhook, \
         patch("stripe.Refund.create") as mock_refund:
        yield {
            "create": mock_create,
            "webhook": mock_webhook,
            "refund": mock_refund,
            "session": fake_session,
        }


# ─────────────────────────────────────────────────────────────────────────────
# Test data factory helpers
# ─────────────────────────────────────────────────────────────────────────────

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
    Create and persist a test user with a hashed password.

    Args:
        db: Active async session.
        email: Unique email (auto-generated if not provided).
        password: Plain-text password (will be hashed).
        role: User role.
        is_active: Whether account is active.
        email_verified: Whether email is verified.

    Returns:
        Persisted User ORM instance.
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
        db: Active async session.
        seller: The owning seller user.
        title: Book title.
        price: Listing price.
        quantity: Available stock.
        status: Listing status.

    Returns:
        Persisted Book ORM instance.
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


def make_auth_headers(user: User) -> dict[str, str]:
    """
    Generate Bearer auth headers for a user without hitting the DB.

    Args:
        user: The user to generate a token for.

    Returns:
        Dict with ``Authorization`` header ready to pass to AsyncClient.
    """
    token = create_access_token(user.id, user.role.value)
    return {"Authorization": f"Bearer {token}"}


# ─────────────────────────────────────────────────────────────────────────────
# Pre-built user fixtures
# ─────────────────────────────────────────────────────────────────────────────

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


@pytest.fixture()
def buyer_headers(buyer_user: User) -> dict[str, str]:
    """Auth headers for the buyer fixture user."""
    return make_auth_headers(buyer_user)


@pytest.fixture()
def seller_headers(seller_user: User) -> dict[str, str]:
    """Auth headers for the seller fixture user."""
    return make_auth_headers(seller_user)


@pytest.fixture()
def admin_headers(admin_user: User) -> dict[str, str]:
    """Auth headers for the admin fixture user."""
    return make_auth_headers(admin_user)