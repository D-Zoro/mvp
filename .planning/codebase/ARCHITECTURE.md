# Books4All Architecture

**Project Type:** Full-stack peer-to-peer used-book marketplace
**Frontend:** Next.js 16 + React 19 + TypeScript
**Backend:** FastAPI (Python) + PostgreSQL + Redis
**Architecture Style:** API-first with separated layers (Repository, Service, Schema pattern)

---

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│         Next.js App (React 19 + TypeScript)                     │
│  Pages | Components | API Client | State Management (Zustand)   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ↓ HTTP / REST API
                    (axios + React Query)
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                          │
│                    FastAPI Application                          │
│  v1 API Router | Middleware | Exception Handlers | Auth Guards   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ↓                ↓                ↓
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ Endpoints│    │ Core     │    │ Services │
    │ Layer    │    │ (Config, │    │ Business │
    │ (Routes) │    │Security, │    │ Logic    │
    │          │    │ Database)│    │          │
    └────┬─────┘    └────┬─────┘    └────┬─────┘
         │               │               │
         └───────────────┼───────────────┘
                         ↓
           ┌─────────────────────────────┐
           │   REPOSITORY LAYER          │
           │ (Data Access / ORM)         │
           │ Repositories + Base CRUD    │
           └──────────────┬──────────────┘
                          ↓
           ┌──────────────────────────────┐
           │   MODEL LAYER                │
           │ SQLAlchemy ORM Models        │
           │ Enums, Relations, Indexes    │
           └──────────────┬───────────────┘
                          ↓
        ┌──────────────────────────────┐
        │    DATA LAYER                │
        │ PostgreSQL + Alembic (Migrations)
        │ Redis (Cache, Rate Limiting)
        └──────────────────────────────┘
```

---

## Backend Layering (FastAPI)

### **1. API Layer** (`app/api/v1/endpoints/`)
Entry point for HTTP requests. Routes requests to appropriate services.

**Endpoints:**
- `auth.py` — Authentication (login, register, OAuth, token refresh)
- `books.py` — Book listing CRUD (sellers create/edit, buyers search)
- `orders.py` — Order management (create, cancel, status updates)
- `reviews.py` — Verified-purchase reviews
- `payments.py` — Stripe payment webhook handling
- `upload.py` — Image upload endpoint

**Responsibilities:**
- Request validation (via Pydantic schemas)
- Authentication/authorization checks (JWT bearer tokens)
- Delegating business logic to services
- Returning standardized responses

### **2. Service Layer** (`app/services/`)
Business logic and domain rules. Services orchestrate repositories and enforce constraints.

**Services:**
- `auth_service.py` — User registration, password hashing, JWT generation, OAuth flow
- `book_service.py` — Book CRUD, ownership checks, search/filter logic
- `order_service.py` — Order creation, status transitions, inventory checks
- `payment_service.py` — Stripe payment processing, webhook validation
- `storage.py` — Image upload/storage (S3, local file system)
- `exceptions.py` — Custom domain exceptions (ServiceError subclasses)

**Key Pattern:** Services throw typed exceptions (e.g., `BookNotFoundError`, `NotSellerError`) which are caught by global exception handlers in `app/main.py`.

### **3. Repository Layer** (`app/repositories/`)
Data access abstraction. Repositories provide CRUD and query methods for models.

**Repositories:**
- `base.py` — Base repository with generic CRUD operations
- `book.py` — Book queries (search, filter by status/condition, pagination)
- `user.py` — User queries (find by email, role-based)
- `order.py` — Order queries (by user, by status)
- `review.py` — Review queries (by book, by user)
- `message.py` — Messaging/notifications

**Key Pattern:** All DB operations go through repositories. Services never directly execute raw SQL or access the session.

### **4. Schema Layer** (`app/schemas/`)
Request/response validation via Pydantic v2. Defines API contracts.

**Schemas:**
- `auth.py` — LoginRequest, TokenResponse, RegisterRequest
- `book.py` — BookCreate, BookUpdate, BookResponse, BookListResponse
- `order.py` — OrderCreate, OrderResponse, OrderStatusUpdate
- `review.py` — ReviewCreate, ReviewResponse
- `pagination.py` — PaginatedResponse[T]
- `base.py` — BaseSchema (common fields)
- `error.py` — Error response structures
- `user.py` — UserResponse, UserCreate

### **5. Model Layer** (`app/models/`)
SQLAlchemy ORM models. Defines database schema and relationships.

**Models:**
- `base.py` — Base model with id, created_at, updated_at timestamps
- `user.py` — User (role: seller/buyer, auth fields)
- `book.py` — Book (condition, status enums, seller foreign key)
- `order.py` — Order (status state machine, OrderItem child)
- `review.py` — Review (verified-purchase, rating, content)
- `message.py` — Message (buyer-seller communication)

**Patterns:**
- UUID primary keys
- Soft deletes via `deleted_at` timestamp
- Enum fields for status/condition
- Indexes on frequently queried columns (e.g., user_id, status)

### **6. Core Layer** (`app/core/`)
Cross-cutting concerns and infrastructure.

**Modules:**
- `config.py` — Settings (Pydantic BaseSettings) loaded from `.env`
- `database.py` — SQLAlchemy engine, AsyncSession factory
- `security.py` — Password hashing (bcrypt), JWT generation/validation
- `dependencies.py` — FastAPI dependency injection (get_db, get_current_user)
- `rate_limiter.py` — Redis-backed rate limiting middleware
- `keys.py` — Encryption key management

### **7. Main Application** (`app/main.py`)
FastAPI app bootstrap. Middleware setup, exception handlers, lifespan events.

**Features:**
- CORS middleware
- Rate limiting middleware
- Global exception handlers (ServiceError → HTTP status mapping)
- Lifespan events (startup DB pool, Redis init; shutdown cleanup)
- Health check endpoint
- Prometheus metrics endpoint

---

## Frontend Layering (Next.js)

### **1. Pages** (`app/*/page.tsx`)
Route handlers and page components using Next.js App Router.

**Pages:**
- `app/page.tsx` — Home / landing
- `app/books/page.tsx` — Book listing / search
- `app/books/[id]/page.tsx` — Book detail
- `app/cart/page.tsx` — Shopping cart
- `app/checkout/page.tsx` — Order checkout
- `app/login/page.tsx` — Login form
- `app/register/page.tsx` — Registration form
- `app/dashboard/page.tsx` — Buyer dashboard (orders, messages)
- `app/seller/books/create/page.tsx` — Seller: create book listing
- `app/seller/dashboard/page.tsx` — Seller dashboard (inventory, sales)

### **2. Components** (`src/components/`)
Reusable UI building blocks.

**Subdirectories:**
- `ui/` — Low-level UI components (BookCard, skeleton, button, etc.)
- `layout/` — Layout components (Header, Footer, Sidebar)
- `auth/` — Auth-related components (AuthGuard, RoleGuard)
- `RoleGuard.tsx` — Role-based access control wrapper
- `AuthGuard.tsx` — Authentication check wrapper

### **3. API Client** (`src/lib/api/`)
HTTP client and service functions. Abstracts backend communication.

**Modules:**
- `client.ts` — Axios instance with auth token injection
- `books.ts` — Book API calls (list, search, get by id, create, update, delete)
- `auth.ts` — Authentication API calls (login, register, refresh token)
- `orders.ts` — Order API calls (create, get status, cancel)
- `payments.ts` — Payment API calls (get Stripe client secret)
- `reviews.ts` — Review API calls (list, create, update)
- `upload.ts` — Image upload API call
- `types.ts` — TypeScript types for API responses
- `index.ts` — Barrel export

**Key Pattern:** All HTTP requests go through this layer. Services are directly called from components via hooks (React Query).

### **4. State Management** (`src/store/`)
Client-side state using Zustand.

**Stores:**
- `authStore.ts` — Authentication state (user, token, login/logout actions)
- `cartStore.ts` — Shopping cart state (items, add/remove, total)

### **5. Hooks** (`src/lib/hooks/`)
Custom React hooks for reusable logic.

**Hooks:**
- `useAuth.ts` — Hook for accessing auth state and login/logout

### **6. Auth** (`src/lib/auth/`)
Authentication utilities.

**Modules:**
- `tokenStorage.ts` — localStorage/sessionStorage token management

### **7. Utilities** (`src/lib/utils.ts`)
Helper functions (formatting, validation, etc.)

### **8. Providers** (`src/providers/`)
Context providers and app-level wrappers.

**Providers:**
- `QueryProvider.tsx` — TanStack React Query provider wrapper

---

## Data Flow

### **Create Book (Seller)**

```
UI Form
  ↓
[BookCreate Component]
  ↓
Zustand (authStore) - get current user
  ↓
useAuth hook / API call
  ↓
POST /api/v1/books [axios with JWT]
  ↓
[Backend: books endpoint]
  ↓
Dependency injection: get_current_user (JWT validation)
  ↓
[BookService.create()]
  ↓
[BookRepository.create()] - INSERT to DB
  ↓
[book_service] performs validation:
  - User is seller
  - Required fields present
  ↓
Returns BookResponse (schema)
  ↓
React Query cache update → UI re-render
```

### **Search Books (Buyer)**

```
UI Search Form
  ↓
[BooksPage Component]
  ↓
useQuery(...) - React Query
  ↓
GET /api/v1/books?search=...&status=active
  ↓
[Backend: books endpoint - list endpoint]
  ↓
[BookService.list(filters)]
  ↓
[BookRepository.search()] - SELECT with WHERE/LIMIT/OFFSET
  ↓
Returns PaginatedResponse[BookListResponse]
  ↓
React Query stores in cache → UI renders list
  ↓
User clicks book → [BookDetail Page]
  ↓
GET /api/v1/books/{id}
  ↓
[BookService.get_by_id()]
  ↓
Returns BookResponse with seller info + reviews
```

### **Checkout Flow**

```
UI Checkout Form
  ↓
Cart items + shipping address
  ↓
POST /api/v1/orders [create order]
  ↓
[Backend: orders endpoint]
  ↓
[OrderService.create_order()]
  ↓
Validation:
  - Inventory check per book
  - User has items in cart
  - Address valid
  ↓
[OrderRepository.create()] - INSERT Order + OrderItems
  ↓
POST /api/v1/payments [create payment intent]
  ↓
[Backend: payments endpoint]
  ↓
[PaymentService.create_payment_intent()]
  ↓
Calls Stripe API → returns clientSecret
  ↓
Frontend receives clientSecret
  ↓
Stripe.js processes payment in UI
  ↓
Payment webhook from Stripe → POST /api/v1/payments/webhook
  ↓
[PaymentService.handle_webhook()]
  ↓
Validates signature, updates Order.status = "paid"
```

---

## Key Design Patterns

### **1. Repository Pattern**
- Abstraction over data access
- Easy to test with mock repositories
- Switch DB without changing business logic

### **2. Service Layer (Domain Logic)**
- All business rules live in services
- Services throw typed exceptions
- Services depend on repositories (dependency injection)

### **3. Dependency Injection (FastAPI)**
```python
# In endpoint:
async def get_books(db: AsyncSession = Depends(get_db)):
    service = BookService(db)
    return await service.list()
```

### **4. Exception Mapping**
- Services throw `ServiceError` subclasses
- Global exception handler maps to HTTP status codes
- Consistent error responses across API

### **5. Middleware Stack**
- CORS middleware
- Rate limiting middleware (Redis)
- Request/response logging (implicit via FastAPI)

### **6. State Management (Frontend)**
- Zustand for auth state (lightweight, no Redux)
- React Query for server state (caching, invalidation)
- Component local state for UI state

### **7. Authorization**
- JWT bearer tokens (15-min access, 7-day refresh)
- Role-based access (seller vs. buyer)
- Ownership checks in services (user_id == resource.user_id)

---

## External Integrations

### **Stripe**
- **Webhook Endpoint:** `POST /api/v1/payments/webhook`
- **Signature Verification:** HMAC-SHA256
- **Events Handled:** `payment_intent.succeeded`, `payment_intent.payment_failed`
- **State Update:** Order status transitions on webhook

### **OAuth (Google & GitHub)**
- **Callback Endpoints:**
  - `GET /api/v1/auth/google/callback?code=...&state=...`
  - `GET /api/v1/auth/github/callback?code=...&state=...`
- **Token Exchange:** Backend exchanges auth code for user profile
- **User Creation:** Auto-creates user if new
- **Returns:** JWT access + refresh tokens

### **Redis**
- **Rate Limiting:** Per-IP request tracking
- **Cache:** Future (not yet implemented)

---

## Infrastructure & Deployment

### **Backend**
- **Runtime:** Python 3.12+ (uvicorn ASGI server)
- **Framework:** FastAPI
- **ORM:** SQLAlchemy 2.0 (async)
- **Database:** PostgreSQL 14+
- **Cache/Queue:** Redis (rate limiting)
- **Migrations:** Alembic
- **Container:** Docker (Dockerfile provided)

### **Frontend**
- **Runtime:** Node.js 18+
- **Framework:** Next.js 16
- **Build:** Webpack (managed by Next.js)
- **Output:** Static + server-side rendering

### **Environments**
- `.env` file loaded on startup (Pydantic BaseSettings)
- Settings validation at app boot
- Environment variables override defaults

---

## Entry Points

### **Backend**
1. `main.py` — ASGI entry (uvicorn main:app)
2. `app/main.py` — FastAPI app creation with middleware/handlers
3. `app/api/v1/router.py` — API router aggregation

### **Frontend**
1. `app/layout.tsx` — Root layout (Next.js)
2. `src/providers/QueryProvider.tsx` — App provider wrapper
3. `src/store/authStore.ts` — State initialization

---

## Summary Table

| Layer | Technology | Responsibility |
|-------|-----------|---|
| **Presentation** | React 19 + Next.js 16 | UI rendering, page routing |
| **API Client** | Axios + React Query | HTTP communication, caching |
| **API Gateway** | FastAPI | Request routing, middleware |
| **Business Logic** | Service classes | Domain rules, workflows |
| **Data Access** | Repository classes | SQL abstraction |
| **Models** | SQLAlchemy ORM | Schema + relationships |
| **Data** | PostgreSQL + Redis | Persistence + cache |
| **Config** | Pydantic Settings | Environment management |
| **Auth** | JWT + OAuth 2.0 | User identification |
| **Payments** | Stripe API | Payment processing |

