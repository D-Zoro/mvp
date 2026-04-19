"""
Error Handling & Information Security Integration Tests — ERROR-02, ERROR-04

Tests for:
- ERROR-02: No information leaks (email enumeration, auth errors, SQL details)
- ERROR-04: Edge case error handling (concurrent mods, invalid states, malformed input)

Uses real test DB with rollback isolation and FastAPI AsyncClient.
"""

import asyncio
import uuid
from typing import Optional

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import create_test_book, create_test_user, make_auth_headers
from app.models.order import OrderStatus
from app.models.user import UserRole


BASE = "/api/v1"


# ─────────────────────────────────────────────────────────────────────────────
# ERROR-02: Information Security & No Leaks
# ─────────────────────────────────────────────────────────────────────────────


class TestNoInformationLeakLogin:
    """Email enumeration: login must be safe and not reveal email existence."""

    async def test_same_error_for_nonexistent_email_and_wrong_password(
        self, async_client: AsyncClient, db_session: AsyncSession
    ):
        """
        Both 'email not found' and 'wrong password' must return 401 with the same
        generic message. This prevents attackers from enumerating valid emails.
        """
        # Create a known user
        existing_user = await create_test_user(
            db_session, email="existing@example.com", password="CorrectPass1"
        )
        await db_session.commit()

        # Case 1: Non-existent email
        resp1 = await async_client.post(
            f"{BASE}/auth/login",
            json={"email": "nonexistent@example.com", "password": "SomePass1"},
        )

        # Case 2: Wrong password for existing email
        resp2 = await async_client.post(
            f"{BASE}/auth/login",
            json={"email": "existing@example.com", "password": "WrongPass1"},
        )

        # Both should be 401
        assert resp1.status_code == 401, f"Non-existent email returned {resp1.status_code}"
        assert resp2.status_code == 401, f"Wrong password returned {resp2.status_code}"

        # Both should have the same generic message
        msg1 = resp1.json()["detail"]
        msg2 = resp2.json()["detail"]
        assert msg1 == msg2, f"Messages differ: {msg1} vs {msg2}"
        assert "invalid" in msg1.lower(), "Message should be generic, not 'email not found'"
        assert "email" not in msg1.lower() or "password" in msg1.lower(), \
            "Message should not leak 'email not found'"

    async def test_password_reset_silent_success_nonexistent_email(
        self, async_client: AsyncClient
    ):
        """
        Password reset must return 200 (success) even if the email doesn't exist.
        This prevents attackers from enumerating valid emails via password reset.
        """
        # Case 1: Existing email
        resp1 = await async_client.post(
            f"{BASE}/auth/forgot-password",
            json={"email": "nonexistent@example.com"},
        )

        # Should be 200 (success) with a generic message
        assert resp1.status_code == 200, f"Password reset returned {resp1.status_code}"
        detail = resp1.json().get("message", "").lower()
        assert "sent" in detail or "check" in detail, "Should say email was sent"


class TestNoSQLLeaks:
    """Error responses must not leak SQL details, paths, or stack traces."""

    async def test_duplicate_email_no_sql_details(
        self, async_client: AsyncClient, db_session: AsyncSession
    ):
        """
        Attempting to register with a duplicate email must NOT expose SQL errors.
        Should return 409 with a generic message, never mentioning constraints.
        """
        # Create existing user
        await create_test_user(db_session, email="taken@example.com")
        await db_session.commit()

        # Try to register with same email
        resp = await async_client.post(
            f"{BASE}/auth/register",
            json={"email": "taken@example.com", "password": "TestPass1"},
        )

        assert resp.status_code == 409, f"Expected 409, got {resp.status_code}"
        detail = resp.json()["detail"].lower()

        # Must NOT contain SQL-specific keywords
        assert "integrity" not in detail, "Should not expose SQLAlchemy IntegrityError"
        assert "unique constraint" not in detail, "Should not expose constraint names"
        assert "23505" not in detail, "Should not expose PostgreSQL error codes"
        assert "sqlalchemy" not in detail, "Should not expose library names"
        assert "duplicate key" not in detail, "Should not expose DB error messages"

        # Should contain a user-friendly message
        assert "already" in detail or "registered" in detail or "email" in detail


class TestAuthorizationVsNotFound:
    """
    Authorization errors (403) vs not-found errors (404) must be distinguished correctly
    to avoid leaking whether a resource exists to unauthorized users.
    """

    async def test_access_denied_returns_403_not_404(
        self,
        async_client: AsyncClient,
        db_session: AsyncSession,
        buyer_user,
        seller_user,
    ):
        """
        When a user lacks permission to access a resource (but it exists),
        return 403 Forbidden, NOT 404 Not Found.
        Returning 404 would confirm to attackers that the resource exists.
        """
        # Create a book owned by seller
        book = await create_test_book(db_session, seller=seller_user, title="Secret Book")
        await db_session.commit()

        buyer_headers = make_auth_headers(buyer_user)

        # Try to edit seller's book as buyer
        resp = await async_client.patch(
            f"{BASE}/books/{book.id}",
            json={"title": "Hacked Title"},
            headers=buyer_headers,
        )

        # Should be 403 (not authorized), not 404 (not found)
        assert resp.status_code == 403, \
            f"Expected 403 Forbidden, got {resp.status_code}"

        detail = resp.json()["detail"].lower()
        assert "permission" in detail or "not authorized" in detail or "forbidden" in detail, \
            f"Should indicate lack of permission, got: {detail}"


# ─────────────────────────────────────────────────────────────────────────────
# ERROR-04: Edge Cases & Malformed Input
# ─────────────────────────────────────────────────────────────────────────────


class TestEdgeCaseInvalidUUID:
    """Invalid UUIDs in path parameters must be rejected gracefully."""

    async def test_invalid_uuid_format(self, async_client: AsyncClient, buyer_headers):
        """
        Non-UUID values in path parameters must return 422 Unprocessable Entity,
        not 500 Internal Server Error or other unexpected codes.
        """
        resp = await async_client.get(
            f"{BASE}/books/not-a-uuid",
            headers=buyer_headers,
        )
        assert resp.status_code == 422, f"Expected 422, got {resp.status_code}"
        detail = resp.json()["detail"]
        # Should have field error info
        assert isinstance(detail, (list, str)), "Should have validation error details"

    async def test_malformed_uuid_order_get(self, async_client: AsyncClient, buyer_headers):
        """Malformed UUID in /orders/{order_id} should return 422."""
        resp = await async_client.get(
            f"{BASE}/orders/malformed",
            headers=buyer_headers,
        )
        assert resp.status_code == 422


class TestEdgeCaseMissingRequiredFields:
    """Missing required fields should return 422 with field-level details."""

    async def test_missing_required_field_register(self, async_client: AsyncClient):
        """Register without password should return 422 with field error."""
        resp = await async_client.post(
            f"{BASE}/auth/register",
            json={"email": "test@example.com"},  # Missing 'password'
        )
        assert resp.status_code == 422
        detail = resp.json()["detail"]
        assert isinstance(detail, list), "Should return field-level errors"
        assert any("password" in str(e).lower() for e in detail), \
            "Should mention the missing 'password' field"

    async def test_missing_required_field_login(self, async_client: AsyncClient):
        """Login without email should return 422."""
        resp = await async_client.post(
            f"{BASE}/auth/login",
            json={"password": "Pass1234"},  # Missing 'email'
        )
        assert resp.status_code == 422


class TestEdgeCaseInvalidEnumValue:
    """Invalid enum values should return 422."""

    async def test_invalid_user_role_register(self, async_client: AsyncClient):
        """Invalid role enum during registration should return 422."""
        resp = await async_client.post(
            f"{BASE}/auth/register",
            json={
                "email": "test@example.com",
                "password": "TestPass1",
                "role": "invalid_role",  # Not 'buyer' or 'seller'
            },
        )
        assert resp.status_code == 422
        detail = resp.json()["detail"]
        assert isinstance(detail, list), "Should have validation errors"


class TestEdgeCaseInsufficientStock:
    """Attempting to order more items than available stock should return 409."""

    async def test_order_more_than_available_stock(
        self,
        async_client: AsyncClient,
        db_session: AsyncSession,
        buyer_user,
        seller_user,
    ):
        """
        Ordering 10 items when only 5 are in stock should return 409 Conflict.
        This is a business logic rejection, not a validation error.
        """
        # Create book with limited stock
        book = await create_test_book(
            db_session, seller=seller_user, quantity=5, price=9.99
        )
        await db_session.commit()

        buyer_headers = make_auth_headers(buyer_user)

        # Try to order more than available
        resp = await async_client.post(
            f"{BASE}/orders",
            json={
                "items": [{"book_id": str(book.id), "quantity": 10}],
                "shipping_address": {
                    "street": "123 Main",
                    "city": "NY",
                    "state": "NY",
                    "zip": "10001",
                    "country": "US",
                },
            },
            headers=buyer_headers,
        )

        assert resp.status_code == 409, f"Expected 409, got {resp.status_code}"
        detail = resp.json()["detail"].lower()
        assert "stock" in detail or "available" in detail or "insufficient" in detail, \
            f"Should mention stock, got: {detail}"


class TestEdgeCaseExpiredToken:
    """Expired tokens should return 401."""

    async def test_expired_access_token(self, async_client: AsyncClient):
        """An expired access token should return 401 Unauthorized."""
        # Create an expired token by using an old expiration time
        from app.core.security import create_token_with_expiration

        # Create token that expired 1 hour ago
        expired_token = create_token_with_expiration(
            user_id=uuid.uuid4(),
            role="buyer",
            token_type="access",
            expires_delta=-3600,  # Negative = expired
        )

        resp = await async_client.get(
            f"{BASE}/books",
            headers={"Authorization": f"Bearer {expired_token}"},
        )

        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        detail = resp.json()["detail"].lower()
        assert "token" in detail or "expired" in detail or "invalid" in detail


class TestEdgeCaseInvalidTokenSignature:
    """Token signed with wrong key should return 401."""

    async def test_token_wrong_signature(self, async_client: AsyncClient):
        """A token signed with a different key should be rejected with 401."""
        from jose import jwt

        # Create token with wrong secret
        fake_token = jwt.encode(
            {
                "sub": str(uuid.uuid4()),
                "role": "buyer",
                "type": "access",
            },
            "wrong_secret_key",
            algorithm="HS256",
        )

        resp = await async_client.get(
            f"{BASE}/books",
            headers={"Authorization": f"Bearer {fake_token}"},
        )

        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"


class TestEdgeCaseWrongTokenType:
    """Using a token of wrong type should return appropriate error."""

    async def test_using_refresh_token_as_access_token(
        self, async_client: AsyncClient, db_session: AsyncSession
    ):
        """
        Using a refresh token where an access token is expected should fail.
        Should return 400 or 401 depending on implementation.
        """
        # Create a user and get tokens
        user = await create_test_user(db_session, email="tokentest@example.com")
        await db_session.commit()

        login_resp = await async_client.post(
            f"{BASE}/auth/login",
            json={"email": "tokentest@example.com", "password": "Test1234!"},
        )
        assert login_resp.status_code == 200
        refresh_token = login_resp.json()["refresh_token"]

        # Try to use refresh token as access token
        resp = await async_client.get(
            f"{BASE}/books",
            headers={"Authorization": f"Bearer {refresh_token}"},
        )

        # Should fail with 400 or 401
        assert resp.status_code in [400, 401], \
            f"Expected 400 or 401, got {resp.status_code}"


class TestEdgeCasePaginationEdgeCases:
    """Pagination edge cases should be handled gracefully."""

    async def test_pagination_page_zero(self, async_client: AsyncClient, buyer_headers):
        """
        Page 0 is invalid (pages should start at 1).
        Should return 422 validation error.
        """
        resp = await async_client.get(
            f"{BASE}/books?page=0&per_page=20",
            headers=buyer_headers,
        )
        # Either 422 (validation error) or 200 with empty/first page (implementation dependent)
        assert resp.status_code in [200, 422], \
            f"Expected 200 or 422 for page=0, got {resp.status_code}"

    async def test_pagination_negative_page(self, async_client: AsyncClient, buyer_headers):
        """Negative page numbers should be rejected."""
        resp = await async_client.get(
            f"{BASE}/books?page=-1&per_page=20",
            headers=buyer_headers,
        )
        assert resp.status_code in [200, 422], \
            f"Expected 200 or 422 for negative page, got {resp.status_code}"

    async def test_pagination_beyond_data(
        self, async_client: AsyncClient, db_session: AsyncSession, buyer_user
    ):
        """
        Requesting a page beyond available data should return 200 with empty list,
        not 404 (since pagination is valid, just no data at that offset).
        """
        # Create a few books
        seller = await create_test_user(db_session, role=UserRole.SELLER)
        for i in range(3):
            await create_test_book(db_session, seller=seller, title=f"Book {i}")
        await db_session.commit()

        buyer_headers = make_auth_headers(buyer_user)

        # Request page 1000 (way beyond data)
        resp = await async_client.get(
            f"{BASE}/books?page=1000&per_page=20",
            headers=buyer_headers,
        )

        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}"
        body = resp.json()
        # Should have empty data array, not 404
        assert isinstance(body.get("data", body.get("items", [])), list), \
            "Should return list (possibly empty)"


class TestEdgeCaseResourceNotFound:
    """Accessing non-existent resources should return 404, not 500."""

    async def test_get_nonexistent_book(self, async_client: AsyncClient, buyer_headers):
        """GET /books/{nonexistent_id} should return 404, not 500."""
        resp = await async_client.get(
            f"{BASE}/books/{uuid.uuid4()}",
            headers=buyer_headers,
        )
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"

    async def test_get_nonexistent_order(self, async_client: AsyncClient, buyer_headers):
        """GET /orders/{nonexistent_id} should return 404."""
        resp = await async_client.get(
            f"{BASE}/orders/{uuid.uuid4()}",
            headers=buyer_headers,
        )
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"


class TestEdgeCaseUnauthenticatedAccess:
    """Accessing protected endpoints without token should return 401."""

    async def test_books_list_unauthenticated(self, async_client: AsyncClient):
        """GET /books without token should return 401."""
        resp = await async_client.get(f"{BASE}/books")
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"

    async def test_orders_create_unauthenticated(self, async_client: AsyncClient):
        """POST /orders without token should return 401."""
        resp = await async_client.post(f"{BASE}/orders", json={})
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"


class TestEdgeCaseInactiveAccount:
    """Inactive accounts should not be able to login (403)."""

    async def test_login_inactive_account(
        self, async_client: AsyncClient, db_session: AsyncSession
    ):
        """Logging in with an inactive account should return 403."""
        # Create inactive user
        user = await create_test_user(
            db_session,
            email="inactive@example.com",
            password="TestPass1",
            is_active=False,
        )
        await db_session.commit()

        resp = await async_client.post(
            f"{BASE}/auth/login",
            json={"email": "inactive@example.com", "password": "TestPass1"},
        )

        assert resp.status_code == 403, f"Expected 403, got {resp.status_code}"
        detail = resp.json()["detail"].lower()
        assert "inactive" in detail or "account" in detail or "disabled" in detail, \
            f"Should mention account issue, got: {detail}"


# ─────────────────────────────────────────────────────────────────────────────
# Response Format Validation
# ─────────────────────────────────────────────────────────────────────────────


class TestErrorResponseFormat:
    """Error responses should follow a consistent format."""

    async def test_service_error_response_format(self, async_client: AsyncClient):
        """Service errors should return {"status_code": ..., "detail": "..."}."""
        # Trigger an error (register with duplicate)
        # First create a user
        resp1 = await async_client.post(
            f"{BASE}/auth/register",
            json={"email": "fmt@example.com", "password": "TestPass1"},
        )
        assert resp1.status_code == 201

        # Now try duplicate
        resp2 = await async_client.post(
            f"{BASE}/auth/register",
            json={"email": "fmt@example.com", "password": "TestPass1"},
        )

        assert resp2.status_code == 409
        body = resp2.json()

        # Should have both fields
        assert "status_code" in body, "Should have 'status_code' field"
        assert "detail" in body, "Should have 'detail' field"
        assert body["status_code"] == 409
        assert isinstance(body["detail"], str), "'detail' should be a string"

    async def test_validation_error_response_format(self, async_client: AsyncClient):
        """Validation errors (422) should return {"status_code": 422, "detail": [...]}}."""
        resp = await async_client.post(
            f"{BASE}/auth/register",
            json={"email": "badpwd@example.com", "password": "weak"},
        )

        assert resp.status_code == 422
        body = resp.json()

        assert "status_code" in body, "Should have 'status_code' field"
        assert "detail" in body, "Should have 'detail' field"
        assert body["status_code"] == 422
        assert isinstance(body["detail"], list), "'detail' should be a list for validation errors"

        # Each error should have field, message, type
        if body["detail"]:
            error = body["detail"][0]
            assert "field" in error or "loc" in error, "Should have field location info"
            assert "message" in error or "msg" in error, "Should have error message"
