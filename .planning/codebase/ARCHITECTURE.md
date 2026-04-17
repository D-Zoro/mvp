# Books4All — Architecture Document

**Last Updated:** 2026-04-18  
**Version:** 1.0

---

## Executive Summary

Books4All is a peer-to-peer used-book marketplace built on a **three-layer backend architecture** (API → Service → Repository → Database) with a separate Next.js frontend. The system prioritizes **async-first patterns**, **typed exceptions**, **role-based access control**, and **transactional integrity**.

---

## System Overview

### Core Stack

| Layer      | Technology                                    | Purpose                          |
|------------|-----------------------------------------------|----------------------------------|
| **Backend**    | FastAPI 0.109, Python 3.12, SQLAlchemy 2.0 async | REST API, business logic         |
| **Database**   | PostgreSQL + Alembic migrations              | Persistent data, transactional safety |
| **Auth**       | JWT (python-jose), bcrypt 4.1.2, Redis       | Session management, rate limiting |
| **Payments**   | Stripe 7.11                                   | Payment processing, webhooks     |
| **Frontend**   | Next.js 15, TypeScript, Tailwind CSS         | User-facing SPA                  |
| **Infra**      | Docker Compose (dev/staging/prod)            | Local dev, staging, production   |

### Key Principles

1. **Async-first**: All DB queries use `AsyncSession` from `sqlalchemy.ext.asyncio`
2. **Typed exceptions**: Service layer raises domain-specific exceptions mapped to HTTP status codes
3. **Three-layer pattern**: Clean separation between API endpoints, business logic, and data access
4. **Role-based access**: `UserRole` enum (BUYER, SELLER, ADMIN) checked via dependency injection
5. **Soft deletes**: Records use `deleted_at` timestamp; queries filter by default
6. **Transactional integrity**: Complex multi-step operations (e.g., order creation) are atomic

---

## Three-Layer Architecture

### Layer 1: API Endpoints (FastAPI Routers)

**File Location:** `backend/app/api/v1/endpoints/`

**Responsibilities:**
- Accept HTTP requests with validated Pydantic schemas
- Extract authentication context (current user, role)
- Call service layer methods
- Catch service exceptions and map to HTTP responses
- Return response schemas (never raw ORM objects)

**Example Request Flow:**
```
POST /api/v1/orders
├─ FastAPI router receives request
├─ Pydantic validates JSON → OrderCreate schema
├─ Dependency injection provides:
│  ├─ current_user (User) from JWT token
│  ├─ db (AsyncSession) from get_db()
├─ Calls order_service.create_order(buyer=current_user, order_data=...)
├─ Service raises OrderNotFoundError or InsufficientStockError
├─ Exception handler maps to HTTP 404 or 409
└─ Returns OrderResponse (Pydantic serialized)
```

**Exception Handling Map:**
- `EmailAlreadyExistsError` → 409 Conflict
- `InvalidCredentialsError` → 401 Unauthorized
- `BookNotFoundError`, `OrderNotFoundError` → 404 Not Found
- `InsufficientStockError` → 409 Conflict
- `InvalidStatusTransitionError` → 422 Unprocessable Entity
- `PaymentError`, `RefundError` → 402 Payment Required
- `ServiceError` (untyped) → 500 Internal Server Error

**Key Endpoints:**
- `/auth/*` — Registration, login, OAuth, token refresh
- `/books/*` — Book CRUD, search, filters, pagination
- `/orders/*` — Create, list, cancel, status updates
- `/payments/*` — Stripe checkout, webhook handling
- `/reviews/*` — Create, list reviews for verified purchases

---

### Layer 2: Service Layer (Business Logic)

**File Location:** `backend/app/services/`

**Responsibilities:**
- Enforce business rules and invariants
- Orchestrate repository calls (often multiple operations)
- Raise **typed exceptions** (not generic `ValueError`)
- Perform validation and authorization checks
- Handle complex workflows (e.g., state transitions)

**Service Classes:**
1. **AuthService** — User registration, login, password reset, OAuth flows
2. **BookService** — Book CRUD, inventory management
3. **OrderService** — Order creation with stock validation, status transitions, cancellation
4. **PaymentService** — Stripe integration, webhook event handling
5. **ReviewService** — Review creation and retrieval for verified purchases

**Example: OrderService.create_order()**
```python
async def create_order(self, *, buyer: User, order_data: OrderCreate) -> OrderResponse:
    """
    1. Validate stock for each item
    2. Deduct quantities atomically
    3. Create Order + OrderItem rows
    4. Return populated OrderResponse
    
    Raises:
        InsufficientStockError: if any book lacks stock
        BookNotFoundError: if book_id doesn't exist
    """
```

**State Machine: Order Lifecycle**
```
PENDING
├─→ PAYMENT_PROCESSING → PAID → SHIPPED → DELIVERED
│                         ├─→ REFUNDED
│                         └─→ REFUNDED
└─→ CANCELLED (buyer self-cancel only, PENDING state only)

Terminal states: CANCELLED, REFUNDED (no further transitions)
```

**Validation Patterns:**
- `OrderService._assert_valid_transition(from_status, to_status)` enforces allowed transitions
- `OrderService.create_order()` pre-fetches all books, validates quantities, then creates atomically
- `BookService` prevents sellers from modifying books they don't own

---

### Layer 3: Repository Layer (Data Access)

**File Location:** `backend/app/repositories/`

**Responsibilities:**
- Execute async SQLAlchemy queries
- Manage soft delete logic (`deleted_at` filtering)
- Load related objects (eager/lazy loading)
- Provide generic CRUD interface for all entities

**BaseRepository Generic Class:**
```python
class BaseRepository[ModelType, CreateSchemaType, UpdateSchemaType]:
    async def get(id: UUID) -> Optional[ModelType]
    async def get_multi(skip, limit, filters) -> list[ModelType]
    async def create(obj_in) -> ModelType
    async def update(db_obj, obj_in) -> ModelType
    async def delete(id) -> bool  # soft delete
    async def hard_delete(id) -> bool
    async def count(filters) -> int
    async def exists(id) -> bool
```

**Specialized Repositories:**
1. **UserRepository** — User lookup, search by email, role queries
2. **BookRepository** — Book search, filtering by status/condition, stock queries
3. **OrderRepository** — `create_with_items()` (atomic), relationship loading
4. **ReviewRepository** — Verified purchase filtering

**OrderRepository.create_with_items() Pattern:**
```python
async def create_with_items(
    self,
    buyer_id: UUID,
    items: list[OrderItemCreate],  # {book_id, quantity}
    shipping_address: dict,
    notes: Optional[str],
) -> Order:
    """
    Transactional operation:
    1. Calculate total from book prices + quantities
    2. Create Order row
    3. Create OrderItem rows for each book
    4. Deduct book.quantity for each item (DB CHECK constraint ensures >= 0)
    5. Flush and return Order with relationships loaded
    
    Atomic: if any step fails, entire transaction rolls back.
    """
```

---

## Data Flow: Complete Request Example

### Scenario: Buyer Creates Order

```
1. CLIENT (Next.js)
   POST /api/v1/orders
   Headers: Authorization: Bearer <access_token>
   Body: {
     "items": [{"book_id": "uuid1", "quantity": 2}],
     "shipping_address": {...}
   }

2. FASTAPI ROUTER (app/api/v1/endpoints/orders.py)
   @router.post("/", response_model=OrderResponse)
   async def create_order(
       order_data: OrderCreate,
       current_user: CurrentUser,
       db: DBSession,
   ):
       service = OrderService(db)
       return await service.create_order(buyer=current_user, order_data=order_data)

3. DEPENDENCY INJECTION (app/core/dependencies.py)
   - get_db() → yields AsyncSession, auto-commits on success
   - get_current_user() → verifies JWT token, fetches User from DB
   - Middlewares: CORS, rate limiting

4. SERVICE LAYER (app/services/order_service.py)
   OrderService.create_order():
   a. Instantiate OrderRepository(db)
   b. For each item in order_data:
      - Fetch Book by book_id
      - Validate book.quantity >= requested quantity
      - If insufficient: raise InsufficientStockError(title, available, requested)
   c. Call order_repo.create_with_items(
        buyer_id=buyer.id,
        items=[...],
        shipping_address=...,
        notes=...,
      )
   d. Return populated OrderResponse

5. REPOSITORY LAYER (app/repositories/order.py)
   OrderRepository.create_with_items():
   a. Calculate total_amount = sum(book.price * qty for each item)
   b. Create Order: db.add(Order(...))
   c. For each item:
      - Create OrderItem: db.add(OrderItem(...))
      - Update Book: book.quantity -= qty
      - db.add(book)
   d. await db.flush()  (not commit — happens in get_db)
   e. await db.refresh(order, relations)
   f. Return order_instance

6. DATABASE (PostgreSQL)
   - INSERT order row
   - INSERT order_item rows
   - UPDATE books.quantity WHERE id IN (...)
   - CHECK constraint: quantity >= 0
   - TRANSACTION: all-or-nothing

7. EXCEPTION HANDLER (app/main.py)
   If InsufficientStockError:
   → _SERVICE_EXCEPTION_MAP[InsufficientStockError] = 409
   → JSONResponse(status_code=409, body={status_code, detail})
   
   If ValidationError:
   → ValidationError handler → 422 with field-level errors

8. RESPONSE (to Client)
   {
     "status_code": 201,  (if successful)
     "data": {
       "id": "uuid",
       "buyer_id": "uuid",
       "total_amount": "125.50",
       "status": "pending",
       "items": [...],
       "created_at": "2026-04-18T...",
       ...
     }
   }
```

---

## Authentication & Authorization Flow

### JWT Token Structure

```python
class TokenPayload(BaseModel):
    sub: str           # User UUID as string
    role: str          # "buyer" | "seller" | "admin"
    type: str          # "access" | "refresh" | "password_reset"
    exp: datetime      # Expiration
    iat: datetime      # Issued at
    jti: Optional[str] # JWT ID for revocation tracking
```

### Token Lifecycle

```
1. User POSTs /api/v1/auth/login with email + password
2. AuthService verifies credentials (bcrypt)
3. Creates TokenPair:
   - access_token (short-lived: 15 min)
   - refresh_token (long-lived: 30 days)
4. Client stores both in secure storage
5. Client includes access_token in Authorization: Bearer header
6. API verifies token signature + expiration
7. When access_token expires:
   - Client POSTs refresh_token to /api/v1/auth/refresh
   - AuthService validates + creates new access_token pair
```

### Role-Based Access Control (RBAC)

**Dependency Factory Pattern:**
```python
def require_role(*allowed_roles: UserRole) -> Callable:
    async def role_checker(current_user: User) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(403, detail="Access denied")
        return current_user
    return role_checker

# Usage:
@router.post("/books")
async def create_book(
    current_user: User = Depends(require_role(UserRole.SELLER, UserRole.ADMIN))
):
    # Only sellers and admins reach here
```

**Convenience Dependencies:**
- `RequireAdmin = Depends(require_role(UserRole.ADMIN))`
- `RequireSeller = Depends(require_role(UserRole.SELLER, UserRole.ADMIN))`
- `RequireBuyer = Depends(require_role(UserRole.BUYER, UserRole.SELLER, UserRole.ADMIN))`

---

## Middleware & Cross-Cutting Concerns

### 1. CORS Middleware
**Purpose:** Allow frontend (different origin) to access backend API  
**Config:** `settings.CORS_ORIGINS`, methods, headers, credentials  
**Location:** `app.main.app.add_middleware(CORSMiddleware, ...)`

### 2. Rate Limiting Middleware
**Purpose:** Prevent abuse; configurable per route  
**Config:** `settings.RATE_LIMIT_DEFAULT_CALLS`, `RATE_LIMIT_DEFAULT_PERIOD`  
**Exclusions:** `/health`, `/metrics`, `/api/v1/docs`, `/payments/webhook`  
**Backend:** Redis (mocked in tests)  
**Location:** `app.core.rate_limiter.RateLimitMiddleware`

### 3. Exception Handlers (in order of specificity)
1. **RequestValidationError** → 422 with field-level errors
2. **HTTPException** → Pass-through to status code
3. **ServiceError** (and subclasses) → Map to HTTP status via `_SERVICE_EXCEPTION_MAP`
4. **Exception** (catch-all) → 500; detail depends on `DEBUG` flag

### 4. Lifecycle Events (app.main.lifespan)
- **Startup:** Warm DB connection pool, initialize Redis
- **Shutdown:** Close Redis, log completion

---

## Database Schema Patterns

### Base Model Class

All models inherit from `Base`:

```python
class Base(DeclarativeBase):
    __abstract__ = True
    
    # UUID primary key
    id: Mapped[UUID] = mapped_column(..., primary_key=True, default=uuid.uuid4)
    
    # Audit timestamps
    created_at: Mapped[datetime] = mapped_column(..., server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(..., onupdate=func.now())
    deleted_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    
    # Soft delete helpers
    @property
    def is_deleted(self) -> bool: return self.deleted_at is not None
    def soft_delete(self) -> None: self.deleted_at = datetime.utcnow()
    def restore(self) -> None: self.deleted_at = None
```

### Key Models

#### User
- **Fields:** email (unique), password_hash, role (enum), email_verified, is_active, oauth_provider/id
- **Relationships:** books (seller), orders (buyer), reviews, messages
- **Soft delete:** Yes (active filtering on queries)

#### Book
- **Fields:** seller_id, title, author, isbn, description, condition, status (active/inactive), price, quantity, cover_image_url
- **Enums:** `BookCondition` (mint, near_mint, very_good, good, fair, poor), `BookStatus` (active, sold_out, inactive)
- **Relationships:** seller (User), orders (via OrderItem), reviews
- **Constraints:** `quantity >= 0` (CHECK constraint)

#### Order
- **Fields:** buyer_id, total_amount (DECIMAL), status (enum), stripe_payment_id, stripe_session_id, shipping_address (JSON), notes
- **Enums:** `OrderStatus` (pending, payment_processing, paid, shipped, delivered, cancelled, refunded)
- **Relationships:** buyer (User), items (OrderItem[])
- **Indices:** buyer_id, status

#### OrderItem
- **Fields:** order_id, book_id, quantity, unit_price_at_purchase
- **Relationships:** order, book

#### Review
- **Fields:** order_id, reviewer_id, book_id, rating (1-5), comment, verified_purchase (boolean)
- **Constraints:** Foreign key (order_id, book_id) must match order items

#### Message (for seller-buyer communication)
- **Fields:** sender_id, recipient_id, subject, body, read_at, deleted_at
- **Relationships:** sender, recipient (both Users)

---

## Error Handling Strategy

### Exception Hierarchy

```
ServiceError (base)
├── EmailAlreadyExistsError
├── InvalidCredentialsError
├── InvalidTokenError
├── AccountInactiveError
├── OAuthNotConfiguredError
├── OAuthError
├── BookNotFoundError
├── NotBookOwnerError
├── NotSellerError
├── OrderNotFoundError
├── NotOrderOwnerError
├── InsufficientStockError
├── OrderNotCancellableError
├── InvalidStatusTransitionError
├── PaymentError
├── StripeWebhookError
└── RefundError
```

### Validation Error Response (422)

```json
{
  "status_code": 422,
  "detail": [
    {
      "field": "body → shipping_address → postal_code",
      "message": "ensure this value has at least 5 characters",
      "type": "value_error.any_str.min_length"
    }
  ]
}
```

### Service Error Response (mapped to HTTP status)

```json
{
  "status_code": 409,
  "detail": "Insufficient stock for 'The Great Gatsby': available=1, requested=5"
}
```

---

## Key Abstractions & Patterns

### 1. Dependency Injection (FastAPI)

**Purpose:** Decouple layers, enable testing, provide cross-cutting concerns

**Example:**
```python
@router.get("/me")
async def get_me(
    current_user: CurrentUser,  # Annotated[User, Depends(get_current_user)]
    db: DBSession,              # Annotated[AsyncSession, Depends(get_db)]
    pagination: Pagination,     # Annotated[PaginationParams, Depends()]
):
    pass
```

**Benefits:**
- Easy to test: mock Depends() values
- Automatic role checking
- Automatic DB session management with transaction rollback

### 2. Generic Repository Pattern

**Purpose:** Reduce boilerplate CRUD code across entity types

```python
class BaseRepository[ModelType, CreateSchemaType, UpdateSchemaType]:
    # Inherited by UserRepository, BookRepository, OrderRepository, etc.
    async def get(id) → Optional[ModelType]
    async def get_multi(skip, limit, filters) → list[ModelType]
    # ... etc
```

**Trade-off:** Generic methods handle common cases; specialized repositories add domain-specific methods.

### 3. Typed Exception Mapping

**Purpose:** Decouple service layer from HTTP status codes; enable consistent error handling

```python
_SERVICE_EXCEPTION_MAP: dict[type[ServiceError], int] = {
    EmailAlreadyExistsError: 409,
    InvalidCredentialsError: 401,
    # ...
}

@app.exception_handler(ServiceError)
async def service_exception_handler(request, exc):
    http_status = _SERVICE_EXCEPTION_MAP.get(type(exc), 500)
    return JSONResponse(status_code=http_status, content=...)
```

### 4. Soft Delete Pattern

**Purpose:** Preserve audit history; allow restoration

```python
# All queries exclude deleted records by default
query = select(User).where(User.deleted_at.is_(None))

# Restore deleted record
await user_repo.restore(user_id)  # Sets deleted_at = None
```

### 5. Transactional Operations

**Purpose:** Ensure atomicity (all-or-nothing semantics)

```python
# OrderRepository.create_with_items()
# 1. Create order + items
# 2. Deduct book quantities
# 3. Single await db.flush() ensures atomicity
# 4. DB-level CHECK constraint (quantity >= 0) is final guard
```

---

## Concurrency & Consistency Safeguards

### 1. Stock Deduction (Order Creation)
- **Potential Issue:** Two simultaneous orders for same book → race condition
- **Safeguard:** 
  - Pre-fetch and validate all books in memory
  - Single atomic transaction: `OrderRepository.create_with_items()`
  - DB CHECK constraint: `quantity >= 0` (last resort)

### 2. Status Transitions (Order)
- **Potential Issue:** Invalid state transitions (e.g., DELIVERED → PENDING)
- **Safeguard:**
  - `OrderService._assert_valid_transition()` checks allowed transitions
  - State machine enforced in service layer, not DB
  - Terminal states (CANCELLED, REFUNDED) prevent further transitions

### 3. OAuth Token Replay
- **Potential Issue:** Attacker reuses OAuth code
- **Safeguard:**
  - OAuth code is single-use per spec
  - Store `oauth_provider_id` (unique per user per provider)
  - Prevent duplicate registrations via email unique constraint

### 4. Stripe Webhook Verification
- **Potential Issue:** Attacker spoofs webhook events
- **Safeguard:**
  - Verify webhook signature using `stripe.Webhook.construct_event()`
  - Use **raw request body**, not parsed JSON
  - Reject unsigned webhooks

---

## Performance Considerations

### Query Optimization

1. **Eager Loading:** `selectinload()` for relationships (e.g., Order + items + books)
2. **Pagination:** All list endpoints use `skip` + `limit`; default 20, max 100 items
3. **Indexing:** 
   - `users.email` (unique index)
   - `orders.buyer_id` (foreign key index)
   - `orders.status` (common filters)
   - `books.seller_id`, `books.status`

### Connection Pooling

```python
create_async_engine(
    DATABASE_URL,
    pool_size=20,              # PostgreSQL-asyncpg default
    max_overflow=10,           # Extra connections beyond pool_size
    pool_pre_ping=True,        # Verify connections before use
)
```

### Rate Limiting

- **Default:** 100 calls per 1 minute per IP
- **Excluded:** `/health`, `/metrics`, `/api/v1/docs`, `/payments/webhook`
- **Backend:** Redis (distributed, works across replicas)

---

## Secrets & Configuration Management

### Environment Variables

**Required:**
- `DATABASE_URL` — async PostgreSQL: `postgresql+asyncpg://user:pass@host/db`
- `SYNC_DATABASE_URL` — sync PostgreSQL for Alembic: `postgresql+psycopg2://...`
- `SECRET_KEY` — JWT signing (min 32 chars)
- `STRIPE_SECRET_KEY` — Stripe API key
- `STRIPE_WEBHOOK_SECRET` — Webhook signing secret
- `REDIS_URL` — Redis connection

**Optional:**
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — OAuth
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` — OAuth
- `DATABASE_ECHO` — SQL logging (default: False)

**File:** `backend/.env` (copy from `backend/.env.example`)

### Sensitive Data Handling

- Passwords: hashed with bcrypt (4.1.2) before storage
- Tokens: signed with `SECRET_KEY` using HS256 algorithm
- Stripe secrets: never logged, used only in PaymentService
- OAuth tokens: exchanged server-side; client never sees provider tokens

---

## Testing Architecture

### Test Layers

1. **Unit Tests** (`tests/unit/`)
   - No DB, no HTTP
   - Mock external dependencies (Redis, Stripe)
   - Test service logic in isolation

2. **DB Tests** (`tests/DB/`)
   - Real PostgreSQL (test database)
   - Each test runs inside rolled-back transaction
   - Test repository + model constraints

3. **Integration Tests** (`tests/integration/`)
   - AsyncClient + ASGITransport
   - Mocked `get_db` dependency pointing to rollback session
   - Test full request → response flow

### Testing Patterns

```python
# Dependency override in conftest.py
@pytest.fixture(autouse=True)
def override_dependencies(client):
    app.dependency_overrides[get_db] = lambda: test_session
    yield
    app.dependency_overrides.clear()

# Test structure
async def test_create_order_insufficient_stock():
    # Arrange: create book with limited stock
    book = await book_repo.create(...)
    
    # Act: try to create order exceeding stock
    with pytest.raises(InsufficientStockError):
        await service.create_order(...)
    
    # Assert: book quantity unchanged
    assert book.quantity == original_qty
```

---

## Frontend Architecture (High-Level)

### Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS
- **Type Safety:** TypeScript (strict mode)
- **State:** Zustand or React Context (in `src/store/`)
- **API Client:** Fetch or Axios (wrapper in `src/lib/`)

### Directory Layout
```
frontend/
├── app/                    # Next.js App Router pages
│   ├── (auth)             # Login, register, OAuth callback
│   ├── books/             # Browse, search, detail
│   ├── cart/              # Shopping cart UI
│   ├── checkout/          # Stripe checkout UI
│   ├── dashboard/         # Buyer/seller dashboards
│   ├── seller/            # Seller-only pages (listing, fulfillment)
│   └── page.tsx           # Homepage
├── src/
│   ├── components/        # Reusable UI components
│   ├── lib/               # API client, utilities, helpers
│   ├── store/             # Zustand stores (cart, auth)
│   ├── providers/         # Context/provider setup
│   └── design_system.md   # Component library docs
```

### Key Data Flows
1. **Authentication:** Login form → API `/auth/login` → JWT stored in localStorage/cookie → Bearer header in all requests
2. **Book Search:** Search input → debounced API `/books?q=...&page=1` → Results displayed
3. **Checkout:** Cart → Stripe session → Redirect to Stripe hosted page → Webhook → Success page
4. **Order Management:** Dashboard → API `/orders?status=...` → Status updates via polling/WebSocket (future)

---

## Deployment & Infrastructure

### Docker Compose

**Services:**
- `backend` — FastAPI uvicorn server (port 8000)
- `frontend` — Next.js dev server (port 3000)
- `postgres` — PostgreSQL (port 5432)
- `redis` — Redis (port 6379)

**Volumes:**
- PostgreSQL data persisted to `postgres_data/`
- Environment file loaded from `backend/.env`

### Production Considerations

1. **Database Migrations:**
   ```bash
   alembic upgrade head  # Applied before API startup
   ```

2. **Reverse Proxy:** Nginx (SSL, rate limiting, compression)

3. **Horizontal Scaling:**
   - Rate limiter uses Redis (shared across replicas)
   - DB connection pooling tuned per replica count
   - Stateless API (no local session storage)

4. **Monitoring:**
   - `/health` endpoint for load balancer health checks
   - `/metrics` endpoint for Prometheus scraping
   - Structured logs (JSON format recommended)

---

## Known Limitations & Gotchas

### 1. bcrypt 5.x Incompatibility
- **Issue:** bcrypt 5.x breaks passlib 1.7.4
- **Fix:** Pin `bcrypt==4.1.2`; do **not** upgrade

### 2. SQLAlchemy Async Sessions
- **Issue:** Accidental sync `.execute()` instead of `await .execute()`
- **Fix:** Always `await session.execute(...)` with AsyncSession

### 3. Stripe Webhook Body
- **Issue:** webhook signature verification requires raw request body
- **Fix:** `PaymentService` reads `Request.body()` not parsed JSON

### 4. JWT Token Type Field
- **Issue:** Tokens carry `type` claim; using wrong token type causes failures
- **Fix:** Always verify `payload.type == "access"` before using token

### 5. Password Hashing Limits
- **Issue:** bcrypt has 72-byte limit; passlib may fail during detection
- **Fix:** Test passwords `<= 72 bytes`; call `hash_password("ShortPass1")` in tests

### 6. Alembic Sync Driver
- **Issue:** Alembic uses sync driver (`SYNC_DATABASE_URL`), not async
- **Fix:** Maintain separate URLs:
  - `DATABASE_URL` → `postgresql+asyncpg://...` (async)
  - `SYNC_DATABASE_URL` → `postgresql+psycopg2://...` (sync)

---

## Quick Reference: Common Operations

### Creating a New Endpoint

1. **Define Schema** (`app/schemas/myfeature.py`)
2. **Define Model** (`app/models/myfeature.py`)
3. **Create Migration** (`alembic revision --autogenerate -m "add_myfeature"`)
4. **Create Repository** (`app/repositories/myfeature.py`)
5. **Create Service** (`app/services/myfeature.py`)
6. **Create Endpoint** (`app/api/v1/endpoints/myfeature.py`)
7. **Include Router** (`app/api/v1/router.py`)

### Adding a New Field to User

```bash
# 1. Edit app/models/user.py, add field
# 2. Run migration
alembic revision --autogenerate -m "add_user_field"
alembic upgrade head

# 3. Update schemas (app/schemas/user.py)
# 4. Add to responses if applicable
```

### Testing a Service

```python
# tests/unit/test_order_service.py
async def test_create_order_insufficient_stock(db_session):
    service = OrderService(db_session)
    
    # Mock or create insufficient stock scenario
    with pytest.raises(InsufficientStockError) as exc_info:
        await service.create_order(...)
    
    assert "The Great Gatsby" in str(exc_info.value)
```

---

## Conclusion

Books4All's architecture emphasizes **clean separation of concerns**, **async-first design**, and **typed error handling**. The three-layer pattern (API → Service → Repository) enables testability, maintainability, and clear data flow. Frontend and backend communicate via a RESTful API with JWT authentication and role-based authorization.

For questions, refer to inline docstrings, the test suite, or `/CLAUDE.md` in the project root.

