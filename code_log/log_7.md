# Log 7 — API Endpoints Layer (Step 2.7)

**Date:** March 18, 2026

---

## What I Did

Created the complete API layer in `backend/app/api/v1/` — wiring all services into FastAPI HTTP routes, adding the v1 router aggregator, and significantly expanding `main.py`.

---

### 1. `endpoints/auth.py` — Authentication Routes

| Method | Path | Auth | Rate Limit |
|--------|------|------|-----------|
| POST | `/api/v1/auth/register` | — | 10/min |
| POST | `/api/v1/auth/login` | — | 5/15min |
| POST | `/api/v1/auth/refresh` | — | 20/min |
| POST | `/api/v1/auth/logout` | Bearer | — |
| GET | `/api/v1/auth/me` | Bearer | — |
| POST | `/api/v1/auth/verify-email` | — | 5/min |
| POST | `/api/v1/auth/forgot-password` | — | 5/5min |
| POST | `/api/v1/auth/reset-password` | — | 5/5min |
| GET | `/api/v1/auth/google` | — | — |
| POST | `/api/v1/auth/google/callback` | — | — |
| GET | `/api/v1/auth/github` | — | — |
| POST | `/api/v1/auth/github/callback` | — | — |

All service exceptions mapped to typed HTTP status codes (409, 401, 400, 403, 503, 502).

---

### 2. `endpoints/books.py` — Book CRUD

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/books` | Optional |
| POST | `/api/v1/books` | Seller/Admin |
| GET | `/api/v1/books/categories` | — |
| GET | `/api/v1/books/my-listings` | Seller/Admin |
| GET/PUT/DELETE | `/api/v1/books/{book_id}` | Optional/Active |
| POST | `/api/v1/books/{book_id}/publish` | Active |

**Key design:** Static paths (`categories`, `my-listings`) are declared **before** `/{book_id}` to prevent routing conflicts.

---

### 3. `endpoints/orders.py` — Order Lifecycle

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/orders` | Active |
| POST | `/api/v1/orders` | Active |
| GET | `/api/v1/orders/{order_id}` | Active |
| POST | `/api/v1/orders/{order_id}/cancel` | Active |

Service exceptions: 404, 403, 409 (stock), 422 (bad status transition).

---

### 4. `endpoints/payments.py` — Stripe Payments

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/v1/payments/checkout/{order_id}` | Active |
| POST | `/api/v1/payments/webhook` | Stripe signature |

**Key design:** Webhook reads raw bytes (`await request.body()`) before any JSON parsing — required for Stripe signature verification. Stripe webhook path is excluded from rate limiting.

---

### 5. `endpoints/reviews.py` — Book Reviews

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/books/{book_id}/reviews` | Optional |
| POST | `/api/v1/books/{book_id}/reviews` | Active |
| GET | `/api/v1/books/{book_id}/reviews/stats` | — |
| PUT | `/api/v1/reviews/{review_id}` | Active |
| DELETE | `/api/v1/reviews/{review_id}` | Active |

Uses `ReviewRepository` directly (no separate service). Duplicate review prevention via `has_reviewed()`. Verified purchase badge set automatically.

---

### 6. `api/v1/router.py` — Router Aggregator

```
api_router
├── /auth/*         → auth_router       (tag: Authentication)
├── /books/*        → books_router      (tag: Books)
├── /books/*/reviews → reviews_router   (tag: Reviews)
├── /orders/*       → orders_router     (tag: Orders)
└── /payments/*     → payments_router   (tag: Payments)
```

---

### 7. `main.py` — Expanded Application

From 38-line skeleton → full production-grade app:

- **OpenAPI metadata:** title, description (markdown), contact, license, docs/redoc/openapi URLs
- **Middleware:** CORS (full settings control) + `RateLimitMiddleware` (excludes health/docs/webhook)
- **Lifespan startup:** DB pool warmup probe + Redis ping
- **Lifespan shutdown:** Redis connection closed gracefully
- **Exception handlers:**
  - `RequestValidationError` → 422 with field-level JSON errors
  - `HTTPException` → standardised JSON body
  - `ServiceError` → mapped to typed HTTP codes via lookup table
  - `Exception` → 500 (detail hidden in production, shown in DEBUG mode)
- **`GET /health`** — live ping of DB + Redis, returns per-service status
- **`GET /metrics`** — Prometheus exposition (graceful stub if `prometheus_client` missing)

---

### 8. Updated Files

| File | Action | Description |
|------|--------|-------------|
| `endpoints/auth.py` | Created | 12 auth routes |
| `endpoints/books.py` | Created | 8 book routes |
| `endpoints/orders.py` | Created | 4 order routes |
| `endpoints/payments.py` | Created | 2 payment routes |
| `endpoints/reviews.py` | Created | 5 review routes |
| `endpoints/__init__.py` | Modified | Exports all 5 routers |
| `api/v1/router.py` | Created | Aggregator with OpenAPI tags |
| `api/v1/__init__.py` | Modified | Exports `api_router` |
| `app/main.py` | Rewritten | Full production-grade app |

---

## Verification Results ✅

### Import smoke test
```
from app.main import app  → OK
```

### All 38 routes registered
```
['GET']         /
['POST']        /api/v1/auth/register
['POST']        /api/v1/auth/login
['POST']        /api/v1/auth/refresh
['POST']        /api/v1/auth/logout
['GET']         /api/v1/auth/me
['POST']        /api/v1/auth/verify-email
['POST']        /api/v1/auth/forgot-password
['POST']        /api/v1/auth/reset-password
['GET']         /api/v1/auth/google
['POST']        /api/v1/auth/google/callback
['GET']         /api/v1/auth/github
['POST']        /api/v1/auth/github/callback
['GET','POST']  /api/v1/books
['GET']         /api/v1/books/categories
['GET']         /api/v1/books/my-listings
['DELETE','GET','PUT'] /api/v1/books/{book_id}
['POST']        /api/v1/books/{book_id}/publish
['GET','POST']  /api/v1/books/{book_id}/reviews
['GET']         /api/v1/books/{book_id}/reviews/stats
['DELETE','PUT'] /api/v1/reviews/{review_id}
['GET','POST']  /api/v1/orders
['GET']         /api/v1/orders/{order_id}
['POST']        /api/v1/orders/{order_id}/cancel
['POST']        /api/v1/payments/checkout/{order_id}
['POST']        /api/v1/payments/webhook
['GET']         /health
['GET']         /metrics
+ OpenAPI docs (/api/v1/docs, /api/v1/redoc, /api/v1/openapi.json)
```

### Existing DB tests — all pass
```
5 passed, 4 warnings in 0.97s
```

---

## What You Should Do (Test & Review)

### 1. Start the dev server
```bash
cd backend
.venv/bin/uvicorn app.main:app --reload --port 8000
```

### 2. Open Swagger UI
```
http://localhost:8000/api/v1/docs
```
You should see 5 tag groups: Authentication, Books, Reviews, Orders, Payments.

### 3. Test register → login → me
```bash
# Register
curl -s -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234","role":"buyer"}' | python3 -m json.tool

# Login
curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234"}' | python3 -m json.tool
```

### 4. Check health
```bash
curl http://localhost:8000/health
```

---

## Next Steps (Awaiting Your Instruction)

- **Step 2.8: Tests** — Unit and integration tests for the API layer
- **Frontend** — Build the Next.js UI

---

**Status:** ✅ Complete — Awaiting your review
