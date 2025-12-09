"""
SQLAlchemy Models Package

Import all models here for easy access and Alembic migration detection.
"""

from app.models.base import Base
from app.models.user import User, UserRole, OAuthProvider
from app.models.book import Book, BookCondition, BookStatus
from app.models.order import Order, OrderItem, OrderStatus
from app.models.review import Review
from app.models.message import Message

__all__ = [
    # Base
    "Base",
    # User
    "User",
    "UserRole",
    "OAuthProvider",
    # Book
    "Book",
    "BookCondition",
    "BookStatus",
    # Order
    "Order",
    "OrderItem",
    "OrderStatus",
    # Review
    "Review",
    # Message
    "Message",
]
