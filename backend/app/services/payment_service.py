"""
Payment Service (Stripe integration).

Handles the Stripe-specific payment operations:
- Create a Stripe Checkout Session for an order
- Handle incoming Stripe webhooks (payment succeeded / failed)
- Process refunds via Stripe Refund API

Design notes
────────────
• stripe is imported lazily (inside methods) so the app still starts even
  if the stripe package is not installed in dev — a clear ImportError is
  raised at call-time instead.
• All Stripe errors are wrapped in typed service exceptions.
• The service intentionally does NOT commit; callers own the transaction.
"""

import json
import logging
from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.order import OrderStatus
from app.repositories.order import OrderRepository
from app.schemas.order import CheckoutSession, OrderResponse
from app.services.exceptions import (
    OrderNotFoundError,
    PaymentError,
    RefundError,
    StripeWebhookError,
)

logger = logging.getLogger(__name__)

# Stripe stores amounts in the smallest currency unit (cents for USD)
_CENTS_PER_DOLLAR = 100


def _get_stripe():
    """Import stripe lazily and configure with the secret key."""
    try:
        import stripe  # type: ignore[import]
    except ImportError as exc:
        raise ImportError(
            "stripe package not installed. Run: pip install stripe"
        ) from exc

    if not getattr(settings, "STRIPE_SECRET_KEY", None):
        raise PaymentError(
            "STRIPE_SECRET_KEY is not configured. "
            "Add it to your environment variables."
        )

    stripe.api_key = settings.STRIPE_SECRET_KEY  # type: ignore[attr-defined]
    return stripe


class PaymentService:
    """
    Service for Stripe payment operations.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.order_repo = OrderRepository(db)

    # ─────────────────────────────────────────────
    # Create Checkout Session
    # ─────────────────────────────────────────────

    async def create_stripe_checkout(
        self,
        *,
        order_id: UUID,
        success_url: str | None = None,
        cancel_url: str | None = None,
    ) -> CheckoutSession:
        """
        Create a Stripe Checkout Session for a pending order.

        Builds line items from the order's items and returns the URL
        the frontend should redirect the user to.

        Args:
            order_id: UUID of the order.
            success_url: URL Stripe redirects to on success.
            cancel_url: URL Stripe redirects to on cancellation.

        Returns:
            CheckoutSession with checkout_url, session_id, order_id.

        Raises:
            OrderNotFoundError: Order does not exist.
            PaymentError: Stripe API call failed or already paid.
        """
        stripe = _get_stripe()

        order = await self.order_repo.get_with_items(order_id)
        if order is None:
            raise OrderNotFoundError(f"Order '{order_id}' not found.")

        if order.status not in (OrderStatus.PENDING, OrderStatus.PAYMENT_PROCESSING):
            raise PaymentError(
                f"Order '{order_id}' is not in a payable state "
                f"(current status: {order.status.value})."
            )

        # Build Stripe line items from order items
        line_items = [
            {
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": item.book_title,
                        "description": f"By {item.book_author}",
                    },
                    "unit_amount": int(item.price_at_purchase * _CENTS_PER_DOLLAR),
                },
                "quantity": item.quantity,
            }
            for item in order.items
        ]

        _success_url = (
            success_url
            or f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}"
               f"/orders/{order_id}/success?session_id={{CHECKOUT_SESSION_ID}}"
        )
        _cancel_url = (
            cancel_url
            or f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')}"
               f"/orders/{order_id}/cancel"
        )

        try:
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=line_items,
                mode="payment",
                success_url=_success_url,
                cancel_url=_cancel_url,
                metadata={"order_id": str(order_id)},
            )
        except Exception as exc:
            raise PaymentError(f"Stripe Checkout creation failed: {exc}") from exc

        # Persist the session ID and mark order as payment-processing
        await self.order_repo.set_payment_id(
            order_id,
            stripe_payment_id=session.payment_intent or "",
            stripe_session_id=session.id,
        )
        await self.order_repo.update_status(order_id, OrderStatus.PAYMENT_PROCESSING)
        await self.db.commit()

        logger.info(
            "Stripe Checkout Session created: order=%s session=%s",
            order_id, session.id,
        )
        return CheckoutSession(
            checkout_url=session.url,
            session_id=session.id,
            order_id=order_id,
        )

    # ─────────────────────────────────────────────
    # Webhook handler
    # ─────────────────────────────────────────────

    async def handle_webhook(
        self,
        *,
        payload: bytes,
        stripe_signature: str,
    ) -> dict:
        """
        Verify and process an incoming Stripe webhook event.

        Supported events:
          - checkout.session.completed  → marks order PAID
          - payment_intent.payment_failed → marks order PENDING (retry allowed)

        Args:
            payload: Raw request body bytes.
            stripe_signature: Value of the ``Stripe-Signature`` HTTP header.

        Returns:
            dict with {"processed": bool, "event_type": str}.

        Raises:
            StripeWebhookError: Signature verification failed.
            PaymentError: Event processing failed.
        """
        stripe = _get_stripe()
        webhook_secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", None)

        if not webhook_secret:
            raise StripeWebhookError(
                "STRIPE_WEBHOOK_SECRET is not configured."
            )

        try:
            event = stripe.Webhook.construct_event(
                payload, stripe_signature, webhook_secret
            )
        except stripe.error.SignatureVerificationError as exc:
            raise StripeWebhookError(
                "Stripe webhook signature verification failed."
            ) from exc
        except Exception as exc:
            raise StripeWebhookError(
                f"Webhook payload parsing failed: {exc}"
            ) from exc

        event_type: str = event["type"]
        event_data = event["data"]["object"]

        logger.info("Stripe webhook received: type=%s", event_type)

        if event_type == "checkout.session.completed":
            await self._handle_checkout_completed(event_data)
        elif event_type == "payment_intent.payment_failed":
            await self._handle_payment_failed(event_data)
        else:
            logger.debug("Unhandled Stripe event type: %s", event_type)
            return {"processed": False, "event_type": event_type}

        return {"processed": True, "event_type": event_type}

    async def _handle_checkout_completed(self, session_data: dict) -> None:
        """Mark the order as PAID when checkout.session.completed fires."""
        session_id: str = session_data.get("id", "")
        payment_intent: str = session_data.get("payment_intent", "")
        order_meta_id: str = session_data.get("metadata", {}).get("order_id", "")

        if not order_meta_id:
            logger.warning("checkout.session.completed missing order_id in metadata")
            return

        order_id = UUID(order_meta_id)
        order = await self.order_repo.get(order_id)
        if order is None:
            logger.error("Webhook: order %s not found", order_id)
            return

        await self.order_repo.mark_paid(order_id, payment_intent)
        await self.db.commit()
        logger.info("Order marked PAID: id=%s stripe_pi=%s", order_id, payment_intent)

    async def _handle_payment_failed(self, payment_intent_data: dict) -> None:
        """Roll order back to PENDING if the payment intent fails."""
        payment_intent_id: str = payment_intent_data.get("id", "")
        order = await self.order_repo.get_by_payment_id(payment_intent_id)
        if order is None:
            return
        await self.order_repo.update_status(order.id, OrderStatus.PENDING)
        await self.db.commit()
        logger.info(
            "Order reset to PENDING after payment failure: id=%s", order.id
        )

    # ─────────────────────────────────────────────
    # Refunds
    # ─────────────────────────────────────────────

    async def refund_payment(
        self,
        *,
        order_id: UUID,
        amount: Decimal | None = None,
        reason: str = "requested_by_customer",
    ) -> OrderResponse:
        """
        Issue a (full or partial) refund for a paid order.

        Args:
            order_id: UUID of the order to refund.
            amount: Optional partial refund amount in USD.
                    If None, the full order amount is refunded.
            reason: Stripe refund reason string
                    (``duplicate``, ``fraudulent``, ``requested_by_customer``).

        Returns:
            Updated OrderResponse with REFUNDED status.

        Raises:
            OrderNotFoundError: Order not found.
            RefundError: Order not paid or Stripe call failed.
        """
        stripe = _get_stripe()

        order = await self.order_repo.get_with_items(order_id)
        if order is None:
            raise OrderNotFoundError(f"Order '{order_id}' not found.")

        if not order.is_paid:
            raise RefundError(
                f"Order '{order_id}' cannot be refunded — "
                f"current status: {order.status.value}."
            )

        if not order.stripe_payment_id:
            raise RefundError(
                f"Order '{order_id}' has no Stripe payment ID; "
                "cannot issue a programmatic refund."
            )

        refund_params: dict = {
            "payment_intent": order.stripe_payment_id,
            "reason": reason,
        }
        if amount is not None:
            refund_params["amount"] = int(amount * _CENTS_PER_DOLLAR)

        try:
            stripe.Refund.create(**refund_params)
        except Exception as exc:
            raise RefundError(f"Stripe refund failed: {exc}") from exc

        await self.order_repo.update_status(order_id, OrderStatus.REFUNDED)
        await self.db.commit()
        await self.db.refresh(order)

        logger.info(
            "Refund issued: order=%s amount=%s reason=%s",
            order_id, amount or "full", reason,
        )
        return OrderResponse.model_validate(order)
