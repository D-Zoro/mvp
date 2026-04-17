# Books4All — Directory Structure & Naming Conventions

**Last Updated:** 2026-04-18  
**Version:** 1.0

---

## Repository Root Layout

```
Books4All/
├── .planning/
│   └── codebase/                   # Architecture & planning documents
│       ├── ARCHITECTURE.md
│       └── STRUCTURE.md            # ← You are here
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI app, middleware, exception handlers
│   │   ├── core/                   # Configuration & infrastructure
│   │   ├── api/
│   │   ├── models/                 # SQLAlchemy ORM models
│   │   ├── schemas/                # Pydantic request/response schemas
│   │   ├── repositories/           # Data access layer
│   │   └── services/               # Business logic layer
│   ├── alembic/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/               # Migration files
│   ├── tests/
│   │   ├── unit/                   # Pure-Python tests (no DB)
│   │   ├── DB/                     # Database tests (real DB, rollback)
│   │   └── integration/            # API tests (AsyncClient)
│   ├── main.py                     # Entrypoint: uvicorn app.main:app
│   ├── pyproject.toml              # Project metadata & dependencies
│   ├── requirements.txt            # (optional) direct dependency list
│   ├── .env.example                # Template for environment variables
│   └── .env                        # ← Local .gitignored secrets
├── frontend/
│   ├── app/                        # Next.js App Router pages
│   ├── src/
│   │   ├── components/             # React components
│   │   ├── lib/                    # Utilities, API client, helpers
│   │   ├── store/                  # Zustand state stores
│   │   ├── providers/              # Context providers
│   │   └── design_system.md        # Component library documentation
│   ├── public/                     # Static assets (images, fonts)
│   ├── package.json                # NPM dependencies
│   ├── tsconfig.json               # TypeScript configuration
│   ├── next.config.js              # Next.js configuration
│   ├── .env.local                  # Local environment variables
│   └── .env.example                # Template
├── code_log/                       # Per-step change markdown logs
├── docker-compose.dev.yml          # Development environment
├── docker-compose.staging.yml      # Staging environment
├── docker-compose.prod.yml         # Production environment
├── .gitignore
├── README.md
└── CLAUDE.md                       # Project context for AI assistants

```

---

## Backend Directory Structure (Detailed)

### `backend/app/main.py`

**Purpose:** FastAPI application initialization, global configuration

**Responsibilities:**
- Define FastAPI app instance
- Mount middleware (CORS, rate limiting)
- Define global exception handlers
- Define lifecycle events (startup/shutdown)
- Mount system endpoints (`/health`, `/metrics`, `/`)
- Include API router

**Key Exports:**
- `app: FastAPI` — Main application instance

**Pattern:**
```python
# Exception map
_SERVICE_EXCEPTION_MAP: dict[type[ServiceError], int] = {...}

# Lifespan context manager
@asynccontextmanager
async def lifespan(app: FastAPI): ...

# Exception handlers
@app.exception_handler(ServiceError) ...
@app.exception_handler(RequestValidationError) ...
@app.exception_handler(Exception) ...

# System endpoints
@app.get("/health") ...
@app.get("/metrics") ...

# Include router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)
```

---

### `backend/app/core/`

**Purpose:** Infrastructure, configuration, security utilities

#### `config.py`
**Exports:** `settings: Settings` (Pydantic BaseSettings)

**Key Fields:**
- `APP_NAME`, `APP_VERSION`, `ENVIRONMENT` — App metadata
- `DEBUG` — Debug mode (False in production)
- `DATABASE_URL` — Async PostgreSQL connection string
- `SYNC_DATABASE_URL` — Sync PostgreSQL for Alembic
- `SECRET_KEY` — JWT signing key (min 32 chars)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — Payment secrets
- `REDIS_URL` — Redis connection for rate limiter
- `CORS_ORIGINS`, `CORS_ALLOW_METHODS` — CORS configuration
- `RATE_LIMIT_DEFAULT_CALLS`, `RATE_LIMIT_DEFAULT_PERIOD` — Rate limiting
- `API_V1_PREFIX` — Default: `/api/v1`
- `BCRYPT_ROUNDS` — Password hashing rounds (default: 12)

#### `database.py`
**Exports:**
- `engine: AsyncEngine` — SQLAlchemy async engine instance
- `async_session_maker` — Session factory
- `get_session()` — Async context manager for sessions
- `check_database_health()` — DB connectivity check
- `init_database()` — Create all tables (dev only)
- `drop_database()` — Drop all tables (testing only)

**Pattern:**
```python
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DATABASE_ECHO,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
)

async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)
```

#### `security.py`
**Exports:**
- `pwd_context: CryptContext` — Password hashing context
- `TokenPayload` — Pydantic model for JWT payload
- `TokenPair` — Access + refresh token pair
- `hash_password(password: str) -> str`
- `verify_password(plain: str, hash: str) -> bool`
- `create_access_token(user_id: UUID, role: UserRole) -> str`
- `create_refresh_token(user_id: UUID) -> str`
- `verify_access_token(token: str) -> Optional[TokenPayload]`

**Token Type Field:** Every token carries `type` claim:
- `"access"` — Short-lived, for API requests
- `"refresh"` — Long-lived, only for token refresh endpoint
- `"password_reset"` — Single-use, for password reset flow
- `"email_verification"` — Single-use, for email verification

#### `dependencies.py`
**Exports:**
- `DBSession` — Type alias: `Annotated[AsyncSession, Depends(get_db)]`
- `TokenDep` — Type alias: `Annotated[TokenPayload, Depends(get_token_payload)]`
- `CurrentUser` — Type alias: `Annotated[User, Depends(get_current_user)]`
- `ActiveUser` — Type alias: `Annotated[User, Depends(get_current_active_user)]`
- `VerifiedUser` — Type alias: `Annotated[User, Depends(get_current_verified_user)]`
- `OptionalUser` — Type alias: `Annotated[Optional[User], Depends(get_optional_user)]`
- `Pagination` — Type alias: `Annotated[PaginationParams, Depends()]`
- `RequireAdmin`, `RequireSeller`, `RequireBuyer` — Pre-made role checkers

**Dependency Functions:**
```python
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yields session, auto-commits/rolls back"""

async def get_token_payload(credentials) -> TokenPayload:
    """Extract JWT token, return payload"""

async def get_current_user(db, token) -> User:
    """Fetch user from DB, verify active"""

async def get_optional_user(db, credentials) -> Optional[User]:
    """Like get_current_user but returns None if not auth"""

async def require_role(*roles) -> Callable:
    """Factory: returns role-checking dependency"""

class PaginationParams:
    page: int = Query(ge=1, default=1)
    per_page: int = Query(ge=1, le=100, default=20)
    skip: int = property  # (page - 1) * per_page
```

#### `rate_limiter.py`
**Exports:**
- `rate_limiter: RateLimiter` — Redis-backed rate limiter
- `RateLimitMiddleware` — Middleware class

**Pattern:**
```python
class RateLimiter:
    async def is_allowed(ip: str) -> bool: ...
    async def get_redis(): ...
    async def close(): ...

class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(request, call_next): ...
```

---

### `backend/app/models/`

**Purpose:** SQLAlchemy ORM model definitions

**Naming Convention:** Singular, CamelCase  
**Inheritance:** All inherit from `Base`

#### `base.py`
**Exports:** `Base: DeclarativeBase`

```python
class Base(DeclarativeBase):
    __abstract__ = True
    
    id: Mapped[UUID] = mapped_column(..., primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(..., server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(..., onupdate=func.now())
    deleted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    
    @property
    def is_deleted(self) -> bool: ...
    def soft_delete(self) -> None: ...
    def restore(self) -> None: ...
```

#### `user.py`
**Key Enums:**
- `UserRole`: BUYER, SELLER, ADMIN
- `OAuthProvider`: GOOGLE, FACEBOOK, GITHUB

**Model: User**
- `email` (unique, indexed)
- `password_hash` (nullable for OAuth users)
- `role` (enum)
- `email_verified`, `is_active` (booleans)
- `first_name`, `last_name`, `avatar_url`
- `oauth_provider`, `oauth_provider_id`
- Relationships: `books`, `orders` (buyer), `reviews`, `messages` (sent/received)

#### `book.py`
**Key Enums:**
- `BookCondition`: MINT, NEAR_MINT, VERY_GOOD, GOOD, FAIR, POOR
- `BookStatus`: ACTIVE, SOLD_OUT, INACTIVE

**Model: Book**
- `seller_id` (foreign key, indexed)
- `title`, `author`, `isbn`, `description`
- `condition` (enum)
- `status` (enum, indexed)
- `price` (DECIMAL)
- `quantity` (INTEGER, CHECK constraint >= 0)
- `cover_image_url`
- Relationships: `seller`, `orders` (via OrderItem), `reviews`

#### `order.py`
**Key Enums:**
- `OrderStatus`: PENDING, PAYMENT_PROCESSING, PAID, SHIPPED, DELIVERED, CANCELLED, REFUNDED

**Models:**
- **Order**
  - `buyer_id` (foreign key, indexed)
  - `total_amount` (DECIMAL)
  - `status` (enum, indexed)
  - `stripe_payment_id`, `stripe_session_id`
  - `shipping_address` (JSON)
  - `notes`
  - Relationships: `buyer`, `items` (OrderItem[])

- **OrderItem**
  - `order_id`, `book_id` (foreign keys)
  - `quantity`, `unit_price_at_purchase`
  - Relationships: `order`, `book`

#### `review.py`
**Model: Review**
- `order_id`, `reviewer_id`, `book_id` (foreign keys)
- `rating` (INTEGER, 1-5)
- `comment`
- `verified_purchase` (boolean, derived from order)
- Relationships: `reviewer` (User), `book`, `order`

#### `message.py`
**Model: Message**
- `sender_id`, `recipient_id` (foreign keys)
- `subject`, `body`
- `read_at` (nullable timestamp)
- Relationships: `sender`, `recipient` (Users)

---

### `backend/app/schemas/`

**Purpose:** Pydantic v2 request/response validation schemas

**Naming Convention:**
- `{Entity}Base` — Common fields (used in Create/Update)
- `{Entity}Create` — Request schema for POST
- `{Entity}Update` — Request schema for PUT/PATCH
- `{Entity}Response` — Response schema for GET
- `{Entity}ListResponse` — Wrapper for paginated lists
- `{Entity}BriefResponse` — Minimal fields (for nested responses)

#### `base.py`
**Exports:**
```python
class BaseSchema(BaseModel):
    """Default: model_config with validation mode 'after'"""
    
class ResponseSchema(BaseSchema):
    """For response models; includes timestamps"""
    id: UUID
    created_at: datetime
    updated_at: datetime

class PaginatedResponse[T]:
    """Generic paginated wrapper"""
    data: list[T]
    total: int
    page: int
    per_page: int
    has_more: bool
```

#### `user.py`
```python
class UserBase(BaseSchema):
    email: str
    first_name: str
    last_name: str
    role: UserRole

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseSchema):
    first_name: Optional[str] = None
    # ... other optional fields

class UserResponse(ResponseSchema, UserBase):
    email_verified: bool
    is_active: bool
    avatar_url: Optional[str]

class UserBriefResponse(BaseSchema):
    id: UUID
    email: str
    avatar_url: Optional[str]
```

#### `book.py`, `order.py`, `review.py`, etc.
Similar pattern:
```python
class BookCreate(BaseSchema):
    title: str
    author: str
    isbn: Optional[str]
    # ...

class BookResponse(ResponseSchema):
    seller_id: UUID
    title: str
    # ...

class OrderItemResponse(BaseSchema):
    book_id: UUID
    book: BookBriefResponse  # Nested
    quantity: int
    unit_price_at_purchase: Decimal

class OrderResponse(ResponseSchema):
    buyer_id: UUID
    total_amount: Decimal
    status: OrderStatus
    items: list[OrderItemResponse]  # Eager loaded
    # ...

class OrderListResponse(BaseSchema):
    data: list[OrderResponse]
    total: int
    page: int
    per_page: int
    has_more: bool
```

#### `error.py`
```python
class ErrorDetail(BaseSchema):
    status_code: int
    detail: str | list[dict]  # String or list of field errors

class ValidationErrorDetail(BaseSchema):
    field: str
    message: str
    type: str
```

---

### `backend/app/repositories/`

**Purpose:** Data access layer; async SQLAlchemy queries

**Naming Convention:** `{Entity}Repository`  
**Base Class:** `BaseRepository[ModelType, CreateSchemaType, UpdateSchemaType]`

#### `base.py`
**Exports:** `BaseRepository[M, C, U]`

**Generic Methods (all repositories inherit):**
```python
async def get(id: UUID, *, include_deleted: bool = False) -> Optional[M]:
    """Single record by ID"""

async def get_by_ids(ids: list[UUID], *, include_deleted: bool = False) -> list[M]:
    """Multiple records by IDs"""

async def get_multi(
    *, 
    skip: int = 0, 
    limit: int = 100, 
    order_by: Optional[str] = None,
    order_desc: bool = True,
    filters: Optional[dict] = None,
    include_deleted: bool = False,
) -> list[M]:
    """Paginated list with optional filtering & ordering"""

async def create(obj_in: Union[C, dict]) -> M:
    """Create new record"""

async def update(db_obj: M, obj_in: Union[U, dict]) -> M:
    """Update existing record"""

async def delete(id: UUID) -> bool:
    """Soft delete (sets deleted_at)"""

async def hard_delete(id: UUID) -> bool:
    """Permanent delete"""

async def restore(id: UUID) -> Optional[M]:
    """Restore soft-deleted record"""

async def count(*, filters: Optional[dict] = None, include_deleted: bool = False) -> int:
    """Count records"""

async def exists(id: UUID, *, include_deleted: bool = False) -> bool:
    """Check existence"""
```

#### `user.py`
**Exports:** `UserRepository(BaseRepository[User, UserCreate, UserUpdate])`

**Specialized Methods:**
```python
async def get_by_email(email: str) -> Optional[User]:
    """Fetch user by email (unique constraint)"""

async def get_by_oauth_id(provider: OAuthProvider, provider_id: str) -> Optional[User]:
    """Fetch user by OAuth provider + ID"""

async def search(q: str, skip: int, limit: int) -> list[User]:
    """Full-text search on name/email"""
```

#### `book.py`
**Exports:** `BookRepository(BaseRepository[Book, BookCreate, BookUpdate])`

**Specialized Methods:**
```python
async def get_by_seller(seller_id: UUID, skip: int, limit: int) -> list[Book]:
    """Books listed by seller"""

async def search(
    q: str, 
    condition: Optional[BookCondition], 
    price_min: Optional[Decimal],
    price_max: Optional[Decimal],
    skip: int, 
    limit: int,
) -> list[Book]:
    """Full-text search with filters"""

async def deduct_quantity(book_id: UUID, qty: int) -> bool:
    """Deduct stock (used in order creation)"""
```

#### `order.py`
**Exports:** `OrderRepository(BaseRepository[Order, OrderCreate, OrderUpdate])`

**Specialized Methods:**
```python
async def get_with_items(order_id: UUID) -> Optional[Order]:
    """Load order + items + books (eager loading)"""

async def create_with_items(
    *,
    buyer_id: UUID,
    items: list[OrderItemCreate],
    shipping_address: dict,
    notes: Optional[str],
) -> Order:
    """Atomic: create order + items + deduct quantities"""

async def get_by_buyer(buyer_id: UUID, skip: int, limit: int) -> list[Order]:
    """Orders for buyer"""

async def get_by_seller(seller_id: UUID, skip: int, limit: int) -> list[Order]:
    """Orders containing seller's books"""

async def update_status(order_id: UUID, new_status: OrderStatus) -> Optional[Order]:
    """Update status (with validation delegated to service)"""
```

#### `review.py`
**Exports:** `ReviewRepository(BaseRepository[Review, ReviewCreate, ReviewUpdate])`

**Specialized Methods:**
```python
async def get_for_book(book_id: UUID, skip: int, limit: int) -> list[Review]:
    """Reviews for book"""

async def is_verified_purchase(order_id: UUID, book_id: UUID) -> bool:
    """Check if book was in delivered order"""
```

---

### `backend/app/services/`

**Purpose:** Business logic layer; orchestrate repositories, enforce invariants

**Naming Convention:** `{Feature}Service`  
**Exception Base:** `ServiceError` and subclasses

#### `exceptions.py`
**Exports:** All custom exception classes

**Hierarchy:**
```python
class ServiceError(Exception):
    """Base"""

# Auth exceptions
class EmailAlreadyExistsError(ServiceError): ...
class InvalidCredentialsError(ServiceError): ...
class InvalidTokenError(ServiceError): ...
class AccountInactiveError(ServiceError): ...
class OAuthNotConfiguredError(ServiceError): ...
class OAuthError(ServiceError): ...

# Book exceptions
class BookNotFoundError(ServiceError): ...
class NotBookOwnerError(ServiceError): ...
class NotSellerError(ServiceError): ...

# Order exceptions
class OrderNotFoundError(ServiceError): ...
class NotOrderOwnerError(ServiceError): ...
class InsufficientStockError(ServiceError): ...
class OrderNotCancellableError(ServiceError): ...
class InvalidStatusTransitionError(ServiceError): ...

# Payment exceptions
class PaymentError(ServiceError): ...
class StripeWebhookError(ServiceError): ...
class RefundError(ServiceError): ...
```

#### `auth_service.py`
**Exports:** `AuthService`

**Methods:**
```python
async def register(self, user_data: UserCreate) -> TokenPair:
    """Create user, return access + refresh tokens"""
    # Raises: EmailAlreadyExistsError

async def login(self, email: str, password: str) -> TokenPair:
    """Authenticate, return tokens"""
    # Raises: InvalidCredentialsError, AccountInactiveError

async def refresh_token(self, refresh_token: str) -> TokenPair:
    """Exchange refresh token for new access token"""
    # Raises: InvalidTokenError

async def initiate_oauth(self, provider: OAuthProvider, code: str) -> TokenPair:
    """OAuth code exchange (Google/GitHub)"""
    # Raises: OAuthNotConfiguredError, OAuthError

async def request_password_reset(self, email: str) -> None:
    """Email reset link (no-op if email not found)"""

async def reset_password(self, token: str, new_password: str) -> None:
    """Apply new password from reset token"""
    # Raises: InvalidTokenError
```

#### `book_service.py`
**Exports:** `BookService`

**Methods:**
```python
async def create_book(self, seller: User, book_data: BookCreate) -> BookResponse:
    """Create book listing"""
    # Raises: NotSellerError

async def get_book(self, book_id: UUID) -> BookResponse:
    """Fetch book"""
    # Raises: BookNotFoundError

async def update_book(self, seller: User, book_id: UUID, book_data: BookUpdate) -> BookResponse:
    """Update book (seller only)"""
    # Raises: BookNotFoundError, NotBookOwnerError

async def delete_book(self, seller: User, book_id: UUID) -> bool:
    """Soft delete book"""
    # Raises: NotBookOwnerError

async def search_books(
    self, 
    q: str, 
    condition: Optional[BookCondition],
    price_min: Optional[Decimal],
    price_max: Optional[Decimal],
    skip: int,
    limit: int,
) -> list[BookResponse]:
    """Full-text search"""

async def get_books_by_seller(self, seller_id: UUID, skip: int, limit: int) -> list[BookResponse]:
    """Books listed by seller"""
```

#### `order_service.py`
**Exports:** `OrderService`

**State Machine Definition:**
```python
_ALLOWED_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.PENDING: {OrderStatus.PAYMENT_PROCESSING, OrderStatus.CANCELLED},
    OrderStatus.PAYMENT_PROCESSING: {OrderStatus.PAID, OrderStatus.CANCELLED},
    OrderStatus.PAID: {OrderStatus.SHIPPED, OrderStatus.REFUNDED},
    OrderStatus.SHIPPED: {OrderStatus.DELIVERED, OrderStatus.REFUNDED},
    OrderStatus.DELIVERED: {OrderStatus.REFUNDED},
    OrderStatus.CANCELLED: set(),
    OrderStatus.REFUNDED: set(),
}
```

**Methods:**
```python
async def create_order(self, *, buyer: User, order_data: OrderCreate) -> OrderResponse:
    """
    Create order:
    1. Validate stock for all items
    2. Create Order + OrderItems (atomic)
    3. Deduct quantities
    """
    # Raises: InsufficientStockError, BookNotFoundError

async def get_order(self, user: User, order_id: UUID) -> OrderResponse:
    """Fetch order (buyer or seller of items in order)"""
    # Raises: OrderNotFoundError, NotOrderOwnerError

async def list_orders(self, user: User, skip: int, limit: int) -> list[OrderResponse]:
    """Orders for buyer or seller"""

async def cancel_order(self, buyer: User, order_id: UUID) -> OrderResponse:
    """Cancel order (PENDING only, buyer only)"""
    # Raises: OrderNotFoundError, OrderNotCancellableError

async def update_status(self, admin: User, order_id: UUID, new_status: OrderStatus) -> OrderResponse:
    """Update order status (admin only, with transition validation)"""
    # Raises: InvalidStatusTransitionError, OrderNotFoundError

def _assert_valid_transition(self, from_status: OrderStatus, to_status: OrderStatus) -> None:
    """Helper: validates transition or raises InvalidStatusTransitionError"""
```

#### `payment_service.py`
**Exports:** `PaymentService`

**Methods:**
```python
async def create_checkout_session(self, order: Order) -> dict:
    """Create Stripe checkout session"""
    # Raises: PaymentError

async def handle_webhook(self, event: dict) -> None:
    """Process Stripe webhook event"""
    # Raises: StripeWebhookError, PaymentError

async def refund_order(self, order: Order) -> None:
    """Initiate refund"""
    # Raises: RefundError

async def get_payment_status(self, order: Order) -> str:
    """Check Stripe payment status"""
```

#### `review_service.py`
**Exports:** `ReviewService`

**Methods:**
```python
async def create_review(
    self, 
    reviewer: User, 
    book_id: UUID, 
    review_data: ReviewCreate,
) -> ReviewResponse:
    """
    Create review:
    1. Verify reviewer purchased book (OrderStatus.DELIVERED)
    2. Check not already reviewed by this user
    3. Create review
    """
    # Raises: BookNotFoundError, InvalidCredentialsError (not verified purchase)

async def get_book_reviews(
    self, 
    book_id: UUID, 
    skip: int, 
    limit: int,
) -> list[ReviewResponse]:
    """Reviews for book (verified purchases only)"""
```

#### `storage.py`
**Exports:** File upload utilities (for book cover images, user avatars)

**Methods:**
```python
async def upload_file(self, file: UploadFile, destination: str) -> str:
    """Upload file to storage, return URL"""
    # Raises: StorageError if fails

async def delete_file(self, file_path: str) -> None:
    """Delete file"""
```

---

### `backend/app/api/v1/`

**Purpose:** FastAPI routers (endpoints grouped by feature)

#### `router.py`
**Exports:** `api_router: APIRouter`

```python
api_router = APIRouter()

# Mount sub-routers with prefixes and tags
api_router.include_router(
    auth_router,
    prefix="/auth",
    tags=["Authentication"],
)
api_router.include_router(
    books_router,
    tags=["Books"],
)
api_router.include_router(
    orders_router,
    tags=["Orders"],
)
# ... etc
```

#### `endpoints/auth.py`
**Exports:** `router: APIRouter`

**Routes:**
```python
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
GET /auth/oauth/{provider}?code=...
POST /auth/password-reset-request
POST /auth/password-reset
GET /auth/me
```

#### `endpoints/books.py`
**Exports:** `router: APIRouter`

**Routes:**
```python
POST /books                   # Create (requires seller role)
GET /books                    # Search & list
GET /books/{book_id}          # Get book
PUT /books/{book_id}          # Update (requires owner)
DELETE /books/{book_id}       # Delete (requires owner)
GET /books/seller/{seller_id} # Books by seller
```

#### `endpoints/orders.py`
**Exports:** `router: APIRouter`

**Routes:**
```python
POST /orders                  # Create order
GET /orders                   # List orders (buyer or seller filter)
GET /orders/{order_id}        # Get order
PATCH /orders/{order_id}/cancel  # Cancel order
PATCH /orders/{order_id}/status  # Update status (admin)
```

#### `endpoints/payments.py`
**Exports:** `router: APIRouter`

**Routes:**
```python
POST /payments/checkout               # Create Stripe session
POST /payments/webhook                # Stripe webhook (no rate limit)
GET /payments/{order_id}/status       # Check payment status
```

#### `endpoints/reviews.py`
**Exports:** `router: APIRouter`

**Routes:**
```python
POST /reviews                 # Create review
GET /books/{book_id}/reviews  # Get reviews for book
```

#### `endpoints/upload.py`
**Exports:** `router: APIRouter`

**Routes:**
```python
POST /upload/book-cover       # Upload book cover
POST /upload/avatar           # Upload user avatar
```

---

### `backend/alembic/`

**Purpose:** Database schema versioning (Alembic)

#### `versions/`
**Naming Convention:** `YYYYMMDD_HHMM_<hash>_<description>.py`

**Example:**
- `20251229_1912_239688c9b228_initial_schema.py`
- `20260320_1308_656108e78ec1_change_shipping_address_to_json.py`

**Pattern:**
```python
revision = '656108e78ec1'
down_revision = '239688c9b228'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column('orders', sa.Column('shipping_address_json', sa.JSON(), ...))
    # ...

def downgrade() -> None:
    op.drop_column('orders', 'shipping_address_json')
    # ...
```

---

### `backend/tests/`

**Purpose:** Automated tests (unit, integration, DB)

#### `conftest.py`
**Purpose:** Shared pytest fixtures

**Key Fixtures:**
```python
@pytest.fixture(autouse=True)
def mock_redis():
    """Mock Redis for tests"""
    with patch('app.core.rate_limiter.get_redis'):
        yield

@pytest.fixture
async def async_client(app):
    """AsyncClient for integration tests"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

@pytest.fixture
async def test_db():
    """Rollback transaction for each test"""
    async with test_session() as session:
        yield session
        await session.rollback()

@pytest.fixture
def override_get_db(test_db):
    """Override get_db dependency"""
    def _override():
        return test_db
    app.dependency_overrides[get_db] = _override
    yield
    app.dependency_overrides.clear()
```

#### `unit/`
**Purpose:** Pure-Python tests (no DB, no HTTP)

**Naming:** `test_*.py`  
**Pattern:**
```python
# tests/unit/test_auth_service.py
async def test_login_invalid_credentials():
    service = AuthService(mock_db)
    with pytest.raises(InvalidCredentialsError):
        await service.login("user@example.com", "wrong_password")
```

#### `DB/`
**Purpose:** Database tests (real DB, rolled-back)

**Naming:** `test_*.py`  
**Pattern:**
```python
# tests/DB/test_order_creation.py
async def test_order_creation_with_stock_validation(async_session):
    # Create book with limited stock
    book = await book_repo.create(...)
    
    # Verify stock reduced after order
    order = await order_service.create_order(...)
    book_after = await book_repo.get(book.id)
    assert book_after.quantity == book.quantity - order_items[0].quantity
```

#### `integration/`
**Purpose:** Full API tests (AsyncClient)

**Naming:** `test_*.py`  
**Pattern:**
```python
# tests/integration/test_orders_api.py
async def test_create_order_endpoint(async_client, auth_header):
    response = await async_client.post(
        "/api/v1/orders",
        json={...},
        headers=auth_header,
    )
    assert response.status_code == 201
    assert response.json()["data"]["status"] == "pending"
```

---

## Frontend Directory Structure

### `frontend/app/`

**Framework:** Next.js App Router (file-based routing)

**Layout:**
```
app/
├── layout.tsx              # Root layout (HTML, fonts, providers)
├── page.tsx                # Homepage /
├── globals.css             # Global styles
├── favicon.ico             # Favicon
│
├── (auth)/                 # Auth routes (route group, no /auth prefix)
│   ├── login/
│   │   ├── page.tsx        # /login
│   │   └── LoginForm.tsx   # Component
│   ├── register/
│   │   ├── page.tsx        # /register
│   │   └── RegisterForm.tsx
│   └── oauth-callback/
│       └── page.tsx        # /oauth-callback (Google/GitHub redirect)
│
├── books/
│   ├── page.tsx            # /books (search & browse)
│   ├── [id]/
│   │   └── page.tsx        # /books/:id (detail)
│   └── components/
│       ├── BookCard.tsx
│       ├── BookSearch.tsx
│       └── BookFilters.tsx
│
├── cart/
│   ├── page.tsx            # /cart
│   └── CartSummary.tsx
│
├── checkout/
│   ├── page.tsx            # /checkout (Stripe integration)
│   └── StripeCheckout.tsx
│
├── dashboard/
│   ├── page.tsx            # /dashboard (buyer dashboard)
│   ├── orders/
│   │   └── [id]/
│   │       └── page.tsx    # /dashboard/orders/:id
│   └── components/
│       └── OrderList.tsx
│
└── seller/
    ├── page.tsx            # /seller (seller dashboard)
    ├── listings/
    │   ├── page.tsx        # /seller/listings
    │   ├── new/
    │   │   └── page.tsx    # /seller/listings/new (create book)
    │   └── [id]/
    │       └── page.tsx    # /seller/listings/:id (edit book)
    ├── orders/
    │   ├── page.tsx        # /seller/orders (fulfillment)
    │   └── [id]/
    │       └── page.tsx    # /seller/orders/:id (detail)
    └── components/
        ├── BookForm.tsx    # Create/edit book
        └── OrderFulfillment.tsx
```

### `frontend/src/components/`

**Purpose:** Reusable React components

**Structure:**
```
components/
├── ui/                     # Base UI components (button, card, modal)
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Modal.tsx
│   ├── Input.tsx
│   └── ...
│
├── auth/                   # Auth-related components
│   ├── LoginForm.tsx
│   ├── RegisterForm.tsx
│   └── ProtectedRoute.tsx
│
├── books/                  # Book display components
│   ├── BookCard.tsx
│   ├── BookList.tsx
│   ├── BookDetail.tsx
│   └── BookSearch.tsx
│
├── orders/                 # Order components
│   ├── OrderList.tsx
│   ├── OrderDetail.tsx
│   └── OrderStatus.tsx
│
└── layout/                 # Layout components
    ├── Header.tsx
    ├── Footer.tsx
    ├── Navbar.tsx
    └── Sidebar.tsx
```

### `frontend/src/lib/`

**Purpose:** Utilities, helpers, API client

**Structure:**
```
lib/
├── api/
│   ├── client.ts           # Axios/Fetch wrapper
│   ├── auth.ts             # Auth endpoints
│   ├── books.ts            # Books endpoints
│   ├── orders.ts           # Orders endpoints
│   └── payments.ts         # Payments endpoints
│
├── utils/
│   ├── format.ts           # Format currency, date, etc.
│   ├── validation.ts       # Form validation
│   └── helpers.ts          # General utilities
│
└── constants.ts            # App-wide constants (API_BASE_URL, etc.)
```

### `frontend/src/store/`

**Purpose:** Global state management (Zustand)

**Structure:**
```
store/
├── authStore.ts            # User, tokens, auth state
├── cartStore.ts            # Shopping cart items
├── uiStore.ts              # Modal, toast, theme state
└── orderStore.ts           # Current order, status
```

### `frontend/src/providers/`

**Purpose:** Context providers, wrappers

**Structure:**
```
providers/
├── AuthProvider.tsx        # Auth context (user, login/logout)
├── CartProvider.tsx        # Cart context
├── ThemeProvider.tsx       # Theme (light/dark) context
└── ToastProvider.tsx       # Toast notifications context
```

---

## Naming Conventions

### Python

**Modules:** `lowercase_with_underscores.py`
- `auth_service.py`, `user_repository.py`, `order_model.py`

**Classes:** `PascalCase`
- `User`, `BookRepository`, `InvalidCredentialsError`, `OrderService`

**Functions:** `lowercase_with_underscores`
- `create_book()`, `validate_stock()`, `get_by_email()`

**Constants:** `UPPERCASE_WITH_UNDERSCORES`
- `DATABASE_ECHO`, `API_V1_PREFIX`, `BCRYPT_ROUNDS`

**Private:** Leading underscore
- `_SERVICE_EXCEPTION_MAP`, `_assert_valid_transition()`

**Enum Members:** `lowercase_with_underscores` or `UPPERCASE_WITH_UNDERSCORES`
- `UserRole.BUYER`, `BookStatus.ACTIVE`, `OrderStatus.PAYMENT_PROCESSING`

### TypeScript

**Files:** `lowercase-with-hyphens.ts` or `PascalCase.tsx`
- `auth-api.ts`, `BookCard.tsx`, `useCart.ts`

**Classes/Types:** `PascalCase`
- `User`, `Book`, `Order`, `AuthService`

**Interfaces:** `PascalCase`, prefix with `I` (optional)
- `User`, `IBook` (if convention followed)

**Functions:** `camelCase`
- `createBook()`, `validateEmail()`, `formatCurrency()`

**Constants:** `UPPERCASE_WITH_UNDERSCORES` or `camelCase`
- `API_BASE_URL`, `defaultPageSize`

**Hooks:** `useHook` prefix
- `useAuth()`, `useCart()`, `useLocalStorage()`

**Store:** `camelCase + Store` suffix
- `authStore`, `cartStore`, `uiStore`

---

## File Size Guidelines

**Ideal Module Boundaries:**

| File Type          | Target Size | Reason                    |
|--------------------|-------------|---------------------------|
| Model             | 50-150 LOC  | Single entity definition  |
| Schema            | 100-300 LOC | All variants (Create/Update/Response) |
| Repository        | 150-300 LOC | Entity + specialized methods |
| Service           | 200-400 LOC | Business logic for one domain |
| Endpoint Router   | 200-500 LOC | All CRUD routes + helpers |
| Component (React) | 150-300 LOC | Single responsibility     |
| Store (Zustand)   | 50-100 LOC  | Focused state slice       |

**Refactor if:**
- Module exceeds 500 LOC → Split into sub-modules
- Function exceeds 50 LOC → Extract sub-functions
- Class has >10 public methods → Separate concerns

---

## Import Organization

### Python

```python
# 1. Standard library
from datetime import datetime, timedelta
import logging
import uuid
from typing import Optional

# 2. Third-party
from fastapi import FastAPI, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# 3. Local imports (relative)
from app.core.config import settings
from app.models.user import User
from app.repositories.user import UserRepository
from app.services.exceptions import InvalidCredentialsError
```

### TypeScript

```typescript
// 1. React & Next.js
import { FC, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// 2. Third-party
import axios from 'axios';
import { Button } from '@shadcn/ui/button';

// 3. Local
import { useAuth } from '@/store/authStore';
import { api } from '@/lib/api/client';
import type { Book } from '@/types';
```

---

## Key Directories & Quick Reference

| Path | Purpose | Example |
|------|---------|---------|
| `backend/app/main.py` | App initialization | FastAPI setup, exception handlers |
| `backend/app/core/` | Infrastructure | Config, DB, security, dependencies |
| `backend/app/models/` | ORM models | User, Book, Order entities |
| `backend/app/schemas/` | Validation schemas | Request/response Pydantic models |
| `backend/app/repositories/` | Data access | Async SQLAlchemy queries |
| `backend/app/services/` | Business logic | Service classes, typed exceptions |
| `backend/app/api/v1/endpoints/` | HTTP endpoints | Routers for auth, books, orders |
| `backend/alembic/versions/` | Migrations | Schema change history |
| `backend/tests/unit/` | Unit tests | Service logic, no DB |
| `backend/tests/DB/` | DB tests | Model constraints, queries |
| `backend/tests/integration/` | API tests | Full request/response |
| `frontend/app/` | Next.js pages | File-based routing |
| `frontend/src/components/` | React components | Reusable UI |
| `frontend/src/lib/api/` | API client | HTTP requests to backend |
| `frontend/src/store/` | State management | Zustand stores |

---

## Quick Checklist: Adding a New Feature

### Backend

- [ ] Define Pydantic schemas in `app/schemas/{feature}.py`
- [ ] Define SQLAlchemy model in `app/models/{feature}.py`
- [ ] Create Alembic migration: `alembic revision --autogenerate -m "add_{feature}"`
- [ ] Create repository in `app/repositories/{feature}.py` (extend BaseRepository)
- [ ] Create service in `app/services/{feature}_service.py` (define exceptions)
- [ ] Create endpoints in `app/api/v1/endpoints/{feature}.py`
- [ ] Include router in `app/api/v1/router.py`
- [ ] Add exception mappings to `app/main.py` if new exceptions
- [ ] Add unit tests in `tests/unit/test_{feature}_service.py`
- [ ] Add DB tests in `tests/DB/test_{feature}_model.py`
- [ ] Add integration tests in `tests/integration/test_{feature}_api.py`

### Frontend

- [ ] Create API client in `src/lib/api/{feature}.ts`
- [ ] Create page in `app/{feature}/page.tsx`
- [ ] Create components in `src/components/{feature}/`
- [ ] Add types in `src/types/{feature}.ts` or inline
- [ ] Add state in `src/store/{feature}Store.ts` if needed
- [ ] Add unit tests for utilities, hooks
- [ ] Add integration tests (if E2E testing setup exists)

---

## Conclusion

The Books4All codebase follows a **clear, layered architecture** with consistent naming conventions and organizational patterns. Use this guide as a reference when navigating the codebase, adding features, or onboarding new developers.

**Key Takeaways:**
- Backend: API → Service → Repository → DB (clean separation)
- Frontend: Pages → Components → API client → State management
- Python: PEP 8 conventions (lowercase, underscores)
- TypeScript: camelCase functions, PascalCase types
- Tests: Unit (no DB) → DB (rollback) → Integration (full flow)

