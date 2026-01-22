from app.models import User, Book
from app.models.user import UserRole
from app.models.book import BookCondition, BookStatus
import pytest
from uuid import uuid4

@pytest.mark.asyncio
async def test_book_requires_valid_seller(db_session):

    seller = User(
        email="seller@example.com",
        role=UserRole.SELLER,
        is_active=True,
        email_verified=True,
    )

    db_session.add(seller)
    await db_session.commit()

    book = Book(
        seller_id=seller.id,  # FK reference
        title="Clean Code",
        author="Robert C. Martin",
        condition=BookCondition.NEW,
        price=499.99,
        quantity=10,
        status=BookStatus.ACTIVE,
        language="EN",
    )

    db_session.add(book)
    await db_session.commit()

    assert book.id is not None

@pytest.mark.asyncio
async def test_book_fails_without_seller(db_session):
    book = Book(
        seller_id=uuid4(),
        title="Ghost Book",
        author="Nobody",
        condition=BookCondition.NEW,
        price=100,
        quantity=1,
        status=BookStatus.ACTIVE,
        language="EN",
    )
   


    db_session.add(book)

    with pytest.raises(Exception):
        await db_session.commit()

    await db_session.rollback()
