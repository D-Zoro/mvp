# Books4All Technology Stack

## Overview
Books4All is a peer-to-peer used-book marketplace built with a modern full-stack architecture: **Next.js React frontend** + **FastAPI Python backend**.

---

## Frontend Stack

### Framework & Runtime
- **Next.js** 16.0.7 - React server-side rendering and static generation framework
- **React** 19.2.0 - UI component library
- **React DOM** 19.2.0 - React renderer for browser DOM
- **TypeScript** 5.x - Type-safe JavaScript superset

### State Management & Forms
- **TanStack React Query** 5.91.3 - Server state management and caching
- **Zustand** 5.0.12 - Lightweight client state management
- **React Hook Form** 7.71.2 - Performant form validation and submission
- **Zod** 4.3.6 - Runtime schema validation for TypeScript

### UI & Styling
- **Tailwind CSS** 4.x - Utility-first CSS framework
- **Lucide React** 0.577.0 - Lightweight icon library
- **Sonner** 2.0.7 - Toast notifications library

### HTTP & API Communication
- **Axios** 1.13.6 - Promise-based HTTP client for API requests
- **Date-fns** 4.1.0 - Modern date utility library

### Testing & Quality
- **Jest** 30.3.0 - JavaScript unit testing framework
- **Playwright** 1.58.2 - End-to-end testing framework
- **Testing Library (React)** 16.3.2 - React component testing utilities
- **Testing Library (Jest DOM)** 6.9.1 - Custom Jest matchers for DOM

### Development Tools
- **ESLint** 9.x - JavaScript linting
- **ESLint Config (Next.js)** 16.0.7 - Next.js recommended rules
- **ts-jest** 29.4.6 - TypeScript support for Jest

### Build Configuration
- **next.config.js** - Strict security headers (CSP, X-Frame-Options, etc.)
- Image optimization with modern formats (AVIF, WebP)
- Remote image pattern support for external domains
- Environment variable configuration for API and Stripe

---

## Backend Stack

### Core Framework & Runtime
- **Python** 3.12 - Programming language
- **FastAPI** 0.109.0 - Modern async web framework
- **Uvicorn** 0.27.0 - ASGI server with uvloop support
- **Starlette** 0.35.1 - ASGI toolkit (FastAPI dependency)

### Database & ORM
- **SQLAlchemy** 2.0.25 - SQL toolkit and ORM with async support
- **SQLAlchemy asyncio** - Async database access
- **AsyncPG** 0.29.0 - Async PostgreSQL driver (high performance)
- **Psycopg** 3.3.2 - PostgreSQL adapter (with binary support)
- **Psycopg2-binary** 2.9.9 - Legacy PostgreSQL driver
- **Alembic** 1.13.1 - Database migration tool
- **Greenlet** 3.0.3 - Lightweight concurrency primitive

### Caching & Sessions
- **Redis** 5.0.1 - In-memory data store with HiredIS optimization
- **HiredIS** 3.3.1 - C parser for Redis protocol (performance)

### Authentication & Security
- **PyJWT (python-jose)** 3.3.0 - JWT token signing and verification
- **Cryptography** 46.0.3 - Cryptographic recipes and primitives
- **Bcrypt** 4.1.2 - Secure password hashing
- **Passlib[bcrypt]** 1.7.4 - Password hashing library

### Payment Processing
- **Stripe** 7.11.0 - Payment processing and checkout integration
- Webhook signature verification and event handling
- Refund processing capabilities
- Checkout session management with Redis deduplication

### File Storage
- **Boto3** 1.34.0 - AWS SDK for Python
- **Botocore** 1.34.162 - Low-level AWS API client
- **S3Transfer** 0.9.0 - S3 file transfer utilities
- S3/MinIO integration for image uploads

### HTTP & Request Handling
- **Httpx** 0.26.0 - Async HTTP client
- **Httptools** 0.7.1 - Fast HTTP request/response parsing
- **Python-multipart** 0.0.6 - Multipart form data parsing
- **Email-validator** 2.3.0 - Email validation

### Data Validation & Serialization
- **Pydantic** 2.5.3 - Data validation using Python type hints
- **Pydantic Settings** 2.1.0 - Settings management with Pydantic
- **Pydantic Extra Types** 2.10.6 - Extra Pydantic data types
- **Pydantic Core** 2.14.6 - Core validation engine

### Task Queue & Background Jobs
- **Celery** 5.6.0 - Distributed task queue
- **Kombu** 5.6.1 - AMQP library for Celery
- **Billiard** 4.2.4 - Process pool implementation
- **AMQP** 5.3.1 - Python AMQP client
- **Vine** 5.1.0 - Event manager for Celery

### Code Quality & Linting
- **Black** 23.12.1 - Code formatter (PEP 8 compliant)
- **Flake8** 7.0.0 - Style guide linter
- **iSort** 5.13.2 - Import statement sorter
- **MyPy** 1.8.0 - Static type checker
- **Pycodestyle** 2.11.1 - PEP 8 conformance checker
- **PyFlakes** 3.2.0 - Logical error checker

### Testing
- **Pytest** 7.4.4 - Testing framework
- **Pytest-asyncio** 0.23.3 - Async test support
- **Pytest-cov** 4.1.0 - Code coverage plugin
- **Coverage** 7.13.0 - Code coverage measurement

### Utilities & Dependencies
- **Python-dotenv** 1.2.1 - .env file support
- **Click** 8.3.1 - CLI creation toolkit
- **ORJson** 3.11.5 - Fast JSON serializer
- **UJson** 5.11.0 - Ultra-fast JSON encoder
- **PyYAML** 6.0.3 - YAML parser
- **PyASN1** 0.6.1 - ASN.1 library
- **Requests** 2.32.5 - HTTP library (synchronous)
- **Certifi** 2025.11.12 - Mozilla CA certificate bundle
- **Typing Extensions** 4.15.0 - Type hint backports
- **Six** 1.17.0 - Python 2 and 3 compatibility

---

## Database

### Primary Database
- **PostgreSQL** - Primary relational database
- Connection string: `postgresql+asyncpg://` with async driver
- Pool configuration:
  - **Pool Size**: 5 (configurable, min 1, max 20)
  - **Max Overflow**: 10 (configurable, min 0, max 50)
  - **Pool Pre-ping**: Enabled (connection verification)

### Cache & Session Store
- **Redis** - In-memory cache for webhooks and rate limiting
- Default URL: `redis://localhost:6379/0`
- Optional password authentication supported
- Webhook deduplication with 24-hour TTL
- Rate limiting state management

---

## Infrastructure

### Containerization
- **Docker** - Container runtime
- **Dockerfile** (Backend) - Multi-stage build
  - Builder stage: Installs dependencies into wheels
  - Production stage: Lean runtime with non-root user (uid 1001)
  - Runs as `appuser:appgroup` (security best practice)
  - Exposes port 8000

### API Server
- **Uvicorn** with standard HTTP server or uvloop
- ASGI-compliant async server
- Configurable host/port
- Health check endpoint at `/health`
- Metrics endpoint at `/metrics` (Prometheus format)

---

## API & Configuration

### API Versioning
- **API V1 Prefix**: `/api/v1`
- OpenAPI/Swagger docs at `/api/v1/docs`
- ReDoc at `/api/v1/redoc`
- OpenAPI spec at `/api/v1/openapi.json`

### Middleware
- **CORS** - Configurable origin, methods, headers, credentials
- **Rate Limiting** - Configurable calls/period
  - Default: 100 calls per 60 seconds
  - Login endpoint: 5 calls per 900 seconds (brute-force protection)
  - Excludes: /health, /metrics, docs, Stripe webhooks

### Authentication
- **JWT (HS256)** - Symmetric token signing
- **Access Token TTL**: 15 minutes (configurable, 5-60 min)
- **Refresh Token TTL**: 7 days (configurable, 1-30 days)
- **Bcrypt Rounds**: 12 (configurable, 10-14)

### OAuth Integrations
- **Google OAuth** - Optional (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- **GitHub OAuth** - Optional (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET)
- Configurable redirect URIs per OAuth provider

### Payment Gateway
- **Stripe** - Payment processing
  - Secret key configuration (sk_...)
  - Publishable key for frontend (pk_...)
  - Webhook secret for event verification (whsec_...)
  - Webhook deduplication via Redis

---

## Configuration Management

### Environment Variables
Managed via **Pydantic Settings** from `.env` file:

**Application**
- `APP_NAME` - Application identifier
- `APP_VERSION` - Semantic version
- `DEBUG` - Debug mode flag
- `ENVIRONMENT` - Deployment environment (development/staging/production)

**Database**
- `DATABASE_URL` - PostgreSQL async connection string (required)
- `DATABASE_POOL_SIZE` - Connection pool size
- `DATABASE_MAX_OVERFLOW` - Overflow connection limit
- `DATABASE_ECHO` - SQL query logging

**Redis**
- `REDIS_URL` - Redis connection string
- `REDIS_PASSWORD` - Optional Redis authentication

**File Upload**
- `MAX_UPLOAD_SIZE` - Max file size (default 5MB)
- `ALLOWED_IMAGE_TYPES` - MIME types allowed (JPEG, PNG, WebP)

**Security**
- `SECRET_KEY` - JWT signing key (must be 32+ characters)
- `JWT_ALGORITHM` - Token algorithm (default HS256)
- `BCRYPT_ROUNDS` - Password hash iterations
- `CORS_ORIGINS` - Allowed origins (comma-separated string or list)
- `CORS_ALLOW_CREDENTIALS` - Enable credential requests
- `CORS_ALLOW_METHODS` - Allowed HTTP methods
- `CORS_ALLOW_HEADERS` - Allowed request headers

**OAuth**
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` - Callback URL
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- `GITHUB_REDIRECT_URI` - Callback URL

**Payment**
- `STRIPE_SECRET_KEY` - Stripe API key (optional)
- `STRIPE_PUBLISHABLE_KEY` - Frontend Stripe key (optional)
- `STRIPE_WEBHOOK_SECRET` - Webhook verification (optional)

**Frontend**
- `FRONTEND_URL` - Frontend URL for redirects

---

## Development Tools & Commands

### Frontend
```bash
npm run dev          # Start development server
npm run build        # Production build
npm start            # Start production server
npm run lint         # Run ESLint
npm run type-check   # TypeScript validation
npm test             # Jest unit tests
npm run test:e2e     # Playwright e2e tests
```

### Backend
```bash
uvicorn app.main:app --reload          # Development server
alembic upgrade head                   # Run migrations
alembic revision --autogenerate        # Create migration
pytest                                 # Run tests
pytest --cov=app                       # Coverage report
black app/                             # Format code
flake8 app/                            # Lint code
mypy app/                              # Type check
```

---

## Version Constraints & Compatibility

### Critical Dependencies
- **Python 3.12+** required (backend)
- **Node.js 20+** recommended (frontend)
- **PostgreSQL 13+** recommended
- **Redis 7+** recommended

### Key Version Pins
- FastAPI 0.109.0 (pinned for stability)
- SQLAlchemy 2.0.25 (async support required)
- Pydantic 2.5.3 (breaking changes from v1)
- React 19.2.0 (latest stable)
- Next.js 16.0.7 (latest stable)

---

## Summary

Books4All uses a modern, production-ready stack with:
- **Async-first** backend (FastAPI + AsyncPG + Redis)
- **Type-safe** design (TypeScript + Pydantic)
- **Enterprise security** (JWT, OAuth, bcrypt, CSP headers)
- **Payment integration** (Stripe with webhook deduplication)
- **File storage** (S3/MinIO)
- **Comprehensive testing** (pytest, Jest, Playwright)
- **Development-friendly** (Docker, migrations, type checking)
