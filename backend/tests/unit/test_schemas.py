"""
Unit tests for Pydantic request/response schemas.

These tests validate schema-level business rules (field constraints,
validators, enum membership) without touching the database or HTTP layer.
All tests are synchronous and fast.
"""

import pytest
from decimal import Decimal
from uuid import uuid4

from pydantic import ValidationError

from app.schemas.auth import RegisterRequest
from app.schemas.book import BookCreate, BookUpdate
from app.schemas.order import OrderCreate, OrderItemCreate, ShippingAddress
from app.schemas.review import ReviewCreate, ReviewUpdate
from app.models.book import BookCondition, BookStatus
from app.models.user import UserRole


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _valid_shipping_address() -> dict:
    return {
        "full_name": "Jane Doe",
        "address_line1": "123 Main St",
        "city": "Springfield",
        "state": "IL",
        "postal_code": "62701",
        "country": "US",
    }


def _valid_book_payload(**overrides) -> dict:
    base = {
        "title": "Clean Code",
        "author": "Robert C. Martin",
        "condition": BookCondition.GOOD,
        "price": Decimal("12.99"),
        "quantity": 3,
    }
    base.update(overrides)
    return base


def _valid_order_items(book_id=None) -> list[dict]:
    return [{"book_id": str(book_id or uuid4()), "quantity": 1}]


# ─────────────────────────────────────────────────────────────────────────────
# RegisterRequest
# ─────────────────────────────────────────────────────────────────────────────

def test_register_valid_buyer():
    """Full valid buyer registration payload should parse without errors."""
    req = RegisterRequest(
        email="buyer@example.com",
        password="Secure1234",
        first_name="Alice",
        last_name="Smith",
        role=UserRole.BUYER,
    )
    assert req.email == "buyer@example.com"
    assert req.role == UserRole.BUYER


def test_register_valid_seller():
    """Seller role should be accepted."""
    req = RegisterRequest(
        email="seller@example.com",
        password="Secure1234",
        role=UserRole.SELLER,
    )
    assert req.role == UserRole.SELLER


def test_register_admin_role_rejected():
    """
    Admin role must not be self-assignable.
    Prevents privilege escalation through the public API.
    """
    with pytest.raises(ValidationError) as exc_info:
        RegisterRequest(
            email="hacker@example.com",
            password="Secure1234",
            role=UserRole.ADMIN,
        )
    assert "admin" in str(exc_info.value).lower()


def test_register_invalid_email():
    """Malformed email address should raise ValidationError."""
    with pytest.raises(ValidationError):
        RegisterRequest(email="not-an-email", password="Secure1234")


def test_register_password_too_short():
    """Password under 8 characters must be rejected."""
    with pytest.raises(ValidationError):
        RegisterRequest(email="u@example.com", password="Ab1")


def test_register_password_no_uppercase():
    """Password without uppercase letter must be rejected."""
    with pytest.raises(ValidationError):
        RegisterRequest(email="u@example.com", password="nouppercase1")


def test_register_password_no_lowercase():
    """Password without lowercase letter must be rejected."""
    with pytest.raises(ValidationError):
        RegisterRequest(email="u@example.com", password="NOLOWER1234")


def test_register_password_no_digit():
    """Password without a digit must be rejected."""
    with pytest.raises(ValidationError):
        RegisterRequest(email="u@example.com", password="NoDigitHere")


# ─────────────────────────────────────────────────────────────────────────────
# BookCreate
# ─────────────────────────────────────────────────────────────────────────────

def test_book_create_valid():
    """Minimal valid book creation payload should parse cleanly."""
    book = BookCreate(**_valid_book_payload())
    assert book.title == "Clean Code"
    assert book.price == Decimal("12.99")


def test_book_create_zero_price_rejected():
    """A book priced at exactly zero must be rejected (price must be > 0)."""
    with pytest.raises(ValidationError):
        BookCreate(**_valid_book_payload(price=Decimal("0")))


def test_book_create_negative_price_rejected():
    """Negative prices are invalid."""
    with pytest.raises(ValidationError):
        BookCreate(**_valid_book_payload(price=Decimal("-5.00")))


def test_book_create_valid_isbn_10():
    """10-digit ISBN (without hyphens) should be accepted."""
    book = BookCreate(**_valid_book_payload(isbn="0306406152"))
    assert book.isbn == "0306406152"


def test_book_create_valid_isbn_13():
    """13-digit ISBN should be accepted."""
    book = BookCreate(**_valid_book_payload(isbn="978-0306406157"))
    assert book.isbn is not None


def test_book_create_invalid_isbn_too_short():
    """ISBN shorter than 10 characters must be rejected."""
    with pytest.raises(ValidationError):
        BookCreate(**_valid_book_payload(isbn="12345"))


def test_book_create_invalid_image_url():
    """Image URLs must start with http:// or https://."""
    with pytest.raises(ValidationError):
        BookCreate(**_valid_book_payload(images=["ftp://not-valid.com/img.jpg"]))


def test_book_create_too_many_images():
    """More than 10 images should be rejected."""
    with pytest.raises(ValidationError):
        BookCreate(**_valid_book_payload(images=[f"https://img.example.com/{i}.jpg" for i in range(11)]))


def test_book_update_all_optional():
    """BookUpdate with no fields set should be valid (all-optional partial update)."""
    update = BookUpdate()
    assert update.title is None
    assert update.price is None


def test_book_update_invalid_price():
    """BookUpdate with zero price must still be rejected."""
    with pytest.raises(ValidationError):
        BookUpdate(price=Decimal("0"))


# ─────────────────────────────────────────────────────────────────────────────
# OrderCreate
# ─────────────────────────────────────────────────────────────────────────────

def test_order_create_valid():
    """Minimal valid order with one item should parse."""
    order = OrderCreate(
        shipping_address=ShippingAddress(**_valid_shipping_address()),
        items=[OrderItemCreate(book_id=uuid4(), quantity=1)],
    )
    assert len(order.items) == 1


def test_order_create_empty_items_rejected():
    """Order with no items must be rejected — a cart must have at least one item."""
    with pytest.raises(ValidationError):
        OrderCreate(
            shipping_address=ShippingAddress(**_valid_shipping_address()),
            items=[],
        )


def test_order_create_duplicate_books_rejected():
    """
    Duplicate book IDs in one order must be rejected.
    Users should combine quantities rather than duplicate line items.
    """
    book_id = uuid4()
    with pytest.raises(ValidationError):
        OrderCreate(
            shipping_address=ShippingAddress(**_valid_shipping_address()),
            items=[
                OrderItemCreate(book_id=book_id, quantity=1),
                OrderItemCreate(book_id=book_id, quantity=2),
            ],
        )


def test_order_item_quantity_must_be_positive():
    """Order item with quantity=0 must be rejected."""
    with pytest.raises(ValidationError):
        OrderItemCreate(book_id=uuid4(), quantity=0)


# ─────────────────────────────────────────────────────────────────────────────
# ReviewCreate / ReviewUpdate
# ─────────────────────────────────────────────────────────────────────────────

def test_review_create_valid_5_star():
    """5-star review should parse."""
    r = ReviewCreate(rating=5, comment="Excellent!")
    assert r.rating == 5


def test_review_create_valid_1_star():
    """1-star review should parse (minimum allowed)."""
    r = ReviewCreate(rating=1)
    assert r.rating == 1


def test_review_create_rating_too_high():
    """Rating of 6 must be rejected (max is 5)."""
    with pytest.raises(ValidationError):
        ReviewCreate(rating=6)


def test_review_create_rating_too_low():
    """Rating of 0 must be rejected (min is 1)."""
    with pytest.raises(ValidationError):
        ReviewCreate(rating=0)


def test_review_update_all_optional():
    """ReviewUpdate with no fields should be valid."""
    update = ReviewUpdate()
    assert update.rating is None
    assert update.comment is None


def test_review_update_invalid_rating():
    """ReviewUpdate with out-of-range rating must still be rejected."""
    with pytest.raises(ValidationError):
        ReviewUpdate(rating=10)
