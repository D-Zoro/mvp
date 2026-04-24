# Books4All Directory Structure

**Overview:** Monorepo with separate `/frontend` (Next.js) and `/backend` (FastAPI) directories.

```
Books4All/
├── frontend/               # Next.js 16 React application
├── backend/                # FastAPI Python application
├── .planning/              # Documentation & planning (this directory)
├── .claude/                # Claude AI configuration
├── .claude-flow/           # RuFlo workflow files
├── .git/                   # Git version control
├── CLAUDE.md               # Project rules & architecture guidelines
└── .mcp.json               # MCP integration config
```

---

## Frontend Directory Structure

```
frontend/
├── app/                    # Next.js App Router (page components)
│   ├── layout.tsx          # Root layout wrapping all pages
│   ├── page.tsx            # Home page
│   ├── books/
│   │   ├── page.tsx        # Books listing / search page
│   │   └── [id]/
│   │       └── page.tsx    # Individual book detail page
│   ├── cart/
│   │   └── page.tsx        # Shopping cart page
│   ├── checkout/
│   │   └── page.tsx        # Order checkout / payment page
│   ├── login/
│   │   └── page.tsx        # Login form page
│   ├── register/
│   │   └── page.tsx        # User registration page
│   ├── dashboard/
│   │   └── page.tsx        # Buyer dashboard (orders, account)
│   └── seller/             # Seller-specific routes
│       ├── books/
│       │   └── create/
│       │       └── page.tsx # Seller: create/list books
│       └── dashboard/
│           └── page.tsx    # Seller dashboard (inventory, sales)
│
├── src/                    # Source code (non-page components)
│   ├── components/         # Reusable UI components
│   │   ├── ui/             # Low-level UI components
│   │   │   ├── BookCard.tsx       # Book listing card
│   │   │   └── skeleton.tsx       # Loading skeleton
│   │   ├── auth/           # Auth-related components
│   │   │   └── AuthGuard.tsx      # Protected route wrapper
│   │   ├── layout/         # Layout components
│   │   │   └── Header.tsx         # Header/navbar
│   │   ├── RoleGuard.tsx   # Role-based access control
│   │   └── AuthGuard.tsx   # Auth check wrapper
│   │
│   ├── lib/                # Utilities and helpers
│   │   ├── api/            # HTTP client & API services
│   │   │   ├── client.ts         # Axios instance (with JWT injection)
│   │   │   ├── auth.ts           # Auth API calls (login, register)
│   │   │   ├── books.ts          # Book API calls (list, search, CRUD)
│   │   │   ├── orders.ts         # Order API calls
│   │   │   ├── payments.ts       # Payment API calls
│   │   │   ├── reviews.ts        # Review API calls
│   │   │   ├── upload.ts         # Image upload API
│   │   │   ├── types.ts          # TypeScript types for API
│   │   │   └── index.ts          # Barrel export
│   │   │
│   │   ├── auth/           # Auth utilities
│   │   │   └── tokenStorage.ts   # localStorage token management
│   │   │
│   │   ├── hooks/          # Custom React hooks
│   │   │   └── useAuth.ts        # Auth hook (user, login, logout)
│   │   │
│   │   └── utils.ts        # General utilities (format, validate, etc.)
│   │
│   ├── store/              # State management (Zustand)
│   │   ├── authStore.ts    # User auth state (user, token, login/logout)
│   │   └── cartStore.ts    # Shopping cart state (items, total)
│   │
│   └── providers/          # Context providers
│       └── QueryProvider.tsx     # React Query provider wrapper
│
├── .next/                  # Next.js build output (git-ignored)
├── node_modules/           # npm dependencies (git-ignored)
├── stitch-exports/         # Generated files (git-ignored)
│
├── package.json            # npm dependencies & scripts
├── tsconfig.json           # TypeScript configuration
├── next.config.js          # Next.js configuration
├── tailwind.config.js      # Tailwind CSS config
└── design_system.md        # UI design system documentation
```

### Frontend Key Files

| File | Purpose |
|------|---------|
| `app/layout.tsx` | Root layout; wraps all pages |
| `app/page.tsx` | Home / landing page |
| `src/lib/api/client.ts` | Axios HTTP client with JWT auth |
| `src/store/authStore.ts` | Zustand store for user state |
| `src/store/cartStore.ts` | Zustand store for cart items |
| `package.json` | Dependencies: Next.js, React, TanStack Query, Zustand, Tailwind |

### Frontend Build & Run

```bash
npm install              # Install dependencies
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm start                # Start production server
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking
npm test                 # Jest tests
npm run test:e2e         # Playwright E2E tests
```

---

## Backend Directory Structure

```
backend/
├── app/                    # Main application package
│   ├── __init__.py         # Package init
│   ├── main.py             # FastAPI app creation, middleware, exception handlers
│   │
│   ├── api/                # HTTP routing layer
│   │   └── v1/             # API v1 (versioning for future v2)
│   │       ├── router.py   # Main router (aggregates all endpoints)
│   │       └── endpoints/  # Endpoint route handlers
│   │           ├── auth.py           # POST /auth/login, /auth/register, /auth/google/callback
│   │           ├── books.py          # GET/POST /books, DELETE /books/{id}
│   │           ├── orders.py         # POST /orders, GET /orders/{id}, PATCH /orders/{id}/cancel
│   │           ├── reviews.py        # GET /books/{id}/reviews, POST /books/{id}/reviews
│   │           ├── payments.py       # POST /payments/webhook (Stripe), GET /payments/intent
│   │           ├── upload.py         # POST /upload (image upload)
│   │           └── __init__.py
│   │
│   ├── services/           # Business logic layer
│   │   ├── __init__.py
│   │   ├── auth_service.py         # User registration, JWT, OAuth flows
│   │   ├── book_service.py         # Book CRUD, search, filters
│   │   ├── order_service.py        # Order creation, status management
│   │   ├── payment_service.py      # Stripe integration, webhook handling
│   │   ├── storage.py              # File upload / S3 integration
│   │   └── exceptions.py           # Custom domain exceptions (ServiceError subclasses)
│   │
│   ├── repositories/       # Data access layer (ORM abstraction)
│   │   ├── __init__.py
│   │   ├── base.py                 # BaseRepository with generic CRUD
│   │   ├── user.py                 # User queries (find_by_email, find_by_id)
│   │   ├── book.py                 # Book queries (search, filter, list)
│   │   ├── order.py                # Order queries (find_by_user, find_by_status)
│   │   ├── review.py               # Review queries (find_by_book, find_by_user)
│   │   └── message.py              # Message queries (for buyer-seller communication)
│   │
│   ├── models/             # SQLAlchemy ORM models (database schema)
│   │   ├── __init__.py
│   │   ├── base.py                 # BaseModel (id, created_at, updated_at)
│   │   ├── user.py                 # User model (email, hashed_password, role)
│   │   ├── book.py                 # Book model (title, description, price, condition, status)
│   │   ├── order.py                # Order model (status state machine, total_price)
│   │   ├── review.py               # Review model (rating, content, verified_purchase)
│   │   └── message.py              # Message model (sender_id, receiver_id, content)
│   │
│   ├── schemas/            # Pydantic request/response models
│   │   ├── __init__.py
│   │   ├── base.py                 # BaseSchema (common fields)
│   │   ├── auth.py                 # LoginRequest, TokenResponse, RegisterRequest
│   │   ├── book.py                 # BookCreate, BookUpdate, BookResponse, BookListResponse
│   │   ├── order.py                # OrderCreate, OrderResponse, OrderStatusUpdate
│   │   ├── review.py               # ReviewCreate, ReviewResponse
│   │   ├── user.py                 # UserResponse, UserCreate
│   │   ├── pagination.py           # PaginatedResponse[T]
│   │   └── error.py                # ErrorResponse
│   │
│   └── core/               # Cross-cutting infrastructure
│       ├── __init__.py
│       ├── config.py               # Settings (Pydantic BaseSettings, .env loading)
│       ├── database.py             # SQLAlchemy engine, AsyncSession factory
│       ├── security.py             # Password hashing (bcrypt), JWT handling
│       ├── dependencies.py         # FastAPI dependency injection (get_db, get_current_user)
│       ├── rate_limiter.py         # Redis-backed rate limiting middleware
│       └── keys.py                 # Encryption key management
│
├── tests/                  # Test suite
│   ├── __init__.py
│   ├── conftest.py         # Pytest fixtures (test DB, mock services)
│   ├── unit/               # Unit tests for services & repositories
│   ├── integration/        # Integration tests (endpoints with real DB)
│   ├── e2e/                # End-to-end tests
│   └── fixtures/           # Test data fixtures
│
├── alembic/                # Database migration tool
│   ├── versions/           # Migration scripts (auto-generated)
│   │   ├── 20251229_1912_initial_schema.py
│   │   └── 20260320_1308_change_shipping_address.py
│   ├── env.py              # Alembic environment config
│   └── script.mako         # Migration template
│
├── main.py                 # ASGI entry point (uvicorn main:app)
├── alembic.ini             # Alembic configuration
├── pyproject.toml          # Python project metadata & dependencies (uv)
├── requirements.txt        # Pip dependencies (generated from uv.lock)
├── requirements-dev.txt    # Dev dependencies
├── uv.lock                 # Dependency lock file
│
├── .env                    # Environment variables (git-ignored)
├── .env.example            # Example .env template
├── .venv/                  # Python virtual environment (git-ignored)
├── .python-version         # Python version (3.12)
│
├── Dockerfile              # Docker image definition
├── .gitignore              # Git ignore rules
├── README.md               # Backend documentation
└── pyrightconfig.json      # Static type checking config
```

### Backend Key Files

| File | Purpose |
|------|---------|
| `main.py` | ASGI entry (uvicorn main:app) |
| `app/main.py` | FastAPI app bootstrap, middleware setup |
| `app/api/v1/router.py` | API router aggregation |
| `app/core/config.py` | Settings & environment loading |
| `app/core/database.py` | SQLAlchemy async engine setup |
| `app/core/security.py` | Password hashing, JWT utils |
| `requirements.txt` | Dependencies: FastAPI, SQLAlchemy, Pydantic, etc. |

### Backend Dependencies

**Key Packages:**
- `fastapi` — Web framework
- `sqlalchemy` — ORM (async)
- `pydantic` — Data validation & settings
- `asyncpg` — PostgreSQL async driver
- `redis` — Cache & rate limiting
- `stripe` — Payment processing
- `python-jose` — JWT handling
- `bcrypt` — Password hashing
- `python-multipart` — File upload handling
- `alembic` — Database migrations

### Backend Build & Run

```bash
# Setup
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt

# Database migrations
alembic upgrade head

# Development
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Testing
pytest
pytest --cov=app tests/

# Linting / Type checking
pylint app/
pyright
```

---

## Project Root Files

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project rules, architecture guidelines, behavioral rules |
| `.mcp.json` | MCP (Model Context Protocol) integration config |
| `.git/` | Git version control metadata |
| `.claude/` | Claude AI workspace config & rules |
| `.claude-flow/` | RuFlo workflow orchestration files |
| `.planning/codebase/` | Architecture & structure documentation (this directory) |

---

## Module Dependencies Overview

### Frontend Module Dependencies

```
app/page.tsx
  ↓ imports
src/components/...
  ↓ imports
src/lib/api/books.ts
  ↓ imports
src/lib/api/client.ts (Axios instance)
  ↓
src/store/authStore.ts (get auth token)
  ↓
localStorage / sessionStorage

src/providers/QueryProvider.tsx
  ↓ wraps
React Query Context

src/store/cartStore.ts
  ↓
Zustand state container
```

### Backend Module Dependencies

```
main.py (ASGI entry)
  ↓ imports
app/main.py
  ↓ mounts
app/api/v1/router.py
  ↓ includes
app/api/v1/endpoints/*.py
  ↓ imports
app/services/*.py
  ↓ imports
app/repositories/*.py
  ↓ uses
app/models/*.py
  ↓ uses
SQLAlchemy AsyncSession
  ↓
PostgreSQL

app/core/config.py
  ↓
Environment variables (.env)

app/core/security.py
  ↓
Password hashing, JWT signing

app/core/rate_limiter.py
  ↓
Redis connection
```

---

## File Organization Rules

### Frontend Rules
- **Pages:** Only in `app/*/page.tsx` (Next.js routing)
- **Components:** Reusable, in `src/components/`
- **API client:** Centralized in `src/lib/api/`
- **State:** Zustand stores in `src/store/`
- **Hooks:** Custom hooks in `src/lib/hooks/`
- **Utilities:** Helper functions in `src/lib/utils.ts`

### Backend Rules
- **Routes:** Only in `app/api/v1/endpoints/`
- **Business logic:** Only in `app/services/`
- **Data access:** Only in `app/repositories/`
- **Schema definitions:** Only in `app/schemas/`
- **Model definitions:** Only in `app/models/`
- **Tests:** Mirrors source structure under `tests/`

---

## Naming Conventions

### Frontend
- Components: PascalCase (e.g., `BookCard.tsx`)
- Files: kebab-case for utility files (e.g., `token-storage.ts`)
- Directories: kebab-case (e.g., `src/lib/api`)

### Backend
- Classes: PascalCase (e.g., `BookService`, `UserRepository`)
- Files: snake_case (e.g., `book_service.py`, `user_repository.py`)
- Modules/packages: snake_case (e.g., `app/services/`, `app/repositories/`)
- Variables: snake_case (e.g., `user_id`, `created_at`)

---

## Configuration & Environment

### Frontend Configuration
- `next.config.js` — Next.js settings
- `tailwind.config.js` — Tailwind CSS theme
- `tsconfig.json` — TypeScript compiler options
- Environment: `.env.local` (localhost:3000 by default)

### Backend Configuration
- `.env` file — All settings (database, redis, jwt secret, stripe keys, oauth credentials)
- `.env.example` — Template for required variables
- `pyproject.toml` — Project metadata & dependencies
- `alembic.ini` — Migration settings
- `pyrightconfig.json` — Type checking rules

### Key Environment Variables

**Backend `.env` (examples):**
```
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/books4all
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=<32-byte-random-hex>
JWT_ALGORITHM=HS256
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
CORS_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

---

## Entry Points Summary

### Frontend Entry Points
1. `frontend/app/layout.tsx` — Root layout, providers wrapper
2. `frontend/app/page.tsx` — Home page
3. `frontend/src/store/authStore.ts` — Auth state initialization
4. `frontend/src/providers/QueryProvider.tsx` — React Query setup

### Backend Entry Points
1. `backend/main.py` — ASGI application (uvicorn entry)
2. `backend/app/main.py` — FastAPI app creation
3. `backend/app/api/v1/router.py` — API route aggregation
4. `backend/app/core/database.py` — DB session factory

---

## Build Artifacts (Git-Ignored)

- **Frontend:** `.next/` (Next.js build), `node_modules/`
- **Backend:** `.venv/` (Python virtual env), `__pycache__/`, `.pytest_cache/`, `.coverage`

