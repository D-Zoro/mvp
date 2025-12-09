"""
Order and OrderItem models for purchase tracking.
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
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.book import Book


class OrderStatus(str, enum.Enum):
    """Order status enumeration."""
    PENDING = "pending"
    PAYMENT_PROCESSING = "payment_processing"
    PAID = "paid"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class Order(Base):
    """
    Order model representing a purchase transaction.
    
    Attributes:
        buyer_id: Foreign key to the buyer user
        total_amount: Total order amount
        status: Current order status
        stripe_payment_id: Stripe payment intent ID
        stripe_session_id: Stripe checkout session ID
        shipping_address: JSON object with shipping details
        notes: Additional order notes
    """
    
    __tablename__ = "orders"
    
    # Buyer relationship
    buyer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Foreign key to buyer user"
    )
    
    # Order details
    total_amount: Mapped[Decimal] = mapped_column(
        DECIMAL(10, 2),
        nullable=False,
        doc="Total order amount"
    )
    status: Mapped[OrderStatus] = mapped_column(
        Enum(OrderStatus, name="order_status", create_constraint=True),
        default=OrderStatus.PENDING,
        nullable=False,
        index=True,
        doc="Current order status"
    )
    
    # Payment details
    stripe_payment_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        unique=True,
        doc="Stripe payment intent ID"
    )
    stripe_session_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        unique=True,
        doc="Stripe checkout session ID"
    )
    
    # Shipping
    shipping_address: Mapped[Optional[dict]] = mapped_column(
        Text,
        nullable=True,
        doc="Shipping address as JSON string"
    )
    
    # Notes
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="Additional order notes"
    )
    
    # Relationships
    buyer: Mapped["User"] = relationship(
        "User",
        back_populates="orders"
    )
    items: Mapped[list["OrderItem"]] = relationship(
        "OrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
        lazy="joined"
    )
    
    # Indexes
    __table_args__ = (
        Index("ix_orders_buyer_status", "buyer_id", "status"),
        Index("ix_orders_status_created", "status", "created_at"),
    )
    
    @property
    def item_count(self) -> int:
        """Get total number of items in order."""
        return sum(item.quantity for item in self.items)
    
    @property
    def is_paid(self) -> bool:
        """Check if order has been paid."""
        return self.status in (
            OrderStatus.PAID,
            OrderStatus.SHIPPED,
            OrderStatus.DELIVERED
        )
    
    @property
    def is_cancellable(self) -> bool:
        """Check if order can be cancelled."""
        return self.status in (
            OrderStatus.PENDING,
            OrderStatus.PAYMENT_PROCESSING
        )
    
    def __repr__(self) -> str:
        return f"<Order(id={self.id}, buyer_id={self.buyer_id}, status={self.status.value}, total={self.total_amount})>"


class OrderItem(Base):
    """
    OrderItem model representing individual items in an order.
    
    Attributes:
        order_id: Foreign key to the order
        book_id: Foreign key to the book
        quantity: Number of copies purchased
        price_at_purchase: Price at time of purchase (for historical accuracy)
    """
    
    __tablename__ = "order_items"
    
    # Foreign keys
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Foreign key to order"
    )
    book_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("books.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Foreign key to book"
    )
    
    # Item details
    quantity: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
        doc="Number of copies purchased"
    )
    price_at_purchase: Mapped[Decimal] = mapped_column(
        DECIMAL(10, 2),
        nullable=False,
        doc="Price at time of purchase"
    )
    
    # Snapshot of book details at purchase time
    book_title: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
        doc="Book title at time of purchase"
    )
    book_author: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        doc="Book author at time of purchase"
    )
    
    # Relationships
    order: Mapped["Order"] = relationship(
        "Order",
        back_populates="items"
    )
    book: Mapped[Optional["Book"]] = relationship(
        "Book",
        back_populates="order_items"
    )
    
    # Indexes
    __table_args__ = (
        Index("ix_order_items_order_book", "order_id", "book_id"),
    )
    
    @property
    def subtotal(self) -> Decimal:
        """Calculate subtotal for this item."""
        return self.price_at_purchase * self.quantity
    
    def __repr__(self) -> str:
        return f"<OrderItem(id={self.id}, order_id={self.order_id}, book_title={self.book_title[:20]}..., qty={self.quantity})>"
