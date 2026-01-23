"""
Message schemas for request/response validation.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import Field

from app.schemas.base import BaseSchema, PaginatedResponse, ResponseSchema
from app.schemas.user import UserBriefResponse


class MessageBase(BaseSchema):
    """
    Base message schema.
    
    Attributes:
        content: Message content
    """
    
    content: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Message content",
    )


class MessageCreate(MessageBase):
    """
    Schema for creating a new message.
    
    Sender ID is set from the authenticated user.
    """
    
    recipient_id: UUID = Field(..., description="Recipient user ID")
    book_id: Optional[UUID] = Field(
        None,
        description="Related book ID (optional)",
    )


class MessageResponse(ResponseSchema):
    """Schema for message API response."""
    
    sender_id: UUID = Field(..., description="Sender user ID")
    recipient_id: UUID = Field(..., description="Recipient user ID")
    book_id: Optional[UUID] = Field(None, description="Related book ID")
    content: str = Field(..., description="Message content")
    read_at: Optional[datetime] = Field(None, description="Read timestamp")
    
    # Nested user info
    sender: Optional[UserBriefResponse] = Field(None, description="Sender info")
    recipient: Optional[UserBriefResponse] = Field(None, description="Recipient info")
    
    @property
    def is_read(self) -> bool:
        """Check if message has been read."""
        return self.read_at is not None
    
    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "sender_id": "987fcdeb-51a2-3c4d-5e6f-789012345678",
                "recipient_id": "abcdef01-2345-6789-abcd-ef0123456789",
                "book_id": "11111111-2222-3333-4444-555555555555",
                "content": "Hi, is this book still available?",
                "read_at": None,
                "created_at": "2024-01-15T10:30:00Z",
                "updated_at": "2024-01-15T10:30:00Z",
            }
        },
    }


class MessageListResponse(PaginatedResponse[MessageResponse]):
    """Paginated list of messages."""
    pass


class ConversationResponse(BaseSchema):
    """Schema for conversation summary."""
    
    participant: UserBriefResponse = Field(..., description="Other participant")
    last_message: MessageResponse = Field(..., description="Most recent message")
    unread_count: int = Field(..., ge=0, description="Unread message count")
    book_id: Optional[UUID] = Field(None, description="Related book ID")


class ConversationListResponse(PaginatedResponse[ConversationResponse]):
    """Paginated list of conversations."""
    pass


class MarkReadRequest(BaseSchema):
    """Schema for marking messages as read."""
    
    message_ids: list[UUID] = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Message IDs to mark as read",
    )


class UnreadCountResponse(BaseSchema):
    """Schema for unread message count."""
    
    unread_count: int = Field(..., ge=0, description="Total unread messages")
