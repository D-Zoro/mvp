"""
Integration tests for the Authentication API.

Uses the real test database (with per-test rollback) and the FastAPI
AsyncClient routed via ASGITransport — no live network required.

Covers:
    POST /api/v1/auth/register       — success, duplicate, weak password
    POST /api/v1/auth/login          — success, wrong creds, inactive
    POST /api/v1/auth/refresh        — valid and invalid tokens
    POST /api/v1/auth/logout         — authenticated and unauthenticated
    GET  /api/v1/auth/me             — authenticated and unauthenticated
    POST /api/v1/auth/verify-email   — invalid token
    POST /api/v1/auth/forgot-password — always 200
    JWT key versioning               — tokens include key_version claim
"""

import pytest
from httpx import AsyncClient
from jose import jwt

from tests.conftest import create_test_user, make_auth_headers
from app.models.user import UserRole
from app.core.config import settings


BASE = "/api/v1/auth"


# ─────────────────────────────────────────────────────────────────────────────
# Register
# ─────────────────────────────────────────────────────────────────────────────

async def test_register_success(async_client: AsyncClient):
    """
    A valid registration payload should create a user and return 201
    with access token and user details.
    """
    resp = await async_client.post(f"{BASE}/register", json={
        "email": "newuser@example.com",
        "password": "Secure1234",
        "role": "buyer",
    })
    assert resp.status_code == 201
    body = resp.json()
    assert "access_token" in body
    assert body["user"]["email"] == "newuser@example.com"


async def test_register_duplicate_email(async_client: AsyncClient, db_session):
    """
    Registering with an already-taken email must return 409 Conflict.
    Email uniqueness is enforced at service level (not just DB constraint).
    """
    await create_test_user(db_session, email="taken@example.com")

    resp = await async_client.post(f"{BASE}/register", json={
        "email": "taken@example.com",
        "password": "Secure1234",
    })
    assert resp.status_code == 409


async def test_register_weak_password(async_client: AsyncClient):
    """
    A password that fails schema validation (too short / no uppercase)
    should return 422 Unprocessable Entity.
    """
    resp = await async_client.post(f"{BASE}/register", json={
        "email": "user@example.com",
        "password": "weak",
    })
    assert resp.status_code == 422


async def test_register_invalid_email(async_client: AsyncClient):
    """Malformed email must be caught by schema validation (422)."""
    resp = await async_client.post(f"{BASE}/register", json={
        "email": "not-an-email",
        "password": "Secure1234",
    })
    assert resp.status_code == 422


async def test_register_admin_role_rejected(async_client: AsyncClient):
    """
    Self-assigning the admin role must be rejected at schema level (422).
    Only existing admins can promote users via admin endpoints.
    """
    resp = await async_client.post(f"{BASE}/register", json={
        "email": "sneaky@example.com",
        "password": "Secure1234",
        "role": "admin",
    })
    assert resp.status_code == 422


# ─────────────────────────────────────────────────────────────────────────────
# Login
# ─────────────────────────────────────────────────────────────────────────────

async def test_login_success(async_client: AsyncClient, db_session):
    """
    Valid email/password combination should return 200 with both tokens.
    """
    await create_test_user(
        db_session, email="login@example.com", password="TestPass1"
    )
    await db_session.commit()

    resp = await async_client.post(f"{BASE}/login", json={
        "email": "login@example.com",
        "password": "TestPass1",
    })
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["token_type"] == "bearer"


async def test_login_wrong_password(async_client: AsyncClient, db_session):
    """
    Wrong password must return 401 Unauthorized.
    The response must NOT reveal whether the email exists.
    """
    await create_test_user(db_session, email="wrongpass@example.com", password="Right1234")
    await db_session.commit()

    resp = await async_client.post(f"{BASE}/login", json={
        "email": "wrongpass@example.com",
        "password": "Wrong1234",
    })
    assert resp.status_code == 401


async def test_login_nonexistent_email(async_client: AsyncClient):
    """Non-existent email returns the same 401 as a wrong password."""
    resp = await async_client.post(f"{BASE}/login", json={
        "email": "nobody@example.com",
        "password": "SomePass1",
    })
    assert resp.status_code == 401


async def test_login_inactive_account(async_client: AsyncClient, db_session):
    """
    Deactivated accounts must return 403 Forbidden (not 401).
    This lets clients display a specific 'account disabled' message.
    """
    await create_test_user(
        db_session,
        email="inactive@example.com",
        password="Pass1234",
        is_active=False,
    )
    await db_session.commit()

    resp = await async_client.post(f"{BASE}/login", json={
        "email": "inactive@example.com",
        "password": "Pass1234",
    })
    assert resp.status_code == 403


# ─────────────────────────────────────────────────────────────────────────────
# Token refresh
# ─────────────────────────────────────────────────────────────────────────────

async def test_refresh_token_success(async_client: AsyncClient, db_session):
    """
    A valid refresh token should return a new access/refresh token pair (200).
    """
    await create_test_user(db_session, email="refresh@example.com", password="Pass1234")
    await db_session.commit()

    login = await async_client.post(f"{BASE}/login", json={
        "email": "refresh@example.com",
        "password": "Pass1234",
    })
    refresh_token = login.json()["refresh_token"]

    resp = await async_client.post(f"{BASE}/refresh", json={"refresh_token": refresh_token})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


async def test_refresh_token_invalid(async_client: AsyncClient):
    """A garbage refresh token must return 400 Bad Request."""
    resp = await async_client.post(
        f"{BASE}/refresh", json={"refresh_token": "this.is.garbage"}
    )
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────────────────────
# Logout
# ─────────────────────────────────────────────────────────────────────────────

async def test_logout_success(async_client: AsyncClient, buyer_user, buyer_headers):
    """Authenticated logout should return 200 with confirmation message."""
    resp = await async_client.post(f"{BASE}/logout", headers=buyer_headers)
    assert resp.status_code == 200
    assert "logged out" in resp.json()["message"].lower()


async def test_logout_unauthenticated(async_client: AsyncClient):
    """Logout without a token must return 401."""
    resp = await async_client.post(f"{BASE}/logout")
    assert resp.status_code == 401


# ─────────────────────────────────────────────────────────────────────────────
# /me
# ─────────────────────────────────────────────────────────────────────────────

async def test_get_me_authenticated(async_client: AsyncClient, buyer_user, buyer_headers):
    """
    Authenticated GET /me should return the current user's profile.
    Validates that the dependency injection correctly resolves the user from JWT.
    """
    resp = await async_client.get(f"{BASE}/me", headers=buyer_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["email"] == buyer_user.email
    assert body["role"] == "buyer"


async def test_get_me_unauthenticated(async_client: AsyncClient):
    """GET /me without a token must return 401."""
    resp = await async_client.get(f"{BASE}/me")
    assert resp.status_code == 401


async def test_get_me_invalid_token(async_client: AsyncClient):
    """GET /me with a forged token must return 401."""
    resp = await async_client.get(
        f"{BASE}/me", headers={"Authorization": "Bearer forged.token.here"}
    )
    assert resp.status_code == 401


# ─────────────────────────────────────────────────────────────────────────────
# Email verification
# ─────────────────────────────────────────────────────────────────────────────

async def test_verify_email_invalid_token(async_client: AsyncClient):
    """An invalid verification token must return 400."""
    resp = await async_client.post(
        f"{BASE}/verify-email", json={"token": "invalid.token.here"}
    )
    assert resp.status_code == 400


# ─────────────────────────────────────────────────────────────────────────────
# JWT Key Versioning (Phase 1 CRIT-03)
# ─────────────────────────────────────────────────────────────────────────────

async def test_token_includes_key_version(async_client: AsyncClient, db_session):
    """
    Verify that tokens created during login include key_version field in payload.
    This validates Phase 1 CRIT-03 JWT secret rotation implementation.
    """
    await create_test_user(
        db_session, email="keyversion@example.com", password="Pass1234"
    )
    await db_session.commit()

    resp = await async_client.post(f"{BASE}/login", json={
        "email": "keyversion@example.com",
        "password": "Pass1234",
    })
    assert resp.status_code == 200
    body = resp.json()
    access_token = body["access_token"]

    # Decode token WITHOUT verification to inspect payload
    unverified_payload = jwt.get_unverified_claims(access_token)

    # Verify key_version field exists and is an integer
    assert "key_version" in unverified_payload
    assert isinstance(unverified_payload["key_version"], int)
    assert unverified_payload["key_version"] >= 1


# ─────────────────────────────────────────────────────────────────────────────
# Forgot password
# ─────────────────────────────────────────────────────────────────────────────

async def test_forgot_password_known_email(async_client: AsyncClient, db_session):
    """
    Forgot-password must always return 200 — even for known emails.
    Anti-enumeration: the response reveals nothing about whether the email exists.
    """
    await create_test_user(db_session, email="known@example.com")
    await db_session.commit()

    resp = await async_client.post(
        f"{BASE}/forgot-password", json={"email": "known@example.com"}
    )
    assert resp.status_code == 200


async def test_forgot_password_unknown_email(async_client: AsyncClient):
    """Forgot-password for unknown email must also return 200 (no enumeration)."""
    resp = await async_client.post(
        f"{BASE}/forgot-password", json={"email": "nobody@example.com"}
    )
    assert resp.status_code == 200
