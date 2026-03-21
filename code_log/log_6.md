# Log 6 - Service Layer (Business Logic)

**Date:** March 17, 2026

---

## What I Did

Created the complete service layer in `backend/app/services/` — the business-logic bridge between API endpoints and the repository data layer.

---

### 1. `exceptions.py` — Typed Exception Hierarchy

All service errors are expressed as specific Python exceptions rather than raw HTTP errors:

| Exception | Meaning |
|-----------|---------|
| `EmailAlreadyExistsError` | Registration with taken email |
| `InvalidCredentialsError` | Wrong email/password |
| `InvalidTokenError` | Expired or invalid JWT/special token |
| `AccountInactiveError` | Deactivated account |
| `OAuthNotConfiguredError` | OAuth provider not set up |
| `OAuthError` | OAuth flow failure |
| `BookNotFoundError` | Book doesn't exist |
| `NotBookOwnerError` | User doesn't own the listing |
| `NotSellerError` | Buyer trying seller actions |
| `OrderNotFoundError` | Order doesn't exist |
| `NotOrderOwnerError` | User can't access/modify order |
| `InsufficientStockError` | Not enough stock for order |
| `InvalidStatusTransitionError` | Illegal order status change |
| `PaymentError` | Stripe payment failure |
| `StripeWebhookError` | Webhook signature failure |
| `RefundError` | Refund cannot be processed |

---

### 2. `auth_service.py` — AuthService

**Methods:**
- `register(email, password, ...)` → Creates user, returns `AuthResponse`
- `login(email, password)` → Verifies credentials, returns `AuthResponse`
- `refresh_token(refresh_token)` → Issues new token pair
- `verify_email(token)` → Marks email verified
- `request_password_reset(email)` → Returns reset token (caller sends email)
- `confirm_password_reset(token, new_password)` → Resets password
- `get_google_auth_url()` → Returns `(url, state)` for redirect
- `google_login(code)` → Exchanges Google code for tokens
- `get_github_auth_url()` → Returns `(url, state)` for redirect
- `github_login(code)` → Exchanges GitHub code for tokens

**Security notes:**
- Login returns same error for "not found" and "wrong password" to prevent email enumeration
- OAuth: find-by-provider → find-by-email (link provider) → create new user
- GitHub email fetched from `/user/emails` if not public

---

### 3. `book_service.py` — BookService

**Methods:**
- `create_book(seller, book_data)` → Only sellers/admins; returns `BookResponse`
- `get_book(book_id)` → Returns `BookResponse` with seller nested
- `search_books(query, filters, pagination)` → Returns `BookListResponse`
- `get_seller_books(seller_id, ...)` → Returns `BookListResponse`
- `get_categories()` → Returns `list[str]`
- `update_book(book_id, requestor, updates)` → Ownership check then update
- `publish_book(book_id, requestor)` → DRAFT → ACTIVE transition
- `delete_book(book_id, requestor)` → Soft-delete with ownership check

**Ownership rule:** Only the owning seller OR an admin may update/delete a listing.

---

### 4. `order_service.py` — OrderService

**Methods:**
- `create_order(buyer, order_data)` → Delegates to repo's atomic `create_with_items`
- `get_order(order_id, requestor)` → Access-controlled retrieval
- `get_order_history(buyer, ...)` → Paginated buyer history
- `get_seller_orders(seller_id, ...)` → Paginated seller order view
- `update_order_status(order_id, new_status, requestor)` → Validates transitions
- `cancel_order(order_id, requestor)` → Shortcut to CANCELLED + stock restore

**Status transition table:**
```
PENDING           → PAYMENT_PROCESSING, CANCELLED
PAYMENT_PROCESSING → PAID, CANCELLED
PAID              → SHIPPED, REFUNDED
SHIPPED           → DELIVERED, REFUNDED
DELIVERED         → REFUNDED
CANCELLED         → (terminal)
REFUNDED          → (terminal)
```

**Access control:** Buyers can only cancel their own orders. Sellers can view orders containing their books. Admins have full access.

---

### 5. `payment_service.py` — PaymentService

**Methods:**
- `create_stripe_checkout(order_id, success_url, cancel_url)` → Creates Stripe Checkout Session, returns `CheckoutSession`
- `handle_webhook(payload, stripe_signature)` → Verifies signature, dispatches to handlers
- `refund_payment(order_id, amount, reason)` → Full or partial Stripe refund

**Webhook events handled:**
- `checkout.session.completed` → marks order PAID
- `payment_intent.payment_failed` → resets order to PENDING

**Design decisions:**
- `stripe` imported lazily — app boots without Stripe in dev
- Amounts converted to cents (Stripe requirement)
- `metadata.order_id` on Stripe session for webhook correlation

---

### 6. Updated Files

| File | Action | Description |
|------|--------|-------------|
| `backend/app/services/__init__.py` | Modified | Exports all services + exceptions |
| `backend/app/services/exceptions.py` | Created | Typed exception hierarchy |
| `backend/app/services/auth_service.py` | Created | Auth business logic |
| `backend/app/services/book_service.py` | Created | Book listing business logic |
| `backend/app/services/order_service.py` | Created | Order lifecycle management |
| `backend/app/services/payment_service.py` | Created | Stripe payment integration |
| `backend/app/core/config.py` | Modified | Added Stripe + FRONTEND_URL settings |
| `backend/requirements.txt` | Modified | Added `stripe==7.11.0` |
| `backend/.env.example` | Modified | Added Stripe keys + FRONTEND_URL |

---

## Import Smoke Test (Passed ✅)

```
All services + exceptions imported successfully
  AuthService: <class 'app.services.auth_service.AuthService'>
  BookService:  <class 'app.services.book_service.BookService'>
  OrderService: <class 'app.services.order_service.OrderService'>
  PaymentService: <class 'app.services.payment_service.PaymentService'>
```

---

## What You Should Do (Test & Review)

### 1. Review service files
```bash
ls -la backend/app/services/
cat backend/app/services/auth_service.py | head -80
cat backend/app/services/order_service.py | head -60
```

### 2. Add Stripe keys to your .env (for payment testing)
```bash
# Copy new .env.example additions
cat backend/.env.example | tail -15
```

### 3. Run quick import test
```bash
cd backend
.venv/bin/python -c "from app.services import AuthService, BookService, OrderService, PaymentService; print('OK')"
```

---

## Next Steps (Awaiting Your Instruction)

- **Step 2.7: API Endpoints** — Wire services into FastAPI routers (`/api/v1/auth`, `/api/v1/books`, `/api/v1/orders`, etc.)
- **Step 2.8: Tests** — Unit tests for service layer
- **Frontend** — Build the Next.js UI

---

**Status:** ✅ Complete — Awaiting your review
