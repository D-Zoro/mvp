"""
Pydantic Schemas Package

All request/response schemas for the API.
"""

# Base schemas
from app.schemas.base import (
    BaseSchema,
    ResponseSchema,
    TimestampMixin,
    IDMixin,
    PaginatedResponse,
)

# User schemas
from app.schemas.user import (
    UserBase,
    UserCreate,
    UserUpdate,
    UserPasswordUpdate,
    UserResponse,
    UserBriefResponse,
    UserListResponse,
    UserRoleUpdate,
)

# Book schemas
from app.schemas.book import (
    BookBase,
    BookCreate,
    BookUpdate,
    BookResponse,
    BookBriefResponse,
    BookListResponse,
    BookSearchParams,
)

# Order schemas
from app.schemas.order import (
    ShippingAddress,
    OrderItemBase,
    OrderItemCreate,
    OrderItemResponse,
    OrderBase,
    OrderCreate,
    OrderUpdate,
    OrderResponse,
    OrderBriefResponse,
    OrderListResponse,
    OrderStatusUpdate,
    CheckoutSession,
)

# Review schemas
from app.schemas.review import (
    ReviewBase,
    ReviewCreate,
    ReviewUpdate,
    ReviewResponse,
    ReviewListResponse,
    ReviewStats,
)

# Message schemas
from app.schemas.message import (
    MessageBase,
    MessageCreate,
    MessageResponse,
    MessageListResponse,
    ConversationResponse,
    ConversationListResponse,
    MarkReadRequest,
    UnreadCountResponse,
)

# Auth schemas
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    AuthResponse,
    RefreshTokenRequest,
    PasswordResetRequest,
    PasswordResetConfirm,
    EmailVerificationRequest,
    OAuthCallbackRequest,
    OAuthURLResponse,
)

# Pagination schemas
from app.schemas.pagination import (
    PaginationParams,
    SortParams,
    get_pagination_params,
    get_sort_params,
)

# Error schemas
from app.schemas.error import (
    ErrorDetail,
    ErrorResponse,
    HTTPError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    ValidationError,
    ConflictError,
    RateLimitError,
    InternalServerError,
    create_error_response,
)

__all__ = [
    # Base
    "BaseSchema",
    "ResponseSchema",
    "TimestampMixin",
    "IDMixin",
    "PaginatedResponse",
    # User
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserPasswordUpdate",
    "UserResponse",
    "UserBriefResponse",
    "UserListResponse",
    "UserRoleUpdate",
    # Book
    "BookBase",
    "BookCreate",
    "BookUpdate",
    "BookResponse",
    "BookBriefResponse",
    "BookListResponse",
    "BookSearchParams",
    # Order
    "ShippingAddress",
    "OrderItemBase",
    "OrderItemCreate",
    "OrderItemResponse",
    "OrderBase",
    "OrderCreate",
    "OrderUpdate",
    "OrderResponse",
    "OrderBriefResponse",
    "OrderListResponse",
    "OrderStatusUpdate",
    "CheckoutSession",
    # Review
    "ReviewBase",
    "ReviewCreate",
    "ReviewUpdate",
    "ReviewResponse",
    "ReviewListResponse",
    "ReviewStats",
    # Message
    "MessageBase",
    "MessageCreate",
    "MessageResponse",
    "MessageListResponse",
    "ConversationResponse",
    "ConversationListResponse",
    "MarkReadRequest",
    "UnreadCountResponse",
    # Auth
    "LoginRequest",
    "RegisterRequest",
    "TokenResponse",
    "AuthResponse",
    "RefreshTokenRequest",
    "PasswordResetRequest",
    "PasswordResetConfirm",
    "EmailVerificationRequest",
    "OAuthCallbackRequest",
    "OAuthURLResponse",
    # Pagination
    "PaginationParams",
    "SortParams",
    "get_pagination_params",
    "get_sort_params",
    # Error
    "ErrorDetail",
    "ErrorResponse",
    "HTTPError",
    "NotFoundError",
    "UnauthorizedError",
    "ForbiddenError",
    "ValidationError",
    "ConflictError",
    "RateLimitError",
    "InternalServerError",
    "create_error_response",
]
