"""
Unit tests for app.core.security — password hashing and JWT utilities.

These tests are pure Python (no database, no HTTP, no network).
All operations are fully deterministic and fast.

Note: passlib + bcrypt 4.x on Python 3.12 has a 72-byte limit for passwords
      longer than 72 bytes. Test passwords are kept short to avoid this.
"""

from datetime import timedelta
from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app.core.security import (
    create_access_token,
    create_refresh_token,
    create_token_pair,
    decode_token,
    generate_email_verification_token,
    generate_password_reset_token,
    hash_password,
    verify_access_token,
    verify_email_verification_token,
    verify_password,
    verify_password_reset_token,
    verify_refresh_token,
    verify_token,
)
from app.core.config import settings
from jose import jwt as jose_jwt


# ─────────────────────────────────────────────────────────────────────────────
# Password hashing
# ─────────────────────────────────────────────────────────────────────────────

def test_hash_password_is_not_plaintext():
    """Hashed password should not equal the original plaintext string."""
    plain = "MySecret1"
    hashed = hash_password(plain)
    assert hashed != plain


def test_hash_password_returns_string():
    """hash_password() should return a non-empty string."""
    result = hash_password("AnyPass1")
    assert isinstance(result, str) and len(result) > 0


def test_hash_password_different_hashes_same_input():
    """bcrypt adds random salt — the same password hashes differently each time."""
    h1 = hash_password("Same1234")
    h2 = hash_password("Same1234")
    assert h1 != h2  # different salts


def test_verify_password_correct():
    """verify_password() returns True for the matching plaintext."""
    plain = "Correct9"
    hashed = hash_password(plain)
    assert verify_password(plain, hashed) is True


def test_verify_password_wrong():
    """verify_password() returns False when the password does not match."""
    hashed = hash_password("RealPass1")
    assert verify_password("WrongPass1", hashed) is False


def test_verify_password_empty_wrong():
    """Empty password should not match a non-empty hash."""
    hashed = hash_password("NotEmpty1")
    assert verify_password("", hashed) is False


# ─────────────────────────────────────────────────────────────────────────────
# JWT access tokens
# ─────────────────────────────────────────────────────────────────────────────

def test_create_access_token_payload():
    """Access token payload must contain the correct sub, role, and type."""
    user_id = uuid4()
    token = create_access_token(user_id, "buyer")
    payload = decode_token(token)

    assert payload["sub"] == str(user_id)
    assert payload["role"] == "buyer"
    assert payload["type"] == "access"


def test_verify_access_token_valid():
    """verify_access_token() should return a TokenPayload for a fresh token."""
    user_id = uuid4()
    token = create_access_token(user_id, "seller")
    result = verify_access_token(token)

    assert result is not None
    assert result.sub == str(user_id)
    assert result.role == "seller"
    assert result.type == "access"


def test_verify_access_token_wrong_type_rejected():
    """
    A refresh token must be rejected by verify_access_token().
    Prevents refresh tokens from being used as access tokens.
    """
    user_id = uuid4()
    refresh = create_refresh_token(user_id, "buyer")
    result = verify_access_token(refresh)
    assert result is None


def test_verify_access_token_expired():
    """Expired access token should return None, not raise."""
    user_id = uuid4()
    token = create_access_token(user_id, "buyer", expires_delta=timedelta(seconds=-1))
    result = verify_access_token(token)
    assert result is None


def test_verify_access_token_garbage():
    """Completely invalid JWT string should return None gracefully."""
    result = verify_access_token("this.is.not.a.token")
    assert result is None


# ─────────────────────────────────────────────────────────────────────────────
# JWT refresh tokens
# ─────────────────────────────────────────────────────────────────────────────

def test_create_refresh_token_payload():
    """Refresh token payload must have type='refresh'."""
    user_id = uuid4()
    token = create_refresh_token(user_id, "seller")
    payload = decode_token(token)

    assert payload["type"] == "refresh"
    assert payload["sub"] == str(user_id)


def test_verify_refresh_token_valid():
    """verify_refresh_token() returns payload for a valid refresh token."""
    user_id = uuid4()
    token = create_refresh_token(user_id, "admin")
    result = verify_refresh_token(token)

    assert result is not None
    assert result.type == "refresh"


def test_verify_refresh_token_wrong_type_rejected():
    """An access token must be rejected by verify_refresh_token()."""
    user_id = uuid4()
    access = create_access_token(user_id, "buyer")
    result = verify_refresh_token(access)
    assert result is None


# ─────────────────────────────────────────────────────────────────────────────
# Token pair
# ─────────────────────────────────────────────────────────────────────────────

def test_create_token_pair_structure():
    """create_token_pair() returns both tokens and token_type='bearer'."""
    user_id = uuid4()
    pair = create_token_pair(user_id, "buyer")

    assert pair.token_type == "bearer"
    assert len(pair.access_token) > 0
    assert len(pair.refresh_token) > 0
    assert pair.expires_in > 0


def test_token_pair_access_and_refresh_differ():
    """Access and refresh tokens in a pair must be different strings."""
    pair = create_token_pair(uuid4(), "seller")
    assert pair.access_token != pair.refresh_token


# ─────────────────────────────────────────────────────────────────────────────
# Password reset tokens
# ─────────────────────────────────────────────────────────────────────────────

def test_password_reset_token_roundtrip():
    """generate → verify should return the same email."""
    email = "reset@example.com"
    token = generate_password_reset_token(email)
    result = verify_password_reset_token(token)
    assert result == email


def test_password_reset_token_wrong_type():
    """An access token should not pass as a password reset token."""
    access = create_access_token(uuid4(), "buyer")
    result = verify_password_reset_token(access)
    assert result is None


def test_password_reset_token_expired():
    """Expired reset token must return None."""
    payload = {
        "sub": "expired@example.com",
        "type": "password_reset",
        "exp": datetime(2000, 1, 1, tzinfo=timezone.utc),
        "iat": datetime(2000, 1, 1, tzinfo=timezone.utc),
    }
    token = jose_jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    assert verify_password_reset_token(token) is None


# ─────────────────────────────────────────────────────────────────────────────
# Email verification tokens
# ─────────────────────────────────────────────────────────────────────────────

def test_email_verification_token_roundtrip():
    """generate → verify should return the same email."""
    email = "verify@example.com"
    token = generate_email_verification_token(email)
    result = verify_email_verification_token(token)
    assert result == email


def test_email_verification_token_wrong_type():
    """A password reset token must not be accepted as an email verification token."""
    reset_token = generate_password_reset_token("someone@example.com")
    result = verify_email_verification_token(reset_token)
    assert result is None
