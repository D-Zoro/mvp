"""
Authentication schemas for login, registration, and tokens.
"""

from typing import Optional

from pydantic import EmailStr, Field, field_validator

from app.models.user import UserRole
from app.schemas.base import BaseSchema
from app.schemas.user import UserResponse


class LoginRequest(BaseSchema):
    """
    Schema for user login.
    
    Attributes:
        email: User's email address
        password: User's password
    """
    
    email: EmailStr = Field(
        ...,
        description="User's email address",
        examples=["john.doe@example.com"],
    )
    password: str = Field(
        ...,
        min_length=1,
        description="User's password",
    )
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "john.doe@example.com",
                "password": "SecureP@ss123",
            }
        },
    }


class RegisterRequest(BaseSchema):
    """
    Schema for user registration.
    
    Attributes:
        email: User's email address
        password: User's password (min 8 chars, must include upper, lower, digit)
        first_name: Optional first name
        last_name: Optional last name
        role: User role (buyer or seller)
    """
    
    email: EmailStr = Field(
        ...,
        description="User's email address",
        examples=["john.doe@example.com"],
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Password (min 8 chars)",
        examples=["SecureP@ss123"],
    )
    first_name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=100,
        description="First name",
    )
    last_name: Optional[str] = Field(
        None,
        min_length=1,
        max_length=100,
        description="Last name",
    )
    role: UserRole = Field(
        default=UserRole.BUYER,
        description="User role (buyer or seller)",
    )
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength."""
        errors = []
        if len(v) < 8:
            errors.append("at least 8 characters")
        if not any(c.isupper() for c in v):
            errors.append("one uppercase letter")
        if not any(c.islower() for c in v):
            errors.append("one lowercase letter")
        if not any(c.isdigit() for c in v):
            errors.append("one digit")
        
        if errors:
            raise ValueError(f"Password must contain {', '.join(errors)}")
        return v
    
    @field_validator("role")
    @classmethod
    def validate_role(cls, v: UserRole) -> UserRole:
        """Validate role - users can only register as buyer or seller."""
        if v == UserRole.ADMIN:
            raise ValueError("Cannot register as admin")
        return v
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "john.doe@example.com",
                "password": "SecureP@ss123",
                "first_name": "John",
                "last_name": "Doe",
                "role": "buyer",
            }
        },
    }


class TokenResponse(BaseSchema):
    """
    Schema for authentication token response.
    
    Attributes:
        access_token: JWT access token
        refresh_token: JWT refresh token
        token_type: Token type (always "bearer")
        expires_in: Access token expiry in seconds
    """
    
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiry in seconds")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "expires_in": 900,
            }
        },
    }


class AuthResponse(BaseSchema):
    """
    Schema for authentication response with user data.
    
    Combines token response with user information.
    """
    
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiry in seconds")
    user: UserResponse = Field(..., description="User information")


class RefreshTokenRequest(BaseSchema):
    """Schema for token refresh request."""
    
    refresh_token: str = Field(
        ...,
        description="JWT refresh token",
    )


class PasswordResetRequest(BaseSchema):
    """Schema for password reset request (forgot password)."""
    
    email: EmailStr = Field(
        ...,
        description="Email address for password reset",
    )


class PasswordResetConfirm(BaseSchema):
    """Schema for confirming password reset."""
    
    token: str = Field(
        ...,
        description="Password reset token",
    )
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="New password",
    )
    
    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength."""
        errors = []
        if len(v) < 8:
            errors.append("at least 8 characters")
        if not any(c.isupper() for c in v):
            errors.append("one uppercase letter")
        if not any(c.islower() for c in v):
            errors.append("one lowercase letter")
        if not any(c.isdigit() for c in v):
            errors.append("one digit")
        
        if errors:
            raise ValueError(f"Password must contain {', '.join(errors)}")
        return v


class EmailVerificationRequest(BaseSchema):
    """Schema for email verification."""
    
    token: str = Field(
        ...,
        description="Email verification token",
    )


class OAuthCallbackRequest(BaseSchema):
    """Schema for OAuth callback."""
    
    code: str = Field(..., description="Authorization code from OAuth provider")
    state: Optional[str] = Field(None, description="State parameter for CSRF protection")


class OAuthURLResponse(BaseSchema):
    """Schema for OAuth authorization URL response."""
    
    authorization_url: str = Field(..., description="OAuth authorization URL")
    state: str = Field(..., description="State parameter for CSRF protection")
