"""
Book Service.

Business logic for book listings:
- Seller creates / updates / deletes their own listings
- Public search with filters and pagination
- Book detail retrieval (with seller info)
- Ownership enforcement before mutations
"""

import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.book import BookStatus
from app.models.user import User, UserRole
from app.repositories.book import BookRepository
from app.schemas.book import (
    BookCreate,
    BookListResponse,
    BookResponse,
    BookUpdate,
)
from app.schemas.base import PaginatedResponse
from app.services.exceptions import (
    BookNotFoundError,
    NotBookOwnerError,
    NotSellerError,
)

logger = logging.getLogger(__name__)


class BookService:
    """
    Service for book-listing operations.

    Ownership rule: only the seller who created a listing (or an admin)
    may update or delete it.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.book_repo = BookRepository(db)

    # ─────────────────────────────────────────────
    # Create
    # ─────────────────────────────────────────────

    async def create_book(
        self,
        *,
        seller: User,
        book_data: BookCreate,
    ) -> BookResponse:
        """
        Create a new book listing for a seller.

        Args:
            seller: Authenticated user creating the listing.
            book_data: Validated book creation schema.

        Returns:
            BookResponse of the created listing.

        Raises:
            NotSellerError: User is a buyer and cannot list books.
        """
        if seller.role not in (UserRole.SELLER, UserRole.ADMIN):
            raise NotSellerError(
                "Only sellers can create book listings. "
                "Please upgrade your account to a seller account."
            )

        book = await self.book_repo.create_for_seller(seller.id, book_data)
        await self.db.commit()
        await self.db.refresh(book)

        logger.info(
            "Book created: id=%s title=%r seller_id=%s",
            book.id, book.title, seller.id,
        )
        return BookResponse.model_validate(book)

    # ─────────────────────────────────────────────
    # Read
    # ─────────────────────────────────────────────

    async def get_book(self, book_id: UUID) -> BookResponse:
        """
        Retrieve a single book with its seller information.

        Args:
            book_id: UUID of the book.

        Returns:
            BookResponse with seller nested.

        Raises:
            BookNotFoundError: Book does not exist or is soft-deleted.
        """
        book = await self.book_repo.get_with_seller(book_id)
        if book is None:
            raise BookNotFoundError(f"Book '{book_id}' not found.")
        return BookResponse.model_validate(book)

    async def search_books(
        self,
        *,
        query: str | None = None,
        category: str | None = None,
        condition: str | None = None,
        min_price: float | None = None,
        max_price: float | None = None,
        seller_id: UUID | None = None,
        status: BookStatus = BookStatus.ACTIVE,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> BookListResponse:
        """
        Search and filter books with pagination.

        Args:
            query: Free-text search across title, author, ISBN.
            category: Filter by category string.
            condition: Filter by BookCondition enum value.
            min_price: Minimum price filter.
            max_price: Maximum price filter.
            seller_id: Restrict to a specific seller.
            status: Listing status (default: active).
            page: 1-indexed page number.
            page_size: Results per page (max 100).
            sort_by: Column name to sort by.
            sort_order: "asc" or "desc".

        Returns:
            BookListResponse (paginated).
        """
        page_size = min(page_size, 100)
        skip = (page - 1) * page_size

        # Run search + count concurrently (two lightweight awaits)
        books = await self.book_repo.search(
            query=query,
            category=category,
            condition=condition,
            min_price=min_price,
            max_price=max_price,
            seller_id=seller_id,
            status=status,
            skip=skip,
            limit=page_size,
            sort_by=sort_by,
            sort_desc=(sort_order == "desc"),
        )
        total = await self.book_repo.search_count(
            query=query,
            category=category,
            condition=condition,
            min_price=min_price,
            max_price=max_price,
            seller_id=seller_id,
            status=status,
        )

        items = [BookResponse.model_validate(b) for b in books]
        return BookListResponse.create(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
        )

    async def get_seller_books(
        self,
        *,
        seller_id: UUID,
        status: BookStatus | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> BookListResponse:
        """
        Retrieve all books for a specific seller.

        Args:
            seller_id: UUID of the seller.
            status: Optional status filter.
            page: Page number.
            page_size: Results per page.

        Returns:
            Paginated BookListResponse.
        """
        page_size = min(page_size, 100)
        skip = (page - 1) * page_size

        books = await self.book_repo.get_by_seller(
            seller_id, skip=skip, limit=page_size, status=status
        )
        total = await self.book_repo.count_by_seller(seller_id, status=status)
        items = [BookResponse.model_validate(b) for b in books]
        return BookListResponse.create(
            items=items, total=total, page=page, page_size=page_size
        )

    async def get_categories(self) -> list[str]:
        """Return a list of all active book categories."""
        return await self.book_repo.get_categories()

    # ─────────────────────────────────────────────
    # Update
    # ─────────────────────────────────────────────

    async def update_book(
        self,
        *,
        book_id: UUID,
        requestor: User,
        updates: BookUpdate,
    ) -> BookResponse:
        """
        Update a book listing.

        Only the owning seller or an admin can update a listing.

        Args:
            book_id: UUID of the book to update.
            requestor: Authenticated user performing the update.
            updates: Partial update schema (only provided fields applied).

        Returns:
            Updated BookResponse.

        Raises:
            BookNotFoundError: Book does not exist.
            NotBookOwnerError: Requestor does not own the listing.
        """
        book = await self.book_repo.get(book_id)
        if book is None:
            raise BookNotFoundError(f"Book '{book_id}' not found.")

        self._assert_ownership(book.seller_id, requestor)

        # Apply partial update
        update_data = updates.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(book, field, value)

        self.db.add(book)
        await self.db.commit()
        await self.db.refresh(book)

        logger.info("Book updated: id=%s by user=%s", book.id, requestor.id)
        return BookResponse.model_validate(book)

    async def publish_book(self, *, book_id: UUID, requestor: User) -> BookResponse:
        """
        Change a book's status from DRAFT → ACTIVE.

        Args:
            book_id: UUID of the book.
            requestor: Authenticated seller/admin.

        Returns:
            Updated BookResponse.

        Raises:
            BookNotFoundError: Book not found.
            NotBookOwnerError: Requestor does not own the book.
        """
        book = await self.book_repo.get(book_id)
        if book is None:
            raise BookNotFoundError(f"Book '{book_id}' not found.")
        self._assert_ownership(book.seller_id, requestor)

        book.status = BookStatus.ACTIVE
        self.db.add(book)
        await self.db.commit()
        await self.db.refresh(book)
        return BookResponse.model_validate(book)

    # ─────────────────────────────────────────────
    # Delete
    # ─────────────────────────────────────────────

    async def delete_book(self, *, book_id: UUID, requestor: User) -> None:
        """
        Soft-delete a book listing.

        Args:
            book_id: UUID of the book.
            requestor: Authenticated user.

        Raises:
            BookNotFoundError: Book not found.
            NotBookOwnerError: Requestor does not own the listing.
        """
        book = await self.book_repo.get(book_id)
        if book is None:
            raise BookNotFoundError(f"Book '{book_id}' not found.")
        self._assert_ownership(book.seller_id, requestor)

        await self.book_repo.delete(book_id)
        await self.db.commit()

        logger.info("Book soft-deleted: id=%s by user=%s", book_id, requestor.id)

    # ─────────────────────────────────────────────
    # Internal helpers
    # ─────────────────────────────────────────────

    @staticmethod
    def _assert_ownership(seller_id: UUID, requestor: User) -> None:
        """Raise NotBookOwnerError if requestor is neither the owner nor admin."""
        if requestor.role == UserRole.ADMIN:
            return
        if seller_id != requestor.id:
            raise NotBookOwnerError(
                "You do not have permission to modify this listing."
            )
