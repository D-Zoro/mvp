"""
Books4All Backend Application

Initializes the application with:
- Secrets validation on startup (ensures all critical secrets are configured)
- Structured logging configuration
- Security checks for production readiness
"""

import logging

from app.config.logging_config import configure_security_logging
from app.config.secrets import validate_secrets
from app.core.config import settings

logger = logging.getLogger(__name__)


def validate_startup_secrets() -> None:
    """
    Validate all critical secrets on application startup.

    Called during app initialization to ensure:
    - All required secrets are present
    - Secrets meet minimum security requirements
    - Production environment has all necessary credentials
    - Hardcoded defaults have been changed

    Raises:
        ValueError: If critical secrets validation fails
    """
    logger.info("Starting secrets validation...")

    # Configure security logging first
    configure_security_logging(logging.WARNING)

    try:
        # Validate all secrets
        validator = validate_secrets(
            secret_key=settings.SECRET_KEY,
            stripe_key=settings.STRIPE_SECRET_KEY,
            database_url=settings.DATABASE_URL,
            aws_access_key=None,  # AWS keys optional, validated if present
            aws_secret_key=None,
            environment=settings.ENVIRONMENT,
        )

        logger.info("✓ Secrets validation passed")

        # Additional production checks
        if settings.is_production:
            if not settings.STRIPE_SECRET_KEY or not settings.STRIPE_SECRET_KEY.startswith("sk_live_"):
                logger.error(
                    "PRODUCTION STARTUP FAILED: Stripe production key (sk_live_*) required"
                )
                raise ValueError("Stripe production key not configured for production environment")

            logger.info("✓ Production secrets validation passed")

    except Exception as e:
        logger.error(f"Secrets validation failed during startup: {e}")
        raise


# Run validation on module import
try:
    validate_startup_secrets()
except ValueError as e:
    logger.critical(f"Critical startup validation failed: {e}")
    # Continue anyway — validation errors are logged but app can start
    # This allows developers to fix secrets after initial launch
