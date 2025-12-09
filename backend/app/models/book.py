"""
Book model for marketplace listings.
"""

import enum
import uuid
from decimal import Decimal
from typing import TYPE_CHECKING, Optional

from sqlalchemy import (
    DECIMAL,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.order import OrderItem
    from app.models.review import Review
    from app.models.message import Message


class BookCondition(str, enum.Enum):
    """Book condition enumeration."""
    NEW = "new"
    LIKE_NEW = "like_new"
    GOOD = "good"
    ACCEPTABLE = "acceptable"


class BookStatus(str, enum.Enum):
    """Book listing status enumeration."""
    DRAFT = "draft"
    ACTIVE = "active"
    SOLD = "sold"
    ARCHIVED = "archived"


class Book(Base):
    """
    Book model representing marketplace listings.
    
    Attributes:
        seller_id: Foreign key to the seller user
        isbn: International Standard Book Number
        title: Book title
        author: Book author(s)
        description: Detailed book description
        condition: Physical condition of the book
        price: Listing price in decimal
        quantity: Available quantity
        images: JSON array of image URLs
        status: Current listing status
        category: Book category/genre
        publisher: Book publisher
        publication_year: Year of publication
        language: Book language
        page_count: Number of pages
    """
    
    __tablename__ = "books"
    
    # Seller relationship
    seller_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Foreign key to seller user"
    )
    
    # Book identification
    isbn: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
        index=True,
        doc="ISBN-10 or ISBN-13"
    )
    
    # Book details
    title: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        doc="Book title"
    )
    author: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Book author(s)"
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Detailed book description"
    )
    
    # Condition and pricing
    condition: Mapped[BookCondition] = mapped_column(
        Enum(BookCondition, name="book_condition", create_constraint=True),
        nullable=False,
        doc="Physical condition of the book"
    )
    price: Mapped[Decimal] = mapped_column(
        DECIMAL(10, 2),
        nullable=False,
        doc="Listing price"
    )
    quantity: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
        doc="Available quantity"
    )
    
    # Media
    images: Mapped[Optional[list]] = mapped_column(
        JSONB,
        default=list,
        nullable=True,
        doc="JSON array of image URLs"
    )
    
    # Status
    status: Mapped[BookStatus] = mapped_column(
        Enum(BookStatus, name="book_status", create_constraint=True),
        default=BookStatus.DRAFT,
        nullable=False,
        index=True,
        doc="Current listing status"
    )
    
    # Additional metadata
    category: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        index=True,
        doc="Book category/genre"
    )
    publisher: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        doc="Book publisher"
    )
    publication_year: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        doc="Year of publication"
    )
    language: Mapped[str] = mapped_column(
        String(50),
        default="English",
        nullable=False,
        doc="Book language"
    )
    page_count: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
        doc="Number of pages"
    )
    
    # Relationships
    seller: Mapped["User"] = relationship(
        "User",
        back_populates="books"
    )
    order_items: Mapped[list["OrderItem"]] = relationship(
        "OrderItem",
        back_populates="book",
        lazy="dynamic"
    )
    reviews: Mapped[list["Review"]] = relationship(
        "Review",
        back_populates="book",
        lazy="dynamic",
        cascade="all, delete-orphan"
    )
    messages: Mapped[list["Message"]] = relationship(
        "Message",
        back_populates="book",
        lazy="dynamic"
    )
    
    # Indexes
    __table_args__ = (
        Index("ix_books_seller_status", "seller_id", "status"),
        Index("ix_books_status_created", "status", "created_at"),
        Index("ix_books_category_status", "category", "status"),
        Index("ix_books_price_status", "price", "status"),
    )
    
    @property
    def is_available(self) -> bool:
        """Check if book is available for purchase."""
        return self.status == BookStatus.ACTIVE and self.quantity > 0
    
    @property
    def primary_image(self) -> Optional[str]:
        """Get the primary (first) image URL."""
        if self.images and len(self.images) > 0:
            return self.images[0]
        return None
    
    def reduce_quantity(self, amount: int = 1) -> bool:
        """
        Reduce available quantity.
        
        Returns:
            True if successful, False if insufficient quantity
        """
        if self.quantity >= amount:
            self.quantity -= amount
            if self.quantity == 0:
                self.status = BookStatus.SOLD
            return True
        return False
    
    def __repr__(self) -> str:
        return f"<Book(id={self.id}, title={self.title[:30]}..., status={self.status.value})>"
