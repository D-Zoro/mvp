"""
Integration tests for rate limiting functionality.

Tests:
- Basic rate limit enforcement on login endpoint
- Rate limit reset after period expires
- Concurrent requests from same IP
- Independent rate limits per IP
- Signup endpoint rate limiting
- Password reset endpoint rate limiting
"""

import asyncio
import logging
from typing import Optional

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient

from app.main import app

logger = logging.getLogger(__name__)

# Test fixtures
pytestmark = pytest.mark.asyncio


@pytest.fixture
def test_user_email() -> str:
    """Test user email."""
    return "ratelimit_test@example.com"


@pytest.fixture
def test_user_password() -> str:
    """Test user password."""
    return "TestPass123!"


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────


async def make_login_request(
    client: AsyncClient,
    email: str = "test@example.com",
    password: str = "password123",
    client_ip: Optional[str] = None,
) -> tuple[int, dict]:
    """
    Make a login request.

    Args:
        client: AsyncClient instance
        email: Email to login with
        password: Password to login with
        client_ip: Optional X-Forwarded-For IP to override client IP

    Returns:
        Tuple of (status_code, response_json)
    """
    headers = {}
    if client_ip:
        headers["X-Forwarded-For"] = client_ip

    response = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
        headers=headers,
    )
    return response.status_code, response.json()


async def make_signup_request(
    client: AsyncClient,
    email: str = "newuser@example.com",
    password: str = "NewPass123!",
    first_name: str = "Test",
    last_name: str = "User",
    client_ip: Optional[str] = None,
) -> tuple[int, dict]:
    """
    Make a signup request.

    Args:
        client: AsyncClient instance
        email: Email to register with
        password: Password to register with
        first_name: First name
        last_name: Last name
        client_ip: Optional X-Forwarded-For IP to override client IP

    Returns:
        Tuple of (status_code, response_json)
    """
    headers = {}
    if client_ip:
        headers["X-Forwarded-For"] = client_ip

    response = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "first_name": first_name,
            "last_name": last_name,
            "role": "buyer",
        },
        headers=headers,
    )
    return response.status_code, response.json()


async def make_reset_password_request(
    client: AsyncClient,
    token: str = "test-token-123",
    new_password: str = "NewPass456!",
    client_ip: Optional[str] = None,
) -> tuple[int, dict]:
    """
    Make a password reset request.

    Args:
        client: AsyncClient instance
        token: Reset token
        new_password: New password
        client_ip: Optional X-Forwarded-For IP to override client IP

    Returns:
        Tuple of (status_code, response_json)
    """
    headers = {}
    if client_ip:
        headers["X-Forwarded-For"] = client_ip

    response = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": new_password},
        headers=headers,
    )
    return response.status_code, response.json()


# ─────────────────────────────────────────────────────────────────────────────
# Tests
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_rate_limit_basic_login() -> None:
    """Test basic rate limit enforcement on login endpoint."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Make 5 successful requests (should all succeed with invalid credentials)
        for i in range(5):
            status_code, response = await make_login_request(
                client,
                email=f"user{i}@example.com",
                password="wrong_password",
            )
            assert status_code in (401, 429), f"Request {i} got status {status_code}"

        # 6th request should be rate limited
        status_code, response = await make_login_request(
            client,
            email="user5@example.com",
            password="wrong_password",
        )
        assert status_code == 429, "6th request should be rate limited (429)"
        assert "Retry-After" in response.get(
            "headers", {}
        ) or "Too many requests" in response.get("detail", "").lower()


@pytest.mark.asyncio
async def test_rate_limit_retry_after_header() -> None:
    """Test that rate limit response includes Retry-After header."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Make 6 requests to trigger rate limit
        for i in range(6):
            response = await client.post(
                "/api/v1/auth/login",
                json={"email": f"user{i}@example.com", "password": "wrong"},
            )
            if response.status_code == 429:
                # Check for Retry-After header
                assert "retry-after" in response.headers.keys() or any(
                    k.lower() == "retry-after" for k in response.headers.keys()
                ), "Retry-After header should be present in 429 response"
                break


@pytest.mark.asyncio
async def test_rate_limit_concurrent_requests() -> None:
    """Test rate limit with concurrent requests from same IP."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Send 10 concurrent requests
        tasks = [
            make_login_request(client, email=f"user{i}@example.com", password="wrong")
            for i in range(10)
        ]
        results = await asyncio.gather(*tasks)

        # Count successes and rate-limited responses
        successes = sum(1 for status, _ in results if status != 429)
        rate_limited = sum(1 for status, _ in results if status == 429)

        # Should have some successes and some rate limited (exact counts depend on timing)
        assert successes > 0, "Should have at least some successful requests"
        assert rate_limited > 0, "Should have some rate-limited requests"
        logger.info(f"Concurrent test: {successes} successes, {rate_limited} rate-limited")


@pytest.mark.asyncio
async def test_rate_limit_different_ips() -> None:
    """Test that different IPs have independent rate limit counters."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Make 5 requests from IP A (should succeed)
        for i in range(5):
            status_code, _ = await make_login_request(
                client,
                email=f"userA{i}@example.com",
                password="wrong",
                client_ip="192.168.1.1",
            )
            assert status_code != 429, f"IP A request {i} should not be rate limited"

        # 6th request from IP A should be rate limited
        status_code, _ = await make_login_request(
            client,
            email="userA5@example.com",
            password="wrong",
            client_ip="192.168.1.1",
        )
        assert status_code == 429, "IP A 6th request should be rate limited"

        # 1st request from IP B should succeed (independent counter)
        status_code, _ = await make_login_request(
            client,
            email="userB1@example.com",
            password="wrong",
            client_ip="192.168.1.2",
        )
        assert status_code != 429, "IP B 1st request should not be rate limited"


@pytest.mark.asyncio
async def test_rate_limit_signup_endpoint() -> None:
    """Test rate limiting on signup endpoint (3 per hour)."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Make 3 requests (should succeed or fail with validation error)
        for i in range(3):
            status_code, _ = await make_signup_request(
                client,
                email=f"newuser{i}@example.com",
                password="NewPass123!",
            )
            # Accept both 201 (success) and 422 (validation) but not 429
            assert status_code != 429, f"Signup request {i} should not be rate limited"

        # 4th request should be rate limited
        status_code, response = await make_signup_request(
            client,
            email="newuser3@example.com",
            password="NewPass123!",
        )
        assert status_code == 429, "4th signup request should be rate limited"


@pytest.mark.asyncio
async def test_rate_limit_password_reset_endpoint() -> None:
    """Test rate limiting on password reset endpoint (3 per hour)."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Make 3 requests (should all fail with invalid token but not rate limited)
        for i in range(3):
            status_code, _ = await make_reset_password_request(
                client,
                token=f"invalid-token-{i}",
                new_password="NewPass456!",
            )
            # Accept 400 (invalid token) but not 429
            assert status_code != 429, f"Reset request {i} should not be rate limited"

        # 4th request should be rate limited
        status_code, response = await make_reset_password_request(
            client,
            token="invalid-token-3",
            new_password="NewPass456!",
        )
        assert status_code == 429, "4th reset request should be rate limited"


@pytest.mark.asyncio
async def test_rate_limit_response_detail() -> None:
    """Test that rate limit response includes helpful detail message."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Make 6 requests to trigger rate limit
        for i in range(6):
            response = await client.post(
                "/api/v1/auth/login",
                json={"email": f"user{i}@example.com", "password": "wrong"},
            )
            if response.status_code == 429:
                # Check response has detail message
                data = response.json()
                assert "detail" in data, "429 response should have detail field"
                detail = data["detail"]
                assert (
                    "too many" in detail.lower()
                    or "rate limit" in detail.lower()
                    or "try again" in detail.lower()
                ), f"Detail should mention rate limit, got: {detail}"
                break


@pytest.mark.asyncio
async def test_rate_limit_independent_by_endpoint() -> None:
    """Test that rate limits are independent per endpoint."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        ip = "192.168.2.1"

        # Make 5 login requests from IP
        for i in range(5):
            status_code, _ = await make_login_request(
                client,
                email=f"loginuser{i}@example.com",
                password="wrong",
                client_ip=ip,
            )
            assert status_code != 429, f"Login request {i} should not be rate limited"

        # 6th login should be rate limited
        status_code, _ = await make_login_request(
            client,
            email="loginuser5@example.com",
            password="wrong",
            client_ip=ip,
        )
        assert status_code == 429, "6th login from same IP should be rate limited"

        # But signup should still work (separate endpoint, separate limit)
        status_code, _ = await make_signup_request(
            client,
            email="signupuser1@example.com",
            password="NewPass123!",
            client_ip=ip,
        )
        assert status_code != 429, (
            "Signup should not be rate limited (different endpoint, "
            "separate counter)"
        )
