"""
Orders API endpoints.

Routes:
    GET  /orders           — Get user's order history (paginated)
    GET  /orders/{id}      — Get order detail
    POST /orders           — Create a new order
    POST /orders/{id}/cancel — Cancel an order
"""

import logging
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request, status

from app.core.dependencies import ActiveUser, DBSession
from app.core.rate_limiter import rate_limit
from app.models.order import OrderStatus
from app.schemas.order import OrderCreate, OrderListResponse, OrderResponse
from app.services import (
    BookNotFoundError,
    InsufficientStockError,
    InvalidStatusTransitionError,
    NotOrderOwnerError,
    OrderNotCancellableError,
    OrderNotFoundError,
    OrderService,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _map_order_exception(exc: Exception) -> HTTPException:
    if isinstance(exc, (OrderNotFoundError, BookNotFoundError)):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    if isinstance(exc, NotOrderOwnerError):
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    if isinstance(exc, InsufficientStockError):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    if isinstance(exc, (InvalidStatusTransitionError, OrderNotCancellableError)):
        return HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        )
    raise exc


# ─────────────────────────────────────────────────────────────────────────────
# Order endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/orders",
    response_model=OrderListResponse,
    summary="Get order history",
    description=(
        "Return the current user's order history, paginated. "
        "Sellers can also use this to see orders containing their books."
    ),
)
@rate_limit(calls=60, period=60)
async def list_orders(
    request: Request,
    current_user: ActiveUser,
    db: DBSession,
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
) -> OrderListResponse:
    """Get the current user's order history."""
    svc = OrderService(db)
    return await svc.get_order_history(
        buyer=current_user,
        page=page,
        page_size=per_page,
    )


@router.get(
    "/orders/{order_id}",
    response_model=OrderResponse,
    summary="Get order detail",
    description=(
        "Retrieve a single order by ID. "
        "Access is restricted to the order owner, relevant sellers, and admins."
    ),
    responses={
        200: {"description": "Order found"},
        403: {"description": "Access denied"},
        404: {"description": "Order not found"},
    },
)
@rate_limit(calls=100, period=60)
async def get_order(
    request: Request,
    order_id: UUID,
    current_user: ActiveUser,
    db: DBSession,
) -> OrderResponse:
    """Get a single order by ID."""
    try:
        svc = OrderService(db)
        return await svc.get_order(order_id=order_id, requestor=current_user)
    except (
        OrderNotFoundError,
        NotOrderOwnerError,
        InsufficientStockError,
        InvalidStatusTransitionError,
        OrderNotCancellableError,
    ) as exc:
        raise _map_order_exception(exc)


@router.post(
    "/orders",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an order",
    description=(
        "Place a new order. Stock levels are checked and decremented atomically. "
        "After creation, proceed to /payments/checkout/{order_id} to pay."
    ),
    responses={
        201: {"description": "Order created"},
        409: {"description": "Insufficient stock"},
        422: {"description": "Validation error"},
    },
)
@rate_limit(calls=10, period=60)
async def create_order(
    request: Request,
    payload: OrderCreate,
    current_user: ActiveUser,
    db: DBSession,
) -> OrderResponse:
    """Create a new order."""
    try:
        svc = OrderService(db)
        return await svc.create_order(buyer=current_user, order_data=payload)
    except (
        BookNotFoundError,
        InsufficientStockError,
        InvalidStatusTransitionError,
        NotOrderOwnerError,
        OrderNotFoundError,
        OrderNotCancellableError,
    ) as exc:
        raise _map_order_exception(exc)


@router.post(
    "/orders/{order_id}/cancel",
    response_model=OrderResponse,
    summary="Cancel an order",
    description=(
        "Cancel a pending order. Only orders in PENDING or PAYMENT_PROCESSING status "
        "can be cancelled. Stock is restored on cancellation."
    ),
    responses={
        200: {"description": "Order cancelled"},
        403: {"description": "Not the order owner"},
        404: {"description": "Order not found"},
        422: {"description": "Order cannot be cancelled in its current status"},
    },
)
@rate_limit(calls=10, period=60)
async def cancel_order(
    request: Request,
    order_id: UUID,
    current_user: ActiveUser,
    db: DBSession,
) -> OrderResponse:
    """Cancel an order by ID."""
    try:
        svc = OrderService(db)
        return await svc.cancel_order(order_id=order_id, requestor=current_user)
    except (
        OrderNotFoundError,
        NotOrderOwnerError,
        OrderNotCancellableError,
        InvalidStatusTransitionError,
        InsufficientStockError,
    ) as exc:
        raise _map_order_exception(exc)
