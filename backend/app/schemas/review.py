"""
Review schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import Field, field_validator

from app.schemas.base import BaseSchema, PaginatedResponse, ResponseSchema
from app.schemas.user import UserBriefResponse


class ReviewBase(BaseSchema):
    """
    Base review schema with common fields.
    
    Attributes:
        rating: Rating from 1 to 5
        comment: Optional review text
    """
    
    rating: int = Field(
        ...,
        ge=1,
        le=5,
        description="Rating from 1 to 5 stars",
        examples=[4],
    )
    comment: Optional[str] = Field(
        None,
        max_length=2000,
        description="Review comment",
        examples=["Great book! Exactly as described."],
    )
    
    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: int) -> int:
        """Validate rating is between 1 and 5."""
        if not 1 <= v <= 5:
            raise ValueError("Rating must be between 1 and 5")
        return v


class ReviewCreate(ReviewBase):
    """
    Schema for creating a new review.
    
    Book ID is provided in the URL path.
    User ID is set from the authenticated user.
    """
    pass


class ReviewUpdate(BaseSchema):
    """
    Schema for updating a review.
    
    All fields are optional - only provided fields will be updated.
    """
    
    rating: Optional[int] = Field(
        None,
        ge=1,
        le=5,
        description="Updated rating",
    )
    comment: Optional[str] = Field(
        None,
        max_length=2000,
        description="Updated comment",
    )


class ReviewResponse(ResponseSchema):
    """Schema for review API response."""
    
    book_id: UUID = Field(..., description="Reviewed book ID")
    user_id: UUID = Field(..., description="Reviewer's user ID")
    rating: int = Field(..., description="Rating (1-5)")
    comment: Optional[str] = Field(None, description="Review comment")
    is_verified_purchase: bool = Field(..., description="Verified purchase badge")
    
    # Nested reviewer info
    user: Optional[UserBriefResponse] = Field(None, description="Reviewer information")
    
    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "book_id": "987fcdeb-51a2-3c4d-5e6f-789012345678",
                "user_id": "abcdef01-2345-6789-abcd-ef0123456789",
                "rating": 5,
                "comment": "Excellent condition, fast shipping!",
                "is_verified_purchase": True,
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-15T10:30:00Z",
            }
        },
    }


class ReviewListResponse(PaginatedResponse[ReviewResponse]):
    """Paginated list of reviews."""
    pass


class ReviewStats(BaseSchema):
    """Schema for book review statistics."""
    
    book_id: UUID = Field(..., description="Book ID")
    total_reviews: int = Field(..., ge=0, description="Total number of reviews")
    average_rating: Optional[float] = Field(
        None,
        ge=1,
        le=5,
        description="Average rating",
    )
    rating_distribution: dict[int, int] = Field(
        ...,
        description="Count of each rating (1-5)",
    )
    verified_purchase_count: int = Field(
        ...,
        ge=0,
        description="Number of verified purchase reviews",
    )
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "book_id": "987fcdeb-51a2-3c4d-5e6f-789012345678",
                "total_reviews": 25,
                "average_rating": 4.2,
                "rating_distribution": {
                    "1": 1,
                    "2": 2,
                    "3": 3,
                    "4": 8,
                    "5": 11,
                },
                "verified_purchase_count": 20,
            }
        },
    }
