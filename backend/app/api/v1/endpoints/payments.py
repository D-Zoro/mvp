"""
Payments API endpoints.

Routes:
    POST /payments/checkout/{order_id} — Create Stripe checkout session
    POST /payments/webhook             — Stripe webhook handler

Design notes:
- The webhook endpoint reads the **raw bytes** body before any JSON parsing
  because Stripe signature verification requires the original bytes.
- Stripe errors do NOT leak internal details in responses.
"""

import logging
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Request, status

from app.core.dependencies import ActiveUser, DBSession
from app.core.rate_limiter import rate_limit
from app.schemas.order import CheckoutSession
from app.services import (
    OrderNotFoundError,
    PaymentError,
    PaymentService,
    RefundError,
    StripeWebhookError,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _map_payment_exception(exc: Exception) -> HTTPException:
    if isinstance(exc, OrderNotFoundError):
        return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    if isinstance(exc, (PaymentError, RefundError)):
        return HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=str(exc)
        )
    if isinstance(exc, StripeWebhookError):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    raise exc


# ─────────────────────────────────────────────────────────────────────────────
# Payment endpoints
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/payments/checkout/{order_id}",
    response_model=CheckoutSession,
    summary="Create Stripe checkout session",
    description=(
        "Create a Stripe Checkout Session for a pending order. "
        "Returns a URL to redirect the user to for payment. "
        "The order must be in PENDING or PAYMENT_PROCESSING status."
    ),
    responses={
        200: {"description": "Checkout session created"},
        402: {"description": "Payment error or order not payable"},
        404: {"description": "Order not found"},
    },
)
@rate_limit(calls=10, period=60)
async def create_checkout(
    request: Request,
    order_id: UUID,
    current_user: ActiveUser,
    db: DBSession,
) -> CheckoutSession:
    """Create a Stripe checkout session for an order."""
    try:
        svc = PaymentService(db)
        return await svc.create_stripe_checkout(order_id=order_id)
    except (
        OrderNotFoundError,
        PaymentError,
        RefundError,
        StripeWebhookError,
    ) as exc:
        raise _map_payment_exception(exc)


@router.post(
    "/payments/webhook",
    summary="Stripe webhook handler",
    description=(
        "Receive and process Stripe webhook events. "
        "Stripe-Signature header is required for payload verification. "
        "**Do not call this endpoint directly** — it is for Stripe's use only."
    ),
    status_code=status.HTTP_200_OK,
    include_in_schema=True,  # visible in docs but marked as Stripe-internal
)
async def stripe_webhook(
    request: Request,
    db: DBSession,
    stripe_signature: str = Header(
        ...,
        alias="stripe-signature",
        description="Stripe webhook signature header (Stripe-Signature)",
    ),
) -> dict:
    """
    Handle Stripe webhook events.

    Reads raw bytes from the request body so Stripe signature verification
    works correctly (it requires the exact unmodified payload).
    """
    # Read raw bytes — MUST happen before any other body access
    payload = await request.body()

    try:
        svc = PaymentService(db)
        result = await svc.handle_webhook(
            payload=payload,
            stripe_signature=stripe_signature,
        )
        return {"received": True, **result}
    except StripeWebhookError as exc:
        logger.warning("Stripe webhook error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except PaymentError as exc:
        logger.error("Payment processing error in webhook: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing failed",
        )
