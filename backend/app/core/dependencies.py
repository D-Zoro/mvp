"""
FastAPI dependency injection functions.

Provides:
- Database session management
- Current user authentication
- Role-based access control (RBAC)
- Pagination helpers
"""

from typing import Annotated, AsyncGenerator, Callable, Optional
from uuid import UUID

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import async_session_maker
from app.core.security import TokenPayload, verify_access_token
from app.models.user import User, UserRole


# HTTP Bearer token security scheme
security = HTTPBearer(auto_error=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Get async database session.
    
    Yields a database session that is automatically closed after use.
    Uses context manager for proper cleanup.
    
    Yields:
        AsyncSession: SQLAlchemy async session
        
    Example:
        @router.get("/items")
        async def get_items(db: AsyncSession = Depends(get_db)):
            result = await db.execute(select(Item))
            return result.scalars().all()
    """
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# Type alias for database dependency
DBSession = Annotated[AsyncSession, Depends(get_db)]


async def get_token_payload(
    credentials: Annotated[
        Optional[HTTPAuthorizationCredentials],
        Depends(security)
    ],
) -> TokenPayload:
    """
    Extract and verify JWT token from Authorization header.
    
    Args:
        credentials: HTTP Bearer credentials from Authorization header
        
    Returns:
        TokenPayload: Verified token payload
        
    Raises:
        HTTPException: 401 if token is missing or invalid
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = credentials.credentials
    payload = verify_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return payload


# Type alias for token payload dependency
TokenDep = Annotated[TokenPayload, Depends(get_token_payload)]


async def get_current_user(
    db: DBSession,
    token: TokenDep,
) -> User:
    """
    Get the current authenticated user.
    
    Fetches user from database using token payload.
    Verifies user exists, is active, and not deleted.
    
    Args:
        db: Database session
        token: Verified token payload
        
    Returns:
        User: Current authenticated user
        
    Raises:
        HTTPException: 401 if user not found or inactive
        
    Example:
        @router.get("/me")
        async def get_me(current_user: User = Depends(get_current_user)):
            return current_user
    """
    from sqlalchemy import select
    
    user_id = UUID(token.sub)
    
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.deleted_at.is_(None),
        )
    )
    user = result.scalar_one_or_none()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )
    
    return user


# Type alias for current user dependency
CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_current_active_user(
    current_user: CurrentUser,
) -> User:
    """
    Get current user, ensuring they are active.
    
    Additional check that user is active (not just not deleted).
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        User: Active user
        
    Raises:
        HTTPException: 403 if user is not active
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    return current_user


# Type alias for active user dependency
ActiveUser = Annotated[User, Depends(get_current_active_user)]


async def get_current_verified_user(
    current_user: ActiveUser,
) -> User:
    """
    Get current user, ensuring their email is verified.
    
    Args:
        current_user: Current active user
        
    Returns:
        User: Verified user
        
    Raises:
        HTTPException: 403 if email not verified
    """
    if not current_user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified",
        )
    return current_user


# Type alias for verified user dependency
VerifiedUser = Annotated[User, Depends(get_current_verified_user)]


def require_role(*allowed_roles: UserRole) -> Callable:
    """
    Create a dependency that requires specific user roles.
    
    Factory function that returns a dependency checker for RBAC.
    
    Args:
        *allowed_roles: One or more UserRole values that are allowed
        
    Returns:
        Callable: Dependency function that checks user role
        
    Example:
        @router.delete("/users/{user_id}")
        async def delete_user(
            user_id: UUID,
            current_user: User = Depends(require_role(UserRole.ADMIN)),
        ):
            # Only admins can reach here
            ...
        
        @router.post("/books")
        async def create_book(
            book: BookCreate,
            current_user: User = Depends(require_role(UserRole.SELLER, UserRole.ADMIN)),
        ):
            # Sellers and admins can create books
            ...
    """
    async def role_checker(
        current_user: ActiveUser,
    ) -> User:
        """Check if current user has required role."""
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in allowed_roles]}",
            )
        return current_user
    
    return role_checker


# Convenience dependencies for common role checks
RequireAdmin = Depends(require_role(UserRole.ADMIN))
RequireSeller = Depends(require_role(UserRole.SELLER, UserRole.ADMIN))
RequireBuyer = Depends(require_role(UserRole.BUYER, UserRole.SELLER, UserRole.ADMIN))


async def get_optional_user(
    db: DBSession,
    credentials: Annotated[
        Optional[HTTPAuthorizationCredentials],
        Depends(security)
    ],
) -> Optional[User]:
    """
    Get current user if authenticated, None otherwise.
    
    Useful for endpoints that work differently for authenticated
    vs anonymous users (e.g., showing personalized content).
    
    Args:
        db: Database session
        credentials: Optional HTTP Bearer credentials
        
    Returns:
        User if authenticated, None otherwise
        
    Example:
        @router.get("/books")
        async def list_books(
            current_user: Optional[User] = Depends(get_optional_user),
        ):
            if current_user:
                # Show personalized results
                ...
            else:
                # Show default results
                ...
    """
    if credentials is None:
        return None
    
    token = credentials.credentials
    payload = verify_access_token(token)
    
    if payload is None:
        return None
    
    from sqlalchemy import select
    
    user_id = UUID(payload.sub)
    
    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.deleted_at.is_(None),
            User.is_active.is_(True),
        )
    )
    return result.scalar_one_or_none()


# Type alias for optional user dependency
OptionalUser = Annotated[Optional[User], Depends(get_optional_user)]


class PaginationParams:
    """
    Pagination parameters for list endpoints.
    
    Provides standardized pagination across all list endpoints.
    
    Attributes:
        page: Current page number (1-indexed)
        per_page: Items per page
        skip: Calculated offset for database query
    """
    
    def __init__(
        self,
        page: Annotated[int, Query(ge=1, description="Page number")] = 1,
        per_page: Annotated[int, Query(ge=1, le=100, description="Items per page")] = 20,
    ):
        self.page = page
        self.per_page = per_page
        self.skip = (page - 1) * per_page


# Type alias for pagination dependency
Pagination = Annotated[PaginationParams, Depends()]
