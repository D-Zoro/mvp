"""
API v1 package.
Exports the api_router for inclusion in main.py.
"""

from app.api.v1.router import api_router

__all__ = ["api_router"]
