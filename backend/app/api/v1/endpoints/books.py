"""
Books API endpoints.

Routes:
    GET    /books                  — Search/list active books
    GET    /books/my-listings      — Get seller's own listings
    GET    /books/categories       — List all categories
    GET    /books/{id}             — Get book detail
    POST   /books                  — Create book listing (seller only)
    PUT    /books/{id}             — Update book listing (owner/admin)
    POST   /books/{id}/publish     — Publish a draft book (owner/admin)
    DELETE /books/{id}             — Soft-delete book (owner/admin)

NOTE: Static paths (my-listings, categories) MUST be declared before
      the parameterised {id} route so FastAPI doesn't treat them as UUIDs.
"""

import logging
from typing import Annotated, Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request, status

from app.core.dependencies import ActiveUser, DBSession, OptionalUser, RequireSeller
from app.core.rate_limiter import rate_limit
from app.models.book import BookCondition, BookStatus
from app.schemas.book import (
    BookCreate,
    BookListResponse,
    BookResponse,
    BookUpdate,
)
from app.services import (
    BookNotFoundError,
    BookService,
    NotBookOwnerError,
    NotSellerError,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _map_book_exception(exc: Exception) -> HTTPException:
    if isinstance(exc, BookNotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    if isinstance(exc, (NotBookOwnerError, NotSellerError)):
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    raise exc


# ─────────────────────────────────────────────────────────────────────────────
# Static routes FIRST (before /{id})
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/books/categories",
    response_model=list[str],
    summary="List book categories",
    description="Return all distinct categories that have active book listings.",
)
@rate_limit(calls=100, period=60)
async def list_categories(request: Request, db: DBSession) -> list[str]:
    """Return all active book categories."""
    svc = BookService(db)
    return await svc.get_categories()


@router.get(
    "/books/my-listings",
    response_model=BookListResponse,
    summary="Get my book listings",
    description="Return the current seller's own book listings, with optional status filter.",
    dependencies=[RequireSeller],
)
@rate_limit(calls=100, period=60)
async def get_my_listings(
    request: Request,
    current_user: ActiveUser,
    db: DBSession,
    status: Optional[BookStatus] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
) -> BookListResponse:
    """Get the authenticated seller's book listings."""
    svc = BookService(db)
    return await svc.get_seller_books(
        seller_id=current_user.id,
        status=status,
        page=page,
        page_size=per_page,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Parameterised routes
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/books",
    response_model=BookListResponse,
    summary="Search and list books",
    description=(
        "Search active book listings with optional filters. "
        "Supports full-text search, category, condition, price range, and pagination."
    ),
)
@rate_limit(calls=100, period=60)
async def list_books(
    request: Request,
    db: DBSession,
    current_user: OptionalUser,
    query: Optional[str] = Query(None, description="Full-text search query"),
    category: Optional[str] = Query(None, description="Filter by category"),
    condition: Optional[BookCondition] = Query(None, description="Filter by condition"),
    min_price: Optional[float] = Query(None, ge=0, description="Minimum price"),
    max_price: Optional[float] = Query(None, ge=0, description="Maximum price"),
    seller_id: Optional[UUID] = Query(None, description="Filter by seller"),
    sort_by: str = Query("created_at", pattern="^(created_at|price|title)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
) -> BookListResponse:
    """List and search books with filters and pagination."""
    svc = BookService(db)
    return await svc.search_books(
        query=query,
        category=category,
        condition=condition,
        min_price=min_price,
        max_price=max_price,
        seller_id=seller_id,
        status=BookStatus.ACTIVE,
        page=page,
        page_size=per_page,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get(
    "/books/{book_id}",
    response_model=BookResponse,
    summary="Get book detail",
    description="Retrieve a single book listing by ID, including seller information.",
    responses={
        200: {"description": "Book found"},
        404: {"description": "Book not found"},
    },
)
@rate_limit(calls=200, period=60)
async def get_book(
    request: Request,
    book_id: UUID,
    db: DBSession,
) -> BookResponse:
    """Get a book by ID."""
    try:
        svc = BookService(db)
        return await svc.get_book(book_id)
    except (BookNotFoundError, NotBookOwnerError, NotSellerError) as exc:
        raise _map_book_exception(exc)


@router.post(
    "/books",
    response_model=BookResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a book listing",
    description="Create a new book listing. Only sellers and admins can create listings.",
    responses={
        201: {"description": "Book created"},
        403: {"description": "Only sellers can create listings"},
        422: {"description": "Validation error"},
    },
    dependencies=[RequireSeller],
)
@rate_limit(calls=30, period=60)
async def create_book(
    request: Request,
    payload: BookCreate,
    current_user: ActiveUser,
    db: DBSession,
) -> BookResponse:
    """Create a new book listing (seller only)."""
    try:
        svc = BookService(db)
        return await svc.create_book(seller=current_user, book_data=payload)
    except (NotSellerError, NotBookOwnerError, BookNotFoundError) as exc:
        raise _map_book_exception(exc)


@router.put(
    "/books/{book_id}",
    response_model=BookResponse,
    summary="Update a book listing",
    description=(
        "Update an existing book listing. "
        "Only the owning seller or an admin may update a listing."
    ),
    responses={
        200: {"description": "Book updated"},
        403: {"description": "Not the owner"},
        404: {"description": "Book not found"},
    },
)
@rate_limit(calls=30, period=60)
async def update_book(
    request: Request,
    book_id: UUID,
    payload: BookUpdate,
    current_user: ActiveUser,
    db: DBSession,
) -> BookResponse:
    """Update a book (owner or admin only)."""
    try:
        svc = BookService(db)
        return await svc.update_book(
            book_id=book_id,
            requestor=current_user,
            updates=payload,
        )
    except (BookNotFoundError, NotBookOwnerError, NotSellerError) as exc:
        raise _map_book_exception(exc)


@router.post(
    "/books/{book_id}/publish",
    response_model=BookResponse,
    summary="Publish a draft book",
    description=(
        "Change a book's status from DRAFT → ACTIVE, making it visible to buyers. "
        "Only the owning seller or an admin can publish."
    ),
    responses={
        200: {"description": "Book published"},
        403: {"description": "Not the owner"},
        404: {"description": "Book not found"},
    },
)
@rate_limit(calls=30, period=60)
async def publish_book(
    request: Request,
    book_id: UUID,
    current_user: ActiveUser,
    db: DBSession,
) -> BookResponse:
    """Publish a draft book listing."""
    try:
        svc = BookService(db)
        return await svc.publish_book(book_id=book_id, requestor=current_user)
    except (BookNotFoundError, NotBookOwnerError, NotSellerError) as exc:
        raise _map_book_exception(exc)


@router.delete(
    "/books/{book_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a book listing",
    description=(
        "Soft-delete a book listing. "
        "Only the owning seller or an admin can delete a listing."
    ),
    responses={
        204: {"description": "Book deleted"},
        403: {"description": "Not the owner"},
        404: {"description": "Book not found"},
    },
)
@rate_limit(calls=10, period=60)
async def delete_book(
    request: Request,
    book_id: UUID,
    current_user: ActiveUser,
    db: DBSession,
) -> None:
    """Soft-delete a book (owner or admin only)."""
    try:
        svc = BookService(db)
        await svc.delete_book(book_id=book_id, requestor=current_user)
    except (BookNotFoundError, NotBookOwnerError, NotSellerError) as exc:
        raise _map_book_exception(exc)
