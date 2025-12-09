"""
Core module for application configuration and utilities.

Exports:
- Settings and configuration
- Security utilities
- Database session management
- Dependency injection helpers
- Rate limiting
"""

from app.core.config import settings, get_settings
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    create_token_pair,
    verify_access_token,
    verify_refresh_token,
    TokenPayload,
    TokenPair,
)
from app.core.database import (
    engine,
    async_session_maker,
    get_session,
    check_database_health,
)
from app.core.dependencies import (
    get_db,
    get_current_user,
    get_optional_user,
    require_role,
    DBSession,
    CurrentUser,
    ActiveUser,
    VerifiedUser,
    OptionalUser,
    Pagination,
)
from app.core.rate_limiter import (
    rate_limit,
    rate_limiter,
    login_rate_limit,
    api_rate_limit,
    strict_rate_limit,
    RateLimitMiddleware,
)

__all__ = [
    # Config
    "settings",
    "get_settings",
    # Security
    "hash_password",
    "verify_password",
    "create_access_token",
    "create_refresh_token",
    "create_token_pair",
    "verify_access_token",
    "verify_refresh_token",
    "TokenPayload",
    "TokenPair",
    # Database
    "engine",
    "async_session_maker",
    "get_session",
    "check_database_health",
    # Dependencies
    "get_db",
    "get_current_user",
    "get_optional_user",
    "require_role",
    "DBSession",
    "CurrentUser",
    "ActiveUser",
    "VerifiedUser",
    "OptionalUser",
    "Pagination",
    # Rate Limiting
    "rate_limit",
    "rate_limiter",
    "login_rate_limit",
    "api_rate_limit",
    "strict_rate_limit",
    "RateLimitMiddleware",
]
