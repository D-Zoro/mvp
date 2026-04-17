# Technology Stack — Books4All

**Last Updated:** 2026-04-18

## Overview

Books4All is a full-stack second-hand book marketplace built with **FastAPI + Next.js**, deployed via **Docker Compose** with **PostgreSQL + Redis** persistence, **Stripe** payments, and **MinIO** object storage.

---

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

**URL Formats:**
- **Async (app):** `postgresql+asyncpg://user:pass@host:5432/db`
- **Sync (Alembic):** `postgresql+psycopg2://user:pass@host:5432/db`

### Authentication & Security

| Component | Version | Purpose |
|-----------|---------|---------|
| **python-jose** | 3.3.0 | JWT encoding/decoding |
| **passlib** | 1.7.4 | Password hashing abstraction |
| **bcrypt** | 4.1.2 | Bcrypt password algorithm ⚠️ **Pinned at 4.1.2** |
| **email-validator** | 2.3.0+ | Email validation |

**Key Notes:**
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

---

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

**Compiler Options:**
- **Target:** ES2022
- **Strict Mode:** Enabled (`strict: true`, `noImplicitOverride: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`)
- **Module Resolution:** Bundler
- **JSX:** react-jsx (no runtime import)

**Path Aliases (tsconfig.json):**
```
@/*              → ./src/*
@/app/*          → ./app/*
@/components/*   → ./src/components/*
@/lib/*          → ./src/lib/*
@/hooks/*        → ./src/lib/hooks/*
@/store/*        → ./src/store/*
@/types/*        → ./src/types/*
@/styles/*       → ./src/styles/*
```

### Next.js Configuration

**Key Settings:**
- **Strict Mode:** Enabled
- **Powered-By Header:** Disabled (security)
- **Compression:** Enabled
- **Image Formats:** AVIF, WebP
- **Cache TTL:** 60 seconds minimum
- **Remote Image Patterns:** HTTPS only
- **Environment Variables:** `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_STRIPE_KEY`

**Security Headers (automatic):**
- `X-Frame-Options: DENY` (clickjacking)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- **CSP:** Allows self, inline scripts (Stripe), HTTPS only for external resources

---

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

**Development** (`docker-compose.dev.yml`):
- Backend: Hot reload, port 8000
- Frontend: Optional, port 3000
- DB/Redis/MinIO: Exposed on host ports
- Volumes: Source-code mounts for live development

**Staging** (`docker-compose.staging.yml`):
- Closer to production configuration
- Reduced verbosity, no source mounts

**Production** (`docker-compose.prod.yml`):
- 2 replicas each (backend, frontend)
- Resource limits (0.5 CPU, 512 MB memory)
- Named volumes for persistence
- Health checks
- Restart policies (`always`)

---

## Python Dependencies Summary

### Core Application
```
fastapi[all]==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.3
pydantic-settings==2.1.0
```

### Database & Async
```
sqlalchemy[asyncio]==2.0.25
asyncpg==0.29.0
psycopg[binary]>=3.3.2
psycopg2-binary==2.9.9
alembic==1.13.1
greenlet==3.0.3
```

### Authentication & Security
```
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
bcrypt==4.1.2    # ⚠️ Pinned — do NOT upgrade
email-validator>=2.3.0
```

### Caching & Background Tasks
```
redis[hiredis]==5.0.1
celery>=5.6.0
```

### Payments & Storage
```
stripe==7.11.0
boto3==1.34.0
```

### HTTP & Communication
```
httpx==0.26.0
python-multipart==0.0.6
```

### Testing
```
pytest==7.4.4
pytest-asyncio==0.23.3
pytest-cov==4.1.0
```

### Code Quality
```
black==23.12.1
isort==5.13.2
flake8==7.0.0
mypy==1.8.0
```

---

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

---

## Frontend Environment Variables

### Exposed to Browser (NEXT_PUBLIC_*)
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL (e.g., `http://localhost:8000/api/v1`) |
| `NEXT_PUBLIC_STRIPE_KEY` | Stripe publishable key (for client-side Stripe.js) |

---

## Key Architecture Patterns

### Three-Layer Backend
```
Request → API Endpoint (FastAPI router)
        → Service Layer (business logic, typed exceptions)
        → Repository Layer (async SQLAlchemy queries)
        → PostgreSQL
```

### Session Lifecycle
```
FastAPI Request
    ↓
Dependency injection: get_db() → AsyncSession
    ↓
Service receives AsyncSession
    ↓
Repository queries via session
    ↓
Response sent
    ↓
Session closed (via context manager)
```

### Error Handling
- **Service exceptions:** Typed exceptions (e.g., `BookNotFoundError`)
- **HTTP mapping:** Global exception handlers map service exceptions to HTTP status codes
- **Validation errors:** Pydantic RequestValidationError → 422
- **Generic errors:** Caught by global handler; details hidden in production

### Testing Architecture
```
Unit Tests (tests/unit/)
  ├─ No DB, no HTTP
  ├─ Mock ORM objects via SimpleNamespace
  └─ Pure Python logic

DB Tests (tests/DB/)
  ├─ Real DB, rollback per test
  └─ Model constraints, queries

Integration Tests (tests/integration/)
  ├─ AsyncClient + ASGI transport
  ├─ Real DB with rollback session
  └─ Full request/response cycle
```

---

## Known Constraints & Gotchas

⚠️ **Bcrypt 5.x incompatible:** Keep `bcrypt==4.1.2` pinned. Do NOT upgrade.

⚠️ **SQLAlchemy async:** Always `await session.execute(...)`. Use `AsyncSession` from `sqlalchemy.ext.asyncio`.

⚠️ **Stripe webhooks:** Pass raw `Request.body()` to webhook verification, not parsed JSON.

⚠️ **JWT type field:** Always verify token `type` claim (`access`, `refresh`, etc.) before acting on it.

⚠️ **Password hashing limit:** passlib/bcrypt limits to ~72 bytes. Test passwords must fit.

⚠️ **Alembic uses sync driver:** `SYNC_DATABASE_URL` must use `postgresql+psycopg2://`.

---

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

---

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

---

**Generated:** 2026-04-18 | **Docs Last Updated:** 2026-04-18
