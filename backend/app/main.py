"""
Books4All — Main FastAPI Application

Features:
- CORS + Rate Limit middleware
- Global exception handlers (ServiceError, HTTP, Validation, generic)
- Startup / shutdown lifecycle events (DB pool, Redis)
- Prometheus-compatible /metrics endpoint (graceful fallback if not installed)
- OpenAPI customisation (contact, license, description)
- Health check with live DB + Redis ping
"""

import logging
import time
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import async_session_maker
from app.core.rate_limiter import RateLimitMiddleware, rate_limiter
from app.services.exceptions import (
    AccountInactiveError,
    BookNotFoundError,
    EmailAlreadyExistsError,
    InsufficientStockError,
    InvalidCredentialsError,
    InvalidStatusTransitionError,
    InvalidTokenError,
    NotBookOwnerError,
    NotOrderOwnerError,
    NotSellerError,
    OAuthError,
    OAuthNotConfiguredError,
    OrderNotCancellableError,
    OrderNotFoundError,
    PaymentError,
    RefundError,
    ServiceError,
    StripeWebhookError,
)

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Service-exception → HTTP status mapping
# ─────────────────────────────────────────────────────────────────────────────

_SERVICE_EXCEPTION_MAP: dict[type[ServiceError], int] = {
    EmailAlreadyExistsError:      status.HTTP_409_CONFLICT,
    InvalidCredentialsError:      status.HTTP_401_UNAUTHORIZED,
    InvalidTokenError:            status.HTTP_400_BAD_REQUEST,
    AccountInactiveError:         status.HTTP_403_FORBIDDEN,
    OAuthNotConfiguredError:      status.HTTP_503_SERVICE_UNAVAILABLE,
    OAuthError:                   status.HTTP_502_BAD_GATEWAY,
    BookNotFoundError:            status.HTTP_404_NOT_FOUND,
    NotBookOwnerError:            status.HTTP_403_FORBIDDEN,
    NotSellerError:               status.HTTP_403_FORBIDDEN,
    OrderNotFoundError:           status.HTTP_404_NOT_FOUND,
    NotOrderOwnerError:           status.HTTP_403_FORBIDDEN,
    InsufficientStockError:       status.HTTP_409_CONFLICT,
    InvalidStatusTransitionError: status.HTTP_422_UNPROCESSABLE_ENTITY,
    OrderNotCancellableError:     status.HTTP_422_UNPROCESSABLE_ENTITY,
    PaymentError:                 status.HTTP_402_PAYMENT_REQUIRED,
    StripeWebhookError:           status.HTTP_400_BAD_REQUEST,
    RefundError:                  status.HTTP_402_PAYMENT_REQUIRED,
}


def _error_body(status_code: int, detail: Any) -> dict:
    return {"status_code": status_code, "detail": detail}


# ─────────────────────────────────────────────────────────────────────────────
# Lifespan — startup / shutdown
# ─────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — startup before yield, shutdown after."""
    # ── STARTUP ──────────────────────────────────────────────────────────────
    logger.info("Starting up %s v%s …", settings.APP_NAME, settings.APP_VERSION)
    logger.info(
        "Environment: %s | Debug: %s | DB pool size: %s",
        settings.ENVIRONMENT,
        settings.DEBUG,
        settings.DATABASE_POOL_SIZE,
    )

    # Warm the DB connection pool with a fast probe
    try:
        from sqlalchemy import text
        async with async_session_maker() as session:
            await session.execute(text("SELECT 1"))
        logger.info("Database connection pool initialised ✓")
    except Exception as exc:  # pragma: no cover
        logger.warning("Database warmup failed (will retry on first request): %s", exc)

    # Init Redis for rate limiter
    try:
        redis = await rate_limiter.get_redis()
        await redis.ping()
        logger.info("Redis connection established ✓")
    except Exception as exc:  # pragma: no cover
        logger.warning(
            "Redis unavailable — rate limiting will be disabled: %s", exc
        )

    yield  # ── application is running ─────────────────────────────────────

    # ── SHUTDOWN ─────────────────────────────────────────────────────────────
    logger.info("Shutting down %s …", settings.APP_NAME)
    await rate_limiter.close()
    logger.info("Redis connection closed ✓")
    logger.info("Shutdown complete.")


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI app
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "**Books4All** is a peer-to-peer used-book marketplace API.\n\n"
        "## Features\n"
        "- 🔐 JWT authentication (email/password + Google & GitHub OAuth)\n"
        "- 📚 Book listings with search, filters, and pagination\n"
        "- 🛒 Order management with inventory tracking\n"
        "- 💳 Stripe payment integration\n"
        "- ⭐ Verified-purchase book reviews\n\n"
        "## Authentication\n"
        "Most endpoints require a Bearer token obtained from `POST /api/v1/auth/login`."
    ),
    contact={
        "name": "Books4All Team",
        "email": "support@books4all.example.com",
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
    lifespan=lifespan,
)


# ─────────────────────────────────────────────────────────────────────────────
# Middleware
# ─────────────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

app.add_middleware(
    RateLimitMiddleware,
    calls=settings.RATE_LIMIT_DEFAULT_CALLS,
    period=settings.RATE_LIMIT_DEFAULT_PERIOD,
    exclude_paths=[
        "/health",
        "/metrics",
        f"{settings.API_V1_PREFIX}/docs",
        f"{settings.API_V1_PREFIX}/redoc",
        f"{settings.API_V1_PREFIX}/openapi.json",
        "/payments/webhook",        # Stripe webhooks must not be rate-limited
    ],
)


# ─────────────────────────────────────────────────────────────────────────────
# Global exception handlers
# ─────────────────────────────────────────────────────────────────────────────

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Return structured 422 with field-level error details."""
    errors = []
    for error in exc.errors():
        field = " → ".join(str(loc) for loc in error["loc"])
        errors.append({"field": field, "message": error["msg"], "type": error["type"]})
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=_error_body(422, errors),
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(
    request: Request, exc: HTTPException
) -> JSONResponse:
    """Standardise HTTPException responses."""
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_body(exc.status_code, exc.detail),
        headers=getattr(exc, "headers", None),
    )


@app.exception_handler(ServiceError)
async def service_exception_handler(
    request: Request, exc: ServiceError
) -> JSONResponse:
    """Map typed service exceptions to appropriate HTTP status codes."""
    http_status = _SERVICE_EXCEPTION_MAP.get(type(exc), status.HTTP_500_INTERNAL_SERVER_ERROR)
    logger.warning(
        "ServiceError [%s] on %s %s: %s",
        type(exc).__name__,
        request.method,
        request.url.path,
        exc,
    )
    return JSONResponse(
        status_code=http_status,
        content=_error_body(http_status, str(exc)),
    )


@app.exception_handler(Exception)
async def generic_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Catch-all handler — never expose internal details in production."""
    logger.exception(
        "Unhandled exception on %s %s: %s",
        request.method,
        request.url.path,
        exc,
    )
    if settings.DEBUG:
        detail = f"{type(exc).__name__}: {exc}"
    else:
        detail = "An unexpected error occurred. Please try again later."

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=_error_body(500, detail),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Core system endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.get(
    "/health",
    tags=["System"],
    summary="Health check",
    description="Returns service health status including DB and Redis connectivity.",
)
async def health_check() -> dict:
    """Live health probe for load balancers and orchestrators."""
    health: dict[str, Any] = {
        "status": "healthy",
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "timestamp": time.time(),
        "services": {},
    }

    # Database ping
    try:
        from sqlalchemy import text
        async with async_session_maker() as session:
            await session.execute(text("SELECT 1"))
        health["services"]["database"] = "ok"
    except Exception as exc:
        health["services"]["database"] = f"error: {exc}"
        health["status"] = "degraded"

    # Redis ping
    try:
        redis = await rate_limiter.get_redis()
        await redis.ping()
        health["services"]["redis"] = "ok"
    except Exception as exc:
        health["services"]["redis"] = f"error: {exc}"
        health["status"] = "degraded"

    return health


@app.get(
    "/metrics",
    tags=["System"],
    summary="Prometheus metrics",
    description=(
        "Exposes Prometheus-compatible metrics if `prometheus_client` is installed. "
        "Returns a basic plain-text stub otherwise."
    ),
    response_class=PlainTextResponse,
)
async def metrics() -> PlainTextResponse:
    """Prometheus metrics endpoint."""
    try:
        from prometheus_client import CONTENT_TYPE_LATEST, generate_latest  # type: ignore

        return PlainTextResponse(
            content=generate_latest().decode("utf-8"),
            media_type=CONTENT_TYPE_LATEST,
        )
    except ImportError:
        # Graceful fallback — prometheus_client not installed
        stub = (
            "# HELP books4all_up Application is running\n"
            "# TYPE books4all_up gauge\n"
            f"books4all_up 1\n"
            f"# HELP books4all_info Application info\n"
            f"# TYPE books4all_info gauge\n"
            f'books4all_info{{version="{settings.APP_VERSION}",'
            f'environment="{settings.ENVIRONMENT}"}} 1\n'
        )
        return PlainTextResponse(content=stub, media_type="text/plain; version=0.0.4")


@app.get("/", tags=["System"], include_in_schema=False)
async def root() -> dict:
    """Root — redirect hint for humans."""
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "docs": f"{settings.API_V1_PREFIX}/docs",
        "health": "/health",
    }


# ─────────────────────────────────────────────────────────────────────────────
# Mount API router
# ─────────────────────────────────────────────────────────────────────────────

app.include_router(api_router, prefix=settings.API_V1_PREFIX)
