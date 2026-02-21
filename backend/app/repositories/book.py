"""
Book repository for book-specific database operations.
"""

from decimal import Decimal
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.book import Book, BookCondition, BookStatus
from app.repositories.base import BaseRepository
from app.schemas.book import BookCreate, BookUpdate


class BookRepository(BaseRepository[Book, BookCreate, BookUpdate]):
    """
    Repository for Book model operations.
    
    Extends BaseRepository with book-specific methods:
    - get_by_seller: Get books by seller
    - search: Full-text search with filters
    - update_quantity: Update stock quantity
    - get_active_books: Get books available for purchase
    """
    
    def __init__(self, db: AsyncSession):
        """Initialize with Book model."""
        super().__init__(Book, db)
    
    async def get_with_seller(
        self,
        book_id: UUID,
    ) -> Optional[Book]:
        """
        Get book with seller relationship loaded.
        
        Args:
            book_id: Book's UUID
            
        Returns:
            Book instance with seller or None
        """
        query = (
            select(Book)
            .options(selectinload(Book.seller))
            .where(
                Book.id == book_id,
                Book.deleted_at.is_(None),
            )
        )
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_by_seller(
        self,
        seller_id: UUID,
        *,
        skip: int = 0,
        limit: int = 100,
        status: Optional[BookStatus] = None,
        include_deleted: bool = False,
    ) -> list[Book]:
        """
        Get books by seller ID.
        
        Args:
            seller_id: Seller's UUID
            skip: Number of records to skip
            limit: Maximum records to return
            status: Optional status filter
            include_deleted: Include soft-deleted books
            
        Returns:
            List of books by seller
        """
        query = select(Book).where(Book.seller_id == seller_id)
        
        if not include_deleted:
            query = query.where(Book.deleted_at.is_(None))
        
        if status:
            query = query.where(Book.status == status)
        
        query = query.order_by(Book.created_at.desc()).offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def count_by_seller(
        self,
        seller_id: UUID,
        *,
        status: Optional[BookStatus] = None,
    ) -> int:
        """
        Count books by seller.
        
        Args:
            seller_id: Seller's UUID
            status: Optional status filter
            
        Returns:
            Number of books
        """
        query = (
            select(func.count())
            .select_from(Book)
            .where(
                Book.seller_id == seller_id,
                Book.deleted_at.is_(None),
            )
        )
        
        if status:
            query = query.where(Book.status == status)
        
        result = await self.db.execute(query)
        return result.scalar() or 0
    
    async def search(
        self,
        *,
        query: Optional[str] = None,
        category: Optional[str] = None,
        condition: Optional[BookCondition] = None,
        min_price: Optional[Decimal] = None,
        max_price: Optional[Decimal] = None,
        seller_id: Optional[UUID] = None,
        status: BookStatus = BookStatus.ACTIVE,
        skip: int = 0,
        limit: int = 100,
        sort_by: str = "created_at",
        sort_desc: bool = True,
    ) -> list[Book]:
        """
        Search books with filters.
        
        Args:
            query: Search query (matches title, author, isbn)
            category: Filter by category
            condition: Filter by condition
            min_price: Minimum price filter
            max_price: Maximum price filter
            seller_id: Filter by seller
            status: Filter by status (default: active)
            skip: Number of records to skip
            limit: Maximum records to return
            sort_by: Field to sort by
            sort_desc: Sort descending if True
            
        Returns:
            List of matching books
        """
        stmt = select(Book).where(Book.deleted_at.is_(None))
        
        # Text search
        if query:
            search_term = f"%{query.lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(Book.title).like(search_term),
                    func.lower(Book.author).like(search_term),
                    Book.isbn.like(search_term),
                )
            )
        
        # Filters
        if category:
            stmt = stmt.where(Book.category == category)
        
        if condition:
            stmt = stmt.where(Book.condition == condition)
        
        if min_price is not None:
            stmt = stmt.where(Book.price >= min_price)
        
        if max_price is not None:
            stmt = stmt.where(Book.price <= max_price)
        
        if seller_id:
            stmt = stmt.where(Book.seller_id == seller_id)
        
        if status:
            stmt = stmt.where(Book.status == status)
        
        # Sorting
        if hasattr(Book, sort_by):
            order_col = getattr(Book, sort_by)
            stmt = stmt.order_by(order_col.desc() if sort_desc else order_col)
        else:
            stmt = stmt.order_by(Book.created_at.desc())
        
        # Pagination
        stmt = stmt.offset(skip).limit(limit)
        
        result = await self.db.execute(stmt)
        return list(result.scalars().all())
    
    async def search_count(
        self,
        *,
        query: Optional[str] = None,
        category: Optional[str] = None,
        condition: Optional[BookCondition] = None,
        min_price: Optional[Decimal] = None,
        max_price: Optional[Decimal] = None,
        seller_id: Optional[UUID] = None,
        status: BookStatus = BookStatus.ACTIVE,
    ) -> int:
        """
        Count books matching search criteria.
        
        Args:
            (same as search method)
            
        Returns:
            Number of matching books
        """
        stmt = (
            select(func.count())
            .select_from(Book)
            .where(Book.deleted_at.is_(None))
        )
        
        if query:
            search_term = f"%{query.lower()}%"
            stmt = stmt.where(
                or_(
                    func.lower(Book.title).like(search_term),
                    func.lower(Book.author).like(search_term),
                    Book.isbn.like(search_term),
                )
            )
        
        if category:
            stmt = stmt.where(Book.category == category)
        
        if condition:
            stmt = stmt.where(Book.condition == condition)
        
        if min_price is not None:
            stmt = stmt.where(Book.price >= min_price)
        
        if max_price is not None:
            stmt = stmt.where(Book.price <= max_price)
        
        if seller_id:
            stmt = stmt.where(Book.seller_id == seller_id)
        
        if status:
            stmt = stmt.where(Book.status == status)
        
        result = await self.db.execute(stmt)
        return result.scalar() or 0
    
    async def update_quantity(
        self,
        book_id: UUID,
        quantity_change: int,
    ) -> Optional[Book]:
        """
        Update book quantity (add or subtract).
        
        Args:
            book_id: Book's UUID
            quantity_change: Amount to add (positive) or subtract (negative)
            
        Returns:
            Updated book or None if not found
        """
        book = await self.get(book_id)
        if book is None:
            return None
        
        new_quantity = book.quantity + quantity_change
        if new_quantity < 0:
            new_quantity = 0
        
        book.quantity = new_quantity
        
        # Auto-update status if sold out
        if new_quantity == 0 and book.status == BookStatus.ACTIVE:
            book.status = BookStatus.SOLD
        
        self.db.add(book)
        await self.db.flush()
        await self.db.refresh(book)
        return book
    
    async def set_quantity(
        self,
        book_id: UUID,
        quantity: int,
    ) -> Optional[Book]:
        """
        Set book quantity to specific value.
        
        Args:
            book_id: Book's UUID
            quantity: New quantity value
            
        Returns:
            Updated book or None if not found
        """
        book = await self.get(book_id)
        if book is None:
            return None
        
        book.quantity = max(0, quantity)
        
        if book.quantity == 0 and book.status == BookStatus.ACTIVE:
            book.status = BookStatus.SOLD
        
        self.db.add(book)
        await self.db.flush()
        await self.db.refresh(book)
        return book
    
    async def update_status(
        self,
        book_id: UUID,
        status: BookStatus,
    ) -> Optional[Book]:
        """
        Update book status.
        
        Args:
            book_id: Book's UUID
            status: New status
            
        Returns:
            Updated book or None if not found
        """
        book = await self.get(book_id)
        if book is None:
            return None
        
        book.status = status
        self.db.add(book)
        await self.db.flush()
        await self.db.refresh(book)
        return book
    
    async def get_active_books(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        category: Optional[str] = None,
    ) -> list[Book]:
        """
        Get active books available for purchase.
        
        Args:
            skip: Number of records to skip
            limit: Maximum records to return
            category: Optional category filter
            
        Returns:
            List of active books with quantity > 0
        """
        query = select(Book).where(
            Book.status == BookStatus.ACTIVE,
            Book.quantity > 0,
            Book.deleted_at.is_(None),
        )
        
        if category:
            query = query.where(Book.category == category)
        
        query = query.order_by(Book.created_at.desc()).offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def get_by_isbn(
        self,
        isbn: str,
    ) -> list[Book]:
        """
        Get books by ISBN.
        
        Args:
            isbn: ISBN to search for
            
        Returns:
            List of books with matching ISBN
        """
        # Clean ISBN (remove hyphens and spaces)
        clean_isbn = isbn.replace("-", "").replace(" ", "")
        
        query = select(Book).where(
            func.replace(func.replace(Book.isbn, "-", ""), " ", "") == clean_isbn,
            Book.deleted_at.is_(None),
        )
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def get_categories(self) -> list[str]:
        """
        Get list of all book categories.
        
        Returns:
            List of unique category names
        """
        query = (
            select(Book.category)
            .where(
                Book.category.isnot(None),
                Book.status == BookStatus.ACTIVE,
                Book.deleted_at.is_(None),
            )
            .distinct()
            .order_by(Book.category)
        )
        
        result = await self.db.execute(query)
        return [row[0] for row in result.fetchall() if row[0]]
    
    async def create_for_seller(
        self,
        seller_id: UUID,
        book_data: BookCreate,
    ) -> Book:
        """
        Create book for a specific seller.
        
        Args:
            seller_id: Seller's UUID
            book_data: Book creation data
            
        Returns:
            Created book instance
        """
        data = book_data.model_dump(exclude_unset=True)
        data["seller_id"] = seller_id
        
        book = Book(**data)
        self.db.add(book)
        await self.db.flush()
        await self.db.refresh(book)
        return book
