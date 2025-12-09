"""
Message model for buyer-seller communication.
"""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.book import Book


class Message(Base):
    """
    Message model for buyer-seller chat.
    
    Attributes:
        sender_id: Foreign key to the sender user
        recipient_id: Foreign key to the recipient user
        book_id: Foreign key to the related book (optional)
        content: Message content
        read_at: Timestamp when message was read
    """
    
    __tablename__ = "messages"
    
    # Foreign keys
    sender_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Foreign key to sender user"
    )
    recipient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        doc="Foreign key to recipient user"
    )
    book_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("books.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
        doc="Foreign key to related book (optional)"
    )
    
    # Message content
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        doc="Message content"
    )
    
    # Read status
    read_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
        doc="Timestamp when message was read"
    )
    
    # Relationships
    sender: Mapped["User"] = relationship(
        "User",
        foreign_keys=[sender_id],
        back_populates="sent_messages"
    )
    recipient: Mapped["User"] = relationship(
        "User",
        foreign_keys=[recipient_id],
        back_populates="received_messages"
    )
    book: Mapped[Optional["Book"]] = relationship(
        "Book",
        back_populates="messages"
    )
    
    # Indexes
    __table_args__ = (
        # Index for conversation lookup
        Index("ix_messages_conversation", "sender_id", "recipient_id"),
        # Index for unread messages
        Index("ix_messages_recipient_unread", "recipient_id", "read_at"),
        # Index for book-related messages
        Index("ix_messages_book_created", "book_id", "created_at"),
    )
    
    @property
    def is_read(self) -> bool:
        """Check if message has been read."""
        return self.read_at is not None
    
    def mark_as_read(self) -> None:
        """Mark message as read."""
        if self.read_at is None:
            self.read_at = datetime.utcnow()
    
    def __repr__(self) -> str:
        read_status = "read" if self.is_read else "unread"
        return f"<Message(id={self.id}, sender={self.sender_id}, recipient={self.recipient_id}, {read_status})>"
