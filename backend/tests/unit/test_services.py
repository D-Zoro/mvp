"""
Unit tests for service-layer business logic.

Uses SimpleNamespace to create lightweight fake model objects — no database
or SQLAlchemy instrumentation involved.

Tests focus on:
- OrderService status-transition enforcement
- OrderService access control (_assert_can_view)
- AuthService error cases (wrong password, inactive account)
"""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest

from app.models.order import OrderStatus
from app.models.user import UserRole
from app.services.exceptions import (
    AccountInactiveError,
    InvalidCredentialsError,
    InvalidStatusTransitionError,
    NotOrderOwnerError,
)
from app.services.order_service import OrderService


# ─────────────────────────────────────────────────────────────────────────────
# Helpers: lightweight fake objects using SimpleNamespace
# (avoids SQLAlchemy instrumentation issues with __new__)
# ─────────────────────────────────────────────────────────────────────────────

def _make_user(role: UserRole = UserRole.BUYER, user_id=None) -> SimpleNamespace:
    """Build a plain namespace that quacks like a User for access-control checks."""
    return SimpleNamespace(id=user_id or uuid4(), role=role, is_active=True)


def _make_order(buyer_id=None, status: OrderStatus = OrderStatus.PENDING, items=None) -> SimpleNamespace:
    """Build a plain namespace that quacks like an Order."""
    return SimpleNamespace(
        id=uuid4(),
        buyer_id=buyer_id or uuid4(),
        status=status,
        items=items or [],
    )


# ─────────────────────────────────────────────────────────────────────────────
# OrderService — status transitions
# ─────────────────────────────────────────────────────────────────────────────

class TestOrderStatusTransitions:
    """
    Validates the _ALLOWED_TRANSITIONS map enforced by OrderService.
    No DB is needed — we call the static helper directly.
    """

    def test_pending_to_payment_processing_allowed(self):
        """PENDING → PAYMENT_PROCESSING is a valid progression."""
        OrderService._assert_valid_transition(
            OrderStatus.PENDING, OrderStatus.PAYMENT_PROCESSING
        )

    def test_pending_to_cancelled_allowed(self):
        """PENDING → CANCELLED is always allowed (buyer self-cancel)."""
        OrderService._assert_valid_transition(
            OrderStatus.PENDING, OrderStatus.CANCELLED
        )

    def test_pending_to_paid_forbidden(self):
        """
        PENDING → PAID skips PAYMENT_PROCESSING and must be rejected.
        Ensures we can't forge a paid status without going through Stripe.
        """
        with pytest.raises(InvalidStatusTransitionError, match="pending"):
            OrderService._assert_valid_transition(
                OrderStatus.PENDING, OrderStatus.PAID
            )

    def test_pending_to_shipped_forbidden(self):
        """PENDING → SHIPPED skips multiple steps and must be rejected."""
        with pytest.raises(InvalidStatusTransitionError):
            OrderService._assert_valid_transition(
                OrderStatus.PENDING, OrderStatus.SHIPPED
            )

    def test_payment_processing_to_paid_allowed(self):
        """PAYMENT_PROCESSING → PAID is the normal successful payment path."""
        OrderService._assert_valid_transition(
            OrderStatus.PAYMENT_PROCESSING, OrderStatus.PAID
        )

    def test_paid_to_shipped_allowed(self):
        """PAID → SHIPPED is a valid seller fulfillment step."""
        OrderService._assert_valid_transition(OrderStatus.PAID, OrderStatus.SHIPPED)

    def test_shipped_to_delivered_allowed(self):
        """SHIPPED → DELIVERED is normal delivery confirmation."""
        OrderService._assert_valid_transition(
            OrderStatus.SHIPPED, OrderStatus.DELIVERED
        )

    def test_cancelled_is_terminal(self):
        """
        CANCELLED is a terminal state — no further transitions allowed.
        Prevents re-activating a cancelled order.
        """
        with pytest.raises(InvalidStatusTransitionError):
            OrderService._assert_valid_transition(
                OrderStatus.CANCELLED, OrderStatus.PENDING
            )

    def test_refunded_is_terminal(self):
        """REFUNDED is a terminal state — no further transitions."""
        with pytest.raises(InvalidStatusTransitionError):
            OrderService._assert_valid_transition(
                OrderStatus.REFUNDED, OrderStatus.PAID
            )

    def test_delivered_to_refunded_allowed(self):
        """DELIVERED → REFUNDED is allowed (post-delivery refund)."""
        OrderService._assert_valid_transition(
            OrderStatus.DELIVERED, OrderStatus.REFUNDED
        )


# ─────────────────────────────────────────────────────────────────────────────
# OrderService — access control
# ─────────────────────────────────────────────────────────────────────────────

class TestOrderAccessControl:
    """
    Validates _assert_can_view: who can view a given order.
    Uses SimpleNamespace fakes so no DB session is needed.
    """

    def test_buyer_can_view_own_order(self):
        """Buyers should be able to view their own orders."""
        buyer = _make_user(UserRole.BUYER)
        order = _make_order(buyer_id=buyer.id)
        # Should not raise
        OrderService._assert_can_view(order, buyer)

    def test_buyer_cannot_view_others_order(self):
        """
        A buyer must not be able to view another user's order.
        Prevents order data leakage between accounts.
        """
        buyer = _make_user(UserRole.BUYER)
        other_order = _make_order(buyer_id=uuid4())  # different buyer
        with pytest.raises(NotOrderOwnerError):
            OrderService._assert_can_view(other_order, buyer)

    def test_admin_can_view_any_order(self):
        """Admins have unrestricted order view access."""
        admin = _make_user(UserRole.ADMIN)
        order = _make_order(buyer_id=uuid4())  # belongs to someone else
        # Should not raise
        OrderService._assert_can_view(order, admin)

    def test_seller_can_view_order_with_their_book(self):
        """
        A seller can view an order if it contains at least one of their books.
        This enables sellers to fulfil and track their items.
        """
        seller = _make_user(UserRole.SELLER)
        item = MagicMock()
        item.book = MagicMock()
        item.book.seller_id = seller.id

        order = _make_order(items=[item])
        # Should not raise
        OrderService._assert_can_view(order, seller)

    def test_seller_cannot_view_order_without_their_book(self):
        """
        A seller must not view an order that contains only other sellers' books.
        """
        seller = _make_user(UserRole.SELLER)
        item = MagicMock()
        item.book = MagicMock()
        item.book.seller_id = uuid4()  # different seller

        order = _make_order(items=[item])
        with pytest.raises(NotOrderOwnerError):
            OrderService._assert_can_view(order, seller)


# ─────────────────────────────────────────────────────────────────────────────
# AuthService — login error cases (mocked repository)
# ─────────────────────────────────────────────────────────────────────────────

class TestAuthServiceLogin:
    """
    Tests for AuthService.login() using a mocked UserRepository.
    No real database; exercises the credential-checking logic only.
    """

    async def _build_service_with_mock_user(self, user_ns: SimpleNamespace):
        """
        Build an AuthService whose user_repo.get_by_email returns a mock user.
        The user is wrapped as a real User-like object via MagicMock with spec.
        """
        from app.services.auth_service import AuthService

        mock_db = AsyncMock()
        svc = AuthService(mock_db)

        mock_repo = AsyncMock()
        mock_repo.get_by_email.return_value = user_ns
        svc.user_repo = mock_repo
        return svc

    async def test_login_wrong_password_raises(self):
        """
        Wrong password must raise InvalidCredentialsError.
        The error message must not reveal whether the email exists.
        """
        from app.core.security import hash_password

        user = SimpleNamespace(
            id=uuid4(),
            email="user@example.com",
            password_hash=hash_password("Correct9"),
            is_active=True,
            role=UserRole.BUYER,
        )

        svc = await self._build_service_with_mock_user(user)

        with pytest.raises(InvalidCredentialsError):
            await svc.login(email="user@example.com", password="Wrong1234")

    async def test_login_inactive_account_raises(self):
        """
        Inactive accounts must raise AccountInactiveError, not InvalidCredentialsError.
        This allows the admin to deactivate accounts while giving a meaningful error.
        """
        from app.core.security import hash_password

        user = SimpleNamespace(
            id=uuid4(),
            email="inactive@example.com",
            password_hash=hash_password("Correct9"),
            is_active=False,
            role=UserRole.BUYER,
        )

        svc = await self._build_service_with_mock_user(user)

        with pytest.raises(AccountInactiveError):
            await svc.login(email="inactive@example.com", password="Correct9")

    async def test_login_nonexistent_email_raises(self):
        """
        Non-existent email must raise InvalidCredentialsError (same as wrong password).
        Prevents email enumeration attacks.
        """
        from app.services.auth_service import AuthService

        mock_db = AsyncMock()
        svc = AuthService(mock_db)
        mock_repo = AsyncMock()
        mock_repo.get_by_email.return_value = None  # user not found
        svc.user_repo = mock_repo

        with pytest.raises(InvalidCredentialsError):
            await svc.login(email="nobody@example.com", password="SomePass1")
