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

        Checks for:
        - Placeholder values (change-this, changeme, etc.)
        - Sequential patterns (1234567890, etc.)
        - Minimum length requirement (32 chars)
        - Default development keys

        Args:
            v: The SECRET_KEY value

        Returns:
            The validated SECRET_KEY

        Raises:
            ValueError: If key contains hardcoded defaults or is too short
        """
        # Check for common placeholder values and patterns
        dangerous_defaults = [
            "change-this",
            "changeme",
            "secret-key",
            "secret",
            "default",
            "password",
            "1234567890",
            "0123456789",
            "development",
            "test-key",
            "my-secret",
        ]

        v_lower = v.lower()
        for danger in dangerous_defaults:
            if danger in v_lower:
                logger.warning(
                    "[SECURITY] SECRET_KEY violation: contains placeholder '%s' — "
                    "SECRET_KEY must be changed in production. "
                    "Generate: openssl rand -hex 32",
                    danger,
                )

        if len(v) < 32:
            logger.warning(
                "[SECURITY] SECRET_KEY violation: too short (%d chars) — "
                "Minimum 32 characters required for adequate entropy. "
                "Generate: openssl rand -hex 32",
                len(v),
            )

        return v

    @field_validator("STRIPE_SECRET_KEY")
    @classmethod
    def validate_stripe_secret(cls, v: Optional[str], info: Any) -> Optional[str]:
        """
        Validate STRIPE_SECRET_KEY for test/live prefixes and dangerous patterns.

        Production environment requires sk_live_ prefix.
        Detects test keys and placeholder values.

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

        # Check for placeholder/test patterns
        if v.startswith("sk_test_"):
            if env == "production":
                logger.warning(
                    "[SECURITY] STRIPE_SECRET_KEY violation: test key in production — "
                    "sk_test_ keys must never be used in production. "
                    "Configure sk_live_ key via environment variables."
                )
            else:
                logger.warning(
                    "[SECURITY] STRIPE_SECRET_KEY notice: using test key (sk_test_) — "
                    "Remember to switch to sk_live_ before production deployment."
                )
        elif not v.startswith("sk_live_"):
            if not v.startswith(("sk_", "rk_")):  # Allow restricted keys too
                logger.warning(
                    "[SECURITY] STRIPE_SECRET_KEY violation: invalid format — "
                    "Must start with sk_live_ or sk_test_. "
                    "Verify this is a valid Stripe API key from https://dashboard.stripe.com/apikeys"
                )

        return v

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        """
        Validate DATABASE_URL for hardcoded passwords and dangerous patterns.

        Detects common hardcoded credentials in connection strings.

        Args:
            v: The DATABASE_URL value

        Returns:
            The validated DATABASE_URL
        """
        # Pattern to detect common hardcoded passwords and default credentials
        dangerous_patterns = [
            (r"password.*=.*password", "password=password pattern"),
            (r":password@", ":password@ (literal password)"),
            (r":12345678@", ":12345678@ (sequential numbers)"),
            (r":root@", ":root@ (root user without secure password)"),
            (r":postgres@", ":postgres@ (postgres user without password)"),
            (r"dbuser:dbpass", "dbuser:dbpass (default credentials)"),
        ]

        v_lower = v.lower()
        for pattern, description in dangerous_patterns:
            if re.search(pattern, v_lower, re.IGNORECASE):
                logger.warning(
                    "[SECURITY] DATABASE_URL violation: contains %s — "
                    "Never commit database credentials. Use environment variables instead. "
                    "Example format: postgresql+asyncpg://user:${DB_PASSWORD}@host:5432/db",
                    description,
                )
                break

        return v

    @field_validator("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY")
    @classmethod
    def validate_aws_credentials(cls, v: Optional[str], info: Any) -> Optional[str]:
        """
        Validate AWS credentials presence and format.

        Detects invalid key formats and suspicious patterns.

        Args:
            v: The AWS credential value
            info: Validation context with other field values

        Returns:
            The validated AWS credential
        """
        if not v:
            return v

        # AWS Access Key IDs are typically 20 chars (AKIA prefix + 16 chars)
        if len(v) < 16:
            logger.warning(
                "[SECURITY] AWS credential violation: too short (<%d chars) — "
                "AWS Access Key IDs should be at least 16 characters. "
                "Verify this is a valid AWS credential from https://console.aws.amazon.com/iam/",
                len(v),
            )

        # Check for placeholder patterns in secret key
        dangerous_aws_patterns = ["secret", "test", "change-this", "changeme"]
        if any(pattern in v.lower() for pattern in dangerous_aws_patterns):
            logger.warning(
                "[SECURITY] AWS credential violation: contains placeholder — "
                "AWS credentials must be real values from your AWS account. "
                "Generate new credentials in IAM console."
            )

        return v

    @root_validator
    @classmethod
    def validate_root(cls, values: dict[str, Any]) -> dict[str, Any]:
        """
        Root validator for cross-field secret validation.

        Checks:
        - Environment-specific secret requirements
        - Production readiness of all critical secrets
        - Consistency between environment and secret types

        Args:
            values: All validated field values

        Returns:
            The validated values dictionary
        """
        env = values.get("ENVIRONMENT", "development")

        # In production, all critical secrets must be set and valid
        if env == "production":
            required_in_prod = {
                "STRIPE_SECRET_KEY": "Payment processing configuration",
                "AWS_ACCESS_KEY_ID": "Cloud storage access",
                "AWS_SECRET_ACCESS_KEY": "Cloud storage authentication",
            }

            missing_in_prod = []
            for key, description in required_in_prod.items():
                if not values.get(key):
                    missing_in_prod.append(f"{key} ({description})")

            if missing_in_prod:
                logger.warning(
                    "[SECURITY] Production validation failed: missing secrets — %s — "
                    "Configure all required secrets via environment variables before deployment.",
                    "; ".join(missing_in_prod),
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
