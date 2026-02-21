"""
Message repository for message-specific database operations.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.message import Message
from app.models.user import User
from app.repositories.base import BaseRepository
from app.schemas.message import MessageCreate


class MessageRepository(BaseRepository[Message, MessageCreate, MessageCreate]):
    """
    Repository for Message model operations.
    
    Extends BaseRepository with message-specific methods:
    - get_conversation: Get messages between two users
    - get_conversations: Get all conversations for a user
    - mark_as_read: Mark messages as read
    - get_unread_count: Count unread messages
    """
    
    def __init__(self, db: AsyncSession):
        """Initialize with Message model."""
        super().__init__(Message, db)
    
    async def create_message(
        self,
        *,
        sender_id: UUID,
        recipient_id: UUID,
        content: str,
        book_id: Optional[UUID] = None,
    ) -> Message:
        """
        Create a new message.
        
        Args:
            sender_id: Sender's UUID
            recipient_id: Recipient's UUID
            content: Message content
            book_id: Optional related book UUID
            
        Returns:
            Created message
        """
        message = Message(
            sender_id=sender_id,
            recipient_id=recipient_id,
            content=content,
            book_id=book_id,
        )
        
        self.db.add(message)
        await self.db.flush()
        await self.db.refresh(message)
        return message
    
    async def get_conversation(
        self,
        user1_id: UUID,
        user2_id: UUID,
        *,
        book_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Message]:
        """
        Get messages between two users.
        
        Args:
            user1_id: First user's UUID
            user2_id: Second user's UUID
            book_id: Optional filter by related book
            skip: Number of records to skip
            limit: Maximum records to return
            
        Returns:
            List of messages in conversation
        """
        query = (
            select(Message)
            .options(
                selectinload(Message.sender),
                selectinload(Message.recipient),
            )
            .where(
                or_(
                    and_(
                        Message.sender_id == user1_id,
                        Message.recipient_id == user2_id,
                    ),
                    and_(
                        Message.sender_id == user2_id,
                        Message.recipient_id == user1_id,
                    ),
                ),
                Message.deleted_at.is_(None),
            )
        )
        
        if book_id:
            query = query.where(Message.book_id == book_id)
        
        query = query.order_by(Message.created_at.desc()).offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def get_conversations(
        self,
        user_id: UUID,
        *,
        skip: int = 0,
        limit: int = 20,
    ) -> list[dict]:
        """
        Get all conversations for a user with last message and unread count.
        
        Args:
            user_id: User's UUID
            skip: Number of conversations to skip
            limit: Maximum conversations to return
            
        Returns:
            List of conversation summaries
        """
        # Subquery to get the other participant for each conversation
        # and the latest message
        conversations = []
        
        # Get unique conversation partners
        partners_query = (
            select(
                func.case(
                    (Message.sender_id == user_id, Message.recipient_id),
                    else_=Message.sender_id,
                ).label("partner_id"),
                func.max(Message.created_at).label("last_message_at"),
            )
            .where(
                or_(
                    Message.sender_id == user_id,
                    Message.recipient_id == user_id,
                ),
                Message.deleted_at.is_(None),
            )
            .group_by("partner_id")
            .order_by(func.max(Message.created_at).desc())
            .offset(skip)
            .limit(limit)
        )
        
        partners_result = await self.db.execute(partners_query)
        partners = partners_result.fetchall()
        
        for partner_row in partners:
            partner_id = partner_row.partner_id
            
            # Get partner info
            partner_query = select(User).where(User.id == partner_id)
            partner_result = await self.db.execute(partner_query)
            partner = partner_result.scalar_one_or_none()
            
            if not partner:
                continue
            
            # Get last message
            last_msg_query = (
                select(Message)
                .where(
                    or_(
                        and_(
                            Message.sender_id == user_id,
                            Message.recipient_id == partner_id,
                        ),
                        and_(
                            Message.sender_id == partner_id,
                            Message.recipient_id == user_id,
                        ),
                    ),
                    Message.deleted_at.is_(None),
                )
                .order_by(Message.created_at.desc())
                .limit(1)
            )
            last_msg_result = await self.db.execute(last_msg_query)
            last_message = last_msg_result.scalar_one_or_none()
            
            # Get unread count
            unread_count = await self.get_unread_count_from(user_id, partner_id)
            
            conversations.append({
                "participant": partner,
                "last_message": last_message,
                "unread_count": unread_count,
                "book_id": last_message.book_id if last_message else None,
            })
        
        return conversations
    
    async def mark_as_read(
        self,
        message_ids: list[UUID],
        user_id: UUID,
    ) -> int:
        """
        Mark messages as read.
        
        Only marks messages where the user is the recipient.
        
        Args:
            message_ids: List of message UUIDs
            user_id: Recipient's UUID
            
        Returns:
            Number of messages marked as read
        """
        if not message_ids:
            return 0
        
        query = select(Message).where(
            Message.id.in_(message_ids),
            Message.recipient_id == user_id,
            Message.read_at.is_(None),
            Message.deleted_at.is_(None),
        )
        
        result = await self.db.execute(query)
        messages = result.scalars().all()
        
        now = datetime.now(timezone.utc)
        count = 0
        for message in messages:
            message.read_at = now
            self.db.add(message)
            count += 1
        
        await self.db.flush()
        return count
    
    async def mark_conversation_read(
        self,
        user_id: UUID,
        other_user_id: UUID,
    ) -> int:
        """
        Mark all messages from another user as read.
        
        Args:
            user_id: Current user's UUID (recipient)
            other_user_id: Other user's UUID (sender)
            
        Returns:
            Number of messages marked as read
        """
        query = select(Message).where(
            Message.sender_id == other_user_id,
            Message.recipient_id == user_id,
            Message.read_at.is_(None),
            Message.deleted_at.is_(None),
        )
        
        result = await self.db.execute(query)
        messages = result.scalars().all()
        
        now = datetime.now(timezone.utc)
        count = 0
        for message in messages:
            message.read_at = now
            self.db.add(message)
            count += 1
        
        await self.db.flush()
        return count
    
    async def get_unread_count(
        self,
        user_id: UUID,
    ) -> int:
        """
        Get total unread message count for a user.
        
        Args:
            user_id: User's UUID
            
        Returns:
            Number of unread messages
        """
        query = (
            select(func.count())
            .select_from(Message)
            .where(
                Message.recipient_id == user_id,
                Message.read_at.is_(None),
                Message.deleted_at.is_(None),
            )
        )
        
        result = await self.db.execute(query)
        return result.scalar() or 0
    
    async def get_unread_count_from(
        self,
        user_id: UUID,
        sender_id: UUID,
    ) -> int:
        """
        Get unread message count from a specific sender.
        
        Args:
            user_id: Recipient's UUID
            sender_id: Sender's UUID
            
        Returns:
            Number of unread messages from sender
        """
        query = (
            select(func.count())
            .select_from(Message)
            .where(
                Message.recipient_id == user_id,
                Message.sender_id == sender_id,
                Message.read_at.is_(None),
                Message.deleted_at.is_(None),
            )
        )
        
        result = await self.db.execute(query)
        return result.scalar() or 0
    
    async def get_messages_for_book(
        self,
        book_id: UUID,
        user_id: UUID,
        *,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Message]:
        """
        Get messages related to a specific book for a user.
        
        Args:
            book_id: Book's UUID
            user_id: User's UUID
            skip: Number of records to skip
            limit: Maximum records to return
            
        Returns:
            List of messages about the book
        """
        query = (
            select(Message)
            .options(
                selectinload(Message.sender),
                selectinload(Message.recipient),
            )
            .where(
                Message.book_id == book_id,
                or_(
                    Message.sender_id == user_id,
                    Message.recipient_id == user_id,
                ),
                Message.deleted_at.is_(None),
            )
            .order_by(Message.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
