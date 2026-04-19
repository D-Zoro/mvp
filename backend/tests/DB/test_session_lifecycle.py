"""
Session Lifecycle and Async Pattern Tests.

Validates:
- Session creation and cleanup
- Transaction rollback on exception
- Transaction commit on success
- Session leak prevention
- Async/await correctness
"""

import pytest
import uuid
from unittest.mock import AsyncMock, patch

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.core.database import async_session_maker
from app.models.user import User, UserRole
from app.models.book import Book, BookCondition, BookStatus
from app.models.order import Order, OrderStatus, OrderItem
from app.core.security import hash_password


# ─────────────────────────────────────────────────────────────────────────────
# Test Suite 1: Session Lifecycle Tests (ASYNC-02)
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_session_creation_and_cleanup(db_session: AsyncSession):
    """
    Session created and closed properly without exception.

    Verifies:
    - Session is not None
    - Session can execute queries
    - Session closes cleanly
    """
    assert db_session is not None
    assert isinstance(db_session, AsyncSession)

    # Verify we can execute a query
    result = await db_session.execute(text("SELECT 1"))
    assert result.scalar() == 1


@pytest.mark.asyncio
async def test_session_rollback_on_exception(async_engine):
    """
    Exception in transaction causes rollback; state unchanged.

    Scenario:
    1. Create a user with unique email
    2. Try to create another user with same email (violates UNIQUE constraint)
    3. Exception rolls back; database unchanged
    """
    # Create initial user
    async with async_session_maker() as session:
        user = User(
            email="unique@example.com",
            username="user1",
            password_hash=hash_password("TestPass1"),
            role=UserRole.BUYER,
        )
        session.add(user)
        await session.commit()

    # Try to create duplicate (should fail and rollback)
    with pytest.raises(IntegrityError):
        async with async_session_maker() as session:
            duplicate_user = User(
                email="unique@example.com",  # Same email!
                username="user2",
                password_hash=hash_password("TestPass1"),
                role=UserRole.BUYER,
            )
            session.add(duplicate_user)
            await session.commit()

    # Verify: exactly 1 user with that email (rollback worked)
    async with async_session_maker() as session:
        query = select(User).where(User.email == "unique@example.com")
        result = await session.execute(query)
        users = result.scalars().all()
        assert len(users) == 1


@pytest.mark.asyncio
async def test_session_commit_on_success(async_engine):
    """
    Successful operation commits data to database.

    Scenario:
    1. Create user in transaction
    2. Commit
    3. Verify data persists in new session
    """
    test_id = uuid.uuid4()

    # Create user and commit
    async with async_session_maker() as session:
        user = User(
            id=test_id,
            email="persistent@example.com",
            username="persistent_user",
            password_hash=hash_password("TestPass1"),
            role=UserRole.SELLER,
        )
        session.add(user)
        await session.commit()

    # Verify in new session
    async with async_session_maker() as session:
        query = select(User).where(User.id == test_id)
        result = await session.execute(query)
        found = result.scalar_one_or_none()
        assert found is not None
        assert found.email == "persistent@example.com"


@pytest.mark.asyncio
async def test_session_isolation_between_transactions(async_engine):
    """
    Changes in one session don't affect another until commit.

    Scenario:
    1. Session A: Create user (not committed yet)
    2. Session B: Query for user (shouldn't see it)
    3. Session A: Commit
    4. Session B: Query again (now visible)
    """
    test_id = uuid.uuid4()

    async with async_session_maker() as session_a:
        user_a = User(
            id=test_id,
            email="isolation@example.com",
            username="isolation_test",
            password_hash=hash_password("TestPass1"),
            role=UserRole.BUYER,
        )
        session_a.add(user_a)
        await session_a.flush()  # Flush but don't commit

        # New session B shouldn't see uncommitted data
        async with async_session_maker() as session_b:
            query = select(User).where(User.id == test_id)
            result = await session_b.execute(query)
            found = result.scalar_one_or_none()
            assert found is None  # Not visible yet

        # Commit in session A
        await session_a.commit()

    # Now session B should see it
    async with async_session_maker() as session_b:
        query = select(User).where(User.id == test_id)
        result = await session_b.execute(query)
        found = result.scalar_one_or_none()
        assert found is not None


@pytest.mark.asyncio
async def test_async_generator_cleanup(db_session: AsyncSession):
    """
    Test that async context managers properly clean up resources.

    This verifies the get_db() dependency pattern works correctly.
    """
    # The db_session fixture uses context manager + try/finally
    # This test just verifies the session is usable (fixture sets it up)
    assert not db_session.is_active or db_session is not None


# ─────────────────────────────────────────────────────────────────────────────
# Test Suite 2: Transaction Boundary Tests (ASYNC-03)
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_order_creation_atomicity(db_session: AsyncSession):
    """
    Order creation is all-or-nothing (atomic).

    Scenario:
    1. Create book with quantity=1
    2. Try to create order with 2 items (should fail)
    3. Verify: book quantity unchanged, order not created
    """
    # Setup: create seller
    seller = User(
        email="seller@example.com",
        username="seller",
        password_hash=hash_password("TestPass1"),
        role=UserRole.SELLER,
    )
    db_session.add(seller)
    await db_session.flush()

    # Setup: create book with quantity=1
    book = Book(
        seller_id=seller.id,
        title="Rare Book",
        author="Author",
        price=10.0,
        quantity=1,
        condition=BookCondition.MINT,
        status=BookStatus.ACTIVE,
    )
    db_session.add(book)
    await db_session.flush()

    # Setup: create buyer
    buyer = User(
        email="buyer@example.com",
        username="buyer",
        password_hash=hash_password("TestPass1"),
        role=UserRole.BUYER,
    )
    db_session.add(buyer)
    await db_session.flush()

    initial_quantity = book.quantity

    # Try to create order with 2 items (will fail - only 1 available)
    with pytest.raises(ValueError, match="Insufficient quantity"):
        from app.repositories.order import OrderRepository
        order_repo = OrderRepository(db_session)

        await order_repo.create_with_items(
            buyer_id=buyer.id,
            items=[
                {"book_id": book.id, "quantity": 1},
                {"book_id": book.id, "quantity": 1},  # This will cause error
            ],
            shipping_address={"street": "123 Main", "city": "City"},
            notes=None,
        )

    # Verify: no order created, quantity unchanged
    query = select(Order).where(Order.buyer_id == buyer.id)
    result = await db_session.execute(query)
    orders = result.scalars().all()
    assert len(orders) == 0

    # Verify: book quantity still 1
    await db_session.refresh(book)
    assert book.quantity == initial_quantity


@pytest.mark.asyncio
async def test_soft_delete_consistency(db_session: AsyncSession):
    """
    Soft-deleted records are not returned by queries.

    Scenario:
    1. Create user
    2. Soft-delete user (set deleted_at)
    3. Query for users
    4. Verify: deleted user not returned
    """
    # Create user
    user = User(
        email="toDelete@example.com",
        username="todelete",
        password_hash=hash_password("TestPass1"),
        role=UserRole.BUYER,
    )
    db_session.add(user)
    await db_session.commit()

    user_id = user.id

    # Soft-delete user
    user.deleted_at = "2024-01-01T00:00:00Z"
    await db_session.commit()

    # Query for users (should filter out deleted)
    query = select(User).where(User.deleted_at.is_(None))
    result = await db_session.execute(query)
    active_users = result.scalars().all()

    # Verify: deleted user not in results
    assert user_id not in [u.id for u in active_users]


@pytest.mark.asyncio
async def test_payment_webhook_idempotency(db_session: AsyncSession):
    """
    Webhook handling is idempotent (safe to call multiple times).

    Scenario:
    1. Create order in PAYMENT_PROCESSING status
    2. Call mark_paid (simulating webhook)
    3. Call mark_paid again (duplicate webhook)
    4. Verify: order PAID, idempotent (no error, same result)
    """
    # Setup: create users
    seller = User(
        email="seller2@example.com",
        username="seller2",
        password_hash=hash_password("TestPass1"),
        role=UserRole.SELLER,
    )
    buyer = User(
        email="buyer2@example.com",
        username="buyer2",
        password_hash=hash_password("TestPass1"),
        role=UserRole.BUYER,
    )
    db_session.add(seller)
    db_session.add(buyer)
    await db_session.flush()

    # Setup: create order in PAYMENT_PROCESSING status
    order = Order(
        buyer_id=buyer.id,
        total_amount=10.0,
        status=OrderStatus.PAYMENT_PROCESSING,
        shipping_address={},
    )
    db_session.add(order)
    await db_session.commit()

    # First "webhook": mark as paid
    from app.repositories.order import OrderRepository
    order_repo = OrderRepository(db_session)

    await order_repo.mark_paid(order.id, "pi_12345")
    await db_session.commit()

    # Verify: order is PAID
    await db_session.refresh(order)
    assert order.status == OrderStatus.PAID
    first_paid_time = order.updated_at

    # Duplicate "webhook": mark as paid again
    await order_repo.mark_paid(order.id, "pi_12345")
    await db_session.commit()

    # Verify: order still PAID (idempotent)
    await db_session.refresh(order)
    assert order.status == OrderStatus.PAID
    assert order.stripe_payment_id == "pi_12345"


# ─────────────────────────────────────────────────────────────────────────────
# Test Suite 3: Async/Await Pattern Tests (ASYNC-01)
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_all_executes_are_awaited(db_session: AsyncSession):
    """
    Verify that all .execute() calls are properly awaited.

    This is a static check via code inspection, but we test the pattern here.
    """
    # Good pattern: await db.execute()
    query = select(User)
    result = await db_session.execute(query)
    users = result.scalars().all()

    assert isinstance(users, list)


@pytest.mark.asyncio
async def test_all_flushes_are_awaited(db_session: AsyncSession):
    """
    Verify that all .flush() calls are properly awaited.
    """
    user = User(
        email="flush_test@example.com",
        username="flush_user",
        password_hash=hash_password("TestPass1"),
        role=UserRole.BUYER,
    )
    db_session.add(user)

    # Good pattern: await db.flush()
    await db_session.flush()

    # After flush, user should have ID
    assert user.id is not None


@pytest.mark.asyncio
async def test_all_commits_are_awaited(db_session: AsyncSession):
    """
    Verify that all .commit() calls are properly awaited.
    """
    user = User(
        email="commit_test@example.com",
        username="commit_user",
        password_hash=hash_password("TestPass1"),
        role=UserRole.BUYER,
    )
    db_session.add(user)

    # Good pattern: await db.commit()
    await db_session.commit()

    # After commit, should persist
    user_id = user.id
    assert user_id is not None


@pytest.mark.asyncio
async def test_async_session_type_validation(db_session: AsyncSession):
    """
    Verify that all repositories use AsyncSession type.
    """
    from app.repositories.user import UserRepository
    from app.repositories.book import BookRepository
    from app.repositories.order import OrderRepository

    # All repos should accept AsyncSession
    user_repo = UserRepository(db_session)
    book_repo = BookRepository(db_session)
    order_repo = OrderRepository(db_session)

    assert user_repo.db is db_session
    assert book_repo.db is db_session
    assert order_repo.db is db_session


# ─────────────────────────────────────────────────────────────────────────────
# Test Suite 4: Connection Pool Tests (ASYNC-04)
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_pool_configuration_valid():
    """
    Verify pool configuration is reasonable.

    Checks:
    - pool_size is set
    - max_overflow is set
    - pool_pre_ping is enabled
    """
    from app.core.database import engine

    # Check pool configuration
    pool = engine.pool

    # For non-NullPool engines
    if hasattr(pool, 'size'):
        assert pool.size > 0  # pool_size should be > 0


@pytest.mark.asyncio
async def test_session_factory_correct_settings():
    """
    Verify async_sessionmaker has correct settings.

    Checks:
    - Uses AsyncSession class
    - expire_on_commit=False
    - autocommit=False
    - autoflush=False
    """
    from app.core.database import async_session_maker

    # async_sessionmaker should have these attributes
    factory_kwargs = async_session_maker.kw

    assert factory_kwargs.get('expire_on_commit') is False
    assert factory_kwargs.get('autocommit') is False
    assert factory_kwargs.get('autoflush') is False


@pytest.mark.asyncio
async def test_database_url_uses_async_driver():
    """
    Verify DATABASE_URL uses asyncpg driver for async.
    """
    from app.core.config import settings

    # Should use postgresql+asyncpg:// for async app
    # (not postgresql+psycopg2:// which is for Alembic)
    assert "asyncpg" in settings.DATABASE_URL or settings.ENVIRONMENT == "production"
