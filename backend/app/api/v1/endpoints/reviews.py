"""
Reviews API endpoints.

Routes:
    GET    /books/{id}/reviews   — List reviews + stats for a book
    POST   /books/{id}/reviews   — Create a review
    PUT    /reviews/{id}         — Update own review
    DELETE /reviews/{id}         — Delete own review

Note: ReviewService was not built in Step 2.6, so this endpoint uses
ReviewRepository directly — keeping the business logic inline and minimal.
"""

import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request, status

from app.core.dependencies import ActiveUser, DBSession, OptionalUser
from app.core.rate_limiter import rate_limit
from app.models.user import UserRole
from app.repositories.review import ReviewRepository
from app.schemas.review import (
    ReviewCreate,
    ReviewListResponse,
    ReviewResponse,
    ReviewStats,
    ReviewUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Book reviews
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/books/{book_id}/reviews",
    response_model=ReviewListResponse,
    summary="Get book reviews",
    description=(
        "List reviews for a book with optional filters. "
        "Also includes aggregate stats (average rating, distribution) in the response."
    ),
)
@rate_limit(calls=100, period=60)
async def list_reviews(
    request: Request,
    book_id: UUID,
    db: DBSession,
    current_user: OptionalUser,
    min_rating: Optional[int] = Query(None, ge=1, le=5, description="Minimum rating"),
    verified_only: bool = Query(False, description="Only verified purchase reviews"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
) -> ReviewListResponse:
    """List all reviews for a book with pagination."""
    repo = ReviewRepository(db)
    skip = (page - 1) * per_page

    reviews = await repo.get_by_book(
        book_id,
        skip=skip,
        limit=per_page,
        min_rating=min_rating,
        verified_only=verified_only,
    )
    total = await repo.count_by_book(book_id, verified_only=verified_only)
    items = [ReviewResponse.model_validate(r) for r in reviews]

    return ReviewListResponse.create(items=items, total=total, page=page, page_size=per_page)


@router.post(
    "/books/{book_id}/reviews",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a book review",
    description=(
        "Leave a review for a book. "
        "A verified purchase badge is automatically added if you purchased the book. "
        "You can only submit one review per book."
    ),
    responses={
        201: {"description": "Review created"},
        409: {"description": "You have already reviewed this book"},
        401: {"description": "Not authenticated"},
    },
)
@rate_limit(calls=10, period=60)
async def create_review(
    request: Request,
    book_id: UUID,
    payload: ReviewCreate,
    current_user: ActiveUser,
    db: DBSession,
) -> ReviewResponse:
    """Create a review for a book."""
    repo = ReviewRepository(db)

    # Prevent duplicate reviews
    already_reviewed = await repo.has_reviewed(current_user.id, book_id)
    if already_reviewed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already reviewed this book.",
        )

    review = await repo.create_review(
        book_id=book_id,
        user_id=current_user.id,
        rating=payload.rating,
        comment=payload.comment,
    )
    await db.commit()
    await db.refresh(review)

    logger.info(
        "Review created: id=%s book=%s user=%s rating=%s",
        review.id, book_id, current_user.id, payload.rating,
    )
    return ReviewResponse.model_validate(review)


# ─────────────────────────────────────────────────────────────────────────────
# Individual review operations
# ─────────────────────────────────────────────────────────────────────────────

@router.put(
    "/reviews/{review_id}",
    response_model=ReviewResponse,
    summary="Update a review",
    description="Update your own review's rating and/or comment.",
    responses={
        200: {"description": "Review updated"},
        403: {"description": "Not your review"},
        404: {"description": "Review not found"},
    },
)
@rate_limit(calls=10, period=60)
async def update_review(
    request: Request,
    review_id: UUID,
    payload: ReviewUpdate,
    current_user: ActiveUser,
    db: DBSession,
) -> ReviewResponse:
    """Update an existing review."""
    repo = ReviewRepository(db)

    review = await repo.get_with_user(review_id)
    if review is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Review '{review_id}' not found.",
        )

    # Only the reviewer or an admin may edit
    if review.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own reviews.",
        )

    # Apply partial update
    if payload.rating is not None:
        review.rating = payload.rating
    if payload.comment is not None:
        review.comment = payload.comment
    review.updated_at = datetime.now(timezone.utc)

    db.add(review)
    await db.commit()
    await db.refresh(review)

    logger.info("Review updated: id=%s by user=%s", review_id, current_user.id)
    return ReviewResponse.model_validate(review)


@router.delete(
    "/reviews/{review_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a review",
    description="Delete your own review. Admins can delete any review.",
    responses={
        204: {"description": "Review deleted"},
        403: {"description": "Not your review"},
        404: {"description": "Review not found"},
    },
)
@rate_limit(calls=10, period=60)
async def delete_review(
    request: Request,
    review_id: UUID,
    current_user: ActiveUser,
    db: DBSession,
) -> None:
    """Soft-delete a review."""
    repo = ReviewRepository(db)

    review = await repo.get_with_user(review_id)
    if review is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Review '{review_id}' not found.",
        )

    if review.user_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own reviews.",
        )

    await repo.delete(review_id)
    await db.commit()

    logger.info("Review deleted: id=%s by user=%s", review_id, current_user.id)


# ─────────────────────────────────────────────────────────────────────────────
# Review stats (bonus endpoint)
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/books/{book_id}/reviews/stats",
    response_model=ReviewStats,
    summary="Get review stats for a book",
    description="Return aggregate review statistics: average rating, distribution, and verified count.",
)
@rate_limit(calls=100, period=60)
async def get_review_stats(
    request: Request,
    book_id: UUID,
    db: DBSession,
) -> ReviewStats:
    """Get review statistics for a book."""
    repo = ReviewRepository(db)
    stats_data = await repo.get_book_stats(book_id)
    return ReviewStats(**stats_data)
