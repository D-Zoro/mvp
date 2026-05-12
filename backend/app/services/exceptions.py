"""
Service layer custom exceptions.

All business-logic errors are expressed as these typed exceptions.
API endpoints catch them and map to appropriate HTTP responses.
"""


class ServiceError(Exception):
    """Base exception for all service-layer errors."""
    pass


# ───── Auth exceptions ─────

class EmailAlreadyExistsError(ServiceError):
    """Raised when trying to register with an already-taken email."""
    pass


class InvalidCredentialsError(ServiceError):
    """Raised when email/password combination is wrong."""
    pass


class InvalidTokenError(ServiceError):
    """Raised when a JWT or special token is invalid or expired."""
    pass


class AccountInactiveError(ServiceError):
    """Raised when the user account is deactivated."""
    pass


class OAuthNotConfiguredError(ServiceError):
    """Raised when the requested OAuth provider is not configured."""
    pass


class OAuthError(ServiceError):
    """Raised when an OAuth flow fails."""
    pass


# ───── Book exceptions ─────

class BookNotFoundError(ServiceError):
    """Raised when a requested book does not exist."""
    pass


class NotBookOwnerError(ServiceError):
    """Raised when a user tries to modify a book they don't own."""
    pass


class NotSellerError(ServiceError):
    """Raised when a buyer tries to perform a seller-only action."""
    pass


# ───── Order exceptions ─────

class OrderNotFoundError(ServiceError):
    """Raised when a requested order does not exist."""
    pass


class NotOrderOwnerError(ServiceError):
    """Raised when a user tries to access an order they don't own."""
    pass


class InsufficientStockError(ServiceError):
    """Raised when requested quantity exceeds available stock."""

    def __init__(self, book_title: str, available: int, requested: int):
        self.book_title = book_title
        self.available = available
        self.requested = requested
        super().__init__(
            f"Insufficient stock for '{book_title}': "
            f"available={available}, requested={requested}"
        )


class OrderNotCancellableError(ServiceError):
    """Raised when an order cannot be cancelled due to its current status."""
    pass


class InvalidStatusTransitionError(ServiceError):
    """Raised when an order status transition is not allowed."""
    pass


# ───── Payment exceptions ─────

class PaymentError(ServiceError):
    """Raised when a Stripe operation fails."""
    pass


class StripeWebhookError(ServiceError):
    """Raised when Stripe webhook signature verification fails."""
    pass


class RefundError(ServiceError):
    """Raised when a refund cannot be processed."""
    pass
