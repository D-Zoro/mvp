"""
Pytest configuration and fixtures.
"""

import pytest


@pytest.fixture
def app():
    """Create application instance for testing."""
    from app.main import app
    return app
