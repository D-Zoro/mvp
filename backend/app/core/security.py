"""
Security utilities for authentication and authorization.

Provides:
- Password hashing and verification using bcrypt
- JWT token creation and verification with key versioning support
- Access and refresh token management
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import UUID

from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from app.core.config import settings
from app.core.keys import get_active_key, get_key_for_verification

logger = logging.getLogger(__name__)


# Password hashing context using bcrypt
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=settings.BCRYPT_ROUNDS,
)


class TokenPayload(BaseModel):
    """
    JWT token payload structure.

    Attributes:
        sub: Subject (user_id as string)
        role: User role (buyer, seller, admin)
        type: Token type (access or refresh)
        key_version: Key version used to sign token (for rotation support)
        exp: Expiration timestamp
        iat: Issued at timestamp
        jti: JWT ID for token revocation tracking
    """
    sub: str
    role: str
    type: str  # "access" or "refresh"
    key_version: int = 1  # Default to 1 for backward compatibility
    exp: datetime
    iat: datetime
    jti: Optional[str] = None


class TokenPair(BaseModel):
    """
    Access and refresh token pair.
    
    Attributes:
        access_token: Short-lived access token
        refresh_token: Long-lived refresh token
        token_type: Token type (always "bearer")
        expires_in: Access token expiry in seconds
    """
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    
    Args:
        password: Plain text password
        
    Returns:
        str: Hashed password
        
    Example:
        >>> hashed = hash_password("mysecurepassword")
        >>> verify_password("mysecurepassword", hashed)
        True
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    
    Args:
        plain_password: Plain text password to verify
        hashed_password: Hashed password to compare against
        
    Returns:
        bool: True if password matches, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    user_id: UUID,
    role: str,
    expires_delta: Optional[timedelta] = None,
    jti: Optional[str] = None,
) -> str:
    """
    Create a JWT access token with key versioning.

    Args:
        user_id: User's UUID
        role: User's role (buyer, seller, admin)
        expires_delta: Optional custom expiration time
        jti: Optional JWT ID for revocation tracking

    Returns:
        str: Encoded JWT access token

    Example:
        >>> token = create_access_token(user.id, user.role.value)
        >>> payload = decode_token(token)
        >>> payload["sub"] == str(user.id)
        True
    """
    from app.core.keys import get_active_key

    now = datetime.now(timezone.utc)

    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    key_version, secret = get_active_key()

    payload = {
        "sub": str(user_id),
        "role": role,
        "type": "access",
        "key_version": key_version,  # Add key version for multi-key support
        "exp": expire,
        "iat": now,
    }

    if jti:
        payload["jti"] = jti

    return jwt.encode(
        payload,
        secret,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_refresh_token(
    user_id: UUID,
    role: str,
    expires_delta: Optional[timedelta] = None,
    jti: Optional[str] = None,
) -> str:
    """
    Create a JWT refresh token with key versioning.

    Refresh tokens have a longer expiry and are used to obtain new access tokens.

    Args:
        user_id: User's UUID
        role: User's role
        expires_delta: Optional custom expiration time
        jti: Optional JWT ID for revocation tracking

    Returns:
        str: Encoded JWT refresh token
    """
    from app.core.keys import get_active_key

    now = datetime.now(timezone.utc)

    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    key_version, secret = get_active_key()

    payload = {
        "sub": str(user_id),
        "role": role,
        "type": "refresh",
        "key_version": key_version,  # Add key version for multi-key support
        "exp": expire,
        "iat": now,
    }

    if jti:
        payload["jti"] = jti

    return jwt.encode(
        payload,
        secret,
        algorithm=settings.JWT_ALGORITHM,
    )


def create_token_pair(
    user_id: UUID,
    role: str,
    access_jti: Optional[str] = None,
    refresh_jti: Optional[str] = None,
) -> TokenPair:
    """
    Create both access and refresh tokens.
    
    Args:
        user_id: User's UUID
        role: User's role
        access_jti: Optional JWT ID for access token
        refresh_jti: Optional JWT ID for refresh token
        
    Returns:
        TokenPair: Access and refresh token pair
        
    Example:
        >>> tokens = create_token_pair(user.id, user.role.value)
        >>> tokens.token_type
        'bearer'
    """
    access_token = create_access_token(user_id, role, jti=access_jti)
    refresh_token = create_refresh_token(user_id, role, jti=refresh_jti)
    
    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # Convert to seconds
    )


def decode_token(token: str) -> dict[str, Any]:
    """
    Decode and verify a JWT token.

    Supports both current and deprecated key versions for backward compatibility
    during secret rotation.

    Args:
        token: JWT token string

    Returns:
        dict: Decoded token payload

    Raises:
        JWTError: If token is invalid or expired
    """
    from app.core.keys import get_key_for_verification

    try:
        # First, decode without verification to extract key_version
        unverified = jwt.get_unverified_claims(token)
        key_version = unverified.get("key_version", 1)  # Default to v1 for old tokens

        # Get the appropriate key for this version
        secret = get_key_for_verification(key_version)
        if not secret:
            raise JWTError(f"Invalid or expired key version: {key_version}")

        # Now verify with the correct key
        return jwt.decode(
            token,
            secret,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except JWTError:
        raise
    except Exception as exc:
        raise JWTError(f"Token decode failed: {exc}") from exc


def verify_token(token: str, token_type: str = "access") -> Optional[TokenPayload]:
    """
    Verify a JWT token and return its payload.

    Supports both current and deprecated key versions.

    Args:
        token: JWT token string
        token_type: Expected token type ("access" or "refresh")

    Returns:
        TokenPayload if valid, None if invalid

    Example:
        >>> payload = verify_token(access_token, "access")
        >>> if payload:
        ...     user_id = payload.sub
    """
    try:
        payload = decode_token(token)

        # Verify token type
        if payload.get("type") != token_type:
            return None

        return TokenPayload(
            sub=payload["sub"],
            role=payload["role"],
            type=payload["type"],
            key_version=payload.get("key_version", 1),  # Default to 1 for old tokens
            exp=datetime.fromtimestamp(payload["exp"], tz=timezone.utc),
            iat=datetime.fromtimestamp(payload["iat"], tz=timezone.utc),
            jti=payload.get("jti"),
        )
    except JWTError:
        return None


def verify_access_token(token: str) -> Optional[TokenPayload]:
    """
    Verify an access token.
    
    Convenience wrapper around verify_token for access tokens.
    
    Args:
        token: JWT access token
        
    Returns:
        TokenPayload if valid, None if invalid
    """
    return verify_token(token, "access")


def verify_refresh_token(token: str) -> Optional[TokenPayload]:
    """
    Verify a refresh token.
    
    Convenience wrapper around verify_token for refresh tokens.
    
    Args:
        token: JWT refresh token
        
    Returns:
        TokenPayload if valid, None if invalid
    """
    return verify_token(token, "refresh")


def generate_password_reset_token(email: str) -> str:
    """
    Generate a password reset token.
    
    Creates a short-lived token (1 hour) for password reset.
    
    Args:
        email: User's email address
        
    Returns:
        str: Password reset token
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(hours=1)
    
    payload = {
        "sub": email,
        "type": "password_reset",
        "exp": expire,
        "iat": now,
    }
    
    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def verify_password_reset_token(token: str) -> Optional[str]:
    """
    Verify a password reset token.
    
    Args:
        token: Password reset token
        
    Returns:
        Email address if valid, None if invalid
    """
    try:
        payload = decode_token(token)
        
        if payload.get("type") != "password_reset":
            return None
        
        return payload.get("sub")
    except JWTError:
        return None


def generate_email_verification_token(email: str) -> str:
    """
    Generate an email verification token.
    
    Creates a token (24 hours) for email verification.
    
    Args:
        email: User's email address
        
    Returns:
        str: Email verification token
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(hours=24)
    
    payload = {
        "sub": email,
        "type": "email_verification",
        "exp": expire,
        "iat": now,
    }
    
    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )


def verify_email_verification_token(token: str) -> Optional[str]:
    """
    Verify an email verification token.

    Args:
        token: Email verification token

    Returns:
        Email address if valid, None if invalid
    """
    try:
        payload = decode_token(token)

        if payload.get("type") != "email_verification":
            return None

        return payload.get("sub")
    except JWTError:
        return None


def create_token_with_expiration(
    user_id: UUID,
    role: str,
    token_type: str = "access",
    expires_delta: int = 0,
) -> str:
    """
    Create a JWT token with custom expiration (for testing).

    Args:
        user_id: User's UUID
        role: User's role (buyer, seller, admin)
        token_type: Token type (access or refresh)
        expires_delta: Expiration delta in seconds (can be negative for expired tokens)

    Returns:
        str: Encoded JWT token

    Example:
        >>> # Create token that expires 1 hour from now
        >>> token = create_token_with_expiration(user_id, "buyer", expires_delta=3600)
        >>> # Create token that expired 1 hour ago
        >>> expired_token = create_token_with_expiration(user_id, "buyer", expires_delta=-3600)
    """
    from app.core.keys import get_active_key

    now = datetime.now(timezone.utc)
    expire = now + timedelta(seconds=expires_delta)

    key_version, secret = get_active_key()

    payload = {
        "sub": str(user_id),
        "role": role,
        "type": token_type,
        "key_version": key_version,
        "exp": expire,
        "iat": now,
    }

    return jwt.encode(
        payload,
        secret,
        algorithm=settings.JWT_ALGORITHM,
    )
