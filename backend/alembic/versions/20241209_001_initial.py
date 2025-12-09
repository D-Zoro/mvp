"""Initial migration - create all tables

Revision ID: 001
Revises: 
Create Date: 2024-12-09

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all initial tables."""
    
    # Create enum types
    op.execute("CREATE TYPE user_role AS ENUM ('buyer', 'seller', 'admin')")
    op.execute("CREATE TYPE oauth_provider AS ENUM ('google', 'facebook', 'github')")
    op.execute("CREATE TYPE book_condition AS ENUM ('new', 'like_new', 'good', 'acceptable')")
    op.execute("CREATE TYPE book_status AS ENUM ('draft', 'active', 'sold', 'archived')")
    op.execute("CREATE TYPE order_status AS ENUM ('pending', 'payment_processing', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded')")
    
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), unique=True, nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=True),
        sa.Column('role', postgresql.ENUM('buyer', 'seller', 'admin', name='user_role', create_type=False), nullable=False, server_default='buyer'),
        sa.Column('email_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('first_name', sa.String(100), nullable=True),
        sa.Column('last_name', sa.String(100), nullable=True),
        sa.Column('avatar_url', sa.Text(), nullable=True),
        sa.Column('oauth_provider', postgresql.ENUM('google', 'facebook', 'github', name='oauth_provider', create_type=False), nullable=True),
        sa.Column('oauth_provider_id', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_oauth', 'users', ['oauth_provider', 'oauth_provider_id'])
    op.create_index('ix_users_role_active', 'users', ['role', 'is_active'])
    
    # Create books table
    op.create_table(
        'books',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('seller_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('isbn', sa.String(20), nullable=True),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('author', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('condition', postgresql.ENUM('new', 'like_new', 'good', 'acceptable', name='book_condition', create_type=False), nullable=False),
        sa.Column('price', sa.DECIMAL(10, 2), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('images', postgresql.JSONB(), nullable=True),
        sa.Column('status', postgresql.ENUM('draft', 'active', 'sold', 'archived', name='book_status', create_type=False), nullable=False, server_default='draft'),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('publisher', sa.String(255), nullable=True),
        sa.Column('publication_year', sa.Integer(), nullable=True),
        sa.Column('language', sa.String(50), nullable=False, server_default='English'),
        sa.Column('page_count', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_books_seller_id', 'books', ['seller_id'])
    op.create_index('ix_books_isbn', 'books', ['isbn'])
    op.create_index('ix_books_status', 'books', ['status'])
    op.create_index('ix_books_category', 'books', ['category'])
    op.create_index('ix_books_seller_status', 'books', ['seller_id', 'status'])
    op.create_index('ix_books_status_created', 'books', ['status', 'created_at'])
    op.create_index('ix_books_category_status', 'books', ['category', 'status'])
    op.create_index('ix_books_price_status', 'books', ['price', 'status'])
    
    # Create orders table
    op.create_table(
        'orders',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('buyer_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('total_amount', sa.DECIMAL(10, 2), nullable=False),
        sa.Column('status', postgresql.ENUM('pending', 'payment_processing', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded', name='order_status', create_type=False), nullable=False, server_default='pending'),
        sa.Column('stripe_payment_id', sa.String(255), unique=True, nullable=True),
        sa.Column('stripe_session_id', sa.String(255), unique=True, nullable=True),
        sa.Column('shipping_address', sa.Text(), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_orders_buyer_id', 'orders', ['buyer_id'])
    op.create_index('ix_orders_status', 'orders', ['status'])
    op.create_index('ix_orders_buyer_status', 'orders', ['buyer_id', 'status'])
    op.create_index('ix_orders_status_created', 'orders', ['status', 'created_at'])
    
    # Create order_items table
    op.create_table(
        'order_items',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('order_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('orders.id', ondelete='CASCADE'), nullable=False),
        sa.Column('book_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('books.id', ondelete='SET NULL'), nullable=True),
        sa.Column('quantity', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('price_at_purchase', sa.DECIMAL(10, 2), nullable=False),
        sa.Column('book_title', sa.String(500), nullable=False),
        sa.Column('book_author', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_order_items_order_id', 'order_items', ['order_id'])
    op.create_index('ix_order_items_book_id', 'order_items', ['book_id'])
    op.create_index('ix_order_items_order_book', 'order_items', ['order_id', 'book_id'])
    
    # Create reviews table
    op.create_table(
        'reviews',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('book_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('books.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('rating', sa.Integer(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('is_verified_purchase', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('book_id', 'user_id', name='uq_review_book_user'),
        sa.CheckConstraint('rating >= 1 AND rating <= 5', name='ck_review_rating_range'),
    )
    op.create_index('ix_reviews_book_id', 'reviews', ['book_id'])
    op.create_index('ix_reviews_user_id', 'reviews', ['user_id'])
    op.create_index('ix_reviews_book_rating', 'reviews', ['book_id', 'rating'])
    
    # Create messages table
    op.create_table(
        'messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('sender_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('recipient_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('book_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('books.id', ondelete='SET NULL'), nullable=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_messages_sender_id', 'messages', ['sender_id'])
    op.create_index('ix_messages_recipient_id', 'messages', ['recipient_id'])
    op.create_index('ix_messages_book_id', 'messages', ['book_id'])
    op.create_index('ix_messages_conversation', 'messages', ['sender_id', 'recipient_id'])
    op.create_index('ix_messages_recipient_unread', 'messages', ['recipient_id', 'read_at'])
    op.create_index('ix_messages_book_created', 'messages', ['book_id', 'created_at'])


def downgrade() -> None:
    """Drop all tables and enum types."""
    
    # Drop tables in reverse order (respecting foreign key constraints)
    op.drop_table('messages')
    op.drop_table('reviews')
    op.drop_table('order_items')
    op.drop_table('orders')
    op.drop_table('books')
    op.drop_table('users')
    
    # Drop enum types
    op.execute("DROP TYPE IF EXISTS order_status")
    op.execute("DROP TYPE IF EXISTS book_status")
    op.execute("DROP TYPE IF EXISTS book_condition")
    op.execute("DROP TYPE IF EXISTS oauth_provider")
    op.execute("DROP TYPE IF EXISTS user_role")
