"""
User repository for user-specific database operations.
"""

from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.user import OAuthProvider, User, UserRole
from app.repositories.base import BaseRepository
from app.schemas.user import UserCreate, UserUpdate


class UserRepository(BaseRepository[User, UserCreate, UserUpdate]):
    """
    Repository for User model operations.
    
    Extends BaseRepository with user-specific methods:
    - get_by_email: Find user by email
    - create_with_password: Create user with hashed password
    - verify_email: Mark email as verified
    - update_password: Change user password
    - get_by_oauth: Find user by OAuth provider
    """
    
    def __init__(self, db: AsyncSession):
        """Initialize with User model."""
        super().__init__(User, db)
    
    async def get_by_email(
        self,
        email: str,
        *,
        include_deleted: bool = False,
    ) -> Optional[User]:
        """
        Get user by email address.
        
        Args:
            email: User's email address
            include_deleted: Include soft-deleted users
            
        Returns:
            User instance or None if not found
        """
        query = select(User).where(User.email == email.lower())
        
        if not include_deleted:
            query = query.where(User.deleted_at.is_(None))
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def create_with_password(
        self,
        *,
        email: str,
        password: str,
        role: UserRole = UserRole.BUYER,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
    ) -> User:
        """
        Create user with hashed password.
        
        Args:
            email: User's email address
            password: Plain text password (will be hashed)
            role: User role (default: buyer)
            first_name: Optional first name
            last_name: Optional last name
            
        Returns:
            Created user instance
        """
        user = User(
            email=email.lower(),
            password_hash=hash_password(password),
            role=role,
            first_name=first_name,
            last_name=last_name,
            email_verified=False,
            is_active=True,
        )
        
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user
    
    async def create_oauth_user(
        self,
        *,
        email: str,
        provider: OAuthProvider,
        provider_id: str,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        avatar_url: Optional[str] = None,
    ) -> User:
        """
        Create user from OAuth provider.
        
        Args:
            email: User's email from OAuth
            provider: OAuth provider (google, github)
            provider_id: User ID from OAuth provider
            first_name: Optional first name from OAuth
            last_name: Optional last name from OAuth
            avatar_url: Optional avatar URL from OAuth
            
        Returns:
            Created user instance
        """
        user = User(
            email=email.lower(),
            password_hash=None,  # OAuth users don't have passwords
            role=UserRole.BUYER,
            first_name=first_name,
            last_name=last_name,
            avatar_url=avatar_url,
            oauth_provider=provider,
            oauth_provider_id=provider_id,
            email_verified=True,  # OAuth emails are pre-verified
            is_active=True,
        )
        
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user
    
    async def get_by_oauth(
        self,
        provider: OAuthProvider,
        provider_id: str,
    ) -> Optional[User]:
        """
        Get user by OAuth provider and provider ID.
        
        Args:
            provider: OAuth provider
            provider_id: User ID from OAuth provider
            
        Returns:
            User instance or None if not found
        """
        query = select(User).where(
            User.oauth_provider == provider,
            User.oauth_provider_id == provider_id,
            User.deleted_at.is_(None),
        )
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def verify_email(
        self,
        user_id: UUID,
    ) -> Optional[User]:
        """
        Mark user's email as verified.
        
        Args:
            user_id: User's UUID
            
        Returns:
            Updated user instance or None if not found
        """
        user = await self.get(user_id)
        if user is None:
            return None
        
        user.email_verified = True
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user
    
    async def update_password(
        self,
        user_id: UUID,
        new_password: str,
    ) -> Optional[User]:
        """
        Update user's password.
        
        Args:
            user_id: User's UUID
            new_password: New plain text password (will be hashed)
            
        Returns:
            Updated user instance or None if not found
        """
        user = await self.get(user_id)
        if user is None:
            return None
        
        user.password_hash = hash_password(new_password)
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user
    
    async def update_role(
        self,
        user_id: UUID,
        new_role: UserRole,
    ) -> Optional[User]:
        """
        Update user's role (admin only).
        
        Args:
            user_id: User's UUID
            new_role: New user role
            
        Returns:
            Updated user instance or None if not found
        """
        user = await self.get(user_id)
        if user is None:
            return None
        
        user.role = new_role
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user
    
    async def deactivate(
        self,
        user_id: UUID,
    ) -> Optional[User]:
        """
        Deactivate user account.
        
        Args:
            user_id: User's UUID
            
        Returns:
            Updated user instance or None if not found
        """
        user = await self.get(user_id)
        if user is None:
            return None
        
        user.is_active = False
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user
    
    async def activate(
        self,
        user_id: UUID,
    ) -> Optional[User]:
        """
        Activate user account.
        
        Args:
            user_id: User's UUID
            
        Returns:
            Updated user instance or None if not found
        """
        user = await self.get(user_id)
        if user is None:
            return None
        
        user.is_active = True
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return user
    
    async def get_by_role(
        self,
        role: UserRole,
        *,
        skip: int = 0,
        limit: int = 100,
        active_only: bool = True,
    ) -> list[User]:
        """
        Get users by role.
        
        Args:
            role: User role to filter by
            skip: Number of records to skip
            limit: Maximum records to return
            active_only: Only return active users
            
        Returns:
            List of users with specified role
        """
        query = select(User).where(
            User.role == role,
            User.deleted_at.is_(None),
        )
        
        if active_only:
            query = query.where(User.is_active.is_(True))
        
        query = query.order_by(User.created_at.desc()).offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def email_exists(
        self,
        email: str,
    ) -> bool:
        """
        Check if email is already registered.
        
        Args:
            email: Email address to check
            
        Returns:
            True if email exists, False otherwise
        """
        user = await self.get_by_email(email, include_deleted=True)
        return user is not None
