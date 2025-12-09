"""
Review model for book reviews and ratings.
"""

import uuid
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.book import Book


class Review(Base):
    """
    Review model representing book reviews and ratings.
    
    Attributes:
        book_id: Foreign key to the reviewed book
        user_id: Foreign key to the reviewer
        rating: Rating from 1 to 5
        comment: Optional review text
        is_verified_purchase: Whether reviewer purchased the book
    """
    
    __tablename__ = "reviews"
    
    # Foreign keys
    book_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("books.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Foreign key to reviewed book"
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Foreign key to reviewer"
    )
    
    # Review content
    rating: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        doc="Rating from 1 to 5"
    )
    comment: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Optional review text"
    )
    
    # Metadata
    is_verified_purchase: Mapped[bool] = mapped_column(
        default=False,
        nullable=False,
        doc="Whether reviewer purchased the book"
    )
    
    # Relationships
    book: Mapped["Book"] = relationship(
        "Book",
        back_populates="reviews"
    )
    user: Mapped["User"] = relationship(
        "User",
        back_populates="reviews"
    )
    
    # Constraints and indexes
    __table_args__ = (
        # Each user can only review a book once
        UniqueConstraint("book_id", "user_id", name="uq_review_book_user"),
        # Rating must be between 1 and 5
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_review_rating_range"),
        # Composite index for book reviews
        Index("ix_reviews_book_rating", "book_id", "rating"),
    )
    
    def __repr__(self) -> str:
        return f"<Review(id={self.id}, book_id={self.book_id}, user_id={self.user_id}, rating={self.rating})>"
