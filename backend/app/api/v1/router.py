"""
API v1 Main Router.

Aggregates all endpoint routers under /api/v1 with proper tags and prefixes.
This router is included in main.py with the API_V1_PREFIX settings value.
"""

from fastapi import APIRouter

from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.books import router as books_router
from app.api.v1.endpoints.orders import router as orders_router
from app.api.v1.endpoints.payments import router as payments_router
from app.api.v1.endpoints.reviews import router as reviews_router
from app.api.v1.endpoints.upload import router as upload_router

api_router = APIRouter()

# Auth — prefix /auth so all routes become /api/v1/auth/...
api_router.include_router(
    auth_router,
    prefix="/auth",
    tags=["Authentication"],
)

# Upload
api_router.include_router(
    upload_router,
    tags=["Upload"],
)

# Books & Reviews — no prefix; individual routes already carry /books/...
api_router.include_router(
    books_router,
    tags=["Books"],
)

api_router.include_router(
    reviews_router,
    tags=["Reviews"],
)

# Orders
api_router.include_router(
    orders_router,
    tags=["Orders"],
)

# Payments
api_router.include_router(
    payments_router,
    tags=["Payments"],
)
