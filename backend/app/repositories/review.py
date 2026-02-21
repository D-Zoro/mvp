"""
Review repository for review-specific database operations.
"""

from typing import Optional
from uuid import UUID

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.order import Order, OrderItem, OrderStatus
from app.models.review import Review
from app.repositories.base import BaseRepository
from app.schemas.review import ReviewCreate, ReviewUpdate


class ReviewRepository(BaseRepository[Review, ReviewCreate, ReviewUpdate]):
    """
    Repository for Review model operations.
    
    Extends BaseRepository with review-specific methods:
    - get_by_book: Get reviews for a book
    - get_by_user: Get reviews by a user
    - get_book_stats: Get review statistics
    - check_verified_purchase: Check if user purchased book
    """
    
    def __init__(self, db: AsyncSession):
        """Initialize with Review model."""
        super().__init__(Review, db)
    
    async def get_with_user(
        self,
        review_id: UUID,
    ) -> Optional[Review]:
        """
        Get review with user relationship loaded.
        
        Args:
            review_id: Review's UUID
            
        Returns:
            Review with user or None
        """
        query = (
            select(Review)
            .options(selectinload(Review.user))
            .where(
                Review.id == review_id,
                Review.deleted_at.is_(None),
            )
        )
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_by_book(
        self,
        book_id: UUID,
        *,
        skip: int = 0,
        limit: int = 100,
        min_rating: Optional[int] = None,
        verified_only: bool = False,
    ) -> list[Review]:
        """
        Get reviews for a specific book.
        
        Args:
            book_id: Book's UUID
            skip: Number of records to skip
            limit: Maximum records to return
            min_rating: Optional minimum rating filter
            verified_only: Only return verified purchase reviews
            
        Returns:
            List of reviews for the book
        """
        query = (
            select(Review)
            .options(selectinload(Review.user))
            .where(
                Review.book_id == book_id,
                Review.deleted_at.is_(None),
            )
        )
        
        if min_rating:
            query = query.where(Review.rating >= min_rating)
        
        if verified_only:
            query = query.where(Review.is_verified_purchase.is_(True))
        
        query = query.order_by(Review.created_at.desc()).offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def count_by_book(
        self,
        book_id: UUID,
        *,
        verified_only: bool = False,
    ) -> int:
        """
        Count reviews for a book.
        
        Args:
            book_id: Book's UUID
            verified_only: Only count verified purchase reviews
            
        Returns:
            Number of reviews
        """
        query = (
            select(func.count())
            .select_from(Review)
            .where(
                Review.book_id == book_id,
                Review.deleted_at.is_(None),
            )
        )
        
        if verified_only:
            query = query.where(Review.is_verified_purchase.is_(True))
        
        result = await self.db.execute(query)
        return result.scalar() or 0
    
    async def get_by_user(
        self,
        user_id: UUID,
        *,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Review]:
        """
        Get reviews by a specific user.
        
        Args:
            user_id: User's UUID
            skip: Number of records to skip
            limit: Maximum records to return
            
        Returns:
            List of reviews by the user
        """
        query = (
            select(Review)
            .options(selectinload(Review.book))
            .where(
                Review.user_id == user_id,
                Review.deleted_at.is_(None),
            )
            .order_by(Review.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def get_user_review_for_book(
        self,
        user_id: UUID,
        book_id: UUID,
    ) -> Optional[Review]:
        """
        Get user's review for a specific book.
        
        Args:
            user_id: User's UUID
            book_id: Book's UUID
            
        Returns:
            Review or None if user hasn't reviewed this book
        """
        query = select(Review).where(
            Review.user_id == user_id,
            Review.book_id == book_id,
            Review.deleted_at.is_(None),
        )
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def create_review(
        self,
        *,
        book_id: UUID,
        user_id: UUID,
        rating: int,
        comment: Optional[str] = None,
    ) -> Review:
        """
        Create a review with verified purchase check.
        
        Args:
            book_id: Book's UUID
            user_id: User's UUID
            rating: Rating (1-5)
            comment: Optional review text
            
        Returns:
            Created review
        """
        # Check if user purchased this book
        is_verified = await self.check_verified_purchase(user_id, book_id)
        
        review = Review(
            book_id=book_id,
            user_id=user_id,
            rating=rating,
            comment=comment,
            is_verified_purchase=is_verified,
        )
        
        self.db.add(review)
        await self.db.flush()
        await self.db.refresh(review)
        return review
    
    async def check_verified_purchase(
        self,
        user_id: UUID,
        book_id: UUID,
    ) -> bool:
        """
        Check if user has purchased a specific book.
        
        Args:
            user_id: User's UUID
            book_id: Book's UUID
            
        Returns:
            True if user has completed purchase of book
        """
        query = (
            select(func.count())
            .select_from(Order)
            .join(OrderItem, Order.id == OrderItem.order_id)
            .where(
                Order.buyer_id == user_id,
                OrderItem.book_id == book_id,
                Order.status.in_([
                    OrderStatus.PAID,
                    OrderStatus.SHIPPED,
                    OrderStatus.DELIVERED,
                ]),
                Order.deleted_at.is_(None),
            )
        )
        
        result = await self.db.execute(query)
        count = result.scalar() or 0
        return count > 0
    
    async def get_book_stats(
        self,
        book_id: UUID,
    ) -> dict:
        """
        Get review statistics for a book.
        
        Args:
            book_id: Book's UUID
            
        Returns:
            Dict with total_reviews, average_rating, rating_distribution
        """
        # Get average and count
        stats_query = select(
            func.count(Review.id).label("total"),
            func.avg(Review.rating).label("average"),
            func.count(Review.id).filter(Review.is_verified_purchase.is_(True)).label("verified"),
        ).where(
            Review.book_id == book_id,
            Review.deleted_at.is_(None),
        )
        
        result = await self.db.execute(stats_query)
        row = result.one()
        
        total = row.total or 0
        average = float(row.average) if row.average else None
        verified = row.verified or 0
        
        # Get rating distribution
        dist_query = select(
            Review.rating,
            func.count(Review.id).label("count"),
        ).where(
            Review.book_id == book_id,
            Review.deleted_at.is_(None),
        ).group_by(Review.rating)
        
        dist_result = await self.db.execute(dist_query)
        distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for row in dist_result:
            distribution[row.rating] = row.count
        
        return {
            "book_id": book_id,
            "total_reviews": total,
            "average_rating": round(average, 2) if average else None,
            "rating_distribution": distribution,
            "verified_purchase_count": verified,
        }
    
    async def has_reviewed(
        self,
        user_id: UUID,
        book_id: UUID,
    ) -> bool:
        """
        Check if user has already reviewed a book.
        
        Args:
            user_id: User's UUID
            book_id: Book's UUID
            
        Returns:
            True if user has reviewed the book
        """
        review = await self.get_user_review_for_book(user_id, book_id)
        return review is not None
