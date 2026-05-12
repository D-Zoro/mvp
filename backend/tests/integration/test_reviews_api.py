"""
Integration tests for the Reviews API.

Uses the real test database (per-test rollback) and FastAPI AsyncClient.

Covers:
    GET    /api/v1/books/{id}/reviews          — public list
    GET    /api/v1/books/{id}/reviews/stats    — aggregate stats
    POST   /api/v1/books/{id}/reviews          — create (success, duplicate, unauthenticated)
    PUT    /api/v1/reviews/{id}               — update (owner success, non-owner forbidden)
    DELETE /api/v1/reviews/{id}               — delete (owner success, non-owner, not-found)
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
async def reviewed_book(db_session, seller_user):
    """An active book ready to receive reviews."""
    book = await create_test_book(
        db_session, seller=seller_user, status=BookStatus.ACTIVE
    )
    await db_session.commit()
    return book


async def _post_review(client: AsyncClient, book_id, headers: dict, rating: int = 4) -> dict:
    """Helper: create a review and return the response body."""
    resp = await client.post(
        f"{BASE}/books/{book_id}/reviews",
        headers=headers,
        json={"rating": rating, "comment": "Test review comment."},
    )
    return resp


# ─────────────────────────────────────────────────────────────────────────────
# List reviews
# ─────────────────────────────────────────────────────────────────────────────

async def test_list_reviews_public(async_client: AsyncClient, reviewed_book):
    """
    GET /books/{id}/reviews should return 200 with a paginated list
    for unauthenticated users.
    """
    resp = await async_client.get(f"{BASE}/books/{reviewed_book.id}/reviews")
    assert resp.status_code == 200
    body = resp.json()
    assert "items" in body
    assert "total" in body


async def test_list_reviews_with_filters(async_client: AsyncClient, reviewed_book):
    """Query params for filtering reviews should be accepted."""
    resp = await async_client.get(
        f"{BASE}/books/{reviewed_book.id}/reviews?min_rating=3&verified_only=false&page=1&per_page=10"
    )
    assert resp.status_code == 200


# ─────────────────────────────────────────────────────────────────────────────
# Review stats
# ─────────────────────────────────────────────────────────────────────────────

async def test_get_review_stats(async_client: AsyncClient, reviewed_book):
    """
    GET /books/{id}/reviews/stats should return aggregate statistics.
    Even for a book with no reviews, the endpoint must return 200 with zeros.
    """
    resp = await async_client.get(f"{BASE}/books/{reviewed_book.id}/reviews/stats")
    assert resp.status_code == 200
    body = resp.json()
    assert "total_reviews" in body
    assert "average_rating" in body
    assert "rating_distribution" in body


# ─────────────────────────────────────────────────────────────────────────────
# Create review
# ─────────────────────────────────────────────────────────────────────────────

async def test_create_review_success(
    async_client: AsyncClient, buyer_headers, reviewed_book
):
    """
    An authenticated user posting a valid review should receive 201.
    The response must include the review ID, rating, and is_verified_purchase.
    """
    resp = await _post_review(async_client, reviewed_book.id, buyer_headers, rating=5)
    assert resp.status_code == 201
    body = resp.json()
    assert body["rating"] == 5
    assert "id" in body
    assert "is_verified_purchase" in body


async def test_create_review_unauthenticated(async_client: AsyncClient, reviewed_book):
    """POST /books/{id}/reviews without auth must return 401."""
    resp = await _post_review(async_client, reviewed_book.id, {}, rating=3)
    assert resp.status_code == 401


async def test_create_review_invalid_rating_too_high(
    async_client: AsyncClient, buyer_headers, reviewed_book
):
    """Rating of 6 must be rejected at schema level (422)."""
    resp = await async_client.post(
        f"{BASE}/books/{reviewed_book.id}/reviews",
        headers=buyer_headers,
        json={"rating": 6},
    )
    assert resp.status_code == 422


async def test_create_review_invalid_rating_zero(
    async_client: AsyncClient, buyer_headers, reviewed_book
):
    """Rating of 0 must be rejected at schema level (422)."""
    resp = await async_client.post(
        f"{BASE}/books/{reviewed_book.id}/reviews",
        headers=buyer_headers,
        json={"rating": 0},
    )
    assert resp.status_code == 422


async def test_create_duplicate_review_rejected(
    async_client: AsyncClient, buyer_headers, reviewed_book
):
    """
    Submitting a second review for the same book must return 409 Conflict.
    Each user can only review each book once.
    """
    await _post_review(async_client, reviewed_book.id, buyer_headers, rating=4)
    duplicate = await _post_review(async_client, reviewed_book.id, buyer_headers, rating=3)
    assert duplicate.status_code == 409


# ─────────────────────────────────────────────────────────────────────────────
# Update review
# ─────────────────────────────────────────────────────────────────────────────

async def test_update_review_owner_success(
    async_client: AsyncClient, buyer_headers, reviewed_book
):
    """
    Review owner can update rating and comment via PUT /reviews/{id}.
    Returns 200 with the updated data.
    """
    create_resp = await _post_review(async_client, reviewed_book.id, buyer_headers, rating=3)
    review_id = create_resp.json()["id"]

    update_resp = await async_client.put(
        f"{BASE}/reviews/{review_id}",
        headers=buyer_headers,
        json={"rating": 5, "comment": "Changed my mind — great book!"},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["rating"] == 5
    assert update_resp.json()["comment"] == "Changed my mind — great book!"


async def test_update_review_non_owner_forbidden(
    async_client: AsyncClient, db_session, buyer_headers, reviewed_book
):
    """
    A different user must receive 403 when trying to edit someone else's review.
    """
    create_resp = await _post_review(async_client, reviewed_book.id, buyer_headers, rating=4)
    review_id = create_resp.json()["id"]

    other = await create_test_user(db_session, email="other@test.com")
    resp = await async_client.put(
        f"{BASE}/reviews/{review_id}",
        headers=make_auth_headers(other),
        json={"rating": 1, "comment": "Vandalism attempt"},
    )
    assert resp.status_code == 403


async def test_update_review_not_found(async_client: AsyncClient, buyer_headers):
    """PUT /reviews/{unknown_id} should return 404."""
    resp = await async_client.put(
        f"{BASE}/reviews/{uuid.uuid4()}",
        headers=buyer_headers,
        json={"rating": 3},
    )
    assert resp.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# Delete review
# ─────────────────────────────────────────────────────────────────────────────

async def test_delete_review_owner_success(
    async_client: AsyncClient, buyer_headers, reviewed_book
):
    """Review owner deleting their own review should return 204 No Content."""
    create_resp = await _post_review(async_client, reviewed_book.id, buyer_headers, rating=2)
    review_id = create_resp.json()["id"]

    delete_resp = await async_client.delete(
        f"{BASE}/reviews/{review_id}", headers=buyer_headers
    )
    assert delete_resp.status_code == 204


async def test_delete_review_non_owner_forbidden(
    async_client: AsyncClient, db_session, buyer_headers, reviewed_book
):
    """Non-owner attempting to delete someone else's review must receive 403."""
    create_resp = await _post_review(async_client, reviewed_book.id, buyer_headers, rating=5)
    review_id = create_resp.json()["id"]

    intruder = await create_test_user(db_session, email="intruder@test.com")
    resp = await async_client.delete(
        f"{BASE}/reviews/{review_id}", headers=make_auth_headers(intruder)
    )
    assert resp.status_code == 403


async def test_delete_review_not_found(async_client: AsyncClient, buyer_headers):
    """DELETE /reviews/{unknown_id} should return 404."""
    resp = await async_client.delete(
        f"{BASE}/reviews/{uuid.uuid4()}", headers=buyer_headers
    )
    assert resp.status_code == 404
