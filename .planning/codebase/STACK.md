# Technology Stack - Books4All

## Project Overview
Books4All is a full-stack web application for buying and selling books online with payment processing, user authentication, and content management capabilities.

---

## Backend Stack

### Runtime & Framework
- **Language**: Python 3.12
- **Framework**: FastAPI 0.109.0
- **ASGI Server**: Uvicorn 0.27.0 (with uvloop 0.22.1 for performance)
- **HTTP Client**: httpx 0.26.0, requests 2.32.5

### Database & ORM
- **Primary Database**: PostgreSQL 16 (async driver)
- **Async PostgreSQL Driver**: asyncpg 0.29.0
- **Sync PostgreSQL Driver**: psycopg 3.3.2, psycopg-binary 3.3.2, psycopg2-binary 2.9.9
- **ORM**: SQLAlchemy 2.0.25 (async support)
- **Migrations**: Alembic 1.13.1

### Caching & Message Queue
- **Cache**: Redis 7 (async support)
- **Redis Client**: redis 5.0.1 (with hiredis 3.3.1 for performance)
- **Task Queue**: Celery 5.6.0
- **Message Broker**: AMQP 5.3.1, kombu 5.6.1, billiard 4.2.4, vine 5.1.0

### Authentication & Security
- **JWT**: python-jose 3.3.0
- **Password Hashing**: bcrypt 4.1.2, passlib 1.7.4
- **Cryptography**: cryptography 46.0.3, ecdsa 0.19.1, pyasn1 0.6.1, rsa 4.9.1
- **Email Validation**: email-validator 2.3.0
- **Token Management**: itsdangerous 2.2.0

### Payment Processing
- **Stripe**: stripe 7.11.0 (lazy import pattern)
- **Decimal Math**: Built-in Decimal type for currency calculations

### Object Storage
- **Storage Client**: boto3 1.34.0, botocore 1.34.162, s3transfer 0.9.0
- **MinIO Support**: S3-compatible object storage (development & production)

### Data Validation & Configuration
- **Schema Validation**: Pydantic 2.5.3, pydantic-core 2.14.6
- **Extra Validators**: pydantic-extra-types 2.10.6
- **Settings Management**: pydantic-settings 2.1.0
- **Environment Variables**: python-dotenv 1.2.0
- **Data Structures**: annotated-types 0.7.0

### Serialization
- **JSON (Fast)**: orjson 3.11.5, ujson 5.11.0
- **YAML**: pyyaml 6.0.3
- **Date/Time**: python-dateutil 2.9.0.post0, tzdata 2025.2, tzlocal 5.3.1

### Testing & Code Quality
- **Testing Framework**: pytest 7.4.4, pytest-asyncio 0.23.3, pytest-cov 4.1.0
- **Code Formatting**: black 23.12.1, isort 5.13.2
- **Linting**: flake8 7.0.0, pyflakes 3.2.0, pycodestyle 2.11.1, mccabe 0.7.0
- **Type Checking**: mypy 1.8.0, mypy-extensions 1.1.0
- **Coverage**: coverage 7.13.0
- **Code Analysis**: pluggy 1.6.0

### Utilities & Dependencies
- **HTTP**: h11 0.16.0, httpcore 1.0.9, httptools 0.7.1
- **Async**: anyio 4.12.0, sniffio 1.3.1, exceptiongroup 1.3.1, greenlet 3.0.3
- **CLI**: click 8.3.1, click-didyoumean 0.3.1, click-plugins 1.1.1.2, click-repl 0.3.0
- **Web Templates**: jinja2 3.1.6, markupsafe 3.0.3
- **Database Migrations**: mako 1.3.10
- **Parsing**: pycparser 2.23, cffi 2.0.0
- **Path Management**: pathspec 0.12.1, platformdirs 4.5.1
- **Interactive Console**: prompt-toolkit 3.0.52
- **Text Processing**: charset-normalizer 3.4.6, idna 3.11, urllib3 2.6.3, jmespath 1.1.0
- **File Watching**: watchfiles 1.1.1
- **WebSockets**: websockets 15.0.1 (for real-time features)
- **Config**: packaging 25.0
- **Typing**: typing-extensions 4.15.0

### Development & Testing Tools
- **Test Configuration**: iniconfig 2.3.0
- **Performance**: Six 1.17.0
- **SSL/DNS**: certifi==2025.11.12, dnspython 2.8.0
- **Rich Terminal Output**: wcwidth 0.2.14

### Docker & Deployment
- **Base Image (Python)**: python:3.12-slim
- **Build Tools**: Multi-stage Docker build for optimized images
- **Non-root User**: AppUser (UID 1001) for security

---

## Frontend Stack

### Runtime & Framework
- **Language**: TypeScript 5
- **Node Version**: Node.js 18 (Alpine)
- **Framework**: Next.js 16.0.7 (App Router)
- **React**: React 19.2.0, React DOM 19.2.0

### State Management & Data Fetching
- **State Management**: Zustand 5.0.12 (lightweight store)
- **Data Fetching**: @tanstack/react-query 5.91.3 (server state)
- **HTTP Client**: axios 1.13.6

### UI & Styling
- **CSS Framework**: Tailwind CSS 4
- **Icon Library**: lucide-react 0.577.0
- **Toast Notifications**: sonner 2.0.7
- **PostCSS**: @tailwindcss/postcss 4

### Form Handling & Validation
- **Form Library**: react-hook-form 7.71.2
- **Schema Validation**: zod 4.3.6 (TypeScript-first validation)

### Utilities
- **Date Handling**: date-fns 4.1.0
- **Multi-part Forms**: python-multipart 0.0.6 (backend support)

### Testing & Development
- **Testing Framework**: Jest 30.3.0
- **TypeScript Jest Support**: ts-jest 29.4.6
- **E2E Testing**: @playwright/test 1.58.2
- **Testing Library (React)**: @testing-library/react 16.3.2
- **Testing Library (Jest DOM)**: @testing-library/jest-dom 6.9.1
- **Type Definitions**: @types/jest 30.0.0, @types/react 19, @types/react-dom 19, @types/node 20, @types/testing-library__jest-dom 5.14.9
- **Linting**: ESLint 9, eslint-config-next 16.0.7

### Build Configuration
- **Build Tool**: Next.js built-in bundler (Webpack)
- **TypeScript Config**: tsconfig.json
- **Next.js Config**: next.config.js

### Docker & Deployment
- **Base Image**: node:18-alpine
- **Build Process**: Multi-stage build with npm ci

---

## Infrastructure & Deployment

### Containerization
- **Container Runtime**: Docker
- **Orchestration**: Docker Compose (dev, staging, production configs)
- **Registry**: Docker Hub (implicit)

### Services Architecture

#### Services (Docker Compose)
```
- Backend API (FastAPI + Uvicorn)
- PostgreSQL 16 Database
- Redis 7 Cache & Session Store
- MinIO Object Storage (S3-compatible)
- Frontend (Next.js) - Optional in dev
```

#### Networks & Volumes
- **Network**: books4all-network (bridge driver)
- **Volumes**:
  - postgres_data_dev (database persistence)
  - redis_data_dev (cache persistence)
  - minio_data_dev (object storage persistence)

### Development Environment
- **PostgreSQL Connection**: localhost:5432 (host) / db:5432 (container-to-container)
- **Redis Connection**: localhost:6379 (host) / redis:6379 (container-to-container)
- **MinIO Connection**: localhost:9000 (host) / minio:9000 (container-to-container)
- **MinIO Console**: localhost:9001
- **Backend API**: http://localhost:8000
- **Frontend**: http://localhost:3000 (when enabled)

### Staging & Production Deployment
- **Environment Separation**: Dedicated compose files for each environment
- **Image Building**: Context-based builds from Docker directories
- **Port Mapping**: Service-specific port configurations

---

## Configuration & Environment Management

### Environment Variables (Core)
- **Application**: APP_NAME, APP_VERSION, ENVIRONMENT, DEBUG
- **API**: API_V1_PREFIX
- **Database**: DATABASE_URL, DATABASE_POOL_SIZE, DATABASE_MAX_OVERFLOW, DATABASE_ECHO
- **Redis**: REDIS_URL, REDIS_PASSWORD
- **JWT**: SECRET_KEY (32+ characters), JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, REFRESH_TOKEN_EXPIRE_DAYS
- **Hashing**: BCRYPT_ROUNDS (10-14)
- **CORS**: CORS_ORIGINS, CORS_ALLOW_CREDENTIALS, CORS_ALLOW_METHODS, CORS_ALLOW_HEADERS
- **OAuth (Google)**: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
- **OAuth (GitHub)**: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_REDIRECT_URI
- **Rate Limiting**: RATE_LIMIT_ENABLED, RATE_LIMIT_DEFAULT_CALLS, RATE_LIMIT_DEFAULT_PERIOD, RATE_LIMIT_LOGIN_CALLS, RATE_LIMIT_LOGIN_PERIOD
- **File Upload**: MAX_UPLOAD_SIZE (bytes), ALLOWED_IMAGE_TYPES (MIME types)
- **AWS/S3/MinIO**: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_ENDPOINT_URL, AWS_S3_BUCKET, AWS_S3_USE_SSL
- **Stripe**: STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET
- **Frontend**: NEXT_PUBLIC_API_URL, FRONTEND_URL

### Configuration Files
- Backend: `.env`, `.env.example`
- Frontend: `.env.example`, `.env.local`
- Docker: `docker-compose.dev.yml`, `docker-compose.staging.yml`, `docker-compose.prod.yml`

---

## Key Technical Features

### Backend
- ✅ Async/await throughout (asyncio + asyncpg)
- ✅ Connection pooling (SQLAlchemy pool management)
- ✅ JWT-based authentication with refresh tokens
- ✅ OAuth2 support (Google, GitHub)
- ✅ Rate limiting middleware
- ✅ CORS middleware configuration
- ✅ Exception handling with typed service errors
- ✅ Stripe payment integration with webhooks
- ✅ S3/MinIO file upload support
- ✅ Redis caching layer
- ✅ Celery task queue (optional)
- ✅ Database migrations with Alembic
- ✅ Type checking with Pydantic v2

### Frontend
- ✅ Server-side rendering (Next.js 16 App Router)
- ✅ Client-side state management (Zustand)
- ✅ Server state management (@tanstack/react-query)
- ✅ Form validation with Zod schema
- ✅ Type-safe component development
- ✅ Responsive design with Tailwind CSS
- ✅ E2E testing with Playwright

---

## Version Matrix

| Component | Version | Status |
|-----------|---------|--------|
| Python | 3.12 | ✅ Current |
| Node.js | 18-Alpine | ✅ Active LTS |
| FastAPI | 0.109.0 | ✅ Current |
| Next.js | 16.0.7 | ✅ Latest |
| React | 19.2.0 | ✅ Latest |
| PostgreSQL | 16 | ✅ Current |
| Redis | 7 | ✅ Current |
| Docker | Latest | ✅ Current |

---

## Performance Optimizations

### Backend
- **uvloop**: Drop-in asyncio replacement for ~2-4x performance
- **orjson/ujson**: Ultra-fast JSON serialization
- **Connection Pooling**: SQLAlchemy async pool management
- **Hiredis**: C-based Redis protocol parser
- **Lazy Imports**: Stripe imported on-demand

### Frontend
- **Next.js Optimization**: Built-in code splitting & lazy loading
- **Tailwind CSS v4**: Faster CSS generation
- **React Query**: Intelligent caching & request deduplication
- **Zustand**: Minimal bundle impact (~1KB)

---

## Development & Production Readiness

### Development
- Hot reload enabled (uvicorn --reload)
- Debug mode available
- Local MinIO S3 emulation
- Simplified secrets (.env with defaults)

### Production
- Multi-stage Docker builds (optimized images)
- Non-root user execution
- Environment-specific configurations
- Stripe production keys required
- OAuth production credentials required
- PostgreSQL connection pooling tuned

---
