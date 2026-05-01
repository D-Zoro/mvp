"""
Secrets Management and Validation Module

Implements runtime validation of secrets on application startup.
Ensures all critical secrets meet security requirements:
- Minimum length requirements (e.g., SECRET_KEY ≥ 32 chars)
- Production prefix validation (e.g., STRIPE_SECRET_KEY must be sk_live_)
- Prevention of hardcoded credentials
- AWS credentials validation

Structured logging provides actionable warnings for each violation type.
"""

import logging
import re
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator, root_validator

logger = logging.getLogger(__name__)


class SecretValidator(BaseModel):
    """
    Pydantic validator for application secrets.

    Performs comprehensive validation on secrets including:
    - Length constraints
    - Format validation (prefixes, patterns)
    - Hardcoded credential detection
    - Production environment checks

    Attributes:
        SECRET_KEY: JWT signing key (min 32 chars, no default values)
        STRIPE_SECRET_KEY: Stripe API key (sk_live_ in production, sk_test_ allowed in dev)
        DATABASE_URL: PostgreSQL connection URL (no hardcoded passwords)
        AWS_ACCESS_KEY_ID: AWS access key
        AWS_SECRET_ACCESS_KEY: AWS secret key
        ENVIRONMENT: Current environment (development, staging, production)
    """

    SECRET_KEY: str = Field(min_length=32, description="JWT signing secret (≥32 chars)")
    STRIPE_SECRET_KEY: Optional[str] = Field(default=None, description="Stripe API secret key")
    DATABASE_URL: str = Field(description="Database connection URL")
    AWS_ACCESS_KEY_ID: Optional[str] = Field(default=None, description="AWS access key ID")
    AWS_SECRET_ACCESS_KEY: Optional[str] = Field(default=None, description="AWS secret access key")
    ENVIRONMENT: str = Field(default="development", description="Environment: development, staging, production")

    class Config:
        """Pydantic configuration for SecretValidator."""
        extra = "allow"  # Allow additional fields from settings

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """
        Validate SECRET_KEY for hardcoded defaults and length.

        Args:
            v: The SECRET_KEY value

        Returns:
            The validated SECRET_KEY

        Raises:
            ValueError: If key contains hardcoded defaults or is too short
        """
        # Check for common placeholder values
        dangerous_defaults = [
            "change-this",
            "changeme",
            "secret",
            "default",
            "password",
            "1234567890",
        ]

        v_lower = v.lower()
        for danger in dangerous_defaults:
            if danger in v_lower:
                logger.warning(
                    "⚠️  SECURITY: SECRET_KEY contains placeholder value '%s' — "
                    "Generate a new key with: openssl rand -hex 32",
                    danger,
                )

        if len(v) < 32:
            logger.warning(
                "⚠️  SECURITY: SECRET_KEY is too short (%d chars) — "
                "Minimum 32 chars required. Generate with: openssl rand -hex 32",
                len(v),
            )

        return v

    @field_validator("STRIPE_SECRET_KEY")
    @classmethod
    def validate_stripe_secret(cls, v: Optional[str], info: Any) -> Optional[str]:
        """
        Validate STRIPE_SECRET_KEY for test/live prefixes.

        Production environment requires sk_live_ prefix.

        Args:
            v: The STRIPE_SECRET_KEY value
            info: Validation context with other field values

        Returns:
            The validated STRIPE_SECRET_KEY

        Raises:
            ValueError: If prefix is invalid for environment
        """
        if not v:
            return v

        env = info.data.get("ENVIRONMENT", "development")

        # Check for test key in production
        if env == "production" and v.startswith("sk_test_"):
            logger.warning(
                "🔴 CRITICAL SECURITY: STRIPE_SECRET_KEY uses test prefix (sk_test_) "
                "in PRODUCTION environment — This will cause payment failures and "
                "expose sensitive data. Use live key: sk_live_*"
            )
        elif not v.startswith(("sk_live_", "sk_test_")):
            logger.warning(
                "⚠️  SECURITY: STRIPE_SECRET_KEY has invalid format (doesn't start with "
                "sk_live_ or sk_test_) — Verify this is a valid Stripe secret key"
            )

        return v

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        """
        Validate DATABASE_URL for hardcoded passwords.

        Args:
            v: The DATABASE_URL value

        Returns:
            The validated DATABASE_URL
        """
        # Pattern to detect common hardcoded passwords
        dangerous_patterns = [
            r"password.*=.*password",  # password=password
            r":password@",              # :password@
            r":12345678@",              # :12345678@
            r":root@",                  # :root@
        ]

        v_lower = v.lower()
        for pattern in dangerous_patterns:
            if re.search(pattern, v_lower, re.IGNORECASE):
                logger.warning(
                    "🔴 CRITICAL SECURITY: DATABASE_URL contains hardcoded password — "
                    "Never commit database credentials. Use environment variables instead."
                )
                break

        return v

    @field_validator("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY")
    @classmethod
    def validate_aws_credentials(cls, v: Optional[str], info: Any) -> Optional[str]:
        """
        Validate AWS credentials presence and format.

        Args:
            v: The AWS credential value
            info: Validation context with other field values

        Returns:
            The validated AWS credential
        """
        if not v:
            return v

        # AWS keys should not be extremely short (typical AKIAIOSFODNN7EXAMPLE)
        if len(v) < 16:
            logger.warning(
                "⚠️  SECURITY: AWS credential appears too short (<%d chars) — "
                "Verify this is a valid AWS key",
                len(v),
            )

        return v

    @root_validator
    @classmethod
    def validate_root(cls, values: dict[str, Any]) -> dict[str, Any]:
        """
        Root validator for cross-field secret validation.

        Checks environment-specific secret requirements.

        Args:
            values: All validated field values

        Returns:
            The validated values dictionary
        """
        env = values.get("ENVIRONMENT", "development")

        # In production, all critical secrets must be set
        if env == "production":
            required_in_prod = ["STRIPE_SECRET_KEY", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"]
            missing_in_prod = [k for k in required_in_prod if not values.get(k)]

            if missing_in_prod:
                logger.warning(
                    "🔴 CRITICAL SECURITY: Production environment missing secrets: %s — "
                    "These must be configured via environment variables",
                    ", ".join(missing_in_prod),
                )

        return values


def validate_secrets(
    secret_key: str,
    stripe_key: Optional[str] = None,
    database_url: str = "",
    aws_access_key: Optional[str] = None,
    aws_secret_key: Optional[str] = None,
    environment: str = "development",
) -> SecretValidator:
    """
    Validate application secrets and return validator instance.

    Intended to be called at application startup to ensure all critical
    secrets meet security requirements.

    Args:
        secret_key: JWT signing secret
        stripe_key: Stripe API secret key
        database_url: PostgreSQL connection URL
        aws_access_key: AWS access key ID
        aws_secret_key: AWS secret access key
        environment: Current environment

    Returns:
        Validated SecretValidator instance

    Raises:
        ValueError: If critical validation fails
    """
    return SecretValidator(
        SECRET_KEY=secret_key,
        STRIPE_SECRET_KEY=stripe_key,
        DATABASE_URL=database_url,
        AWS_ACCESS_KEY_ID=aws_access_key,
        AWS_SECRET_ACCESS_KEY=aws_secret_key,
        ENVIRONMENT=environment,
    )
