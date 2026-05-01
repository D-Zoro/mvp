"""
Structured Logging Configuration for Secrets Management

Provides structured logging utilities for security-related events
with consistent formatting and context tracking.

Log Format: [SEVERITY] CONTEXT: message — guidance

Example:
    [SECURITY] SECRET_KEY violation: contains placeholder 'change-this' —
    SECRET_KEY must be changed in production. Generate: openssl rand -hex 32
"""

import json
import logging
import sys
from datetime import datetime
from typing import Any, Dict, Optional

# Configure root logger for application
logger = logging.getLogger(__name__)


class StructuredFormatter(logging.Formatter):
    """
    Structured logging formatter for security-critical events.

    Outputs JSON-structured logs with context, severity, and guidance.
    Designed for easy parsing by log aggregation systems.
    """

    def format(self, record: logging.LogRecord) -> str:
        """
        Format log record as structured JSON with context.

        Args:
            record: LogRecord to format

        Returns:
            JSON-formatted log string
        """
        log_data: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "context": getattr(record, "context", None),
        }

        # Only include extra fields if present
        if hasattr(record, "extra_data"):
            log_data["extra"] = record.extra_data

        return json.dumps(log_data, default=str)


def configure_security_logging(level: int = logging.WARNING) -> None:
    """
    Configure structured logging for security events.

    Adds handlers for both console and file output with structured format.

    Args:
        level: Logging level (default: WARNING for security-critical events)
    """
    # Create formatter
    formatter = StructuredFormatter()

    # Console handler
    console_handler = logging.StreamHandler(sys.stderr)
    console_handler.setFormatter(formatter)
    console_handler.setLevel(level)

    # Get logger and configure
    security_logger = logging.getLogger("app.config.secrets")
    security_logger.setLevel(level)
    security_logger.addHandler(console_handler)

    # Prevent propagation to avoid duplicate logs
    security_logger.propagate = False


def log_secret_violation(
    violation_type: str,
    secret_name: str,
    description: str,
    guidance: str,
) -> None:
    """
    Log a secret violation with structured format.

    Args:
        violation_type: Type of violation (e.g., "placeholder", "format", "missing")
        secret_name: Name of the secret (e.g., "SECRET_KEY")
        description: Description of what was violated
        guidance: Actionable guidance to fix the issue
    """
    message = f"{secret_name}: {description} — {guidance}"
    context = {
        "violation_type": violation_type,
        "secret": secret_name,
        "description": description,
    }

    record = logging.LogRecord(
        name="app.config.secrets",
        level=logging.WARNING,
        pathname="",
        lineno=0,
        msg=message,
        args=(),
        exc_info=None,
    )
    record.context = context

    logger.warning(message)


def log_production_check(missing_secrets: list[str]) -> None:
    """
    Log production environment secret validation failures.

    Args:
        missing_secrets: List of missing required secrets
    """
    logger.warning(
        "[SECURITY] Production validation: missing secrets %s — "
        "Configure all required secrets via environment variables.",
        missing_secrets,
    )


# Convenience functions for specific secret types

def log_secret_key_violation(reason: str, guidance: str) -> None:
    """Log SECRET_KEY validation failure."""
    log_secret_violation("placeholder", "SECRET_KEY", reason, guidance)


def log_stripe_violation(reason: str, guidance: str) -> None:
    """Log STRIPE_SECRET_KEY validation failure."""
    log_secret_violation("format", "STRIPE_SECRET_KEY", reason, guidance)


def log_database_violation(reason: str, guidance: str) -> None:
    """Log DATABASE_URL validation failure."""
    log_secret_violation("hardcoded", "DATABASE_URL", reason, guidance)


def log_aws_violation(reason: str, guidance: str) -> None:
    """Log AWS credential validation failure."""
    log_secret_violation("format", "AWS_CREDENTIALS", reason, guidance)
