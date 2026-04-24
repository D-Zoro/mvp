# Books4All External Integrations & Services

## Overview
Books4All integrates with multiple external services and APIs for payments, authentication, file storage, and notifications.

---

## Payment Processing

### Stripe
**Purpose**: Payment processing, checkout, and refund management  
**Type**: Third-party SaaS API  
**Configuration**:
- `STRIPE_SECRET_KEY` - API secret key (sk_...)
- `STRIPE_PUBLISHABLE_KEY` - Frontend public key (pk_...)
- `STRIPE_WEBHOOK_SECRET` - Webhook signing secret (whsec_...)

**Integration Points**:
- **PaymentService** (`app/services/payment_service.py`) - Core integration layer
- Lazy import pattern (app starts even if Stripe unavailable in dev)
- Checkout session creation for orders
- Webhook event handling with Redis deduplication
- Refund processing with partial/full support

**Supported Events**:
- `checkout.session.completed` - Order marked PAID
- `payment_intent.payment_failed` - Order reset to PENDING

**Features**:
- Webhook deduplication using Redis (24-hour TTL)
- Metadata inclusion with order IDs
- Success/cancel URL configuration
- Line items built from order data
- Stripe error handling with typed exceptions

**Frontend Integration**:
- `NEXT_PUBLIC_STRIPE_KEY` - Publishable key exposed to frontend
- Redirect to Stripe Checkout session
- Success/cancel page routing
- Session ID tracking

---

## Authentication Providers

### Google OAuth 2.0
**Purpose**: Social authentication via Google  
**Type**: OAuth 2.0 Identity Provider  
**Configuration**:
- `GOOGLE_CLIENT_ID` - OAuth client identifier
- `GOOGLE_CLIENT_SECRET` - OAuth client secret
- `GOOGLE_REDIRECT_URI` - Callback URL (default: http://localhost:8000/api/v1/auth/google/callback)

**Integration Points**:
- `app/services/auth_service.py` - OAuth flow handling
- User creation/linking on first login
- Email-based user lookup
- Token exchange and verification

**Features**:
- Optional (checked via `google_oauth_enabled` property)
- Automatic user account creation
- Email verification bypass for OAuth users

### GitHub OAuth 2.0
**Purpose**: Social authentication via GitHub  
**Type**: OAuth 2.0 Identity Provider  
**Configuration**:
- `GITHUB_CLIENT_ID` - OAuth client identifier
- `GITHUB_CLIENT_SECRET` - OAuth client secret
- `GITHUB_REDIRECT_URI` - Callback URL (default: http://localhost:8000/api/v1/auth/github/callback)

**Integration Points**:
- `app/services/auth_service.py` - OAuth flow handling
- User creation/linking on first login
- GitHub username mapping to user profile
- Token exchange and verification

**Features**:
- Optional (checked via `github_oauth_enabled` property)
- Automatic user account creation
- GitHub profile data integration

---

## Data Storage

### PostgreSQL
**Purpose**: Primary relational database  
**Type**: SQL Database  
**Connection**:
- URL Pattern: `postgresql+asyncpg://user:password@host:port/database`
- Async Driver: AsyncPG (native async Python driver)
- Default Port: 5432

**Configuration**:
- `DATABASE_URL` - Full connection string (required)
- `DATABASE_POOL_SIZE` - Connection pool size (default: 5, range: 1-20)
- `DATABASE_MAX_OVERFLOW` - Overflow connections (default: 10, range: 0-50)
- `DATABASE_ECHO` - SQL query logging (default: false)

**Tables & Models**:
- `users` - User accounts, OAuth linking, authentication
- `books` - Book listings with inventory
- `orders` - Order management with status tracking
- `order_items` - Order line items
- `reviews` - Verified-purchase book reviews
- `messages` - Peer-to-peer messaging

**ORM & Migrations**:
- **SQLAlchemy 2.0** - ORM and query builder
- **Alembic 1.13.1** - Schema migrations
- Async session management via `async_session_maker`
- Connection pool pre-ping for health checks

**Performance Features**:
- Async connection pooling
- Connection reuse optimization
- Query echo for debugging (conditional)
- Health check at startup via `init_database()`

### Redis
**Purpose**: Caching, sessions, rate limiting, webhook deduplication  
**Type**: In-Memory Key-Value Store  
**Connection**:
- URL Pattern: `redis://[password@]host:port/database`
- Default: `redis://localhost:6379/0`
- Async Library: `redis[hiredis]==5.0.1`

**Configuration**:
- `REDIS_URL` - Connection string (default: redis://localhost:6379/0)
- `REDIS_PASSWORD` - Optional authentication

**Use Cases**:
- **Rate Limiting**: Request counting per client
  - Key pattern: `rate_limit:{ip_or_user}:{endpoint}`
  - TTL: Per second/minute configured
- **Webhook Deduplication**: Stripe event caching
  - Key pattern: `webhook_event:{event_id}`
  - TTL: 24 hours (86400 seconds)
- **Session Management**: JWT refresh tokens
  - Token blacklisting capability
  - Configurable expiration

**Features**:
- HiredIS C parser for optimized protocol parsing
- Async/await support
- Connection pooling
- Graceful fallback if unavailable (rate limiting disabled)

---

## File Storage

### AWS S3 / MinIO
**Purpose**: Image and file upload storage  
**Type**: Object Storage (S3-compatible)  
**Integration**: Boto3 SDK

**Configuration**:
- `AWS_ENDPOINT_URL` - S3 or MinIO endpoint
  - Production: AWS S3 (https://s3.amazonaws.com)
  - Development: MinIO (http://minio:9000)
- `AWS_ACCESS_KEY_ID` - Access credentials
- `AWS_SECRET_ACCESS_KEY` - Secret credentials
- `AWS_REGION` - AWS region (default: us-east-1)
- `AWS_BUCKET_NAME` - Storage bucket (default: books4all-uploads)
- `PUBLIC_STORAGE_URL` - Public CDN/URL for served files

**Integration Points**:
- `app/services/storage.py` - S3 operations
- Book cover image uploads
- User profile images
- File validation and organization

**Storage Structure**:
- Bucket: `books4all-uploads`
- Path pattern: `{folder}/YYYY/MM/{uuid}.{ext}`
  - Example: `books/2024/04/abc123def.jpg`
- Automatic bucket creation in development

**Features**:
- Auto bucket initialization
- Public read policy in development
- Content-type preservation
- Unique filename generation with UUID
- Date-based folder organization
- URL construction (MinIO dev vs S3 production)

**Production Considerations**:
- CloudFront CDN recommended for S3
- Configure CORS policies
- Access key rotation
- Bucket lifecycle policies (retention)
- Server-side encryption

---

## Email & Communications

### Email Validation
**Service**: Built-in email-validator  
**Purpose**: Email format validation  
**Library**: `email-validator>=2.3.0`

**Configuration**:
- Used during user registration
- Validates deliverability (DNS lookup)
- Normalizes email addresses
- Configuration in user schema validation

**Integration Points**:
- User registration endpoint
- Email uniqueness constraint
- OAuth provider email mapping

### Notifications (Future)
**Placeholder for**:
- Order confirmation emails
- Payment receipts
- Review notifications
- Message alerts
- Seller notifications

**Recommended Services**:
- SendGrid
- AWS SES
- Mailgun
- Twilio SendGrid

---

## Monitoring & Observability

### Prometheus Metrics
**Purpose**: Application metrics and monitoring  
**Type**: Metrics endpoint  
**Endpoint**: `/metrics`  
**Format**: Prometheus plain-text format

**Configuration**:
- Optional: `prometheus_client` library
- Graceful fallback to stub metrics if not installed
- Health check aggregation with services status

**Metrics Exposed**:
- `books4all_up` - Application health gauge
- `books4all_info` - Version and environment info
- Request/response metrics (if prometheus_client installed)

### Health Check
**Endpoint**: `/health`  
**Services Checked**:
- Database connectivity (SELECT 1 query)
- Redis connectivity (PING command)
- Overall system status (healthy/degraded)

**Response Format**:
```json
{
  "status": "healthy|degraded",
  "version": "1.0.0",
  "environment": "development|production",
  "timestamp": 1234567890.123,
  "services": {
    "database": "ok|error: ...",
    "redis": "ok|error: ..."
  }
}
```

---

## Third-Party API Clients

### HTTP Requests
**Library**: `httpx==0.26.0` (async HTTP client)

**Use Cases**:
- OAuth token exchange
- External API calls
- Webhook dispatching (future)
- User data enrichment

### Type Safety
**Validation**: Pydantic models for all external API responses
- Request schema validation
- Response schema validation
- Type hints for IDE support

---

## Frontend Integrations

### API Communication
**Backend URL**: `NEXT_PUBLIC_API_URL`
- Development: `http://localhost:8000`
- Production: Environment-specific

**HTTP Client**: Axios  
**Libraries**:
- TanStack React Query - Server state sync
- Custom axios instance with auth headers
- JWT token refresh on 401

### Payment Frontend
**Stripe Integration**:
- `NEXT_PUBLIC_STRIPE_KEY` - Public key
- Stripe.js library (loaded from CDN)
- Checkout session redirect flow

### Authentication
**Flow**:
1. Login/register with email+password or OAuth
2. Receive JWT access token + refresh token
3. Store in secure HTTP-only cookie or localStorage
4. Include in Authorization header for API calls
5. Refresh token on access token expiration

---

## Data Flow Diagrams

### Payment Flow
```
Frontend (Stripe Checkout)
    ↓
PaymentService.create_stripe_checkout()
    ↓ (API call)
Stripe API
    ↓ (creates session)
Frontend redirected to checkout.stripe.com
    ↓ (user enters payment info)
Stripe webhook → /payments/webhook
    ↓
PaymentService.handle_webhook()
    ↓ (verify signature, deduplicate)
Redis (cache event)
    ↓
OrderRepository.mark_paid()
    ↓
PostgreSQL (update order status)
```

### Authentication Flow
```
User enters credentials/clicks OAuth button
    ↓
Frontend → POST /api/v1/auth/login or /auth/{provider}/authorize
    ↓
AuthService (validate credentials OR OAuth token exchange)
    ↓
External OAuth provider (if social login)
    ↓
JWT token generation
    ↓
Return to frontend with access + refresh tokens
    ↓
Store in HTTP-only cookies or localStorage
    ↓
Include Authorization header in subsequent requests
    ↓
RateLimitMiddleware checks against Redis
    ↓
Route handler processes request
```

### File Upload Flow
```
Frontend (form upload)
    ↓
BookService.create_book() with file
    ↓
StorageService.upload_file()
    ↓
Boto3 S3 client
    ↓
MinIO (dev) or AWS S3 (prod)
    ↓
Return public URL
    ↓
Store URL in PostgreSQL (books table)
    ↓
Return book response to frontend
```

---

## Environment-Specific Configurations

### Development
- **Database**: Local PostgreSQL or Docker container
- **Redis**: Local Redis or Docker container
- **Storage**: MinIO (S3-compatible local server)
- **Stripe**: Test mode (sk_test_...)
- **OAuth**: Optional, sandbox/test credentials
- **Frontend URL**: http://localhost:3000
- **Backend URL**: http://localhost:8000

### Production
- **Database**: Managed PostgreSQL (RDS, CloudSQL, etc.)
- **Redis**: Managed cache (ElastiCache, Azure Cache, etc.)
- **Storage**: AWS S3 with CloudFront CDN
- **Stripe**: Live mode (sk_live_...)
- **OAuth**: Production credentials
- **Frontend URL**: https://books4all.example.com
- **Backend URL**: https://api.books4all.example.com
- **Security**: 
  - SSL/TLS certificates
  - Firewalls and security groups
  - VPC isolation
  - Secret rotation policies

---

## Security Considerations

### API Security
- **CORS**: Configurable origins, methods, headers
- **Rate Limiting**: Per-IP and per-user limits
- **HTTPS**: Required in production
- **CSP Headers**: Content Security Policy configured
- **HSTS**: Recommended for production

### Data Protection
- **Password Hashing**: Bcrypt (12 rounds)
- **JWT Signing**: HS256 with secret key
- **SSL/TLS**: Required for production databases and cache
- **Webhook Signature Verification**: Stripe signature validation
- **Input Validation**: Pydantic schema validation at boundaries

### Credential Management
- **Environment Variables**: All secrets via .env (not committed)
- **Secret Rotation**: Keys should be rotated regularly
- **Principle of Least Privilege**: Limited service IAM roles
- **Audit Logging**: Log security events (failed auth, refunds, etc.)

---

## Dependency Security

### Regular Updates
- **Python**: Patch version updates recommended (3.12.x)
- **FastAPI**: Monthly security patches
- **Stripe SDK**: Monthly updates for new API features
- **Dependency scanning**: Use tools like:
  - `pip-audit` for Python
  - `npm audit` for JavaScript
  - Dependabot for GitHub

### Known Issues & CVEs
- Monitor security advisories for:
  - FastAPI/Starlette vulnerabilities
  - PostgreSQL driver vulnerabilities
  - Stripe SDK issues
  - OAuth library updates

---

## Integration Testing & Development

### Local Development Setup
```bash
# Backend
docker-compose up postgres redis minio  # External services
python -m pytest                        # Run tests
uvicorn app.main:app --reload         # Start server

# Frontend
npm install
npm run dev
```

### Testing Integrations
- **Stripe**: Use test API keys and test event fixtures
- **OAuth**: Use sandbox/development credentials
- **S3/MinIO**: Local MinIO container
- **Email**: Use test email addresses or MailHog

### Mock Services (for unit tests)
- Mock Stripe API calls with `unittest.mock`
- Mock OAuth responses
- Mock S3 with `moto` library
- Mock Redis with `fakeredis` library

---

## Summary

Books4All integrates with:
- **Stripe** for payment processing and webhooks
- **Google & GitHub OAuth** for social authentication
- **PostgreSQL** for data persistence
- **Redis** for caching and rate limiting
- **S3/MinIO** for file storage
- **Email Validator** for input validation

All integrations follow these principles:
- Async-first design
- Type-safe schemas (Pydantic)
- Lazy imports for optional services
- Graceful degradation on failures
- Redis deduplication for idempotency
- Comprehensive error handling
