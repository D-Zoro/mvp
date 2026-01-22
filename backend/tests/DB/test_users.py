
from app.models import User
from app.models.user import UserRole
from app.models.book import BookCondition, BookStatus
import pytest

@pytest.mark.asyncio
async def test_create_user(db_session):
    """
    DEV-NOTE:
    This test verifies:
    - user table exists
    - UUID primary key works
    - enum (role) works
    - NOT NULL constraints are satisfied
    """

    user = User(
        email="testuser@example.com",
        role=UserRole.BUYER,
        is_active=True,
        email_verified=False,
    )

    db_session.add(user)
    await db_session.commit()

    # DEV-NOTE:
    # If commit succeeded, DB accepted the row.
    assert user.id is not None

@pytest.mark.asyncio
async def test_unique_email_constraint(db_session):
    """
    DEV-NOTE:
    This test ensures UNIQUE(email) constraint works.
    """

    user1 = User(
        email="unique@example.com",
        role=UserRole.BUYER,
        is_active=True,
        email_verified=False,
    )

    user2 = User(
        email="unique@example.com",  # same email
        role=UserRole.SELLER,
        is_active=True,
        email_verified=False,
    )

    db_session.add(user1)
    await db_session.commit()

    db_session.add(user2)

    with pytest.raises(Exception):
        await db_session.commit()
       
    await db_session.rollback()
