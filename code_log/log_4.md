# Log 4 - Pydantic Schemas

**Date:** January 22, 2026

---

## What I Did

Created comprehensive Pydantic schemas for all models in `backend/app/schemas/`:

### 1. Base Schemas (`base.py`)

- `BaseSchema` - Common config (from_attributes, str_strip_whitespace, etc.)
- `TimestampMixin` - created_at, updated_at fields
- `IDMixin` - UUID id field
- `ResponseSchema` - Combines ID + Timestamps for API responses
- `PaginatedResponse[T]` - Generic paginated response with:
  - items, total, page, page_size, pages
  - has_next, has_prev
  - `create()` factory method

---

### 2. User Schemas (`user.py`)

| Schema | Purpose |
|--------|---------|
| `UserBase` | email, first_name, last_name |
| `UserCreate` | + password (with strength validation), role |
| `UserUpdate` | all fields optional |
| `UserPasswordUpdate` | current_password, new_password |
| `UserResponse` | full response excluding password_hash |
| `UserBriefResponse` | minimal info for nested responses |
| `UserListResponse` | paginated list |
| `UserRoleUpdate` | admin role change |

**Password Validation:**
- Min 8 characters
- At least 1 uppercase
- At least 1 lowercase
- At least 1 digit

---

### 3. Book Schemas (`book.py`)

| Schema | Purpose |
|--------|---------|
| `BookBase` | title, author, isbn, description, condition, price |
| `BookCreate` | + quantity, images, category, publisher, etc. |
| `BookUpdate` | all fields optional |
| `BookResponse` | full response + seller info |
| `BookBriefResponse` | minimal for nested responses |
| `BookListResponse` | paginated list |
| `BookSearchParams` | query, category, condition, price range, sort |

**Validators:**
- ISBN format (10 or 13 digits)
- Price > 0, max 10000
- Max 10 images
- Image URLs must start with http/https

---

### 4. Order Schemas (`order.py`)

| Schema | Purpose |
|--------|---------|
| `ShippingAddress` | full_name, address, city, state, postal, country |
| `OrderItemCreate` | book_id, quantity |
| `OrderItemResponse` | + price_at_purchase, book snapshot |
| `OrderCreate` | items[], shipping_address |
| `OrderUpdate` | status, notes (admin) |
| `OrderResponse` | full response + items + buyer |
| `OrderListResponse` | paginated list |
| `CheckoutSession` | checkout_url, session_id, order_id |

**Validators:**
- 1-50 items per order
- No duplicate books (combine quantities)

---

### 5. Review Schemas (`review.py`)

| Schema | Purpose |
|--------|---------|
| `ReviewBase` | rating (1-5), comment |
| `ReviewCreate` | for POST |
| `ReviewUpdate` | optional fields for PATCH |
| `ReviewResponse` | + is_verified_purchase, user info |
| `ReviewListResponse` | paginated list |
| `ReviewStats` | average_rating, rating_distribution, total |

---

### 6. Message Schemas (`message.py`)

| Schema | Purpose |
|--------|---------|
| `MessageBase` | content |
| `MessageCreate` | + recipient_id, book_id |
| `MessageResponse` | + sender, recipient, read_at |
| `MessageListResponse` | paginated list |
| `ConversationResponse` | participant, last_message, unread_count |
| `MarkReadRequest` | message_ids[] |
| `UnreadCountResponse` | unread_count |

---

### 7. Auth Schemas (`auth.py`)

| Schema | Purpose |
|--------|---------|
| `LoginRequest` | email, password |
| `RegisterRequest` | email, password, names, role |
| `TokenResponse` | access_token, refresh_token, expires_in |
| `AuthResponse` | tokens + user info |
| `RefreshTokenRequest` | refresh_token |
| `PasswordResetRequest` | email (forgot password) |
| `PasswordResetConfirm` | token, new_password |
| `EmailVerificationRequest` | token |
| `OAuthCallbackRequest` | code, state |
| `OAuthURLResponse` | authorization_url, state |

---

### 8. Pagination Schemas (`pagination.py`)

- `PaginationParams` - page, page_size, skip, limit
- `SortParams` - sort_by, sort_order
- `get_pagination_params()` - FastAPI dependency
- `get_sort_params()` - FastAPI dependency

---

### 9. Error Schemas (`error.py`)

**RFC 7807 Compliant:**

```python
ErrorResponse:
  - type: URI reference
  - title: short summary
  - status: HTTP code
  - detail: explanation
  - instance: request path
  - errors: [ErrorDetail] (for validation)
```

**Pre-defined Errors:**
- `NotFoundError` (404)
- `UnauthorizedError` (401)
- `ForbiddenError` (403)
- `ValidationError` (422)
- `ConflictError` (409)
- `RateLimitError` (429)
- `InternalServerError` (500)

**Factory Function:**
```python
create_error_response(status, detail, title, error_type, instance, errors)
```

---

## Files Created

| File | Description |
|------|-------------|
| `backend/app/schemas/base.py` | Base classes + pagination |
| `backend/app/schemas/user.py` | User schemas |
| `backend/app/schemas/book.py` | Book schemas |
| `backend/app/schemas/order.py` | Order schemas |
| `backend/app/schemas/review.py` | Review schemas |
| `backend/app/schemas/message.py` | Message schemas |
| `backend/app/schemas/auth.py` | Auth schemas |
| `backend/app/schemas/pagination.py` | Pagination helpers |
| `backend/app/schemas/error.py` | RFC 7807 errors |
| `backend/app/schemas/__init__.py` | Module exports |

---

## What You Should Do (Test & Review)

### 1. Test Schema Imports
```bash
cd backend
python -c "
from app.schemas import (
    UserCreate, UserResponse,
    BookCreate, BookResponse,
    OrderCreate, OrderResponse,
    ReviewCreate, ReviewResponse,
    LoginRequest, TokenResponse,
    ErrorResponse, PaginatedResponse,
)
print('All schemas imported successfully!')
"
```

### 2. Test User Schema Validation
```bash
cd backend
python -c "
from app.schemas import UserCreate

# Valid user
user = UserCreate(
    email='test@example.com',
    password='SecureP@ss123',
    first_name='John',
    last_name='Doe'
)
print('Valid user:', user.email)

# Invalid password (should fail)
try:
    bad_user = UserCreate(email='test@example.com', password='weak')
except Exception as e:
    print('Password validation:', str(e)[:50])
"
```

### 3. Test Book Schema Validation
```bash
cd backend
python -c "
from decimal import Decimal
from app.schemas import BookCreate
from app.models.book import BookCondition

book = BookCreate(
    title='The Great Gatsby',
    author='F. Scott Fitzgerald',
    isbn='978-0743273565',
    condition=BookCondition.LIKE_NEW,
    price=Decimal('19.99'),
)
print('Book:', book.title, '-', book.price)
"
```

### 4. Test Pagination
```bash
cd backend
python -c "
from app.schemas import PaginatedResponse

# Create paginated response
response = PaginatedResponse.create(
    items=['item1', 'item2', 'item3'],
    total=100,
    page=2,
    page_size=20,
)
print('Page:', response.page, 'of', response.pages)
print('Has next:', response.has_next)
print('Has prev:', response.has_prev)
"
```

### 5. Test Error Response
```bash
cd backend
python -c "
from app.schemas import create_error_response

error = create_error_response(
    status=404,
    detail='Book not found',
    instance='/api/v1/books/123'
)
print('Error:', error.title, '-', error.detail)
"
```

### 6. Review Schema Files
```bash
ls -la backend/app/schemas/
cat backend/app/schemas/book.py | head -80
```

---

## Usage Examples

### In API Endpoints
```python
from app.schemas import BookCreate, BookResponse, BookListResponse

@router.post("/books", response_model=BookResponse)
async def create_book(
    book_data: BookCreate,
    current_user: CurrentUser,
) -> BookResponse:
    # book_data is validated automatically
    ...

@router.get("/books", response_model=BookListResponse)
async def list_books(
    pagination: PaginationParams = Depends(get_pagination_params),
) -> BookListResponse:
    ...
```

### Error Responses in OpenAPI
```python
from app.schemas import ErrorResponse, NotFoundError

@router.get(
    "/books/{id}",
    response_model=BookResponse,
    responses={
        404: {"model": ErrorResponse, "description": "Book not found"},
    }
)
async def get_book(id: UUID):
    ...
```

---

**Status:** ✅ Complete - Awaiting your review
