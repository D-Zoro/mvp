"""
Authentication Service.

Handles all authentication business logic:
- User registration (email/password)
- Login and token issuance
- Token refresh
- OAuth login (Google & GitHub)
- Email verification flow
- Password reset flow
"""

import logging
import secrets
from typing import Optional
from uuid import UUID

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_token_pair,
    generate_email_verification_token,
    generate_password_reset_token,
    verify_email_verification_token,
    verify_password,
    verify_password_reset_token,
    verify_refresh_token,
)
from app.models.user import OAuthProvider, User, UserRole
from app.repositories.user import UserRepository
from app.schemas.auth import AuthResponse, TokenResponse
from app.schemas.user import UserResponse
from app.services.exceptions import (
    AccountInactiveError,
    EmailAlreadyExistsError,
    InvalidCredentialsError,
    InvalidTokenError,
    OAuthError,
    OAuthNotConfiguredError,
)

logger = logging.getLogger(__name__)


def _build_token_response(user: User) -> AuthResponse:
    """Build an AuthResponse from a User, issuing a fresh token pair."""
    tokens = create_token_pair(user.id, user.role.value)
    return AuthResponse(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        token_type=tokens.token_type,
        expires_in=tokens.expires_in,
        user=UserResponse.model_validate(user),
    )


def _build_token_only_response(user: User) -> TokenResponse:
    """Build a TokenResponse (no user payload) from a User."""
    tokens = create_token_pair(user.id, user.role.value)
    return TokenResponse(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        token_type=tokens.token_type,
        expires_in=tokens.expires_in,
    )


class AuthService:
    """
    Service handling authentication and authorisation operations.

    All methods take an ``AsyncSession`` as their first argument so that
    the caller (endpoint handler) owns the unit-of-work / commit boundary.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.user_repo = UserRepository(db)

    # ─────────────────────────────────────────────
    # Registration
    # ─────────────────────────────────────────────

    async def register(
        self,
        *,
        email: str,
        password: str,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        role: UserRole = UserRole.BUYER,
    ) -> AuthResponse:
        """
        Register a new user with email and password.

        Args:
            email: User email address.
            password: Plain-text password (validated by schema before reaching here).
            first_name: Optional first name.
            last_name: Optional last name.
            role: Role to assign (buyer or seller — admin cannot self-register).

        Returns:
            AuthResponse with tokens and user info.

        Raises:
            EmailAlreadyExistsError: If the email is already taken.
        """
        # Guard: duplicate email
        if await self.user_repo.email_exists(email):
            raise EmailAlreadyExistsError(
                f"An account with email '{email}' already exists."
            )

        user = await self.user_repo.create_with_password(
            email=email,
            password=password,
            role=role,
            first_name=first_name,
            last_name=last_name,
        )
        await self.db.commit()
        await self.db.refresh(user)

        logger.info("New user registered: id=%s email=%s role=%s", user.id, user.email, user.role)

        # NOTE: In production you'd send an email verification link here.
        # token = generate_email_verification_token(user.email)
        # email_service.send_verification_email(user.email, token)

        return _build_token_response(user)

    # ─────────────────────────────────────────────
    # Login
    # ─────────────────────────────────────────────

    async def login(self, *, email: str, password: str) -> AuthResponse:
        """
        Authenticate a user with email and password.

        Args:
            email: User email.
            password: Plain-text password.

        Returns:
            AuthResponse with fresh token pair.

        Raises:
            InvalidCredentialsError: Email not found or password wrong.
            AccountInactiveError: Account is deactivated.
        """
        user = await self.user_repo.get_by_email(email)

        # Deliberate: same error for "not found" and "wrong password"
        # to prevent email enumeration.
        if user is None or user.password_hash is None:
            raise InvalidCredentialsError("Invalid email or password.")

        if not verify_password(password, user.password_hash):
            raise InvalidCredentialsError("Invalid email or password.")

        if not user.is_active:
            raise AccountInactiveError("Your account has been deactivated.")

        logger.info("User logged in: id=%s", user.id)
        return _build_token_response(user)

    # ─────────────────────────────────────────────
    # Token refresh
    # ─────────────────────────────────────────────

    async def refresh_token(self, *, refresh_token: str) -> TokenResponse:
        """
        Issue a new access/refresh token pair from a valid refresh token.

        Args:
            refresh_token: The JWT refresh token.

        Returns:
            New TokenResponse.

        Raises:
            InvalidTokenError: Token is malformed, expired, or wrong type.
            AccountInactiveError: Account has been deactivated since token issuance.
        """
        payload = verify_refresh_token(refresh_token)
        if payload is None:
            raise InvalidTokenError("Refresh token is invalid or has expired.")

        user = await self.user_repo.get(UUID(payload.sub))
        if user is None:
            raise InvalidTokenError("User associated with token no longer exists.")

        if not user.is_active:
            raise AccountInactiveError("Your account has been deactivated.")

        return _build_token_only_response(user)

    # ─────────────────────────────────────────────
    # Email verification
    # ─────────────────────────────────────────────

    def generate_email_verification_link(self, email: str) -> str:
        """
        Return the verification token (caller decides how to deliver it).

        In production the endpoint would e-mail this link to the user.
        """
        return generate_email_verification_token(email)

    async def verify_email(self, *, token: str) -> UserResponse:
        """
        Mark a user's email as verified.

        Args:
            token: Email verification JWT.

        Returns:
            Updated UserResponse.

        Raises:
            InvalidTokenError: Token invalid or expired.
        """
        email = verify_email_verification_token(token)
        if email is None:
            raise InvalidTokenError("Email verification token is invalid or has expired.")

        user = await self.user_repo.get_by_email(email)
        if user is None:
            raise InvalidTokenError("No account found for that verification token.")

        if not user.email_verified:
            await self.user_repo.verify_email(user.id)
            await self.db.commit()
            await self.db.refresh(user)

        return UserResponse.model_validate(user)

    # ─────────────────────────────────────────────
    # Password reset
    # ─────────────────────────────────────────────

    async def request_password_reset(self, *, email: str) -> Optional[str]:
        """
        Generate a password reset token for the given email.

        Returns the token string (caller handles delivery), or None if no
        account exists — we don't reveal whether the email is registered.
        """
        user = await self.user_repo.get_by_email(email)
        if user is None:
            # Silently succeed to prevent email enumeration
            return None

        token = generate_password_reset_token(email)
        logger.info("Password reset requested for: %s", email)
        return token

    async def confirm_password_reset(self, *, token: str, new_password: str) -> UserResponse:
        """
        Reset a user's password using a valid reset token.

        Args:
            token: Password reset JWT.
            new_password: New plain-text password.

        Returns:
            Updated UserResponse.

        Raises:
            InvalidTokenError: Token invalid or expired.
        """
        email = verify_password_reset_token(token)
        if email is None:
            raise InvalidTokenError("Password reset token is invalid or has expired.")

        user = await self.user_repo.get_by_email(email)
        if user is None:
            raise InvalidTokenError("No account found for that reset token.")

        await self.user_repo.update_password(user.id, new_password)
        await self.db.commit()
        await self.db.refresh(user)

        logger.info("Password reset for user: id=%s", user.id)
        return UserResponse.model_validate(user)

    # ─────────────────────────────────────────────
    # OAuth — Google
    # ─────────────────────────────────────────────

    def get_google_auth_url(self) -> tuple[str, str]:
        """
        Build the Google OAuth authorisation URL.

        Returns:
            (authorization_url, state) tuple.

        Raises:
            OAuthNotConfiguredError: Google OAuth credentials not set.
        """
        if not settings.google_oauth_enabled:
            raise OAuthNotConfiguredError("Google OAuth is not configured.")

        state = secrets.token_urlsafe(32)
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "access_type": "offline",
        }
        base = "https://accounts.google.com/o/oauth2/v2/auth"
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{base}?{query}", state

    async def google_login(self, *, code: str) -> AuthResponse:
        """
        Exchange Google OAuth code for user profile and issue tokens.

        Args:
            code: Authorization code from Google callback.

        Returns:
            AuthResponse with tokens and user info.

        Raises:
            OAuthNotConfiguredError: Google credentials not configured.
            OAuthError: Google token exchange or profile fetch failed.
        """
        if not settings.google_oauth_enabled:
            raise OAuthNotConfiguredError("Google OAuth is not configured.")

        async with httpx.AsyncClient() as client:
            # Exchange code for access token
            token_resp = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                    "grant_type": "authorization_code",
                },
            )
            if token_resp.status_code != 200:
                raise OAuthError(f"Google token exchange failed: {token_resp.text}")

            token_data = token_resp.json()
            google_access_token = token_data.get("access_token")
            if not google_access_token:
                raise OAuthError("No access_token in Google response.")

            # Fetch user profile
            profile_resp = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {google_access_token}"},
            )
            if profile_resp.status_code != 200:
                raise OAuthError("Failed to fetch Google user profile.")

            profile = profile_resp.json()

        return await self._oauth_login(
            provider=OAuthProvider.GOOGLE,
            provider_id=profile["id"],
            email=profile.get("email", ""),
            first_name=profile.get("given_name"),
            last_name=profile.get("family_name"),
            avatar_url=profile.get("picture"),
        )

    # ─────────────────────────────────────────────
    # OAuth — GitHub
    # ─────────────────────────────────────────────

    def get_github_auth_url(self) -> tuple[str, str]:
        """
        Build the GitHub OAuth authorisation URL.

        Returns:
            (authorization_url, state) tuple.

        Raises:
            OAuthNotConfiguredError: GitHub OAuth credentials not set.
        """
        if not settings.github_oauth_enabled:
            raise OAuthNotConfiguredError("GitHub OAuth is not configured.")

        state = secrets.token_urlsafe(32)
        params = {
            "client_id": settings.GITHUB_CLIENT_ID,
            "redirect_uri": settings.GITHUB_REDIRECT_URI,
            "scope": "user:email",
            "state": state,
        }
        base = "https://github.com/login/oauth/authorize"
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{base}?{query}", state

    async def github_login(self, *, code: str) -> AuthResponse:
        """
        Exchange GitHub OAuth code for user profile and issue tokens.

        Args:
            code: Authorization code from GitHub callback.

        Returns:
            AuthResponse with tokens and user info.

        Raises:
            OAuthNotConfiguredError: GitHub credentials not configured.
            OAuthError: GitHub token exchange or profile fetch failed.
        """
        if not settings.github_oauth_enabled:
            raise OAuthNotConfiguredError("GitHub OAuth is not configured.")

        async with httpx.AsyncClient() as client:
            # Exchange code for access token
            token_resp = await client.post(
                "https://github.com/login/oauth/access_token",
                data={
                    "client_id": settings.GITHUB_CLIENT_ID,
                    "client_secret": settings.GITHUB_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": settings.GITHUB_REDIRECT_URI,
                },
                headers={"Accept": "application/json"},
            )
            if token_resp.status_code != 200:
                raise OAuthError(f"GitHub token exchange failed: {token_resp.text}")

            token_data = token_resp.json()
            github_token = token_data.get("access_token")
            if not github_token:
                raise OAuthError("No access_token in GitHub response.")

            # Fetch profile
            profile_resp = await client.get(
                "https://api.github.com/user",
                headers={
                    "Authorization": f"Bearer {github_token}",
                    "Accept": "application/vnd.github+json",
                },
            )
            if profile_resp.status_code != 200:
                raise OAuthError("Failed to fetch GitHub user profile.")
            profile = profile_resp.json()

            # GitHub may not expose primary email in /user; check /user/emails
            email = profile.get("email")
            if not email:
                emails_resp = await client.get(
                    "https://api.github.com/user/emails",
                    headers={
                        "Authorization": f"Bearer {github_token}",
                        "Accept": "application/vnd.github+json",
                    },
                )
                if emails_resp.status_code == 200:
                    for entry in emails_resp.json():
                        if entry.get("primary") and entry.get("verified"):
                            email = entry["email"]
                            break

            if not email:
                raise OAuthError(
                    "Could not retrieve a verified email from GitHub. "
                    "Please make your email public or use email/password sign-up."
                )

            # Parse name
            full_name: str = profile.get("name") or ""
            parts = full_name.split(" ", 1)
            first_name = parts[0] if parts else None
            last_name = parts[1] if len(parts) > 1 else None

        return await self._oauth_login(
            provider=OAuthProvider.GITHUB,
            provider_id=str(profile["id"]),
            email=email,
            first_name=first_name,
            last_name=last_name,
            avatar_url=profile.get("avatar_url"),
        )

    # ─────────────────────────────────────────────
    # Internal OAuth helper
    # ─────────────────────────────────────────────

    async def _oauth_login(
        self,
        *,
        provider: OAuthProvider,
        provider_id: str,
        email: str,
        first_name: Optional[str],
        last_name: Optional[str],
        avatar_url: Optional[str],
    ) -> AuthResponse:
        """
        Find-or-create a user from OAuth profile data and return tokens.

        Strategy:
        1. If we find a user by provider+provider_id → log them in.
        2. If we find a user by email → link the OAuth provider to the account.
        3. Otherwise → create a new user.
        """
        # 1. Existing OAuth user
        user = await self.user_repo.get_by_oauth(provider, provider_id)

        if user is None:
            # 2. Email match — link OAuth to existing account
            user = await self.user_repo.get_by_email(email)
            if user is not None:
                user.oauth_provider = provider
                user.oauth_provider_id = provider_id
                if avatar_url and not user.avatar_url:
                    user.avatar_url = avatar_url
                self.db.add(user)
            else:
                # 3. Brand-new user
                user = await self.user_repo.create_oauth_user(
                    email=email,
                    provider=provider,
                    provider_id=provider_id,
                    first_name=first_name,
                    last_name=last_name,
                    avatar_url=avatar_url,
                )

        if not user.is_active:
            raise AccountInactiveError("Your account has been deactivated.")

        await self.db.commit()
        await self.db.refresh(user)

        logger.info(
            "OAuth login: provider=%s user_id=%s", provider.value, user.id
        )
        return _build_token_response(user)
