"""
Authentication API endpoints.

Routes:
    POST /auth/register          — Register new user
    POST /auth/login             — Login with email/password
    POST /auth/refresh           — Refresh access token
    POST /auth/logout            — Logout (client drops token)
    GET  /auth/me                — Get current user profile
    POST /auth/verify-email      — Verify email address
    POST /auth/forgot-password   — Request password reset
    POST /auth/reset-password    — Confirm password reset
    GET  /auth/google            — Get Google OAuth URL
    POST /auth/google/callback   — Google OAuth callback
    GET  /auth/github            — Get GitHub OAuth URL
    POST /auth/github/callback   — GitHub OAuth callback
"""

import logging
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.dependencies import ActiveUser, DBSession
from app.core.rate_limiter import rate_limit
from app.schemas.auth import (
    AuthResponse,
    EmailVerificationRequest,
    LoginRequest,
    OAuthCallbackRequest,
    OAuthURLResponse,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.user import UserResponse
from app.services import (
    AccountInactiveError,
    AuthService,
    EmailAlreadyExistsError,
    InvalidCredentialsError,
    InvalidTokenError,
    OAuthError,
    OAuthNotConfiguredError,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _map_auth_exception(exc: Exception) -> HTTPException:
    """Map service exceptions to HTTP responses."""
    if isinstance(exc, EmailAlreadyExistsError):
        return HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    if isinstance(exc, InvalidCredentialsError):
        return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc))
    if isinstance(exc, InvalidTokenError):
        return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    if isinstance(exc, AccountInactiveError):
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))
    if isinstance(exc, OAuthNotConfiguredError):
        return HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)
        )
    if isinstance(exc, OAuthError):
        return HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
    raise exc  # unexpected — let the global handler deal with it


# ─────────────────────────────────────────────────────────────────────────────
# Registration & Login
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Create a new user account and return tokens + user info.",
    responses={
        201: {"description": "User registered successfully"},
        409: {"description": "Email already in use"},
        422: {"description": "Validation error"},
    },
)
@rate_limit(calls=10, period=60)
async def register(
    request: Request,
    payload: RegisterRequest,
    db: DBSession,
) -> AuthResponse:
    """Register a new user account."""
    try:
        svc = AuthService(db)
        return await svc.register(
            email=payload.email,
            password=payload.password,
            first_name=payload.first_name,
            last_name=payload.last_name,
            role=payload.role,
        )
    except (
        EmailAlreadyExistsError,
        InvalidCredentialsError,
        InvalidTokenError,
        AccountInactiveError,
        OAuthNotConfiguredError,
        OAuthError,
    ) as exc:
        raise _map_auth_exception(exc)


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Login with email and password",
    description="Authenticate with email/password and receive JWT tokens.",
    responses={
        200: {"description": "Login successful"},
        401: {"description": "Invalid credentials"},
        403: {"description": "Account inactive"},
    },
)
@rate_limit(calls=5, period=900)  # 5 attempts / 15 min
async def login(
    request: Request,
    payload: LoginRequest,
    db: DBSession,
) -> AuthResponse:
    """Login and receive access + refresh tokens."""
    try:
        svc = AuthService(db)
        return await svc.login(email=payload.email, password=payload.password)
    except (
        InvalidCredentialsError,
        AccountInactiveError,
        EmailAlreadyExistsError,
        InvalidTokenError,
        OAuthNotConfiguredError,
        OAuthError,
    ) as exc:
        raise _map_auth_exception(exc)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
    description="Exchange a valid refresh token for a new token pair.",
    responses={
        200: {"description": "Tokens refreshed"},
        400: {"description": "Invalid or expired refresh token"},
    },
)
@rate_limit(calls=20, period=60)
async def refresh_token(
    request: Request,
    payload: RefreshTokenRequest,
    db: DBSession,
) -> TokenResponse:
    """Get a new access/refresh token pair."""
    try:
        svc = AuthService(db)
        return await svc.refresh_token(refresh_token=payload.refresh_token)
    except (InvalidTokenError, AccountInactiveError) as exc:
        raise _map_auth_exception(exc)


@router.post(
    "/logout",
    summary="Logout",
    description=(
        "Logout the current user. Tokens are stateless JWTs — "
        "the client should discard them. Returns 200 OK."
    ),
    status_code=status.HTTP_200_OK,
)
async def logout(current_user: ActiveUser) -> dict:
    """Logout endpoint — client-side token removal."""
    logger.info("User logged out: id=%s", current_user.id)
    return {"message": "Logged out successfully"}


# ─────────────────────────────────────────────────────────────────────────────
# Current User Profile
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
    description="Return the profile of the currently authenticated user.",
    responses={
        200: {"description": "Current user profile"},
        401: {"description": "Not authenticated"},
    },
)
async def get_me(current_user: ActiveUser) -> UserResponse:
    """Get the current authenticated user's profile."""
    return UserResponse.model_validate(current_user)


# ─────────────────────────────────────────────────────────────────────────────
# Email Verification
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/verify-email",
    response_model=UserResponse,
    summary="Verify email address",
    description="Verify a user's email using the token sent to their inbox.",
    responses={
        200: {"description": "Email verified successfully"},
        400: {"description": "Invalid or expired token"},
    },
)
@rate_limit(calls=5, period=60)
async def verify_email(
    request: Request,
    payload: EmailVerificationRequest,
    db: DBSession,
) -> UserResponse:
    """Verify an email address with a verification token."""
    try:
        svc = AuthService(db)
        return await svc.verify_email(token=payload.token)
    except InvalidTokenError as exc:
        raise _map_auth_exception(exc)


# ─────────────────────────────────────────────────────────────────────────────
# Password Reset
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/forgot-password",
    summary="Request password reset",
    description=(
        "Send a password reset link to the provided email. "
        "Always returns 200 to prevent email enumeration."
    ),
    status_code=status.HTTP_200_OK,
)
@rate_limit(calls=5, period=300)  # 5 per 5 minutes
async def forgot_password(
    request: Request,
    payload: PasswordResetRequest,
    db: DBSession,
) -> dict:
    """Request a password reset email."""
    svc = AuthService(db)
    token = await svc.request_password_reset(email=payload.email)
    # In production: email_service.send_reset_email(payload.email, token)
    # For dev, we log the token (NEVER do this in production)
    if token:
        logger.debug("Password reset token for %s: %s", payload.email, token)
    return {"message": "If that email exists, a reset link has been sent."}


@router.post(
    "/reset-password",
    response_model=UserResponse,
    summary="Confirm password reset",
    description="Reset your password using the token from the reset email.",
    responses={
        200: {"description": "Password reset successfully"},
        400: {"description": "Invalid or expired token"},
    },
)
@rate_limit(calls=5, period=300)
async def reset_password(
    request: Request,
    payload: PasswordResetConfirm,
    db: DBSession,
) -> UserResponse:
    """Confirm password reset with token and new password."""
    try:
        svc = AuthService(db)
        return await svc.confirm_password_reset(
            token=payload.token,
            new_password=payload.new_password,
        )
    except InvalidTokenError as exc:
        raise _map_auth_exception(exc)


# ─────────────────────────────────────────────────────────────────────────────
# OAuth — Google
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/google",
    response_model=OAuthURLResponse,
    summary="Get Google OAuth URL",
    description="Return the URL to redirect the user to for Google OAuth login.",
    responses={
        200: {"description": "Google OAuth authorization URL"},
        503: {"description": "Google OAuth not configured"},
    },
)
async def google_auth_url(db: DBSession) -> OAuthURLResponse:
    """Get Google OAuth authorization URL."""
    try:
        svc = AuthService(db)
        url, state = svc.get_google_auth_url()
        return OAuthURLResponse(authorization_url=url, state=state)
    except OAuthNotConfiguredError as exc:
        raise _map_auth_exception(exc)


@router.post(
    "/google/callback",
    response_model=AuthResponse,
    summary="Google OAuth callback",
    description="Exchange Google authorization code for user tokens.",
    responses={
        200: {"description": "Google OAuth login successful"},
        400: {"description": "OAuth code invalid"},
        503: {"description": "Google OAuth not configured"},
    },
)
async def google_callback(
    payload: OAuthCallbackRequest,
    db: DBSession,
) -> AuthResponse:
    """Handle Google OAuth callback and login/register user."""
    try:
        svc = AuthService(db)
        return await svc.google_login(code=payload.code)
    except (OAuthNotConfiguredError, OAuthError, AccountInactiveError) as exc:
        raise _map_auth_exception(exc)


# ─────────────────────────────────────────────────────────────────────────────
# OAuth — GitHub
# ─────────────────────────────────────────────────────────────────────────────

@router.get(
    "/github",
    response_model=OAuthURLResponse,
    summary="Get GitHub OAuth URL",
    description="Return the URL to redirect the user to for GitHub OAuth login.",
    responses={
        200: {"description": "GitHub OAuth authorization URL"},
        503: {"description": "GitHub OAuth not configured"},
    },
)
async def github_auth_url(db: DBSession) -> OAuthURLResponse:
    """Get GitHub OAuth authorization URL."""
    try:
        svc = AuthService(db)
        url, state = svc.get_github_auth_url()
        return OAuthURLResponse(authorization_url=url, state=state)
    except OAuthNotConfiguredError as exc:
        raise _map_auth_exception(exc)


@router.post(
    "/github/callback",
    response_model=AuthResponse,
    summary="GitHub OAuth callback",
    description="Exchange GitHub authorization code for user tokens.",
    responses={
        200: {"description": "GitHub OAuth login successful"},
        400: {"description": "OAuth code invalid"},
        503: {"description": "GitHub OAuth not configured"},
    },
)
async def github_callback(
    payload: OAuthCallbackRequest,
    db: DBSession,
) -> AuthResponse:
    """Handle GitHub OAuth callback and login/register user."""
    try:
        svc = AuthService(db)
        return await svc.github_login(code=payload.code)
    except (OAuthNotConfiguredError, OAuthError, AccountInactiveError) as exc:
        raise _map_auth_exception(exc)
