"""
User model for authentication and user management.
"""

import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, Enum, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.book import Book
    from app.models.order import Order
    from app.models.review import Review
    from app.models.message import Message


class UserRole(str, enum.Enum):
    """User role enumeration."""
    BUYER = "buyer"
    SELLER = "seller"
    ADMIN = "admin"


class OAuthProvider(str, enum.Enum):
    """OAuth provider enumeration."""
    GOOGLE = "google"
    FACEBOOK = "facebook"
    GITHUB = "github"


class User(Base):
    """
    User model representing platform users.
    
    Attributes:
        email: Unique email address for authentication
        password_hash: Hashed password (nullable for OAuth users)
        role: User role (buyer, seller, admin)
        email_verified: Whether email has been verified
        is_active: Whether user account is active
        first_name: User's first name
        last_name: User's last name
        avatar_url: URL to user's profile picture
        oauth_provider: OAuth provider if using social login
        oauth_provider_id: User ID from OAuth provider
    """
    
    __tablename__ = "users"
    
    # Authentication fields
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
        doc="User's email address"
    )
    password_hash: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        doc="Hashed password (null for OAuth users)"
    )
    
    # Role and status
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", create_constraint=True),
        default=UserRole.BUYER,
        nullable=False,
        doc="User role (buyer, seller, admin)"
    )
    email_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        doc="Whether email has been verified"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        doc="Whether user account is active"
    )
    
    # Profile fields
    first_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        doc="User's first name"
    )
    last_name: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        doc="User's last name"
    )
    avatar_url: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        doc="URL to user's profile picture"
    )
    
    # OAuth fields
    oauth_provider: Mapped[Optional[OAuthProvider]] = mapped_column(
        Enum(OAuthProvider, name="oauth_provider", create_constraint=True),
        nullable=True,
        doc="OAuth provider (google, facebook, github)"
    )
    oauth_provider_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        doc="User ID from OAuth provider"
    )
    
    # Relationships
    books: Mapped[list["Book"]] = relationship(
        "Book",
        back_populates="seller",
        lazy="dynamic",
        cascade="all, delete-orphan"
    )
    orders: Mapped[list["Order"]] = relationship(
        "Order",
        back_populates="buyer",
        lazy="dynamic",
        cascade="all, delete-orphan"
    )
    reviews: Mapped[list["Review"]] = relationship(
        "Review",
        back_populates="user",
        lazy="dynamic",
        cascade="all, delete-orphan"
    )
    sent_messages: Mapped[list["Message"]] = relationship(
        "Message",
        foreign_keys="Message.sender_id",
        back_populates="sender",
        lazy="dynamic"
    )
    received_messages: Mapped[list["Message"]] = relationship(
        "Message",
        foreign_keys="Message.recipient_id",
        back_populates="recipient",
        lazy="dynamic"
    )
    
    # Indexes
    __table_args__ = (
        Index("ix_users_oauth", "oauth_provider", "oauth_provider_id"),
        Index("ix_users_role_active", "role", "is_active"),
    )
    
    @property
    def full_name(self) -> str:
        """Get user's full name."""
        parts = [self.first_name, self.last_name]
        return " ".join(p for p in parts if p) or "Unknown"
    
    @property
    def is_seller(self) -> bool:
        """Check if user has seller role."""
        return self.role in (UserRole.SELLER, UserRole.ADMIN)
    
    @property
    def is_admin(self) -> bool:
        """Check if user has admin role."""
        return self.role == UserRole.ADMIN
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, role={self.role.value})>"
