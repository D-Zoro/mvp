"""
Error response schemas following RFC 7807 (Problem Details for HTTP APIs).

See: https://tools.ietf.org/html/rfc7807
"""

from typing import Any, Optional

from pydantic import Field

from app.schemas.base import BaseSchema


class ErrorDetail(BaseSchema):
    """
    Schema for individual error detail.
    
    Used for validation errors or multiple error conditions.
    """
    
    loc: list[str] = Field(
        ...,
        description="Location of the error (e.g., ['body', 'email'])",
    )
    msg: str = Field(
        ...,
        description="Error message",
    )
    type: str = Field(
        ...,
        description="Error type identifier",
    )


class ErrorResponse(BaseSchema):
    """
    RFC 7807 compliant error response schema.
    
    Attributes:
        type: A URI reference that identifies the problem type
        title: A short, human-readable summary of the problem
        status: The HTTP status code
        detail: A human-readable explanation specific to this occurrence
        instance: A URI reference that identifies the specific occurrence
        errors: Additional error details (for validation errors)
    """
    
    type: str = Field(
        default="about:blank",
        description="URI reference identifying the problem type",
        examples=["https://api.books4all.com/errors/validation"],
    )
    title: str = Field(
        ...,
        description="Short summary of the problem",
        examples=["Validation Error"],
    )
    status: int = Field(
        ...,
        description="HTTP status code",
        examples=[400, 401, 403, 404, 422, 500],
    )
    detail: str = Field(
        ...,
        description="Detailed explanation of the error",
        examples=["The provided email address is already registered."],
    )
    instance: Optional[str] = Field(
        None,
        description="URI reference for this specific error occurrence",
        examples=["/api/v1/auth/register"],
    )
    errors: Optional[list[ErrorDetail]] = Field(
        None,
        description="Additional error details",
    )
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "type": "https://api.books4all.com/errors/validation",
                "title": "Validation Error",
                "status": 422,
                "detail": "Request validation failed",
                "instance": "/api/v1/books",
                "errors": [
                    {
                        "loc": ["body", "price"],
                        "msg": "Price must be greater than 0",
                        "type": "value_error",
                    }
                ],
            }
        },
    }


class HTTPError(BaseSchema):
    """Simple HTTP error response (for backwards compatibility)."""
    
    detail: str = Field(..., description="Error message")


# Pre-defined error responses for common scenarios
class NotFoundError(ErrorResponse):
    """404 Not Found error response."""
    
    type: str = "https://api.books4all.com/errors/not-found"
    title: str = "Not Found"
    status: int = 404


class UnauthorizedError(ErrorResponse):
    """401 Unauthorized error response."""
    
    type: str = "https://api.books4all.com/errors/unauthorized"
    title: str = "Unauthorized"
    status: int = 401


class ForbiddenError(ErrorResponse):
    """403 Forbidden error response."""
    
    type: str = "https://api.books4all.com/errors/forbidden"
    title: str = "Forbidden"
    status: int = 403


class ValidationError(ErrorResponse):
    """422 Validation Error response."""
    
    type: str = "https://api.books4all.com/errors/validation"
    title: str = "Validation Error"
    status: int = 422


class ConflictError(ErrorResponse):
    """409 Conflict error response."""
    
    type: str = "https://api.books4all.com/errors/conflict"
    title: str = "Conflict"
    status: int = 409


class RateLimitError(ErrorResponse):
    """429 Rate Limit error response."""
    
    type: str = "https://api.books4all.com/errors/rate-limit"
    title: str = "Too Many Requests"
    status: int = 429
    retry_after: Optional[int] = Field(
        None,
        description="Seconds until rate limit resets",
    )


class InternalServerError(ErrorResponse):
    """500 Internal Server Error response."""
    
    type: str = "https://api.books4all.com/errors/internal"
    title: str = "Internal Server Error"
    status: int = 500


def create_error_response(
    status: int,
    detail: str,
    title: Optional[str] = None,
    error_type: Optional[str] = None,
    instance: Optional[str] = None,
    errors: Optional[list[dict[str, Any]]] = None,
) -> ErrorResponse:
    """
    Factory function to create error responses.
    
    Args:
        status: HTTP status code
        detail: Error detail message
        title: Error title (defaults based on status code)
        error_type: Error type URI
        instance: Request path
        errors: Additional error details
        
    Returns:
        ErrorResponse: Configured error response
    """
    # Default titles based on status code
    default_titles = {
        400: "Bad Request",
        401: "Unauthorized",
        403: "Forbidden",
        404: "Not Found",
        409: "Conflict",
        422: "Validation Error",
        429: "Too Many Requests",
        500: "Internal Server Error",
    }
    
    error_details = None
    if errors:
        error_details = [ErrorDetail(**e) for e in errors]
    
    return ErrorResponse(
        type=error_type or f"https://api.books4all.com/errors/{status}",
        title=title or default_titles.get(status, "Error"),
        status=status,
        detail=detail,
        instance=instance,
        errors=error_details,
    )
