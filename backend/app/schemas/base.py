"""
Base schema classes and common validators.

Provides reusable base classes and validation utilities.
"""

from datetime import datetime
from typing import Any, Generic, Optional, TypeVar
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BaseSchema(BaseModel):
    """
    Base schema with common configuration.
    
    All schemas should inherit from this class.
    """
    
    model_config = ConfigDict(
        from_attributes=True,  # Enable ORM mode
        populate_by_name=True,  # Allow population by field name or alias
        str_strip_whitespace=True,  # Strip whitespace from strings
        validate_assignment=True,  # Validate on assignment
        use_enum_values=True,  # Use enum values instead of enum objects
    )


class TimestampMixin(BaseModel):
    """Mixin for timestamp fields."""
    
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


class IDMixin(BaseModel):
    """Mixin for ID field."""
    
    id: UUID = Field(..., description="Unique identifier")


class ResponseSchema(BaseSchema, IDMixin, TimestampMixin):
    """Base schema for API responses with ID and timestamps."""
    pass


# Generic type for list responses
T = TypeVar("T")


class PaginatedResponse(BaseSchema, Generic[T]):
    """
    Generic paginated response schema.
    
    Attributes:
        items: List of items
        total: Total number of items
        page: Current page number
        page_size: Items per page
        pages: Total number of pages
        has_next: Whether there is a next page
        has_prev: Whether there is a previous page
    """
    
    items: list[T] = Field(..., description="List of items")
    total: int = Field(..., ge=0, description="Total number of items")
    page: int = Field(..., ge=1, description="Current page number")
    page_size: int = Field(..., ge=1, le=100, description="Items per page")
    pages: int = Field(..., ge=0, description="Total number of pages")
    has_next: bool = Field(..., description="Has next page")
    has_prev: bool = Field(..., description="Has previous page")
    
    @classmethod
    def create(
        cls,
        items: list[T],
        total: int,
        page: int,
        page_size: int,
    ) -> "PaginatedResponse[T]":
        """
        Create a paginated response.
        
        Args:
            items: List of items for current page
            total: Total number of items
            page: Current page number
            page_size: Items per page
            
        Returns:
            PaginatedResponse with calculated pagination metadata
        """
        pages = (total + page_size - 1) // page_size if page_size > 0 else 0
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            pages=pages,
            has_next=page < pages,
            has_prev=page > 1,
        )
