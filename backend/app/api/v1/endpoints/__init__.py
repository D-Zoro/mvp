"""
API v1 endpoints package.

Exports all endpoint routers for use by the v1 router aggregator.
"""

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.books import router as books_router
from app.api.v1.endpoints.orders import router as orders_router
from app.api.v1.endpoints.payments import router as payments_router
from app.api.v1.endpoints.reviews import router as reviews_router

__all__ = [
    "auth_router",
    "books_router",
    "orders_router",
    "payments_router",
    "reviews_router",
]
