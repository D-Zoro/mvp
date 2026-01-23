"""
Pagination schemas.
"""

from typing import Annotated

from fastapi import Query
from pydantic import Field

from app.schemas.base import BaseSchema


class PaginationParams(BaseSchema):
    """
    Schema for pagination query parameters.
    
    Attributes:
        page: Page number (1-indexed)
        page_size: Number of items per page
    """
    
    page: int = Field(
        default=1,
        ge=1,
        description="Page number (1-indexed)",
    )
    page_size: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Items per page (max 100)",
    )
    
    @property
    def skip(self) -> int:
        """Calculate offset for database query."""
        return (self.page - 1) * self.page_size
    
    @property
    def limit(self) -> int:
        """Get limit for database query."""
        return self.page_size


def get_pagination_params(
    page: Annotated[int, Query(ge=1, description="Page number")] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, description="Items per page")] = 20,
) -> PaginationParams:
    """
    FastAPI dependency for pagination parameters.
    
    Usage:
        @router.get("/items")
        async def list_items(
            pagination: PaginationParams = Depends(get_pagination_params)
        ):
            ...
    """
    return PaginationParams(page=page, page_size=page_size)


class SortParams(BaseSchema):
    """
    Schema for sorting parameters.
    
    Attributes:
        sort_by: Field to sort by
        sort_order: Sort direction (asc/desc)
    """
    
    sort_by: str = Field(
        default="created_at",
        description="Field to sort by",
    )
    sort_order: str = Field(
        default="desc",
        pattern="^(asc|desc)$",
        description="Sort direction",
    )
    
    @property
    def is_ascending(self) -> bool:
        """Check if sort order is ascending."""
        return self.sort_order == "asc"


def get_sort_params(
    sort_by: Annotated[str, Query(description="Field to sort by")] = "created_at",
    sort_order: Annotated[str, Query(pattern="^(asc|desc)$", description="Sort direction")] = "desc",
) -> SortParams:
    """FastAPI dependency for sort parameters."""
    return SortParams(sort_by=sort_by, sort_order=sort_order)
