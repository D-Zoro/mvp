# External Integrations — Books4All

**Last Updated:** 2026-04-18

## Overview

Books4All integrates with multiple external services for payments, authentication, storage, and monitoring. This document details each integration's configuration, endpoints, error handling, and security model.

---

## Payment Processing — Stripe

### Purpose
Handle order payments via Stripe Checkout Sessions, webhook events, and refunds.

### Status
**Required** — Payment functionality disabled if `STRIPE_SECRET_KEY` is not configured.

### Configuration

| Variable | Purpose | Example |
|----------|---------|---------|
| `STRIPE_SECRET_KEY` | API key for server-side operations | `sk_test_...` or `sk_live_...` |
| `STRIPE_PUBLISHABLE_KEY` | Public key (frontend) | `pk_test_...` or `pk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Endpoint secret for signature verification | `whsec_...` |

### Endpoints

#### Create Checkout Session
```
POST /api/v1/payments/checkout/{order_id}
```
- **Auth:** Bearer token required
- **Rate Limit:** 10 calls per 60 seconds
- **Response:** `CheckoutSession` (checkout_url, session_id, order_id)
- **Errors:**
  - 404: Order not found
  - 402: Order not payable or payment error
  - 422: Invalid order status

**Flow:**
1. Fetch order with line items
2. Build Stripe line items (quantity × price_at_purchase)
3. Create Stripe Checkout Session
4. Store session ID and mark order as `PAYMENT_PROCESSING`
5. Return checkout URL for frontend redirect

**Line Item Mapping:**
```python
{
  "price_data": {
    "currency": "usd",
    "product_data": {
      "name": item.book_title,
      "description": f"By {item.book_author}"
    },
    "unit_amount": int(item.price_at_purchase * 100)  # cents
  },
  "quantity": item.quantity
}
```

#### Webhook Handler
```
POST /api/v1/payments/webhook
Header: Stripe-Signature: <signature>
```
- **Auth:** None (signature verification replaces auth)
- **Rate Limit:** Excluded (must not be rate-limited)
- **Content-Type:** `application/json` (raw body)
- **Status:** 200 OK on success

**Events Handled:**
| Event | Action |
|-------|--------|
| `charge.succeeded` | Mark order `PAID`, update payment_intent |
| `charge.failed` | Log failure, optionally mark order as failed |
| `charge.refunded` | Mark order `REFUNDED` |

**Webhook Signature Verification:**
```python
import stripe

payload = request.body()  # Raw bytes (NOT JSON)
sig_header = request.headers.get("Stripe-Signature")
webhook_secret = settings.STRIPE_WEBHOOK_SECRET

try:
    event = stripe.Webhook.construct_event(
        payload, sig_header, webhook_secret
    )
except stripe.error.SignatureVerificationError:
    raise StripeWebhookError("Invalid signature")
```

⚠️ **Critical:** Pass raw `Request.body()`, not parsed JSON. Stripe signature verification depends on exact byte-for-byte match.

### Data Model Integration

**Order Modifications:**
- `stripe_session_id`: Session ID from Checkout
- `stripe_payment_id`: Payment Intent ID (charge.succeeded)
- `payment_intent`: Full payment metadata

**Status Transitions via Webhook:**
```
PENDING
  ↓ (create_checkout)
PAYMENT_PROCESSING
  ↓ (charge.succeeded webhook)
PAID
  ↓ (order fulfilled)
SHIPPED
  ↓ (buyer receives)
DELIVERED
  ↓ (optional refund)
REFUNDED
```

### Error Handling

**Service Exceptions:**
- `PaymentError`: API call failed, order not payable, Stripe misconfiguration
- `RefundError`: Refund API call failed
- `StripeWebhookError`: Signature invalid, event parsing failed
- `OrderNotFoundError`: Order ID doesn't exist

**HTTP Mapping:**
- 402 Payment Required: `PaymentError`, `RefundError`
- 400 Bad Request: `StripeWebhookError`
- 404 Not Found: `OrderNotFoundError`

### Testing

**Stripe Test Keys:**
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
```

**Test Cards:**
- Success: `4242 4242 4242 4242`
- Declined: `4000 0000 0000 0002`
- See: https://stripe.com/docs/testing

### Cost & Quotas

- **Transaction Fees:** 2.9% + $0.30 USD per transaction
- **Rate Limits:** Standard Stripe API limits (100 req/sec per key)
- **Webhook Retry:** Stripe retries failed webhooks for 3 days

### Security

- Keys stored in environment variables (never in code)
- Webhook signature always verified
- Payment Intent ID persisted for reconciliation
- No PII stored locally (Stripe handles card data)

---

## Authentication — OAuth 2.0

### Google OAuth

#### Purpose
Allow users to sign up / login via Google account.

#### Configuration

| Variable | Purpose | Example |
|----------|---------|---------|
| `GOOGLE_CLIENT_ID` | App ID from Google Cloud Console | `123...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | App secret | `GOCSPX-...` |
| `GOOGLE_REDIRECT_URI` | Callback URL | `http://localhost:8000/api/v1/auth/google/callback` |

#### Endpoints

##### Get Google Auth URL
```
GET /api/v1/auth/google
```
- **Auth:** None
- **Response:** `{ "url": "https://accounts.google.com/...", "state": "..." }`

**Flow:**
1. Generate random `state` (32 bytes, URL-safe)
2. Build authorization URL with scopes: `openid email profile`
3. Return URL and state (frontend stores state, redirects user)

##### Google Callback
```
POST /api/v1/auth/google/callback
Body: { "code": "...", "state": "..." }
```
- **Auth:** None
- **Response:** `AuthResponse` (tokens + user info)
- **Errors:**
  - 503 Service Unavailable: Google OAuth not configured
  - 502 Bad Gateway: Token exchange failed
  - 400 Bad Request: Invalid code/state

**Flow:**
1. Exchange authorization code for access token (POST to `https://oauth2.googleapis.com/token`)
2. Fetch user profile (GET to `https://www.googleapis.com/oauth2/v2/userinfo`)
3. Extract: `id`, `email`, `given_name`, `family_name`, `picture`
4. Create or update user with `OAuthProvider.GOOGLE`
5. Issue JWT token pair

#### User Matching

**First-time login:**
1. If no user with provider_id + GOOGLE: create new user (role=BUYER)
2. Link OAuth account to user

**Existing user:**
1. Fetch user by provider_id
2. Return token pair

#### Scopes
- `openid`: ID token
- `email`: Email address
- `profile`: Name, picture

#### Error Handling

**Common Errors:**
- Missing `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` → 503
- Token exchange failed (invalid code) → 502
- Profile fetch failed → 502

---

### GitHub OAuth

#### Purpose
Alternative sign-up / login via GitHub account.

#### Configuration

| Variable | Purpose | Example |
|----------|---------|---------|
| `GITHUB_CLIENT_ID` | App ID from GitHub Settings | `Ov23li...` |
| `GITHUB_CLIENT_SECRET` | App secret | `ghp_...` |
| `GITHUB_REDIRECT_URI` | Callback URL | `http://localhost:8000/api/v1/auth/github/callback` |

#### Endpoints

##### Get GitHub Auth URL
```
GET /api/v1/auth/github
```
- **Auth:** None
- **Response:** `{ "url": "https://github.com/login/oauth/...", "state": "..." }`

##### GitHub Callback
```
POST /api/v1/auth/github/callback
Body: { "code": "...", "state": "..." }
```
- **Auth:** None
- **Response:** `AuthResponse` (tokens + user info)
- **Errors:** Same as Google

#### Scopes
- `user:email`: Read user email

#### User Matching
Same as Google: create or retrieve user by provider_id.

---

## Email Verification & Password Reset

### Overview
JWT-based flows for email verification and password recovery (no external email service yet).

### Email Verification Token
```python
def generate_email_verification_token(email: str) -> str:
    """Generate 24-hour JWT token."""
    payload = {
        "sub": email,
        "type": "email_verification",
        "exp": now + timedelta(hours=24),
        "iat": now
    }
    return jwt.encode(payload, SECRET_KEY, "HS256")
```

**Endpoint:**
```
POST /api/v1/auth/verify-email
Body: { "token": "..." }
```

### Password Reset Token
```python
def generate_password_reset_token(email: str) -> str:
    """Generate 1-hour JWT token."""
    payload = {
        "sub": email,
        "type": "password_reset",
        "exp": now + timedelta(hours=1),
        "iat": now
    }
    return jwt.encode(payload, SECRET_KEY, "HS256")
```

**Endpoints:**
1. Request reset:
```
POST /api/v1/auth/forgot-password
Body: { "email": "..." }
Response: 200 (silent success, no info leakage)
```

2. Confirm reset:
```
POST /api/v1/auth/reset-password
Body: { "token": "...", "new_password": "..." }
Response: UserResponse (updated user)
```

⚠️ **Note:** In production, email delivery should be via external service (SendGrid, AWS SES, etc.).

---

## Object Storage — S3 / MinIO

### Purpose
Store book cover images, user avatars, and file uploads.

### Configuration

| Variable | Purpose | Default |
|----------|---------|---------|
| `AWS_ENDPOINT_URL` | S3 or MinIO endpoint | `http://minio:9000` |
| `AWS_ACCESS_KEY_ID` | Access key | `minioadmin` |
| `AWS_SECRET_ACCESS_KEY` | Secret key | `minioadmin` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `AWS_BUCKET_NAME` | Bucket name | `books4all-uploads` |
| `PUBLIC_STORAGE_URL` | Public URL for clients | `http://localhost:9000` |

### Storage Service

**Class:** `StorageService` (app/services/storage.py)

```python
class StorageService:
    def __init__(self):
        self.s3_client = boto3.client('s3', endpoint_url=AWS_ENDPOINT_URL, ...)
        self.bucket_name = AWS_BUCKET_NAME
        self._ensure_bucket_exists()
    
    async def upload_file(self, file: UploadFile, folder: str = "books") -> str:
        """Upload file and return public URL."""
        # Generate key: books/2026/04/uuid.jpg
        # Upload to S3/MinIO
        # Return: {PUBLIC_STORAGE_URL}/{bucket}/{key}
```

### File Organization

**Key Pattern:** `{folder}/YYYY/MM/{uuid}{ext}`

**Folders:**
- `books/`: Book cover images
- `avatars/`: User profile pictures
- `uploads/`: Generic files

**Example:** `books/2026/04/550e8400-e29b-41d4-a716-446655440000.jpg`

### Upload Endpoint

```
POST /api/v1/upload
Content-Type: multipart/form-data
Body: file (binary), folder (optional)
```
- **Auth:** Bearer token required
- **File Validation:**
  - MIME types: image/jpeg, image/png, image/webp
  - Max size: 5 MB (configurable via `MAX_UPLOAD_SIZE`)
- **Response:** `{ "url": "http://...", "filename": "..." }`

### Development vs. Production

**Development (MinIO):**
- Self-hosted via Docker
- Public read access for local testing
- Bucket created on first access

**Production (AWS S3 / CloudFront):**
- Use AWS S3 buckets
- CloudFront CDN in front
- Bucket policy: restricted read (signed URLs)
- Set `PUBLIC_STORAGE_URL` to CloudFront domain

### Errors

- 413 Payload Too Large: File exceeds `MAX_UPLOAD_SIZE`
- 415 Unsupported Media Type: MIME type not allowed
- 500 Internal Server Error: S3 upload failed (ClientError)

---

## Rate Limiting — Redis

### Purpose
Prevent abuse via request throttling and login brute-force protection.

### Configuration

| Variable | Default | Purpose |
|----------|---------|---------|
| `RATE_LIMIT_ENABLED` | true | Global enable/disable |
| `RATE_LIMIT_DEFAULT_CALLS` | 100 | Default: 100 calls |
| `RATE_LIMIT_DEFAULT_PERIOD` | 60 | Per 60 seconds |
| `RATE_LIMIT_LOGIN_CALLS` | 5 | Login: 5 attempts |
| `RATE_LIMIT_LOGIN_PERIOD` | 900 | Per 15 minutes |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis endpoint |

### Mechanism

**Middleware:** `RateLimitMiddleware` (app/core/rate_limiter.py)

```python
@router.post("/login")
@rate_limit(calls=5, period=900)  # 5 attempts per 15 min
async def login(...):
    ...
```

**Key Format:** `rate_limit:{path}:{client_ip}`

**Behavior:**
1. Increment counter on each request
2. Set expiry to `period` seconds
3. If counter > `calls`: return 429 Too Many Requests
4. Skip rate limiting for `/health`, `/metrics`, `/docs`, `/webhook`

### Excluded Endpoints

- `/health` (health checks)
- `/metrics` (monitoring)
- `/api/v1/docs` (OpenAPI docs)
- `/api/v1/redoc` (ReDoc docs)
- `/api/v1/openapi.json` (spec)
- `/payments/webhook` (Stripe webhooks must not be rate-limited)

### Fallback

If Redis is unavailable, rate limiting is disabled (logged as warning).

---

## Monitoring & Observability

### Health Check
```
GET /health
```
- **Response:** JSON with service status
- **Checks:**
  - Database connectivity (SELECT 1)
  - Redis connectivity (PING)
- **Status:** `healthy` or `degraded`

### Metrics Endpoint
```
GET /metrics
```
- **Format:** Prometheus-compatible text
- **Fallback:** Basic gauge if `prometheus_client` not installed
- **Metrics:**
  - `books4all_up`: App running indicator
  - `books4all_info`: Version and environment

---

## Request/Response Cycle

### Middleware Stack

```
Request
  ↓
CORS Middleware (check origins)
  ↓
Rate Limit Middleware (check calls/period)
  ↓
FastAPI Router (path matching)
  ↓
Dependency Injection (get_db, get_current_user, etc.)
  ↓
Endpoint Handler
  ↓
Service Layer (business logic)
  ↓
Repository Layer (database queries)
  ↓
PostgreSQL / Redis
  ↓
Response (Pydantic schema validation)
  ↓
Exception Handlers (if error)
  ↓
Client
```

### Exception Handling

**Flow:**
1. Service raises typed exception (e.g., `BookNotFoundError`)
2. Global handler catches it
3. Maps to HTTP status via `_SERVICE_EXCEPTION_MAP`
4. Returns JSON: `{ "status_code": 404, "detail": "..." }`

**Mapping:**
```python
_SERVICE_EXCEPTION_MAP: dict[type[ServiceError], int] = {
    EmailAlreadyExistsError:      409,  # Conflict
    InvalidCredentialsError:      401,  # Unauthorized
    InvalidTokenError:            400,  # Bad Request
    BookNotFoundError:            404,  # Not Found
    PaymentError:                 402,  # Payment Required
    InvalidStatusTransitionError: 422,  # Unprocessable Entity
    ...
}
```

### Validation Errors

**Pydantic 422 Response:**
```json
{
  "status_code": 422,
  "detail": [
    {
      "field": "email",
      "message": "Invalid email format",
      "type": "value_error.email"
    }
  ]
}
```

---

## Security Best Practices

### Authentication
- ✓ JWT tokens with 15-min expiry (access), 7-day (refresh)
- ✓ Bcrypt hashing (12 rounds) for passwords
- ✓ OAuth state validation
- ✓ Rate limiting on login (5 attempts per 15 min)
- ✓ Role-based access control (BUYER, SELLER, ADMIN)

### Authorization
- `Depends(require_role(...))` for role-based endpoints
- `Depends(ActiveUser)` for authenticated endpoints
- Silent email enumeration prevention (no "user not found" for password reset)

### Data Protection
- ✓ HTTPS enforced (TLS at Nginx layer)
- ✓ CORS restricted to frontend origin
- ✓ CSP headers prevent XSS
- ✓ No sensitive data in error messages (DEBUG=false)
- ✓ Stripe PCI compliance (no card data stored locally)

### Webhook Security
- ✓ Stripe signature verification (raw bytes)
- ✓ Webhook endpoint excluded from rate limiting
- ✓ Event type validation before processing

### API Security
- ✓ Rate limiting prevents brute force
- ✓ Input validation via Pydantic schemas
- ✓ SQL injection prevented (SQLAlchemy ORM)
- ✓ CSRF tokens (Next.js handles automatically)

---

## External API Quotas & Limits

| Service | Limit | Note |
|---------|-------|------|
| **Stripe** | 100 req/sec per API key | Standard tier |
| **Google OAuth** | Per-project limits | Unlimited for dev |
| **GitHub OAuth** | 60 req/hour (unauthenticated) | Increase to 5000 with auth |
| **Redis** | Connection limits | 10,000+ typical |
| **PostgreSQL** | Connection pool size | Default: 5–20 |
| **S3/MinIO** | Object size | 5 GB max per object |

---

## Integration Dependency Graph

```
Frontend (Next.js)
    ↓
[NEXT_PUBLIC_API_URL]
    ↓
Backend (FastAPI)
    ├─→ PostgreSQL ← [DATABASE_URL]
    ├─→ Redis ← [REDIS_URL]
    ├─→ Stripe ← [STRIPE_SECRET_KEY, WEBHOOK_SECRET]
    ├─→ Google OAuth ← [GOOGLE_CLIENT_ID, CLIENT_SECRET]
    ├─→ GitHub OAuth ← [GITHUB_CLIENT_ID, CLIENT_SECRET]
    └─→ S3/MinIO ← [AWS_ENDPOINT_URL, ACCESS_KEY, SECRET_KEY]

Payment Flow:
    Frontend → [Stripe.js] → Stripe API
                   ↓
            Checkout Session
                   ↓
            Frontend → Backend → [Create checkout]
                                   ↓
                            Backend → Stripe Checkout
                                   ↓
                            User completes payment
                                   ↓
                            Stripe → [Webhook] → Backend
                                   ↓
                            Order marked PAID
                                   ↓
                            PostgreSQL
```

---

## Deployment Checklist

### Stripe
- [ ] Create Stripe account (test/live)
- [ ] Add backend domain to Webhook endpoints
- [ ] Copy `sk_live_...`, `pk_live_...`, `whsec_...` to env
- [ ] Test webhook signature verification
- [ ] Configure webhook events: `charge.succeeded`, `charge.failed`, `charge.refunded`

### OAuth — Google
- [ ] Create OAuth 2.0 app in Google Cloud Console
- [ ] Add authorized redirect URI
- [ ] Copy Client ID / Secret to env
- [ ] Test flow: Google → Callback → Token pair

### OAuth — GitHub
- [ ] Create OAuth app in GitHub Settings
- [ ] Add authorization callback URL
- [ ] Copy Client ID / Secret to env
- [ ] Test flow: GitHub → Callback → Token pair

### S3 / Storage
- [ ] Create S3 bucket (or use MinIO for dev)
- [ ] Set bucket policy (CORS for CloudFront)
- [ ] Set `AWS_ENDPOINT_URL` and credentials
- [ ] Test file upload / retrieve
- [ ] If prod: Configure CloudFront CDN

### Redis
- [ ] Ensure Redis instance is running
- [ ] Test connection via `redis-cli`
- [ ] Set `REDIS_URL` in env
- [ ] Configure persistence (AOF) for production

### Database
- [ ] PostgreSQL running with `books4all` database
- [ ] User permissions configured
- [ ] Backups scheduled
- [ ] Set `DATABASE_URL` (async) and `SYNC_DATABASE_URL` (Alembic)

---

## Troubleshooting

### Stripe Webhook Not Triggering
1. Check webhook endpoint is public and accessible
2. Verify `Stripe-Signature` header is present
3. Ensure `STRIPE_WEBHOOK_SECRET` matches endpoint secret
4. Check logs for `StripeWebhookError`

### OAuth Login Fails
1. Verify Client ID / Secret are correct
2. Confirm redirect URI matches exactly (including protocol)
3. Check httpx client can reach OAuth provider
4. Test with `curl` manually

### File Upload Fails
1. Check `AWS_ENDPOINT_URL` is reachable
2. Verify bucket exists and is accessible
3. Confirm `AWS_ACCESS_KEY_ID` / `SECRET_ACCESS_KEY` are correct
4. Check file MIME type is in `ALLOWED_IMAGE_TYPES`
5. Verify file size < `MAX_UPLOAD_SIZE`

### Rate Limiting Issues
1. Confirm Redis is running: `redis-cli ping`
2. Check `REDIS_URL` is correct
3. Verify `RATE_LIMIT_ENABLED=true`
4. Look for `rate_limit:{path}:{ip}` keys in Redis

---

**Generated:** 2026-04-18 | **Docs Last Updated:** 2026-04-18
