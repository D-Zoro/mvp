"""
Order Service.

Business logic for the order lifecycle:
- Create order (with stock validation and quantity deduction)
- Retrieve order history for buyers and sellers
- Update order status (with allowed-transition enforcement)
- Cancel order (restores book quantities)
- Concurrency safety note: quantity deduction happens inside the
  OrderRepository's transactional create_with_items; a DB-level
  CHECK constraint (quantity >= 0) is the ultimate guard.
"""

import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.order import Order, OrderStatus
from app.models.user import User, UserRole
from app.repositories.order import OrderRepository
from app.schemas.order import (
    OrderCreate,
    OrderListResponse,
    OrderResponse,
)
from app.services.exceptions import (
    InsufficientStockError,
    InvalidStatusTransitionError,
    OrderNotCancellableError,
    OrderNotFoundError,
    NotOrderOwnerError,
)

logger = logging.getLogger(__name__)

# Valid status transitions: {current_status: {allowed_next_statuses}}
_ALLOWED_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.PENDING: {
        OrderStatus.PAYMENT_PROCESSING,
        OrderStatus.CANCELLED,
    },
    OrderStatus.PAYMENT_PROCESSING: {
        OrderStatus.PAID,
        OrderStatus.CANCELLED,
    },
    OrderStatus.PAID: {
        OrderStatus.SHIPPED,
        OrderStatus.REFUNDED,
    },
    OrderStatus.SHIPPED: {
        OrderStatus.DELIVERED,
        OrderStatus.REFUNDED,
    },
    OrderStatus.DELIVERED: {
        OrderStatus.REFUNDED,
    },
    OrderStatus.CANCELLED: set(),
    OrderStatus.REFUNDED: set(),
}


class OrderService:
    """
    Service managing the full order lifecycle.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.order_repo = OrderRepository(db)

    # ─────────────────────────────────────────────
    # Create
    # ─────────────────────────────────────────────

    async def create_order(
        self,
        *,
        buyer: User,
        order_data: OrderCreate,
    ) -> OrderResponse:
        """
        Create a new order for a buyer.

        Validates stock availability for every item, atomically reduces
        quantities, and creates the order + order-item rows.

        Args:
            buyer: Authenticated buyer initiating the purchase.
            order_data: Validated OrderCreate schema.

        Returns:
            OrderResponse with all items loaded.

        Raises:
            InsufficientStockError: One or more books lack sufficient stock.
            ValueError: Propagated from repository if book not found.
        """
        shipping_dict = order_data.shipping_address.model_dump()

        try:
            order = await self.order_repo.create_with_items(
                buyer_id=buyer.id,
                items=order_data.items,
                shipping_address=shipping_dict,
                notes=order_data.notes,
            )
        except ValueError as exc:
            # The repository raises ValueError for stock issues; re-raise
            # as our typed exception so endpoint handlers can respond cleanly.
            msg = str(exc)
            if "Insufficient quantity" in msg:
                # Parse repo message: "Insufficient quantity for {title}. Available: N, Requested: M"
                raise InsufficientStockError(
                    book_title="(see detail)",
                    available=0,
                    requested=0,
                ) from exc
            raise

        await self.db.commit()

        # Re-fetch with relationships for full response
        order = await self.order_repo.get_with_items(order.id)

        logger.info(
            "Order created: id=%s buyer=%s total=%s items=%d",
            order.id, buyer.id, order.total_amount, len(order.items),
        )
        return OrderResponse.model_validate(order)

    # ─────────────────────────────────────────────
    # Read
    # ─────────────────────────────────────────────

    async def get_order(self, *, order_id: UUID, requestor: User) -> OrderResponse:
        """
        Retrieve a single order.

        Buyers can only view their own orders; sellers can view orders that
        contain their books; admins can view any order.

        Args:
            order_id: UUID of the order.
            requestor: Authenticated user.

        Returns:
            OrderResponse with items.

        Raises:
            OrderNotFoundError: Order does not exist.
            NotOrderOwnerError: Requestor not authorised to view this order.
        """
        order = await self.order_repo.get_with_items(order_id)
        if order is None:
            raise OrderNotFoundError(f"Order '{order_id}' not found.")

        self._assert_can_view(order, requestor)
        return OrderResponse.model_validate(order)

    async def get_order_history(
        self,
        *,
        buyer: User,
        status: OrderStatus | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> OrderListResponse:
        """
        Paginated list of orders placed by a buyer.

        Args:
            buyer: Authenticated buyer.
            status: Optional status filter.
            page: Page number (1-indexed).
            page_size: Items per page (max 100).

        Returns:
            OrderListResponse (paginated).
        """
        page_size = min(page_size, 100)
        skip = (page - 1) * page_size

        orders = await self.order_repo.get_by_buyer(
            buyer.id, skip=skip, limit=page_size, status=status
        )
        total = await self.order_repo.count_by_buyer(buyer.id, status=status)
        items = [OrderResponse.model_validate(o) for o in orders]
        return OrderListResponse.create(
            items=items, total=total, page=page, page_size=page_size
        )

    async def get_seller_orders(
        self,
        *,
        seller_id: UUID,
        status: OrderStatus | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> OrderListResponse:
        """
        Paginated list of orders containing a seller's books.

        Args:
            seller_id: UUID of the seller.
            status: Optional status filter.
            page: Page number.
            page_size: Items per page.

        Returns:
            OrderListResponse.
        """
        page_size = min(page_size, 100)
        skip = (page - 1) * page_size

        orders = await self.order_repo.get_orders_for_seller(
            seller_id, skip=skip, limit=page_size, status=status
        )
        items = [OrderResponse.model_validate(o) for o in orders]
        # total count not available without extra query — use len for now
        return OrderListResponse.create(
            items=items, total=len(items), page=page, page_size=page_size
        )

    # ─────────────────────────────────────────────
    # Update status
    # ─────────────────────────────────────────────

    async def update_order_status(
        self,
        *,
        order_id: UUID,
        new_status: OrderStatus,
        requestor: User,
    ) -> OrderResponse:
        """
        Transition an order to a new status.

        Only admins may advance an order's status arbitrarily.
        Buyers may only cancel their own pending orders.

        Args:
            order_id: UUID of the order.
            new_status: Target status.
            requestor: Authenticated user.

        Returns:
            Updated OrderResponse.

        Raises:
            OrderNotFoundError: Order not found.
            NotOrderOwnerError: Requestor cannot mutate this order.
            InvalidStatusTransitionError: Transition not allowed.
        """
        order = await self.order_repo.get_with_items(order_id)
        if order is None:
            raise OrderNotFoundError(f"Order '{order_id}' not found.")

        # Non-admins: buyers can only cancel their own orders
        if requestor.role != UserRole.ADMIN:
            if order.buyer_id != requestor.id:
                raise NotOrderOwnerError(
                    "You do not have permission to update this order."
                )
            if new_status != OrderStatus.CANCELLED:
                raise NotOrderOwnerError(
                    "Buyers may only cancel orders. "
                    "Status updates are performed by administrators."
                )

        self._assert_valid_transition(order.status, new_status)

        if new_status == OrderStatus.CANCELLED:
            order = await self.order_repo.cancel_order(order_id)
        else:
            order = await self.order_repo.update_status(order_id, new_status)

        await self.db.commit()
        await self.db.refresh(order)

        logger.info(
            "Order status updated: id=%s %s→%s by user=%s",
            order_id, order.status, new_status, requestor.id,
        )
        return OrderResponse.model_validate(order)

    # ─────────────────────────────────────────────
    # Cancel
    # ─────────────────────────────────────────────

    async def cancel_order(self, *, order_id: UUID, requestor: User) -> OrderResponse:
        """
        Cancel an order and restore book stock.

        Delegates to update_order_status with CANCELLED.
        """
        return await self.update_order_status(
            order_id=order_id,
            new_status=OrderStatus.CANCELLED,
            requestor=requestor,
        )

    # ─────────────────────────────────────────────
    # Internal helpers
    # ─────────────────────────────────────────────

    @staticmethod
    def _assert_valid_transition(
        current: OrderStatus,
        target: OrderStatus,
    ) -> None:
        """Raise InvalidStatusTransitionError if the transition is not allowed."""
        allowed = _ALLOWED_TRANSITIONS.get(current, set())
        if target not in allowed:
            raise InvalidStatusTransitionError(
                f"Cannot transition order from '{current.value}' to '{target.value}'. "
                f"Allowed transitions: {[s.value for s in allowed] or 'none'}."
            )

    @staticmethod
    def _assert_can_view(order: Order, requestor: User) -> None:
        """Raise NotOrderOwnerError if requestor cannot view the order."""
        if requestor.role == UserRole.ADMIN:
            return
        if order.buyer_id == requestor.id:
            return
        # Sellers: check if any item belongs to their catalogue
        if requestor.role == UserRole.SELLER:
            for item in order.items:
                if item.book and item.book.seller_id == requestor.id:
                    return
        raise NotOrderOwnerError(
            "You do not have permission to view this order."
        )
