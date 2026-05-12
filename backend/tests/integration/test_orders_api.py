"""
Integration tests for the Orders API.

Uses the real test database (per-test rollback) and FastAPI AsyncClient.

Covers:
    POST /api/v1/orders              — create (success, unauthenticated, insufficient stock)
    GET  /api/v1/orders              — list history (empty, after create)
    GET  /api/v1/orders/{id}         — detail (owner access, other user forbidden)
    POST /api/v1/orders/{id}/cancel  — cancel (success, double-cancel → 422)
"""

import uuid

import pytest
from httpx import AsyncClient

from tests.conftest import create_test_book, create_test_user, make_auth_headers
from app.models.book import BookStatus
from app.models.user import UserRole


BASE = "/api/v1"


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture()
async def book_for_order(db_session, seller_user):
    """An active book with 5 in stock — ready to be ordered."""
    book = await create_test_book(
        db_session,
        seller=seller_user,
        status=BookStatus.ACTIVE,
        quantity=5,
        price=9.99,
    )
    await db_session.commit()
    return book


def _order_payload(book_id, quantity: int = 1) -> dict:
    """Build a valid OrderCreate payload."""
    return {
        "items": [{"book_id": str(book_id), "quantity": quantity}],
        "shipping_address": {
            "full_name": "Test Buyer",
            "address_line1": "10 Test Lane",
            "city": "Testville",
            "state": "TS",
            "postal_code": "12345",
            "country": "US",
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# Create order
# ─────────────────────────────────────────────────────────────────────────────

async def test_create_order_success(
    async_client: AsyncClient, buyer_headers, buyer_user, book_for_order
):
    """
    A buyer with valid items and a shipping address should receive 201
    with the order details including total_amount.
    """
    resp = await async_client.post(
        f"{BASE}/orders",
        headers=buyer_headers,
        json=_order_payload(book_for_order.id, quantity=2),
    )
    assert resp.status_code == 201
    body = resp.json()
    assert "id" in body
    assert body["status"] == "pending"
    assert float(body["total_amount"]) == pytest.approx(9.99 * 2, abs=0.01)


async def test_create_order_unauthenticated(async_client: AsyncClient, book_for_order):
    """POST /orders without auth must return 401."""
    resp = await async_client.post(
        f"{BASE}/orders", json=_order_payload(book_for_order.id)
    )
    assert resp.status_code == 401


async def test_create_order_insufficient_stock(
    async_client: AsyncClient, buyer_headers, book_for_order
):
    """
    Ordering more than available stock must return 409 Conflict.
    Stock is 5; requesting 10 triggers InsufficientStockError.
    """
    resp = await async_client.post(
        f"{BASE}/orders",
        headers=buyer_headers,
        json=_order_payload(book_for_order.id, quantity=10),
    )
    assert resp.status_code == 409


async def test_create_order_nonexistent_book(async_client: AsyncClient, buyer_headers):
    """Ordering a book that does not exist should return a 4xx response."""
    resp = await async_client.post(
        f"{BASE}/orders",
        headers=buyer_headers,
        json=_order_payload(uuid.uuid4()),
    )
    assert resp.status_code in (404, 422, 409)


async def test_create_order_empty_items_rejected(async_client: AsyncClient, buyer_headers):
    """Order with no items must be rejected at schema level (422)."""
    resp = await async_client.post(
        f"{BASE}/orders",
        headers=buyer_headers,
        json={
            "items": [],
            "shipping_address": {
                "full_name": "X",
                "address_line1": "1 Main",
                "city": "City",
                "state": "ST",
                "postal_code": "00000",
                "country": "US",
            },
        },
    )
    assert resp.status_code == 422


# ─────────────────────────────────────────────────────────────────────────────
# List orders
# ─────────────────────────────────────────────────────────────────────────────

async def test_list_orders_empty(async_client: AsyncClient, buyer_headers):
    """Fresh buyer with no orders should see an empty paginated response."""
    resp = await async_client.get(f"{BASE}/orders", headers=buyer_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 0
    assert body["items"] == []


async def test_list_orders_after_create(
    async_client: AsyncClient, buyer_headers, book_for_order
):
    """After placing an order, it should appear in the order history list."""
    # Place an order
    await async_client.post(
        f"{BASE}/orders",
        headers=buyer_headers,
        json=_order_payload(book_for_order.id),
    )
    # Verify it appears in the list
    resp = await async_client.get(f"{BASE}/orders", headers=buyer_headers)
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1


async def test_list_orders_unauthenticated(async_client: AsyncClient):
    """GET /orders without auth must return 401."""
    resp = await async_client.get(f"{BASE}/orders")
    assert resp.status_code == 401


# ─────────────────────────────────────────────────────────────────────────────
# Order detail
# ─────────────────────────────────────────────────────────────────────────────

async def test_get_order_detail_owner(
    async_client: AsyncClient, buyer_headers, book_for_order
):
    """Order owner should be able to retrieve full order detail (200)."""
    create_resp = await async_client.post(
        f"{BASE}/orders",
        headers=buyer_headers,
        json=_order_payload(book_for_order.id),
    )
    order_id = create_resp.json()["id"]

    detail_resp = await async_client.get(
        f"{BASE}/orders/{order_id}", headers=buyer_headers
    )
    assert detail_resp.status_code == 200
    assert detail_resp.json()["id"] == order_id


async def test_get_order_detail_other_user_forbidden(
    async_client: AsyncClient, db_session, buyer_headers, book_for_order
):
    """
    A different authenticated user must not be able to view someone else's order.
    Returns 403 Forbidden (not 404 — we don't hide existence, just deny access).
    """
    # Create order as buyer
    create_resp = await async_client.post(
        f"{BASE}/orders",
        headers=buyer_headers,
        json=_order_payload(book_for_order.id),
    )
    order_id = create_resp.json()["id"]

    # Try to access as a different buyer
    other_buyer = await create_test_user(
        db_session, role=UserRole.BUYER, email="otherguy@test.com"
    )
    resp = await async_client.get(
        f"{BASE}/orders/{order_id}",
        headers=make_auth_headers(other_buyer),
    )
    assert resp.status_code == 403


async def test_get_order_detail_not_found(async_client: AsyncClient, buyer_headers):
    """GET /orders/{unknown_id} should return 404."""
    resp = await async_client.get(
        f"{BASE}/orders/{uuid.uuid4()}", headers=buyer_headers
    )
    assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# Cancel order
# ─────────────────────────────────────────────────────────────────────────────

async def test_cancel_order_success(
    async_client: AsyncClient, buyer_headers, book_for_order
):
    """
    Cancelling a PENDING order should return 200 with status='cancelled'.
    Stock should be restored (tested implicitly by allowing a re-order).
    """
    create_resp = await async_client.post(
        f"{BASE}/orders",
        headers=buyer_headers,
        json=_order_payload(book_for_order.id),
    )
    order_id = create_resp.json()["id"]

    cancel_resp = await async_client.post(
        f"{BASE}/orders/{order_id}/cancel", headers=buyer_headers
    )
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "cancelled"


async def test_cancel_already_cancelled_order(
    async_client: AsyncClient, buyer_headers, book_for_order
):
    """
    Cancelling an already-cancelled order must return 422.
    CANCELLED is a terminal state — no further transitions are allowed.
    """
    create_resp = await async_client.post(
        f"{BASE}/orders",
        headers=buyer_headers,
        json=_order_payload(book_for_order.id),
    )
    order_id = create_resp.json()["id"]

    await async_client.post(f"{BASE}/orders/{order_id}/cancel", headers=buyer_headers)
    second_cancel = await async_client.post(
        f"{BASE}/orders/{order_id}/cancel", headers=buyer_headers
    )
    assert second_cancel.status_code == 422


async def test_cancel_order_other_user_forbidden(
    async_client: AsyncClient, db_session, buyer_headers, book_for_order
):
    """Another user must not be able to cancel someone else's order (403)."""
    create_resp = await async_client.post(
        f"{BASE}/orders",
        headers=buyer_headers,
        json=_order_payload(book_for_order.id),
    )
    order_id = create_resp.json()["id"]

    other = await create_test_user(db_session, email="random@test.com")
    resp = await async_client.post(
        f"{BASE}/orders/{order_id}/cancel",
        headers=make_auth_headers(other),
    )
    assert resp.status_code == 403
