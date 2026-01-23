"""
Book schemas for request/response validation.
"""

from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import Field, field_validator

from app.models.book import BookCondition, BookStatus
from app.schemas.base import BaseSchema, PaginatedResponse, ResponseSchema
from app.schemas.user import UserBriefResponse


class BookBase(BaseSchema):
    """
    Base book schema with common fields.
    
    Attributes:
        title: Book title
        author: Book author(s)
        isbn: ISBN-10 or ISBN-13
        description: Detailed description
        condition: Physical condition
        price: Listing price
    """
    
    title: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Book title",
        examples=["The Great Gatsby"],
    )
    author: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Book author(s)",
        examples=["F. Scott Fitzgerald"],
    )
    isbn: Optional[str] = Field(
        None,
        min_length=10,
        max_length=20,
        description="ISBN-10 or ISBN-13",
        examples=["978-0743273565"],
    )
    description: Optional[str] = Field(
        None,
        max_length=5000,
        description="Detailed book description",
    )
    condition: BookCondition = Field(
        ...,
        description="Physical condition of the book",
    )
    price: Decimal = Field(
        ...,
        gt=0,
        le=10000,
        decimal_places=2,
        description="Listing price in USD",
        examples=[19.99],
    )
    
    @field_validator("isbn")
    @classmethod
    def validate_isbn(cls, v: Optional[str]) -> Optional[str]:
        """Validate ISBN format."""
        if v is None:
            return v
        # Remove hyphens and spaces
        clean = v.replace("-", "").replace(" ", "")
        if len(clean) not in (10, 13):
            raise ValueError("ISBN must be 10 or 13 characters (excluding hyphens)")
        if not clean.replace("X", "").isdigit():
            raise ValueError("ISBN must contain only digits (and X for ISBN-10)")
        return v
    
    @field_validator("price", mode="before")
    @classmethod
    def validate_price(cls, v) -> Decimal:
        """Ensure price is a valid decimal."""
        if isinstance(v, str):
            v = Decimal(v)
        if v <= 0:
            raise ValueError("Price must be greater than 0")
        return v


class BookCreate(BookBase):
    """
    Schema for creating a new book listing.
    
    Seller ID is set from the authenticated user.
    """
    
    quantity: int = Field(
        default=1,
        ge=1,
        le=1000,
        description="Available quantity",
    )
    images: Optional[list[str]] = Field(
        default=None,
        max_length=10,
        description="List of image URLs (max 10)",
    )
    category: Optional[str] = Field(
        None,
        max_length=100,
        description="Book category/genre",
        examples=["Fiction", "Science Fiction", "Biography"],
    )
    publisher: Optional[str] = Field(
        None,
        max_length=255,
        description="Publisher name",
    )
    publication_year: Optional[int] = Field(
        None,
        ge=1000,
        le=2100,
        description="Year of publication",
    )
    language: str = Field(
        default="English",
        max_length=50,
        description="Book language",
    )
    page_count: Optional[int] = Field(
        None,
        ge=1,
        le=50000,
        description="Number of pages",
    )
    status: BookStatus = Field(
        default=BookStatus.DRAFT,
        description="Listing status",
    )
    
    @field_validator("images")
    @classmethod
    def validate_images(cls, v: Optional[list[str]]) -> Optional[list[str]]:
        """Validate image URLs."""
        if v is None:
            return v
        if len(v) > 10:
            raise ValueError("Maximum 10 images allowed")
        for url in v:
            if not url.startswith(("http://", "https://")):
                raise ValueError(f"Invalid image URL: {url}")
        return v


class BookUpdate(BaseSchema):
    """
    Schema for updating a book listing.
    
    All fields are optional - only provided fields will be updated.
    """
    
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    author: Optional[str] = Field(None, min_length=1, max_length=255)
    isbn: Optional[str] = Field(None, min_length=10, max_length=20)
    description: Optional[str] = Field(None, max_length=5000)
    condition: Optional[BookCondition] = None
    price: Optional[Decimal] = Field(None, gt=0, le=10000)
    quantity: Optional[int] = Field(None, ge=0, le=1000)
    images: Optional[list[str]] = Field(None, max_length=10)
    category: Optional[str] = Field(None, max_length=100)
    publisher: Optional[str] = Field(None, max_length=255)
    publication_year: Optional[int] = Field(None, ge=1000, le=2100)
    language: Optional[str] = Field(None, max_length=50)
    page_count: Optional[int] = Field(None, ge=1, le=50000)
    status: Optional[BookStatus] = None
    
    @field_validator("price", mode="before")
    @classmethod
    def validate_price(cls, v) -> Optional[Decimal]:
        """Ensure price is a valid decimal if provided."""
        if v is None:
            return v
        if isinstance(v, str):
            v = Decimal(v)
        if v <= 0:
            raise ValueError("Price must be greater than 0")
        return v


class BookResponse(ResponseSchema):
    """
    Schema for book API response.
    
    Includes all book fields plus seller information.
    """
    
    seller_id: UUID = Field(..., description="Seller's user ID")
    title: str = Field(..., description="Book title")
    author: str = Field(..., description="Book author(s)")
    isbn: Optional[str] = Field(None, description="ISBN")
    description: Optional[str] = Field(None, description="Description")
    condition: BookCondition = Field(..., description="Book condition")
    price: Decimal = Field(..., description="Price in USD")
    quantity: int = Field(..., description="Available quantity")
    images: Optional[list[str]] = Field(None, description="Image URLs")
    status: BookStatus = Field(..., description="Listing status")
    category: Optional[str] = Field(None, description="Category")
    publisher: Optional[str] = Field(None, description="Publisher")
    publication_year: Optional[int] = Field(None, description="Publication year")
    language: str = Field(..., description="Language")
    page_count: Optional[int] = Field(None, description="Page count")
    
    # Nested seller info (optional, populated when needed)
    seller: Optional[UserBriefResponse] = Field(None, description="Seller information")
    
    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "seller_id": "987fcdeb-51a2-3c4d-5e6f-789012345678",
                "title": "The Great Gatsby",
                "author": "F. Scott Fitzgerald",
                "isbn": "978-0743273565",
                "description": "A classic American novel...",
                "condition": "like_new",
                "price": 12.99,
                "quantity": 3,
                "images": ["https://example.com/book1.jpg"],
                "status": "active",
                "category": "Fiction",
                "publisher": "Scribner",
                "publication_year": 2004,
                "language": "English",
                "page_count": 180,
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-15T10:30:00Z",
            }
        },
    }


class BookBriefResponse(BaseSchema):
    """Brief book info for nested responses."""
    
    id: UUID = Field(..., description="Book ID")
    title: str = Field(..., description="Book title")
    author: str = Field(..., description="Book author")
    price: Decimal = Field(..., description="Price")
    condition: BookCondition = Field(..., description="Condition")
    primary_image: Optional[str] = Field(None, description="Primary image URL")


class BookListResponse(PaginatedResponse[BookResponse]):
    """Paginated list of books."""
    pass


class BookSearchParams(BaseSchema):
    """Schema for book search/filter parameters."""
    
    query: Optional[str] = Field(None, description="Search query")
    category: Optional[str] = Field(None, description="Filter by category")
    condition: Optional[BookCondition] = Field(None, description="Filter by condition")
    min_price: Optional[Decimal] = Field(None, ge=0, description="Minimum price")
    max_price: Optional[Decimal] = Field(None, ge=0, description="Maximum price")
    seller_id: Optional[UUID] = Field(None, description="Filter by seller")
    status: Optional[BookStatus] = Field(
        default=BookStatus.ACTIVE,
        description="Filter by status",
    )
    sort_by: Optional[str] = Field(
        default="created_at",
        description="Sort field",
        pattern="^(created_at|price|title)$",
    )
    sort_order: Optional[str] = Field(
        default="desc",
        description="Sort order",
        pattern="^(asc|desc)$",
    )
