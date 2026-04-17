# Books4All — Agent Memory

Books4All is a second-hand book marketplace. Sellers list used books; buyers browse, order, and pay. Payments go through Stripe.

## Stack

| Layer | Tech |
|-------|------|
| Backend | FastAPI 0.109, Python 3.12, SQLAlchemy 2 (async), Alembic, PostgreSQL |
| Auth | JWT (python-jose), passlib + bcrypt 4.1.2, Redis (rate limiting) |
| Payments | Stripe 7.11 |
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Infra | Docker Compose (dev/staging/prod), uv (Python packages) |

## Repo Layout

```
Books4All/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # auth, books, orders, payments, reviews
│   │   ├── core/               # config, database, dependencies, security, rate_limiter
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── repositories/       # async DB access layer
│   │   ├── schemas/            # Pydantic v2 request/response schemas
│   │   └── services/           # business logic (auth, book, order, payment)
│   ├── alembic/                # migrations
│   ├── tests/
│   │   ├── DB/                 # model/constraint tests (real DB, rollback)
│   │   ├── unit/               # pure-Python tests (no DB, no HTTP)
│   │   └── integration/        # API tests (AsyncClient + real DB)
│   ├── pyproject.toml
│   └── requirements.txt
├── frontend/
│   └── app/                    # Next.js App Router pages
├── code_log/                   # per-step markdown change logs
└── docker-compose.*.yml
```

## Architecture

**Three-layer backend:**
```
Request → API endpoint (FastAPI router)
        → Service layer (business logic, raises typed exceptions)
        → Repository layer (async SQLAlchemy queries)
        → PostgreSQL
```

**Key patterns:**
- Services receive a `AsyncSession` injected via `Depends(get_db)` from `app.core.dependencies`.
- Repositories are instantiated inside services (`self.user_repo = UserRepository(db)`).
- Services raise exceptions from `app.services.exceptions` (e.g. `InvalidCredentialsError`, `BookNotFoundError`). Endpoints catch these and return the right HTTP status.
- Schemas live in `app.schemas.*`. Use `BookResponse`, `OrderResponse`, etc. for API output. Never return ORM objects directly.

## User Roles

`UserRole` enum: `BUYER`, `SELLER`, `ADMIN`

- Buyers: browse, purchase, review.
- Sellers: list books, fulfil orders containing their books.
- Admins: unrestricted access to everything.

Role is embedded in the JWT (`role` claim) and checked via `Depends(require_role(...))` in `app.core.dependencies`.

## Order State Machine

```
PENDING → PAYMENT_PROCESSING → PAID → SHIPPED → DELIVERED → REFUNDED
PENDING → CANCELLED          (buyer self-cancel only)
```

`OrderService._assert_valid_transition(from, to)` enforces this. `CANCELLED` and `REFUNDED` are terminal. Never skip states.

## Common Commands

```bash
# --- Backend ---
cd backend

# Start dev server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run all tests
.venv/bin/pytest tests/unit/ tests/DB/ -q

# Run with coverage
.venv/bin/pytest tests/unit/ tests/DB/ --cov=app --cov-report=term-missing

# New migration
alembic revision --autogenerate -m "describe_change"
alembic upgrade head

# Install a package (uses uv, not pip)
uv pip install <package>

# Format / lint
black app/ tests/
isort app/ tests/
flake8 app/

# --- Frontend ---
cd frontend
npm run dev          # http://localhost:3000
npm run build
npm run lint
```

## Environment Variables

Copy `backend/.env.example` → `backend/.env`. Key vars:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | async PostgreSQL URL (`postgresql+asyncpg://...`) |
| `SYNC_DATABASE_URL` | sync URL for Alembic (`postgresql+psycopg2://...`) |
| `SECRET_KEY` | JWT signing key (min 32 chars) |
| `STRIPE_SECRET_KEY` | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `REDIS_URL` | Redis connection URL |

## Testing Conventions

- **Unit tests** (`tests/unit/`): no DB, no HTTP. Use `SimpleNamespace` to fake ORM objects (not `User.__new__` — SQLAlchemy requires mapper init).
- **DB tests** (`tests/DB/`): real DB, each test runs inside a rolled-back transaction.
- **Integration tests** (`tests/integration/`): `AsyncClient` + `ASGITransport` + overridden `get_db` dependency pointing at the rollback session.
- `asyncio_mode = "auto"` in `pyproject.toml` — no `@pytest.mark.asyncio` needed.
- Redis is mocked globally via `mock_redis` autouse fixture in `conftest.py`.

## Known Gotchas

- **bcrypt 5.x breaks passlib 1.7.4** — keep `bcrypt==4.1.2` pinned. Do not upgrade bcrypt.
- **SQLAlchemy async sessions** — always `await session.execute(...)`, not `.execute(...)`. Use `AsyncSession` from `sqlalchemy.ext.asyncio`.
- **Stripe webhooks** — raw body must be passed to `stripe.Webhook.construct_event`, not the parsed JSON. The `payments` endpoint reads `Request.body()` for this reason.
- **JWT type field** — tokens carry a `type` claim (`access` | `refresh` | `password_reset` | `email_verification`). Always verify the correct type before acting on a token.
- **Password hashing in tests** — Call `hash_password("ShortPass1")` (≤72 bytes). passlib/bcrypt raises `ValueError` for passwords approaching the bcrypt 72-byte limit during backend detection.
- **Alembic uses sync driver** — `SYNC_DATABASE_URL` must use `postgresql+psycopg2://`. `DATABASE_URL` uses `postgresql+asyncpg://` for the app runtime.

## Code Style

- Python: Black (line length 88), isort (profile=black), flake8.
- Type hints on every function signature; Pydantic v2 models for all I/O.
- No `Any` in public API surfaces.
- Docstrings on all public service methods.
- Frontend: TypeScript strict mode, ESLint.

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Books4All — Production MVP**

Books4All is a second-hand book marketplace where sellers list used books, buyers browse and order them, and payments are processed through Stripe. The goal is to ship a production-grade MVP with all layers working correctly — backend services, repositories, and frontend components.

**Core Value:** **All backend and frontend components work correctly with zero breaking changes, delivering a production-ready marketplace MVP.**

### Constraints

- **Tech Stack**: FastAPI 0.109, Python 3.12, PostgreSQL, Redis, Next.js 15 — locked for MVP
- **Database**: PostgreSQL async driver (asyncpg), sync driver for Alembic migrations
- **Authentication**: JWT tokens with bcrypt — no OAuth for MVP
- **Timeline**: Ship production MVP with zero known critical issues
- **Quality Bar**: All requirements must pass end-to-end testing before release
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Overview
## Backend Stack
### Runtime & Framework
| Component | Version | Purpose |
|-----------|---------|---------|
| **Python** | 3.12 | Runtime language |
| **FastAPI** | 0.109.0 | Async web framework (ASGI) |
| **Uvicorn** | 0.27.0 | ASGI server (auto-reload in dev) |
| **Pydantic** | 2.5.3 | Request/response validation |
| **Pydantic Settings** | 2.1.0 | Environment configuration management |
### Database & ORM
| Component | Version | Purpose |
|-----------|---------|---------|
| **PostgreSQL** | 16-alpine | Primary relational database |
| **SQLAlchemy** | 2.0.25 | Async ORM (asyncio support) |
| **asyncpg** | 0.29.0 | PostgreSQL async driver |
| **psycopg** | 3.3.2+ | Alternative PostgreSQL driver (binary) |
| **Alembic** | 1.13.1 | Database migration tool |
- **Async (app):** `postgresql+asyncpg://user:pass@host:5432/db`
- **Sync (Alembic):** `postgresql+psycopg2://user:pass@host:5432/db`
### Authentication & Security
| Component | Version | Purpose |
|-----------|---------|---------|
| **python-jose** | 3.3.0 | JWT encoding/decoding |
| **passlib** | 1.7.4 | Password hashing abstraction |
| **bcrypt** | 4.1.2 | Bcrypt password algorithm ⚠️ **Pinned at 4.1.2** |
| **email-validator** | 2.3.0+ | Email validation |
- JWT tokens carry `type` field: `access`, `refresh`, `password_reset`, `email_verification`
- Bcrypt hashing rounds: configurable via `BCRYPT_ROUNDS` (default 12, range 10–14)
- Token claims: `sub` (user_id), `role`, `type`, `exp`, `iat`, `jti` (optional)
### Caching & Session Management
| Component | Version | Purpose |
|-----------|---------|---------|
| **Redis** | 7-alpine (container) | Cache, rate limiting, session store |
| **redis** (Python) | 5.0.1 | Async Redis client (with hiredis) |
| **hiredis** | 3.3.1 | C parser for Redis protocol (optional perf boost) |
### Testing & Quality
| Component | Version | Purpose |
|-----------|---------|---------|
| **pytest** | 7.4.4 | Unit/integration test framework |
| **pytest-asyncio** | 0.23.3 | Async test support (`asyncio_mode = "auto"`) |
| **pytest-cov** | 4.1.0 | Coverage reporting |
| **black** | 23.12.1 | Code formatter (line length: 88) |
| **isort** | 5.13.2 | Import sorting (`profile=black`) |
| **flake8** | 7.0.0 | Linting |
| **mypy** | 1.8.0 | Static type checking |
### HTTP & External Integration
| Component | Version | Purpose |
|-----------|---------|---------|
| **httpx** | 0.26.0 | Async HTTP client (OAuth, webhooks) |
| **stripe** | 7.11.0 | Payment processing SDK |
| **boto3** | 1.34.0 | AWS S3 / MinIO SDK |
| **python-multipart** | 0.0.6 | Multipart form data parsing |
### Async Runtime
| Component | Version | Purpose |
|-----------|---------|---------|
| **greenlet** | 3.0.3 | Threading context for SQLAlchemy async |
## Frontend Stack
### Runtime & Framework
| Component | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 18+ (inferred) | JavaScript runtime |
| **TypeScript** | 5 | Type-safe JavaScript |
| **Next.js** | 16.0.7 | React framework (App Router) |
| **React** | 19.2.0 | UI library |
| **React DOM** | 19.2.0 | DOM rendering |
### State Management & Queries
| Component | Version | Purpose |
|-----------|---------|---------|
| **@tanstack/react-query** | 5.91.3 | Server state management & caching |
| **zustand** | 5.0.12 | Lightweight client state (store) |
| **react-hook-form** | 7.71.2 | Form state & validation |
| **axios** | 1.13.6 | HTTP client (fallback to fetch) |
### UI & Styling
| Component | Version | Purpose |
|-----------|---------|---------|
| **Tailwind CSS** | 4 | Utility-first CSS framework |
| **@tailwindcss/postcss** | 4 | Tailwind PostCSS plugin |
| **lucide-react** | 0.577.0 | Icon library |
| **sonner** | 2.0.7 | Toast notifications |
### Validation & Utilities
| Component | Version | Purpose |
|-----------|---------|---------|
| **zod** | 4.3.6 | Schema validation & parsing |
| **date-fns** | 4.1.0 | Date manipulation & formatting |
### Development & Testing
| Component | Version | Purpose |
|-----------|---------|---------|
| **ESLint** | 9 | JavaScript linting |
| **eslint-config-next** | 16.0.7 | Next.js ESLint config |
| **Jest** | 30.3.0 | Unit test framework |
| **@testing-library/react** | 16.3.2 | React testing utilities |
| **@testing-library/jest-dom** | 6.9.1 | Custom matchers |
| **@playwright/test** | 1.58.2 | End-to-end testing |
| **ts-jest** | 29.4.6 | Jest TypeScript support |
### TypeScript Configuration
- **Target:** ES2022
- **Strict Mode:** Enabled (`strict: true`, `noImplicitOverride: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`)
- **Module Resolution:** Bundler
- **JSX:** react-jsx (no runtime import)
### Next.js Configuration
- **Strict Mode:** Enabled
- **Powered-By Header:** Disabled (security)
- **Compression:** Enabled
- **Image Formats:** AVIF, WebP
- **Cache TTL:** 60 seconds minimum
- **Remote Image Patterns:** HTTPS only
- **Environment Variables:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_STRIPE_KEY`
- `X-Frame-Options: DENY` (clickjacking)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- **CSP:** Allows self, inline scripts (Stripe), HTTPS only for external resources
## Infrastructure & Deployment
### Containerization
| Component | Version | Purpose |
|-----------|---------|---------|
| **Docker** | Latest | Containerization |
| **Docker Compose** | 3.9 | Multi-container orchestration |
### Database Containers
| Service | Image | Ports | Storage |
|---------|-------|-------|---------|
| **PostgreSQL** | `postgres:16-alpine` | 5432 | `postgres_data_*` volume |
| **Redis** | `redis:7-alpine` | 6379 | `redis_data_*` volume |
| **MinIO** | `minio/minio:latest` | 9000 (API), 9001 (Console) | `minio_data_*` volume |
### Reverse Proxy & Load Balancing
| Component | Purpose |
|-----------|---------|
| **Nginx** | Reverse proxy, TLS termination, load balancing (prod) |
| **Alpine Linux** | Lightweight base image for Nginx |
### Package Management
| Tool | Purpose |
|------|---------|
| **uv** | Fast Python package installer (alternative to pip) |
| **pip** | Standard Python package manager (fallback) |
| **npm** | Node.js package manager (frontend) |
### Docker Compose Environments
- Backend: Hot reload, port 8000
- Frontend: Optional, port 3000
- DB/Redis/MinIO: Exposed on host ports
- Volumes: Source-code mounts for live development
- Closer to production configuration
- Reduced verbosity, no source mounts
- 2 replicas each (backend, frontend)
- Resource limits (0.5 CPU, 512 MB memory)
- Named volumes for persistence
- Health checks
- Restart policies (`always`)
## Python Dependencies Summary
### Core Application
### Database & Async
### Authentication & Security
### Caching & Background Tasks
### Payments & Storage
### HTTP & Communication
### Testing
### Code Quality
## Environment Variables (Backend)
### Application
| Variable | Default | Description |
|----------|---------|-------------|
| `APP_NAME` | `Books4All` | Application name |
| `APP_VERSION` | `1.0.0` | Version string |
| `DEBUG` | `false` | Debug mode |
| `ENVIRONMENT` | `development` | `development`, `staging`, `production` |
| `API_V1_PREFIX` | `/api/v1` | API version prefix |
### Database
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✓ | PostgreSQL async URL (`postgresql+asyncpg://...`) |
| `DATABASE_POOL_SIZE` | 5 | Connection pool size (1–20) |
| `DATABASE_MAX_OVERFLOW` | 10 | Max overflow connections (0–50) |
| `DATABASE_ECHO` | false | Log SQL queries (debug) |
### Redis
| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection URL |
| `REDIS_PASSWORD` | None | Optional password |
### Authentication & JWT
| Variable | Default | Description |
|----------|---------|-------------|
| `SECRET_KEY` | (required) | JWT signing key (≥32 chars) |
| `JWT_ALGORITHM` | `HS256` | JWT encoding algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | 15 | Access token TTL |
| `REFRESH_TOKEN_EXPIRE_DAYS` | 7 | Refresh token TTL |
| `BCRYPT_ROUNDS` | 12 | Bcrypt hashing rounds (10–14) |
### CORS
| Variable | Default | Description |
|----------|---------|-------------|
| `CORS_ORIGINS` | `["http://localhost:3000"]` | Allowed CORS origins (comma-separated) |
| `CORS_ALLOW_CREDENTIALS` | `true` | Allow credentials |
| `CORS_ALLOW_METHODS` | `["*"]` | Allowed HTTP methods |
| `CORS_ALLOW_HEADERS` | `["*"]` | Allowed headers |
### OAuth — Google
| Variable | Required | Description |
|----------|----------|-------------|
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth app ID |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth secret |
| `GOOGLE_REDIRECT_URI` | `http://localhost:8000/api/v1/auth/google/callback` | Callback URL |
### OAuth — GitHub
| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_CLIENT_ID` | Optional | GitHub OAuth app ID |
| `GITHUB_CLIENT_SECRET` | Optional | GitHub OAuth secret |
| `GITHUB_REDIRECT_URI` | `http://localhost:8000/api/v1/auth/github/callback` | Callback URL |
### Rate Limiting
| Variable | Default | Description |
|----------|---------|-------------|
| `RATE_LIMIT_ENABLED` | `true` | Enable rate limiting |
| `RATE_LIMIT_DEFAULT_CALLS` | 100 | Calls per period |
| `RATE_LIMIT_DEFAULT_PERIOD` | 60 | Period in seconds |
| `RATE_LIMIT_LOGIN_CALLS` | 5 | Login attempts |
| `RATE_LIMIT_LOGIN_PERIOD` | 900 | Login period (15 min) |
### File Uploads
| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_UPLOAD_SIZE` | 5242880 | Max upload size (5 MB) |
| `ALLOWED_IMAGE_TYPES` | `["image/jpeg", "image/png", "image/webp"]` | MIME types |
### Stripe Payments
| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | Optional | Stripe secret key (`sk_...`) |
| `STRIPE_PUBLISHABLE_KEY` | Optional | Stripe publishable key (`pk_...`) |
| `STRIPE_WEBHOOK_SECRET` | Optional | Webhook endpoint secret (`whsec_...`) |
### Object Storage (S3/MinIO)
| Variable | Default | Description |
|----------|---------|-------------|
| `AWS_ENDPOINT_URL` | `http://minio:9000` | S3/MinIO endpoint |
| `AWS_ACCESS_KEY_ID` | `minioadmin` | Access key |
| `AWS_SECRET_ACCESS_KEY` | `minioadmin` | Secret key |
| `AWS_REGION` | `us-east-1` | AWS region |
| `AWS_BUCKET_NAME` | `books4all-uploads` | S3 bucket name |
| `PUBLIC_STORAGE_URL` | `http://localhost:9000` | Public storage URL |
### Frontend
| Variable | Default | Description |
|----------|---------|-------------|
| `FRONTEND_URL` | `http://localhost:3000` | Frontend URL for redirects |
## Frontend Environment Variables
### Exposed to Browser (NEXT_PUBLIC_*)
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL (e.g., `http://localhost:8000/api/v1`) |
| `NEXT_PUBLIC_STRIPE_KEY` | Stripe publishable key (for client-side Stripe.js) |
## Key Architecture Patterns
### Three-Layer Backend
### Session Lifecycle
### Error Handling
- **Service exceptions:** Typed exceptions (e.g., `BookNotFoundError`)
- **HTTP mapping:** Global exception handlers map service exceptions to HTTP status codes
- **Validation errors:** Pydantic RequestValidationError → 422
- **Generic errors:** Caught by global handler; details hidden in production
### Testing Architecture
## Known Constraints & Gotchas
## Deployment Checklist
- [ ] Set `DEBUG=false` in production environment
- [ ] Update `SECRET_KEY` (≥32 random chars)
- [ ] Configure `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`
- [ ] Set `CORS_ORIGINS` to frontend domain
- [ ] Configure OAuth secrets (Google, GitHub)
- [ ] Update `FRONTEND_URL` and `PUBLIC_STORAGE_URL`
- [ ] Use `postgresql+psycopg2://` for Alembic (sync)
- [ ] Use `postgresql+asyncpg://` for app (async)
- [ ] Run migrations: `alembic upgrade head`
- [ ] Scale backend to 2+ replicas
- [ ] Enable Nginx SSL termination
- [ ] Set resource limits in Docker Compose
- [ ] Configure S3/CloudFront for file storage (not MinIO in prod)
## Version Matrix
| Layer | Tech | Version | Status |
|-------|------|---------|--------|
| **API** | FastAPI | 0.109.0 | Current |
| **ORM** | SQLAlchemy | 2.0.25 | Async-ready |
| **Auth** | python-jose | 3.3.0 | Current |
| **Payments** | Stripe SDK | 7.11.0 | Current |
| **Frontend** | Next.js | 16.0.7 | Latest |
| **Frontend** | React | 19.2.0 | Latest |
| **Runtime** | Python | 3.12 | Latest |
| **Runtime** | Node.js | 18+ | LTS |
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Overview
## Backend (FastAPI / Python)
### Project Structure
### Code Organization Principles
### Naming Conventions
#### File & Module Names
- Snake case: `auth_service.py`, `user_repository.py`, `test_auth_api.py`
- Match class name to module: `UserService` in `user_service.py`
- Repository modules: `{model}_repository.py` (e.g., `book_repository.py`)
- Endpoints: `{resource}.py` (e.g., `auth.py`, `books.py`)
#### Class Names
- PascalCase: `UserService`, `BookRepository`, `AuthRequest`
- Enums: `UserRole`, `OrderStatus`, `BookCondition`
- Exception classes: `UserNotFoundError`, `InvalidCredentialsError` (suffix with `Error`)
#### Function/Method Names
- Snake case: `create_user()`, `get_by_email()`, `update_password()`
- Async functions: same snake case (no special prefix)
- Private methods/functions: prefix with `_`: `_map_auth_exception()`, `_assert_valid_transition()`
- Helpers: clear verb-noun pattern: `build_token_response()`, `verify_email()`
#### Variable Names
- Snake case: `user_id`, `book_title`, `order_status`
- Boolean variables: prefix with `is_`, `has_`, `can_`: `is_active`, `has_stock`, `can_publish`
- Constants: SCREAMING_SNAKE_CASE: `MAX_UPLOAD_SIZE`, `DEFAULT_PAGE_SIZE`
- Type variables: PascalCase: `ModelType`, `CreateSchemaType`, `UpdateSchemaType`
#### Database & Schema Naming
- Tables (plural): `users`, `books`, `orders`, `reviews`
- Columns (snake_case): `email`, `password_hash`, `created_at`, `is_active`
- Foreign keys: `{table}_id`: `seller_id`, `buyer_id`, `user_id`
- Enum column types: `{entity}_{enum}`: `user_role`, `order_status`
### Error Handling
#### Exception Hierarchy
#### Exception Design Rules
### Type Hints
- **Mandatory on all function signatures** — no `Any` in public APIs
- Use standard library types: `list[T]`, `dict[K, V]`, `Optional[T]`
- Use `Union` for multiple specific types (not `Any`)
- Async functions: return type applies to the awaited value, not `Coroutine`
- Generator returns: `AsyncGenerator[T, None]` for async context managers
### Docstrings
- **Google-style docstrings** on all public methods in services and repositories
- Include `Args:`, `Returns:`, `Raises:` sections
- Example:
### Code Style
#### Formatting
- **Line length:** 88 characters (Black default)
- **Formatter:** Black
- **Import sorter:** isort (profile=black)
- **Linter:** flake8
#### Import Organization
#### Spacing & Formatting
- Two blank lines between top-level functions/classes
- One blank line between methods in a class
- No blank lines after imports
- Trailing commas in multi-line structures
#### Comments & Logging
- **Docstrings**, not inline comments, for explaining "why"
- Use `logger.info()`, `logger.warning()`, `logger.exception()` — never `print()`
- Log at INFO level for important business events (login, registration, payments)
- Log at WARNING level for recoverable errors
- Include context in logs: user IDs, resource IDs, status changes
#### Conditional Assertions
- Use comments for guards/preconditions:
#### Sections & Dividers
- Use dividers for major section boundaries:
### SQLAlchemy / Async Patterns
#### Async Session Usage
- Always `await session.execute(...)` — never `.execute(...)`
- Use `AsyncSession` from `sqlalchemy.ext.asyncio`
- Never use sync driver (`psycopg2`) for app code (only Alembic: `SYNC_DATABASE_URL`)
#### Query Building
#### Flushing vs. Committing
- **Repositories**: use `await db.flush()` to keep transaction control with the service
- **Services**: call `await db.commit()` after completing business logic
- **Endpoints**: don't call commit/flush — it's the service's responsibility
#### Models: Mapped Column Syntax
- Use `Mapped` with `mapped_column()` (SQLAlchemy 2.0 style):
#### Relationships
- Always specify `back_populates` on both sides
- Lazy loading: `lazy="dynamic"` for list relationships (don't load by default)
- Use `TYPE_CHECKING` for forward references in circular dependencies:
### Pydantic v2 Schemas
#### BaseSchema Configuration
#### Request vs. Response
- **Request schemas** (Create, Update): inherits from `BaseSchema`
- **Response schemas**: inherits from `ResponseSchema` (includes ID + timestamps)
- Example:
#### Field Validation
- Use Pydantic validators for complex validation:
## Frontend (Next.js / TypeScript)
### Project Structure
### Naming Conventions
#### File & Folder Names
- Components: PascalCase: `UserProfile.tsx`, `BookCard.tsx`
- Pages: lowercase with hyphens: `[id].tsx`, `my-listings.tsx`
- Hooks: PascalCase prefixed with `use`: `useAuth.ts`, `useCart.ts`
- API functions: snake_case: `books.ts`, `orders.ts`, `auth.ts`
- Types: snake_case: `user.ts`, `book.ts`, `order.ts`
- Utils: snake_case: `formatPrice.ts`, `parseDate.ts`
#### Variable & Function Names
- React components: PascalCase: `const BookCard = (props) => { ... }`
- Props interfaces: `{ComponentName}Props`: `interface BookCardProps { ... }`
- Event handlers: prefix with `handle` or `on`: `handleSubmit()`, `onClose()`
- Custom hooks: `use{FeatureName}`: `useAuth()`, `useBookList()`
- Helper functions: camelCase verb-noun: `formatPrice()`, `parseDate()`, `truncateText()`
#### Type Names
- Interfaces: PascalCase: `User`, `Book`, `Order`, `AuthResponse`
- Types: PascalCase: `BookCondition`, `OrderStatus`
- Enums: PascalCase: `UserRole`, `BookStatus`
### TypeScript Conventions
#### Strict Mode
- All files in strict TypeScript mode (no `any` without justification)
- Always provide return types on functions:
#### Type Definitions
- Keep types in `lib/types/` organized by domain:
- Export all types from a barrel file:
#### Component Patterns
- Always use `"use client"` at the top for interactive components
- Separate from server components in the same folder if needed
### React & Next.js Patterns
#### Hooks Usage
- Use React Query (`@tanstack/react-query`) for server state:
- Use `useState` for local UI state only (form inputs, modals, etc.)
- Use `useEffect` for side effects (watch dependencies carefully)
#### Error Handling
- API errors: catch and display via toast or inline error message
#### Form Handling
- Use React Hook Form with Zod validation:
#### State Management (if needed)
- Keep it minimal — React Query handles most server state
- Zustand or Context API for global UI state (theme, user session, cart)
- Avoid Redux-style complexity
### Styling
#### Tailwind CSS
- Use Tailwind utility classes — avoid custom CSS when possible
- Responsive classes: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- Dark mode support: `dark:` prefix
#### Custom CSS
- Keep in `styles/globals.css` or component module
- Use CSS custom properties for theme colors (coordinated with backend colors)
- Example color variables:
#### Component-Level Styles
- Avoid inline `style={}` — use Tailwind or CSS modules
- For complex conditional styles, build className strings:
### API Integration
#### API Client Functions
- Keep in `lib/api/{resource}.ts`
- One file per domain (books, orders, auth, etc.)
- Use fetch or axios (whichever is configured)
- Example:
#### Authentication
- Store JWT in HTTP-only cookie or secure storage
- Add auth token to request headers in API layer:
## Cross-Cutting Concerns
### Logging
#### Backend Logging
- Use Python's `logging` module (configured in FastAPI lifespan)
- Log levels:
#### Frontend Logging
- Use `console.log()`, `console.warn()`, `console.error()` during development
- In production, consider a logging service (e.g., Sentry)
- Log API errors and user actions for debugging
### Security
#### Backend
- **Password hashing**: bcrypt via passlib (min 72 bytes enforced)
- **JWT tokens**: include `type` claim (`access`, `refresh`, `password_reset`)
- **CORS**: configured in `main.py` with allowed origins
- **Rate limiting**: Redis-backed, excludes webhooks and health checks
- **Input validation**: Pydantic schemas for all inputs
- **SQL injection**: parameterized queries via SQLAlchemy
- **Secrets**: all sensitive config in environment variables (`.env`)
#### Frontend
- **Authentication**: store JWT securely (HTTP-only cookie preferred)
- **CSRF**: handled by Next.js automatically for same-origin requests
- **XSS**: React escapes content by default; be careful with `dangerouslySetInnerHTML`
- **API secrets**: never expose private keys in client code
### Testing
#### Backend Testing
- See [TESTING.md](./TESTING.md) for comprehensive testing conventions
#### Frontend Testing
- Unit tests: Jest + React Testing Library
- Integration tests: end-to-end flow testing via Cypress or Playwright
- Mock API responses in unit tests using Mock Service Worker (MSW)
## Summary Table
| Aspect | Convention | Example |
|--------|-----------|---------|
| **Backend File Names** | snake_case | `auth_service.py` |
| **Backend Classes** | PascalCase | `UserService` |
| **Backend Methods** | snake_case | `get_by_email()` |
| **Backend Constants** | SCREAMING_SNAKE_CASE | `MAX_UPLOAD_SIZE` |
| **Backend Exceptions** | PascalCase + `Error` suffix | `InvalidCredentialsError` |
| **Backend Databases** | snake_case, plural | `users`, `user_id` |
| **Frontend Components** | PascalCase | `BookCard.tsx` |
| **Frontend Pages** | lowercase-kebab-case | `my-listings.tsx` |
| **Frontend Hooks** | use{Name} | `useAuth.ts` |
| **Frontend Types** | PascalCase | `User`, `Book` |
| **Frontend Functions** | camelCase | `formatPrice()` |
| **Line Length** | 88 chars (Black) | N/A |
| **Type Hints** | Required in signatures | `async def get_user(...) -> User:` |
| **Exception Strategy** | Typed + service layer | Raise in service, catch in endpoint |
| **Form Validation** | Zod (frontend), Pydantic (backend) | `z.object({ ... })` |
| **Styling** | Tailwind CSS + custom CSS | `className="px-4 py-2 bg-primary"` |
## See Also
- [TESTING.md](./TESTING.md) — Testing framework, structure, and best practices
- `CLAUDE.md` — Project-specific context and known gotchas
- `pyproject.toml` — Backend dependencies and tool configuration
- `backend/app/main.py` — Global exception handlers and middleware
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Executive Summary
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
## Three-Layer Architecture
### Layer 1: API Endpoints (FastAPI Routers)
- Accept HTTP requests with validated Pydantic schemas
- Extract authentication context (current user, role)
- Call service layer methods
- Catch service exceptions and map to HTTP responses
- Return response schemas (never raw ORM objects)
```
```
- `EmailAlreadyExistsError` → 409 Conflict
- `InvalidCredentialsError` → 401 Unauthorized
- `BookNotFoundError`, `OrderNotFoundError` → 404 Not Found
- `InsufficientStockError` → 409 Conflict
- `InvalidStatusTransitionError` → 422 Unprocessable Entity
- `PaymentError`, `RefundError` → 402 Payment Required
- `ServiceError` (untyped) → 500 Internal Server Error
- `/auth/*` — Registration, login, OAuth, token refresh
- `/books/*` — Book CRUD, search, filters, pagination
- `/orders/*` — Create, list, cancel, status updates
- `/payments/*` — Stripe checkout, webhook handling
- `/reviews/*` — Create, list reviews for verified purchases
### Layer 2: Service Layer (Business Logic)
- Enforce business rules and invariants
- Orchestrate repository calls (often multiple operations)
- Raise **typed exceptions** (not generic `ValueError`)
- Perform validation and authorization checks
- Handle complex workflows (e.g., state transitions)
```python
```
```
```
- `OrderService._assert_valid_transition(from_status, to_status)` enforces allowed transitions
- `OrderService.create_order()` pre-fetches all books, validates quantities, then creates atomically
- `BookService` prevents sellers from modifying books they don't own
### Layer 3: Repository Layer (Data Access)
- Execute async SQLAlchemy queries
- Manage soft delete logic (`deleted_at` filtering)
- Load related objects (eager/lazy loading)
- Provide generic CRUD interface for all entities
```python
```
```python
```
## Data Flow: Complete Request Example
### Scenario: Buyer Creates Order
```
```
## Authentication & Authorization Flow
### JWT Token Structure
```python
```
### Token Lifecycle
```
```
### Role-Based Access Control (RBAC)
```python
```
- `RequireAdmin = Depends(require_role(UserRole.ADMIN))`
- `RequireSeller = Depends(require_role(UserRole.SELLER, UserRole.ADMIN))`
- `RequireBuyer = Depends(require_role(UserRole.BUYER, UserRole.SELLER, UserRole.ADMIN))`
## Middleware & Cross-Cutting Concerns
### 1. CORS Middleware
### 2. Rate Limiting Middleware
### 3. Exception Handlers (in order of specificity)
### 4. Lifecycle Events (app.main.lifespan)
- **Startup:** Warm DB connection pool, initialize Redis
- **Shutdown:** Close Redis, log completion
## Database Schema Patterns
### Base Model Class
```python
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
## Error Handling Strategy
### Exception Hierarchy
```
```
### Validation Error Response (422)
```json
```
### Service Error Response (mapped to HTTP status)
```json
```
## Key Abstractions & Patterns
### 1. Dependency Injection (FastAPI)
```python
```
- Easy to test: mock Depends() values
- Automatic role checking
- Automatic DB session management with transaction rollback
### 2. Generic Repository Pattern
```python
```
### 3. Typed Exception Mapping
```python
```
### 4. Soft Delete Pattern
```python
```
### 5. Transactional Operations
```python
```
## Concurrency & Consistency Safeguards
### 1. Stock Deduction (Order Creation)
- **Potential Issue:** Two simultaneous orders for same book → race condition
- **Safeguard:** 
### 2. Status Transitions (Order)
- **Potential Issue:** Invalid state transitions (e.g., DELIVERED → PENDING)
- **Safeguard:**
### 3. OAuth Token Replay
- **Potential Issue:** Attacker reuses OAuth code
- **Safeguard:**
### 4. Stripe Webhook Verification
- **Potential Issue:** Attacker spoofs webhook events
- **Safeguard:**
## Performance Considerations
### Query Optimization
### Connection Pooling
```python
```
### Rate Limiting
- **Default:** 100 calls per 1 minute per IP
- **Excluded:** `/health`, `/metrics`, `/api/v1/docs`, `/payments/webhook`
- **Backend:** Redis (distributed, works across replicas)
## Secrets & Configuration Management
### Environment Variables
- `DATABASE_URL` — async PostgreSQL: `postgresql+asyncpg://user:pass@host/db`
- `SYNC_DATABASE_URL` — sync PostgreSQL for Alembic: `postgresql+psycopg2://...`
- `SECRET_KEY` — JWT signing (min 32 chars)
- `STRIPE_SECRET_KEY` — Stripe API key
- `STRIPE_WEBHOOK_SECRET` — Webhook signing secret
- `REDIS_URL` — Redis connection
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — OAuth
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` — OAuth
- `DATABASE_ECHO` — SQL logging (default: False)
### Sensitive Data Handling
- Passwords: hashed with bcrypt (4.1.2) before storage
- Tokens: signed with `SECRET_KEY` using HS256 algorithm
- Stripe secrets: never logged, used only in PaymentService
- OAuth tokens: exchanged server-side; client never sees provider tokens
## Testing Architecture
### Test Layers
### Testing Patterns
```python
```
## Frontend Architecture (High-Level)
### Tech Stack
- **Framework:** Next.js 15 (App Router)
- **Styling:** Tailwind CSS
- **Type Safety:** TypeScript (strict mode)
- **State:** Zustand or React Context (in `src/store/`)
- **API Client:** Fetch or Axios (wrapper in `src/lib/`)
### Directory Layout
```
```
### Key Data Flows
## Deployment & Infrastructure
### Docker Compose
- `backend` — FastAPI uvicorn server (port 8000)
- `frontend` — Next.js dev server (port 3000)
- `postgres` — PostgreSQL (port 5432)
- `redis` — Redis (port 6379)
- PostgreSQL data persisted to `postgres_data/`
- Environment file loaded from `backend/.env`
### Production Considerations
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
## Quick Reference: Common Operations
### Creating a New Endpoint
### Adding a New Field to User
```bash
```
### Testing a Service
```python
```
## Conclusion
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

| Skill | Description | Path |
|-------|-------------|------|
| "AgentDB Advanced Features" | "Master advanced AgentDB features including QUIC synchronization, multi-database management, custom distance metrics, hybrid search, and distributed systems integration. Use when building distributed AI systems, multi-agent coordination, or advanced vector search applications." | `.claude/skills/agentdb-advanced/SKILL.md` |
| "AgentDB Learning Plugins" | "Create and train AI learning plugins with AgentDB's 9 reinforcement learning algorithms. Includes Decision Transformer, Q-Learning, SARSA, Actor-Critic, and more. Use when building self-learning agents, implementing RL, or optimizing agent behavior through experience." | `.claude/skills/agentdb-learning/SKILL.md` |
| "AgentDB Memory Patterns" | "Implement persistent memory patterns for AI agents using AgentDB. Includes session memory, long-term storage, pattern learning, and context management. Use when building stateful agents, chat systems, or intelligent assistants." | `.claude/skills/agentdb-memory-patterns/SKILL.md` |
| "AgentDB Performance Optimization" | "Optimize AgentDB performance with quantization (4-32x memory reduction), HNSW indexing (150x faster search), caching, and batch operations. Use when optimizing memory usage, improving search speed, or scaling to millions of vectors." | `.claude/skills/agentdb-optimization/SKILL.md` |
| "AgentDB Vector Search" | "Implement semantic vector search with AgentDB for intelligent document retrieval, similarity matching, and context-aware querying. Use when building RAG systems, semantic search engines, or intelligent knowledge bases." | `.claude/skills/agentdb-vector-search/SKILL.md` |
| browser | Web browser automation with AI-optimized snapshots for claude-flow agents | `.claude/skills/browser/SKILL.md` |
| github-code-review | Comprehensive GitHub code review with AI-powered swarm coordination | `.claude/skills/github-code-review/SKILL.md` |
| github-multi-repo | Multi-repository coordination, synchronization, and architecture management with AI swarm orchestration | `.claude/skills/github-multi-repo/SKILL.md` |
| github-project-management | Comprehensive GitHub project management with swarm-coordinated issue tracking, project board automation, and sprint planning | `.claude/skills/github-project-management/SKILL.md` |
| github-release-management | Comprehensive GitHub release orchestration with AI swarm coordination for automated versioning, testing, deployment, and rollback management | `.claude/skills/github-release-management/SKILL.md` |
| github-workflow-automation | Advanced GitHub Actions workflow automation with AI swarm coordination, intelligent CI/CD pipelines, and comprehensive repository management | `.claude/skills/github-workflow-automation/SKILL.md` |
| Hooks Automation | Automated coordination, formatting, and learning from Claude Code operations using intelligent hooks with MCP integration. Includes pre/post task hooks, session management, Git integration, memory coordination, and neural pattern training for enhanced development workflows. | `.claude/skills/hooks-automation/SKILL.md` |
| Pair Programming | AI-assisted pair programming with multiple modes (driver/navigator/switch), real-time verification, quality monitoring, and comprehensive testing. Supports TDD, debugging, refactoring, and learning sessions. Features automatic role switching, continuous code review, security scanning, and performance optimization with truth-score verification. | `.claude/skills/pair-programming/SKILL.md` |
| "ReasoningBank with AgentDB" | "Implement ReasoningBank adaptive learning with AgentDB's 150x faster vector database. Includes trajectory tracking, verdict judgment, memory distillation, and pattern recognition. Use when building self-learning agents, optimizing decision-making, or implementing experience replay systems." | `.claude/skills/reasoningbank-agentdb/SKILL.md` |
| "ReasoningBank Intelligence" | "Implement adaptive learning with ReasoningBank for pattern recognition, strategy optimization, and continuous improvement. Use when building self-learning agents, optimizing workflows, or implementing meta-cognitive systems." | `.claude/skills/reasoningbank-intelligence/SKILL.md` |
| "Skill Builder" | "Create new Claude Code Skills with proper YAML frontmatter, progressive disclosure structure, and complete directory organization. Use when you need to build custom skills for specific workflows, generate skill templates, or understand the Claude Skills specification." | `.claude/skills/skill-builder/SKILL.md` |
| sparc-methodology | SPARC (Specification, Pseudocode, Architecture, Refinement, Completion) comprehensive development methodology with multi-agent orchestration | `.claude/skills/sparc-methodology/SKILL.md` |
| stream-chain | Stream-JSON chaining for multi-agent pipelines, data transformation, and sequential workflows | `.claude/skills/stream-chain/SKILL.md` |
| swarm-advanced | Advanced swarm orchestration patterns for research, development, testing, and complex distributed workflows | `.claude/skills/swarm-advanced/SKILL.md` |
| "Swarm Orchestration" | "Orchestrate multi-agent swarms with agentic-flow for parallel task execution, dynamic topology, and intelligent coordination. Use when scaling beyond single agents, implementing complex workflows, or building distributed AI systems." | `.claude/skills/swarm-orchestration/SKILL.md` |
| "V3 CLI Modernization" | "CLI modernization and hooks system enhancement for claude-flow v3. Implements interactive prompts, command decomposition, enhanced hooks integration, and intelligent workflow automation." | `.claude/skills/v3-cli-modernization/SKILL.md` |
| "V3 Core Implementation" | "Core module implementation for claude-flow v3. Implements DDD domains, clean architecture patterns, dependency injection, and modular TypeScript codebase with comprehensive testing." | `.claude/skills/v3-core-implementation/SKILL.md` |
| "V3 DDD Architecture" | "Domain-Driven Design architecture for claude-flow v3. Implements modular, bounded context architecture with clean separation of concerns and microkernel pattern." | `.claude/skills/v3-ddd-architecture/SKILL.md` |
| "V3 Deep Integration" | "Deep agentic-flow@alpha integration implementing ADR-001. Eliminates 10,000+ duplicate lines by building claude-flow as specialized extension rather than parallel implementation." | `.claude/skills/v3-integration-deep/SKILL.md` |
| "V3 MCP Optimization" | "MCP server optimization and transport layer enhancement for claude-flow v3. Implements connection pooling, load balancing, tool registry optimization, and performance monitoring for sub-100ms response times." | `.claude/skills/v3-mcp-optimization/SKILL.md` |
| "V3 Memory Unification" | "Unify 6+ memory systems into AgentDB with HNSW indexing for 150x-12,500x search improvements. Implements ADR-006 (Unified Memory Service) and ADR-009 (Hybrid Memory Backend)." | `.claude/skills/v3-memory-unification/SKILL.md` |
| "V3 Performance Optimization" | "Achieve aggressive v3 performance targets: 2.49x-7.47x Flash Attention speedup, 150x-12,500x search improvements, 50-75% memory reduction. Comprehensive benchmarking and optimization suite." | `.claude/skills/v3-performance-optimization/SKILL.md` |
| "V3 Security Overhaul" | "Complete security architecture overhaul for claude-flow v3. Addresses critical CVEs (CVE-1, CVE-2, CVE-3) and implements secure-by-default patterns. Use for security-first v3 implementation." | `.claude/skills/v3-security-overhaul/SKILL.md` |
| "V3 Swarm Coordination" | "15-agent hierarchical mesh coordination for v3 implementation. Orchestrates parallel execution across security, core, and integration domains following 10 ADRs with 14-week timeline." | `.claude/skills/v3-swarm-coordination/SKILL.md` |
| "Verification & Quality Assurance" | "Comprehensive truth scoring, code quality verification, and automatic rollback system with 0.95 accuracy threshold for ensuring high-quality agent outputs and codebase reliability." | `.claude/skills/verification-quality/SKILL.md` |
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
