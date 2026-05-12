"""
Service Layer Package

Business logic lives here. Each service:
- Accepts an AsyncSession (caller owns commit/rollback)
- Uses repositories for data access
- Raises typed exceptions from app.services.exceptions
- Returns Pydantic response schemas (never raw ORM objects to callers)
"""

from app.services.auth_service import AuthService
from app.services.book_service import BookService
from app.services.order_service import OrderService
from app.services.payment_service import PaymentService
from app.services.exceptions import (
    # Base
    ServiceError,
    # Auth
    EmailAlreadyExistsError,
    InvalidCredentialsError,
    InvalidTokenError,
    AccountInactiveError,
    OAuthNotConfiguredError,
    OAuthError,
    # Book
    BookNotFoundError,
    NotBookOwnerError,
    NotSellerError,
    # Order
    OrderNotFoundError,
    NotOrderOwnerError,
    InsufficientStockError,
    OrderNotCancellableError,
    InvalidStatusTransitionError,
    # Payment
    PaymentError,
    StripeWebhookError,
    RefundError,
)

__all__ = [
    # Services
    "AuthService",
    "BookService",
    "OrderService",
    "PaymentService",
    # Exceptions — base
    "ServiceError",
    # Exceptions — auth
    "EmailAlreadyExistsError",
    "InvalidCredentialsError",
    "InvalidTokenError",
    "AccountInactiveError",
    "OAuthNotConfiguredError",
    "OAuthError",
    # Exceptions — book
    "BookNotFoundError",
    "NotBookOwnerError",
    "NotSellerError",
    # Exceptions — order
    "OrderNotFoundError",
    "NotOrderOwnerError",
    "InsufficientStockError",
    "OrderNotCancellableError",
    "InvalidStatusTransitionError",
    # Exceptions — payment
    "PaymentError",
    "StripeWebhookError",
    "RefundError",
]
