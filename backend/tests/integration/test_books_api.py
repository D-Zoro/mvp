"""
Integration tests for the Books API.

Uses the real test database (per-test rollback) and FastAPI AsyncClient.

Covers:
    GET    /api/v1/books              — public listing / search
    GET    /api/v1/books/categories   — public category list
    GET    /api/v1/books/my-listings  — seller-only
    GET    /api/v1/books/{id}         — book detail
    POST   /api/v1/books              — seller create
    PUT    /api/v1/books/{id}         — owner update
    POST   /api/v1/books/{id}/publish — draft → active
    DELETE /api/v1/books/{id}         — soft delete
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
async def active_book(db_session, seller_user):
    """A persisted, active book listing owned by the seller fixture."""
    book = await create_test_book(
        db_session, seller=seller_user, status=BookStatus.ACTIVE
    )
    await db_session.commit()
    return book


@pytest.fixture()
async def draft_book(db_session, seller_user):
    """A persisted draft (not yet published) book owned by the seller fixture."""
    book = await create_test_book(
        db_session, seller=seller_user, status=BookStatus.DRAFT
    )
    await db_session.commit()
    return book


# ─────────────────────────────────────────────────────────────────────────────
# Listing / search
# ─────────────────────────────────────────────────────────────────────────────

async def test_list_books_public(async_client: AsyncClient, active_book):
    """
    GET /books should return 200 and a paginated book list for unauthenticated users.
    Books4All allows browsing without an account.
    """
    resp = await async_client.get(f"{BASE}/books")
    assert resp.status_code == 200
    body = resp.json()
    assert "items" in body
    assert "total" in body


async def test_list_books_pagination_params(async_client: AsyncClient, active_book):
    """Pagination query params should be accepted without error."""
    resp = await async_client.get(f"{BASE}/books?page=1&per_page=5")
    assert resp.status_code == 200


async def test_list_categories_public(async_client: AsyncClient):
    """GET /books/categories should return 200 with a list (possibly empty)."""
    resp = await async_client.get(f"{BASE}/books/categories")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


# ─────────────────────────────────────────────────────────────────────────────
# Book detail
# ─────────────────────────────────────────────────────────────────────────────

async def test_get_book_found(async_client: AsyncClient, active_book):
    """GET /books/{id} for an existing book should return 200 with data."""
    resp = await async_client.get(f"{BASE}/books/{active_book.id}")
    assert resp.status_code == 200
    body = resp.json()
    assert body["id"] == str(active_book.id)
    assert body["title"] == active_book.title


async def test_get_book_not_found(async_client: AsyncClient):
    """GET /books/{id} for a non-existent UUID should return 404."""
    resp = await async_client.get(f"{BASE}/books/{uuid.uuid4()}")
    assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# My listings (seller-only)
# ─────────────────────────────────────────────────────────────────────────────

async def test_my_listings_seller(async_client: AsyncClient, seller_user, seller_headers, active_book):
    """
    GET /books/my-listings as a seller should return their own books.
    Validates that the static route is resolved before the /{book_id} param route.
    """
    resp = await async_client.get(f"{BASE}/books/my-listings", headers=seller_headers)
    assert resp.status_code == 200
    body = resp.json()
    ids = [item["id"] for item in body["items"]]
    assert str(active_book.id) in ids


async def test_my_listings_buyer_forbidden(async_client: AsyncClient, buyer_headers):
    """Buyers must receive 403 when accessing seller-only /my-listings."""
    resp = await async_client.get(f"{BASE}/books/my-listings", headers=buyer_headers)
    assert resp.status_code == 403


async def test_my_listings_unauthenticated(async_client: AsyncClient):
    """Unauthenticated request to /books/my-listings must return 401."""
    resp = await async_client.get(f"{BASE}/books/my-listings")
    assert resp.status_code == 401


# ─────────────────────────────────────────────────────────────────────────────
# Create book
# ─────────────────────────────────────────────────────────────────────────────

async def test_create_book_seller_success(async_client: AsyncClient, seller_headers):
    """
    POST /books by a seller should create a book and return 201 with the book data.
    Books are created as DRAFT by default.
    """
    resp = await async_client.post(
        f"{BASE}/books",
        headers=seller_headers,
        json={
            "title": "Python Tricks",
            "author": "Dan Bader",
            "condition": "good",
            "price": 14.99,
            "quantity": 2,
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["title"] == "Python Tricks"
    assert "id" in body


async def test_create_book_buyer_forbidden(async_client: AsyncClient, buyer_headers):
    """
    Buyers must receive 403 when trying to create a listing.
    Only sellers and admins can create books.
    """
    resp = await async_client.post(
        f"{BASE}/books",
        headers=buyer_headers,
        json={
            "title": "A Book",
            "author": "Someone",
            "condition": "good",
            "price": 9.99,
            "quantity": 1,
        },
    )
    assert resp.status_code == 403


async def test_create_book_unauthenticated(async_client: AsyncClient):
    """POST /books without auth must return 401."""
    resp = await async_client.post(
        f"{BASE}/books",
        json={"title": "X", "author": "Y", "condition": "good", "price": 1.0, "quantity": 1},
    )
    assert resp.status_code == 401


async def test_create_book_invalid_zero_price(async_client: AsyncClient, seller_headers):
    """POST /books with price=0 must return 422 (schema validation)."""
    resp = await async_client.post(
        f"{BASE}/books",
        headers=seller_headers,
        json={"title": "Free", "author": "A", "condition": "good", "price": 0, "quantity": 1},
    )
    assert resp.status_code == 422


# ─────────────────────────────────────────────────────────────────────────────
# Update book
# ─────────────────────────────────────────────────────────────────────────────

async def test_update_book_owner_success(async_client: AsyncClient, seller_user, seller_headers, active_book):
    """Owner can update their book's title and price."""
    resp = await async_client.put(
        f"{BASE}/books/{active_book.id}",
        headers=seller_headers,
        json={"title": "Updated Title", "price": 19.99},
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated Title"


async def test_update_book_non_owner_forbidden(async_client: AsyncClient, db_session, active_book):
    """
    A different seller attempting to update another's book must receive 403.
    Ownership is verified in the service layer.
    """
    other_seller = await create_test_user(
        db_session, role=UserRole.SELLER, email="other_seller@test.com"
    )
    other_headers = make_auth_headers(other_seller)

    resp = await async_client.put(
        f"{BASE}/books/{active_book.id}",
        headers=other_headers,
        json={"title": "Stolen Title"},
    )
    assert resp.status_code == 403


async def test_update_book_not_found(async_client: AsyncClient, seller_headers):
    """PUT /books/{unknown_id} should return 404."""
    resp = await async_client.put(
        f"{BASE}/books/{uuid.uuid4()}",
        headers=seller_headers,
        json={"price": 5.00},
    )
    assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# Publish
# ─────────────────────────────────────────────────────────────────────────────

async def test_publish_book_success(async_client: AsyncClient, seller_headers, draft_book):
    """
    POST /books/{id}/publish on a DRAFT book should change its status to ACTIVE (200).
    """
    resp = await async_client.post(
        f"{BASE}/books/{draft_book.id}/publish", headers=seller_headers
    )
    assert resp.status_code == 200
    assert resp.json()["status"] == "active"


# ─────────────────────────────────────────────────────────────────────────────
# Delete
# ─────────────────────────────────────────────────────────────────────────────

async def test_delete_book_owner_success(async_client: AsyncClient, seller_headers, active_book):
    """Owner deleting their book should return 204 No Content."""
    resp = await async_client.delete(
        f"{BASE}/books/{active_book.id}", headers=seller_headers
    )
    assert resp.status_code == 204


async def test_delete_book_not_found(async_client: AsyncClient, seller_headers):
    """DELETE /books/{unknown_id} should return 404."""
    resp = await async_client.delete(
        f"{BASE}/books/{uuid.uuid4()}", headers=seller_headers
    )
    assert resp.status_code == 404


async def test_delete_book_non_owner_forbidden(async_client: AsyncClient, db_session, active_book):
    """Another seller cannot delete someone else's book (403)."""
    other = await create_test_user(
        db_session, role=UserRole.SELLER, email="intruder@test.com"
    )
    resp = await async_client.delete(
        f"{BASE}/books/{active_book.id}",
        headers=make_auth_headers(other),
    )
    assert resp.status_code == 403
