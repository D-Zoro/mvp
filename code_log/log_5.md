# Step 2.5: Repository Layer

## Summary
Created the repository pattern for data access layer in `backend/app/repositories/`.

## Files Created

### 1. `base.py` - Generic Base Repository
- **Generic typing** with `ModelType`, `CreateSchemaType`, `UpdateSchemaType`
- **CRUD operations:**
  - `get(id)` - Get single record by UUID
  - `get_by_ids(ids)` - Get multiple records by UUIDs
  - `get_multi(skip, limit, filters)` - Paginated listing with filtering
  - `create(obj_in)` - Create new record
  - `update(db_obj, obj_in)` - Update existing record
  - `delete(id)` - Soft delete
  - `hard_delete(id)` - Permanent delete
  - `restore(id)` - Restore soft-deleted record
  - `count(filters)` - Count records
  - `exists(id)` - Check existence

### 2. `user.py` - UserRepository
- `get_by_email(email)` - Find user by email
- `create_with_password(email, password, role, ...)` - Create with hashed password
- `create_oauth_user(...)` - Create from OAuth provider
- `get_by_oauth(provider, provider_id)` - Find OAuth user
- `verify_email(user_id)` - Mark email verified
- `update_password(user_id, new_password)` - Change password
- `update_role(user_id, new_role)` - Change user role
- `activate/deactivate(user_id)` - Toggle active status
- `get_by_role(role)` - Get users by role
- `email_exists(email)` - Check email availability

### 3. `book.py` - BookRepository
- `get_with_seller(book_id)` - Load with seller relationship
- `get_by_seller(seller_id, skip, limit, status)` - Seller's books
- `search(query, category, condition, min_price, max_price, ...)` - Full-text search
- `search_count(...)` - Count search results
- `update_quantity(book_id, quantity_change)` - Adjust quantity (+/-)
- `set_quantity(book_id, quantity)` - Set absolute quantity
- `update_status(book_id, status)` - Change status
- `get_active_books(skip, limit, category)` - Available books
- `get_by_isbn(isbn)` - Find by ISBN
- `get_categories()` - List all categories
- `create_for_seller(seller_id, book_data)` - Create book for seller

### 4. `order.py` - OrderRepository
- `get_with_items(order_id)` - Load with items and buyer
- `create_with_items(buyer_id, items, shipping_address, notes)` - Transactional order creation
  - Validates book availability
  - Calculates total from book prices
  - Creates order items
  - Reduces book quantities
  - Auto-marks sold out books
- `get_by_buyer(buyer_id, skip, limit, status)` - Buyer's orders
- `update_status(order_id, status)` - Change order status
- `set_payment_id(order_id, stripe_payment_id, session_id)` - Set Stripe IDs
- `mark_paid(order_id, stripe_payment_id)` - Mark order as paid
- `cancel_order(order_id)` - Cancel and restore quantities
- `get_orders_for_seller(seller_id)` - Orders containing seller's books
- `get_by_payment_id/get_by_session_id` - Find by Stripe IDs

### 5. `review.py` - ReviewRepository
- `get_with_user(review_id)` - Load with user
- `get_by_book(book_id, skip, limit, min_rating, verified_only)` - Book's reviews
- `get_by_user(user_id)` - User's reviews
- `get_user_review_for_book(user_id, book_id)` - Get user's review for specific book
- `create_review(book_id, user_id, rating, comment)` - Create with verified purchase check
- `check_verified_purchase(user_id, book_id)` - Check if user purchased book
- `get_book_stats(book_id)` - Get statistics:
  - Total reviews
  - Average rating
  - Rating distribution (1-5)
  - Verified purchase count
- `has_reviewed(user_id, book_id)` - Check if already reviewed

### 6. `message.py` - MessageRepository
- `create_message(sender_id, recipient_id, content, book_id)` - Send message
- `get_conversation(user1_id, user2_id, book_id, skip, limit)` - Get messages between users
- `get_conversations(user_id)` - Get all conversations with:
  - Partner info
  - Last message
  - Unread count
  - Related book
- `mark_as_read(message_ids, user_id)` - Mark specific messages read
- `mark_conversation_read(user_id, other_user_id)` - Mark all from user as read
- `get_unread_count(user_id)` - Total unread messages
- `get_unread_count_from(user_id, sender_id)` - Unread from specific sender
- `get_messages_for_book(book_id, user_id)` - Messages about specific book

## Key Features

### Async/Await
All methods use async SQLAlchemy with proper await patterns.

### Transaction Handling
- Operations use `flush()` instead of `commit()` for transaction control at service layer
- `OrderRepository.create_with_items()` handles complex multi-table operations atomically

### Soft Delete Support
- All queries exclude soft-deleted records by default
- `include_deleted` parameter to override when needed
- `restore()` method to undo soft deletes

### Relationship Loading
- Uses `selectinload()` for eager loading relationships
- Prevents N+1 query problems

### Generic Typing
- Base repository is fully typed with generics
- IDE support for method parameters and returns

## Testing

```bash
cd backend

# Test imports
python -c "
from app.repositories import (
    BaseRepository,
    UserRepository,
    BookRepository,
    OrderRepository,
    ReviewRepository,
    MessageRepository,
)
print('✓ All repositories imported successfully')
"

# Verify typing
python -c "
from app.repositories.base import BaseRepository, ModelType, CreateSchemaType, UpdateSchemaType
print('✓ Generic types available')
"
```

## Directory Structure
```
backend/app/repositories/
├── __init__.py      # Package exports
├── base.py          # Generic base repository
├── user.py          # User operations
├── book.py          # Book operations
├── order.py         # Order operations (with items)
├── review.py        # Review operations
└── message.py       # Message operations
```
