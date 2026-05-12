# Log 2 - SQLAlchemy Models & Alembic Migrations

**Date:** December 9, 2025

---

## What I Did

### 1. Created SQLAlchemy Models

**`backend/app/models/base.py`** - Base model with:
- UUID primary keys
- `created_at`, `updated_at` timestamps (auto-managed)
- `deleted_at` for soft delete support
- Helper methods: `soft_delete()`, `restore()`, `is_deleted`, `to_dict()`

**`backend/app/models/user.py`** - User model:
- `id`, `email` (unique, indexed), `password_hash`
- `role` enum: `buyer`, `seller`, `admin`
- `email_verified`, `is_active`
- OAuth fields: `oauth_provider`, `oauth_provider_id`
- Profile: `first_name`, `last_name`, `avatar_url`
- Relationships: `books`, `orders`, `reviews`, `sent_messages`, `received_messages`
- Indexes: email, OAuth composite, role+active

**`backend/app/models/book.py`** - Book model:
- `id`, `seller_id` (FK to users)
- `isbn`, `title`, `author`, `description`
- `condition` enum: `new`, `like_new`, `good`, `acceptable`
- `price` (Decimal), `quantity`
- `images` (JSONB array)
- `status` enum: `draft`, `active`, `sold`, `archived`
- Metadata: `category`, `publisher`, `publication_year`, `language`, `page_count`
- Indexes: seller_id, status, created_at (composite indexes)

**`backend/app/models/order.py`** - Order & OrderItem:
- Order: `buyer_id`, `total_amount`, `status`, `stripe_payment_id`, `stripe_session_id`
- OrderItem: `order_id`, `book_id`, `quantity`, `price_at_purchase`, `book_title`, `book_author`
- Proper cascade relationships

**`backend/app/models/review.py`** - Review model:
- `book_id`, `user_id`, `rating` (1-5), `comment`
- `is_verified_purchase`
- Unique constraint: (book_id, user_id)
- Check constraint: rating 1-5

**`backend/app/models/message.py`** - Message model:
- `sender_id`, `recipient_id`, `book_id`, `content`, `read_at`
- Conversation and unread indexes

### 2. Set Up Alembic Migrations

**Created:**
- `backend/alembic.ini` - Alembic configuration (uses DATABASE_URL from env)
- `backend/alembic/env.py` - Environment config (imports all models)
- `backend/alembic/script.py.mako` - Migration template
- `backend/alembic/versions/20241209_001_initial.py` - Initial migration with all tables

**Migration includes:**
- All 6 tables (users, books, orders, order_items, reviews, messages)
- All enum types
- All indexes (including composite indexes)
- All constraints (unique, check, foreign keys)
- Proper upgrade/downgrade functions

### 3. Created Backend README

- `backend/README.md` with:
  - Setup instructions
  - Migration commands
  - Running instructions
  - Project structure

---

## What You Should Do (Test & Review)

### 1. Review Model Files
```bash
# Check model files
ls -la backend/app/models/
cat backend/app/models/user.py | head -50
```

### 2. Verify Alembic Setup
```bash
cd backend
ls -la alembic/
cat alembic/env.py | head -30
```

### 3. Test Migration (requires PostgreSQL running)

**Option A: With Docker**
```bash
# Start just the database
docker-compose -f docker-compose.dev.yml up -d db

# Wait for it to be ready, then run migrations
cd backend
pip install -r requirements.txt
alembic upgrade head
```

**Option B: With local PostgreSQL**
```bash
# Create database
createdb books4all

# Copy env file
cp .env.example .env

# Run migrations
cd backend
pip install -r requirements.txt
alembic upgrade head
```

### 4. Verify Tables Created
```bash
# Connect to PostgreSQL and check
psql -d books4all -c "\dt"
psql -d books4all -c "\d users"
```

### 5. Check Model Imports
```bash
cd backend
python -c "from app.models import User, Book, Order, Review, Message; print('All models imported successfully')"
```

---

## Files Created/Modified

| File | Action | Description |
|------|--------|-------------|
| `backend/app/models/base.py` | Created | Base model class |
| `backend/app/models/user.py` | Created | User model |
| `backend/app/models/book.py` | Created | Book model |
| `backend/app/models/order.py` | Created | Order & OrderItem models |
| `backend/app/models/review.py` | Created | Review model |
| `backend/app/models/message.py` | Created | Message model |
| `backend/app/models/__init__.py` | Modified | Export all models |
| `backend/alembic.ini` | Created | Alembic configuration |
| `backend/alembic/env.py` | Created | Alembic environment |
| `backend/alembic/script.py.mako` | Created | Migration template |
| `backend/alembic/versions/20241209_001_initial.py` | Created | Initial migration |
| `backend/README.md` | Created | Backend documentation |

---

## Next Steps (Awaiting Your Instruction)
- Pydantic schemas for request/response validation
- API endpoints implementation
- Authentication (JWT + OAuth)
- Service layer business logic
- Whatever you specify next

---

**Status:** ✅ Complete - Awaiting your review
