"""
Configuration package for Books4All backend.

Provides settings management, secrets validation, and logging configuration.

Modules:
    secrets: SecretValidator class for runtime secret validation
    logging_config: Structured logging utilities for security events
"""

from app.config.secrets import SecretValidator, validate_secrets

__all__ = [
    "SecretValidator",
    "validate_secrets",
]
