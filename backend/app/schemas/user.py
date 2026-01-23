"""
User schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import EmailStr, Field, field_validator

from app.models.user import OAuthProvider, UserRole
from app.schemas.base import BaseSchema, PaginatedResponse, ResponseSchema


class UserBase(BaseSchema):
    """
    Base user schema with common fields.
    
    Attributes:
        email: User's email address
        first_name: User's first name
        last_name: User's last name
    """
    
    email: EmailStr = Field(
        ...,
        description="User's email address",
        examples=["john.doe@example.com"],
    )
    first_name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=100,
        description="User's first name",
        examples=["John"],
    )
    last_name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=100,
        description="User's last name",
        examples=["Doe"],
    )


class UserCreate(UserBase):
    """
    Schema for user registration.
    
    Attributes:
        password: Plain text password (will be hashed)
        role: User role (defaults to buyer)
    """
    
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Password (min 8 characters)",
        examples=["SecureP@ss123"],
    )
    role: UserRole = Field(
        default=UserRole.BUYER,
        description="User role",
    )
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserUpdate(BaseSchema):
    """
    Schema for updating user profile.
    
    All fields are optional - only provided fields will be updated.
    """
    
    first_name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=100,
        description="User's first name",
    )
    last_name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=100,
        description="User's last name",
    )
    avatar_url: Optional[str] = Field(
        None,
        max_length=500,
        description="URL to profile picture",
    )


class UserPasswordUpdate(BaseSchema):
    """Schema for password change."""
    
    current_password: str = Field(
        ...,
        min_length=8,
        description="Current password",
    )
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="New password",
    )
    
    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        """Validate new password strength."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class UserResponse(ResponseSchema):
    """
    Schema for user API response.
    
    Excludes sensitive fields like password_hash.
    """
    
    email: EmailStr = Field(..., description="User's email address")
    role: UserRole = Field(..., description="User role")
    email_verified: bool = Field(..., description="Email verification status")
    is_active: bool = Field(..., description="Account active status")
    first_name: Optional[str] = Field(None, description="First name")
    last_name: Optional[str] = Field(None, description="Last name")
    avatar_url: Optional[str] = Field(None, description="Profile picture URL")
    oauth_provider: Optional[OAuthProvider] = Field(None, description="OAuth provider")
    
    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "email": "john.doe@example.com",
                "role": "buyer",
                "email_verified": True,
                "is_active": True,
                "first_name": "John",
                "last_name": "Doe",
                "avatar_url": "https://example.com/avatar.jpg",
                "oauth_provider": None,
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-15T10:30:00Z",
            }
        },
    }


class UserBriefResponse(BaseSchema):
    """Brief user info for nested responses."""
    
    id: UUID = Field(..., description="User ID")
    email: EmailStr = Field(..., description="User's email")
    first_name: Optional[str] = Field(None, description="First name")
    last_name: Optional[str] = Field(None, description="Last name")
    avatar_url: Optional[str] = Field(None, description="Profile picture URL")
    
    @property
    def full_name(self) -> str:
        """Get user's full name."""
        parts = [self.first_name, self.last_name]
        return " ".join(p for p in parts if p) or "Unknown"


class UserListResponse(PaginatedResponse[UserResponse]):
    """Paginated list of users."""
    pass


class UserRoleUpdate(BaseSchema):
    """Schema for admin to update user role."""
    
    role: UserRole = Field(..., description="New user role")
