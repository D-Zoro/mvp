"""
Order repository for order-specific database operations.
"""

import logging
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.book import Book
from app.models.order import Order, OrderItem, OrderStatus
from app.repositories.base import BaseRepository
from app.schemas.order import OrderCreate, OrderItemCreate, OrderUpdate

logger = logging.getLogger(__name__)


class OrderRepository(BaseRepository[Order, OrderCreate, OrderUpdate]):
    """
    Repository for Order model operations.
    
    Extends BaseRepository with order-specific methods:
    - create_with_items: Create order with items in transaction
    - get_by_buyer: Get orders for a buyer
    - update_status: Update order status
    - get_with_items: Get order with items loaded
    """
    
    def __init__(self, db: AsyncSession):
        """Initialize with Order model."""
        super().__init__(Order, db)
    
    async def get_with_items(
        self,
        order_id: UUID,
    ) -> Optional[Order]:
        """
        Get order with items relationship loaded.
        
        Args:
            order_id: Order's UUID
            
        Returns:
            Order instance with items or None
        """
        query = (
            select(Order)
            .options(
                selectinload(Order.items).selectinload(OrderItem.book),
                selectinload(Order.buyer),
            )
            .where(
                Order.id == order_id,
                Order.deleted_at.is_(None),
            )
        )
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def create_with_items(
        self,
        *,
        buyer_id: UUID,
        items: list[OrderItemCreate],
        shipping_address: dict,
        notes: Optional[str] = None,
    ) -> Order:
        """
        Create order with items in a single transaction.
        
        Calculates total amount from book prices and creates order items.
        Also reduces book quantities.
        
        Args:
            buyer_id: Buyer's UUID
            items: List of order items
            shipping_address: Shipping address dict
            notes: Optional order notes
            
        Returns:
            Created order with items
            
        Raises:
            ValueError: If book not found or insufficient quantity
        """
        # Fetch all books and calculate total
        total_amount = Decimal("0.00")
        order_items_data = []
        
        for item in items:
            # Get book with row-level lock to prevent race condition
            book_query = (
                select(Book)
                .where(
                    Book.id == item.book_id,
                    Book.deleted_at.is_(None),
                )
                .with_for_update()  # Lock row during transaction
            )
            result = await self.db.execute(book_query)
            book = result.scalar_one_or_none()

            if book is None:
                raise ValueError(f"Book {item.book_id} not found")

            # Log successful lock acquisition
            logger.debug(
                f"Acquired lock for book {book.id}. "
                f"Available quantity: {book.quantity}, Requested: {item.quantity}"
            )

            if book.quantity < item.quantity:
                raise ValueError(
                    f"Insufficient quantity for {book.title}. "
                    f"Available: {book.quantity}, Requested: {item.quantity}"
                )
            
            # Calculate item total
            item_total = book.price * item.quantity
            total_amount += item_total
            
            # Prepare order item data
            order_items_data.append({
                "book_id": book.id,
                "quantity": item.quantity,
                "price_at_purchase": book.price,
                "book_title": book.title,
                "book_author": book.author,
                "book": book,  # Keep reference for quantity update
            })
        
        # Create order
        order = Order(
            buyer_id=buyer_id,
            total_amount=total_amount,
            status=OrderStatus.PENDING,
            shipping_address=shipping_address,  # Store as JSON dict
            notes=notes,
        )
        self.db.add(order)
        await self.db.flush()
        
        # Create order items and update book quantities
        for item_data in order_items_data:
            book = item_data.pop("book")
            
            # Create order item
            order_item = OrderItem(
                order_id=order.id,
                **item_data,
            )
            self.db.add(order_item)
            
            # Reduce book quantity
            book.quantity -= item_data["quantity"]
            if book.quantity == 0:
                from app.models.book import BookStatus
                book.status = BookStatus.SOLD
            self.db.add(book)
        
        await self.db.flush()
        await self.db.refresh(order)
        
        # Load items relationship
        return await self.get_with_items(order.id)
    
    async def get_by_buyer(
        self,
        buyer_id: UUID,
        *,
        skip: int = 0,
        limit: int = 100,
        status: Optional[OrderStatus] = None,
    ) -> list[Order]:
        """
        Get orders for a specific buyer.
        
        Args:
            buyer_id: Buyer's UUID
            skip: Number of records to skip
            limit: Maximum records to return
            status: Optional status filter
            
        Returns:
            List of orders for buyer
        """
        query = (
            select(Order)
            .options(selectinload(Order.items))
            .where(
                Order.buyer_id == buyer_id,
                Order.deleted_at.is_(None),
            )
        )
        
        if status:
            query = query.where(Order.status == status)
        
        query = query.order_by(Order.created_at.desc()).offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def count_by_buyer(
        self,
        buyer_id: UUID,
        *,
        status: Optional[OrderStatus] = None,
    ) -> int:
        """
        Count orders for a buyer.
        
        Args:
            buyer_id: Buyer's UUID
            status: Optional status filter
            
        Returns:
            Number of orders
        """
        query = (
            select(func.count())
            .select_from(Order)
            .where(
                Order.buyer_id == buyer_id,
                Order.deleted_at.is_(None),
            )
        )
        
        if status:
            query = query.where(Order.status == status)
        
        result = await self.db.execute(query)
        return result.scalar() or 0
    
    async def update_status(
        self,
        order_id: UUID,
        status: OrderStatus,
    ) -> Optional[Order]:
        """
        Update order status.
        
        Args:
            order_id: Order's UUID
            status: New order status
            
        Returns:
            Updated order or None if not found
        """
        order = await self.get(order_id)
        if order is None:
            return None
        
        order.status = status
        self.db.add(order)
        await self.db.flush()
        await self.db.refresh(order)
        return order
    
    async def set_payment_id(
        self,
        order_id: UUID,
        stripe_payment_id: str,
        stripe_session_id: Optional[str] = None,
    ) -> Optional[Order]:
        """
        Set Stripe payment IDs on order.
        
        Args:
            order_id: Order's UUID
            stripe_payment_id: Stripe payment intent ID
            stripe_session_id: Optional Stripe checkout session ID
            
        Returns:
            Updated order or None if not found
        """
        order = await self.get(order_id)
        if order is None:
            return None
        
        order.stripe_payment_id = stripe_payment_id
        if stripe_session_id:
            order.stripe_session_id = stripe_session_id
        
        self.db.add(order)
        await self.db.flush()
        await self.db.refresh(order)
        return order
    
    async def mark_paid(
        self,
        order_id: UUID,
        stripe_payment_id: str,
    ) -> Optional[Order]:
        """
        Mark order as paid.
        
        Args:
            order_id: Order's UUID
            stripe_payment_id: Stripe payment intent ID
            
        Returns:
            Updated order or None if not found
        """
        order = await self.get(order_id)
        if order is None:
            return None
        
        order.status = OrderStatus.PAID
        order.stripe_payment_id = stripe_payment_id
        
        self.db.add(order)
        await self.db.flush()
        await self.db.refresh(order)
        return order
    
    async def cancel_order(
        self,
        order_id: UUID,
    ) -> Optional[Order]:
        """
        Cancel order and restore book quantities.
        
        Args:
            order_id: Order's UUID
            
        Returns:
            Cancelled order or None if not found
        """
        order = await self.get_with_items(order_id)
        if order is None:
            return None
        
        # Only allow cancellation of pending/processing orders
        if order.status not in (OrderStatus.PENDING, OrderStatus.PAYMENT_PROCESSING):
            raise ValueError(f"Cannot cancel order with status {order.status.value}")
        
        # Restore book quantities
        for item in order.items:
            if item.book:
                item.book.quantity += item.quantity
                from app.models.book import BookStatus
                if item.book.status == BookStatus.SOLD:
                    item.book.status = BookStatus.ACTIVE
                self.db.add(item.book)
        
        order.status = OrderStatus.CANCELLED
        self.db.add(order)
        await self.db.flush()
        await self.db.refresh(order)
        return order
    
    async def get_orders_for_seller(
        self,
        seller_id: UUID,
        *,
        skip: int = 0,
        limit: int = 100,
        status: Optional[OrderStatus] = None,
    ) -> list[Order]:
        """
        Get orders containing books from a specific seller.
        
        Args:
            seller_id: Seller's UUID
            skip: Number of records to skip
            limit: Maximum records to return
            status: Optional status filter
            
        Returns:
            List of orders containing seller's books
        """
        # Join through order items to find orders with seller's books
        query = (
            select(Order)
            .distinct()
            .join(OrderItem, Order.id == OrderItem.order_id)
            .join(Book, OrderItem.book_id == Book.id)
            .where(
                Book.seller_id == seller_id,
                Order.deleted_at.is_(None),
            )
            .options(selectinload(Order.items))
        )
        
        if status:
            query = query.where(Order.status == status)
        
        query = query.order_by(Order.created_at.desc()).offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count_orders_for_seller(
        self,
        seller_id: UUID,
        *,
        status: Optional[OrderStatus] = None,
    ) -> int:
        """
        Count orders containing books from a specific seller.

        Args:
            seller_id: Seller's UUID
            status: Optional status filter

        Returns:
            Number of orders containing seller's books
        """
        # Join through order items to find orders with seller's books
        query = (
            select(func.count(Order.id))
            .distinct()
            .select_from(Order)
            .join(OrderItem, Order.id == OrderItem.order_id)
            .join(Book, OrderItem.book_id == Book.id)
            .where(
                Book.seller_id == seller_id,
                Order.deleted_at.is_(None),
            )
        )

        if status:
            query = query.where(Order.status == status)

        result = await self.db.execute(query)
        return result.scalar() or 0

    async def get_by_payment_id(
        self,
        stripe_payment_id: str,
    ) -> Optional[Order]:
        """
        Get order by Stripe payment ID.
        
        Args:
            stripe_payment_id: Stripe payment intent ID
            
        Returns:
            Order or None if not found
        """
        query = select(Order).where(
            Order.stripe_payment_id == stripe_payment_id,
            Order.deleted_at.is_(None),
        )
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_by_session_id(
        self,
        stripe_session_id: str,
    ) -> Optional[Order]:
        """
        Get order by Stripe session ID.
        
        Args:
            stripe_session_id: Stripe checkout session ID
            
        Returns:
            Order or None if not found
        """
        query = select(Order).where(
            Order.stripe_session_id == stripe_session_id,
            Order.deleted_at.is_(None),
        )
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
