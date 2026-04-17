"""
JWT Key Management with versioning and deprecation.

Supports multiple key versions for graceful JWT secret rotation.
Allows old keys to remain valid for 30 days (deprecation window)
while new key version is activated.

Configuration:
- KEYS: Dictionary mapping version number to secret key string
- ACTIVE_KEY_VERSION: Currently active key version (used for signing new tokens)
- KEY_ACTIVATION_TIMESTAMPS: When each key version was activated
- DEPRECATED_KEY_TTL_SECONDS: How long to accept old keys (30 days = 2592000 seconds)

Example rotation procedure:
1. Generate new key_v2
2. Add to KEYS dict: {1: "old-key", 2: "new-key"}
3. Set KEY_ACTIVATION_TIMESTAMPS[2] = datetime.utcnow()
4. Update ACTIVE_KEY_VERSION = 2 (new tokens signed with key_v2)
5. Old tokens with key_version=1 still accepted for 30 days
6. After 30 days, remove key_v1 from KEYS
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Key Configuration
# ─────────────────────────────────────────────────────────────────────────────

# Currently active key version for signing new tokens
ACTIVE_KEY_VERSION: int = 1

# Dictionary mapping key version to secret key
# Each key must be >= 32 characters for HS256 algorithm
KEYS: dict[int, str] = {
    1: "your-secret-key-version-1-min-32-chars-required-for-jwt-signature",
    # 2: "your-secret-key-version-2-min-32-chars-required-for-jwt-signature",  # Add after rotation
}

# Deprecation window: old keys are accepted for this many seconds
# 30 days = 86400 * 30 = 2592000 seconds
DEPRECATED_KEY_TTL_SECONDS: int = 2592000

# Track when each key version was activated (for deprecation window calculation)
KEY_ACTIVATION_TIMESTAMPS: dict[int, datetime] = {
    1: datetime.utcnow(),  # Key 1 activated now
    # 2: datetime.utcnow() - timedelta(days=1),  # Key 2 activated 1 day ago (example)
}


# ─────────────────────────────────────────────────────────────────────────────
# Public Functions
# ─────────────────────────────────────────────────────────────────────────────


def get_active_key() -> tuple[int, str]:
    """
    Get the currently active key for signing new tokens.

    The active key is used to sign all new access, refresh, and other
    token types. Clients receive the key_version in token payload.

    Returns:
        tuple: (version, secret_key)

    Raises:
        KeyError: If active key version not found in KEYS dict
    """
    version = ACTIVE_KEY_VERSION
    secret = KEYS.get(version)
    if not secret:
        raise KeyError(f"Active key version {version} not found in KEYS dict")
    return version, secret


def get_key_for_verification(key_version: int) -> Optional[str]:
    """
    Get key for verification. Returns key if active or within deprecation window.

    Verifies tokens that claim to be signed with key_version.
    Accepts the key if:
    1. It's the currently active key version, OR
    2. It's an old version within the deprecation window (30 days)

    Args:
        key_version: Key version from token payload

    Returns:
        str: Secret key if valid, None if version not found or expired
    """
    if key_version not in KEYS:
        logger.warning(f"Key version {key_version} not found in KEYS dict")
        return None

    activated_at = KEY_ACTIVATION_TIMESTAMPS.get(key_version)
    if not activated_at:
        logger.warning(f"No activation timestamp for key version {key_version}")
        return None

    age_seconds = (datetime.utcnow() - activated_at).total_seconds()

    # Current key is always valid
    if key_version == ACTIVE_KEY_VERSION:
        return KEYS[key_version]

    # Deprecated key within window is still valid
    if age_seconds < DEPRECATED_KEY_TTL_SECONDS:
        logger.debug(
            f"Using deprecated key version {key_version} "
            f"(age: {int(age_seconds)}s of {DEPRECATED_KEY_TTL_SECONDS}s TTL)"
        )
        return KEYS[key_version]

    # Key too old, reject it
    logger.warning(
        f"Key version {key_version} expired "
        f"(age: {int(age_seconds)}s > {DEPRECATED_KEY_TTL_SECONDS}s TTL)"
    )
    return None
