"""
Order schemas for request/response validation.
"""

from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import Field, field_validator

from app.models.order import OrderStatus
from app.schemas.base import BaseSchema, PaginatedResponse, ResponseSchema
from app.schemas.book import BookBriefResponse
from app.schemas.user import UserBriefResponse


class ShippingAddress(BaseSchema):
    """Schema for shipping address."""
    
    full_name: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Recipient's full name",
    )
    address_line1: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Street address",
    )
    address_line2: Optional[str] = Field(
        None,
        max_length=255,
        description="Apartment, suite, etc.",
    )
    city: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="City",
    )
    state: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="State/Province",
    )
    postal_code: str = Field(
        ...,
        min_length=1,
        max_length=20,
        description="Postal/ZIP code",
    )
    country: str = Field(
        default="US",
        min_length=2,
        max_length=100,
        description="Country",
    )
    phone: Optional[str] = Field(
        None,
        max_length=20,
        description="Phone number",
    )


class OrderItemBase(BaseSchema):
    """Base schema for order item."""
    
    book_id: UUID = Field(..., description="Book ID to purchase")
    quantity: int = Field(
        default=1,
        ge=1,
        le=100,
        description="Quantity to purchase",
    )


class OrderItemCreate(OrderItemBase):
    """Schema for creating an order item."""
    pass


class OrderItemResponse(ResponseSchema):
    """Schema for order item API response."""
    
    order_id: UUID = Field(..., description="Parent order ID")
    book_id: Optional[UUID] = Field(None, description="Book ID")
    quantity: int = Field(..., description="Quantity purchased")
    price_at_purchase: Decimal = Field(..., description="Price at time of purchase")
    book_title: str = Field(..., description="Book title at purchase")
    book_author: str = Field(..., description="Book author at purchase")
    
    # Nested book info (if book still exists)
    book: Optional[BookBriefResponse] = Field(None, description="Book details")
    
    @property
    def subtotal(self) -> Decimal:
        """Calculate subtotal for this item."""
        return self.price_at_purchase * self.quantity


class OrderBase(BaseSchema):
    """Base schema for order."""
    
    shipping_address: ShippingAddress = Field(
        ...,
        description="Shipping address",
    )
    notes: Optional[str] = Field(
        None,
        max_length=1000,
        description="Order notes",
    )


class OrderCreate(OrderBase):
    """
    Schema for creating a new order.
    
    Buyer ID is set from the authenticated user.
    """
    
    items: list[OrderItemCreate] = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Order items (1-50 items)",
    )
    
    @field_validator("items")
    @classmethod
    def validate_items(cls, v: list[OrderItemCreate]) -> list[OrderItemCreate]:
        """Validate order items."""
        if len(v) == 0:
            raise ValueError("Order must have at least one item")
        if len(v) > 50:
            raise ValueError("Order cannot have more than 50 items")
        
        # Check for duplicate books
        book_ids = [item.book_id for item in v]
        if len(book_ids) != len(set(book_ids)):
            raise ValueError("Duplicate books in order. Combine quantities instead.")
        
        return v


class OrderUpdate(BaseSchema):
    """Schema for updating an order (admin only)."""
    
    status: Optional[OrderStatus] = Field(None, description="New order status")
    notes: Optional[str] = Field(None, max_length=1000, description="Order notes")
    shipping_address: Optional[ShippingAddress] = Field(
        None,
        description="Updated shipping address",
    )


class OrderResponse(ResponseSchema):
    """Schema for order API response."""
    
    buyer_id: UUID = Field(..., description="Buyer's user ID")
    total_amount: Decimal = Field(..., description="Total order amount")
    status: OrderStatus = Field(..., description="Order status")
    stripe_payment_id: Optional[str] = Field(None, description="Stripe payment ID")
    shipping_address: Optional[ShippingAddress] = Field(None, description="Shipping address")
    notes: Optional[str] = Field(None, description="Order notes")
    
    # Nested items
    items: list[OrderItemResponse] = Field(
        default_factory=list,
        description="Order items",
    )
    
    # Nested buyer info
    buyer: Optional[UserBriefResponse] = Field(None, description="Buyer information")
    
    @property
    def item_count(self) -> int:
        """Get total number of items."""
        return sum(item.quantity for item in self.items)
    
    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "buyer_id": "987fcdeb-51a2-3c4d-5e6f-789012345678",
                "total_amount": 45.97,
                "status": "paid",
                "stripe_payment_id": "pi_1234567890",
                "shipping_address": {
                    "full_name": "John Doe",
                    "address_line1": "123 Main St",
                    "city": "New York",
                    "state": "NY",
                    "postal_code": "10001",
                    "country": "US",
                },
                "notes": None,
                "items": [],
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-15T10:30:00Z",
            }
        },
    }


class OrderBriefResponse(BaseSchema):
    """Brief order info for lists."""
    
    id: UUID = Field(..., description="Order ID")
    total_amount: Decimal = Field(..., description="Total amount")
    status: OrderStatus = Field(..., description="Status")
    item_count: int = Field(..., description="Number of items")
    created_at: str = Field(..., description="Creation date")


class OrderListResponse(PaginatedResponse[OrderResponse]):
    """Paginated list of orders."""
    pass


class OrderStatusUpdate(BaseSchema):
    """Schema for updating order status."""
    
    status: OrderStatus = Field(..., description="New order status")
    
    @field_validator("status")
    @classmethod
    def validate_status_transition(cls, v: OrderStatus) -> OrderStatus:
        """Validate status (transitions are validated in service layer)."""
        return v


class CheckoutSession(BaseSchema):
    """Schema for checkout session response."""
    
    checkout_url: str = Field(..., description="Stripe checkout URL")
    session_id: str = Field(..., description="Stripe session ID")
    order_id: UUID = Field(..., description="Created order ID")
