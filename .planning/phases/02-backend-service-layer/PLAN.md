---
phase: 02
phase_name: Backend Service Layer
requirements_addressed: [SVCL-01, SVCL-02, SVCL-03, SVCL-04, SVCL-05]
total_waves: 5
total_tasks: 16
estimated_hours: 18-24
depends_on: 01-critical-fixes
phase_1_verified: true
status: ready-for-execution
---

# Phase 2: Backend Service Layer — Execution Plan

**Goal:** Audit and fix all service layer business logic (auth, books, orders, payments), verify Phase 1 integrations, and ensure proper exception handling across all services.

**Success:** All 5 SVCL requirements verified or fixed, all Phase 1 integrations working, full test coverage, zero breaking changes.

---

## Wave 1: UserService Verification (SVCL-01)

### Task 1-1: Verify JWT Integration with Phase 1 Secret Rotation
**UUID:** 2-1-1-user-jwt-verification
**Wave:** 1
**Depends on:** None
**Autonomous:** Yes
**Estimated time:** 45 min

<read_first>
- backend/app/services/auth_service.py (full file)
- backend/app/core/security.py (token creation/verification)
- backend/app/core/keys.py (Phase 1 key versioning — if exists)
- backend/app/api/v1/endpoints/auth.py (login endpoint)
- backend/tests/integration/test_auth_api.py (token creation tests)
</read_first>

<action>
Verify that token creation in UserService uses the new key versioning from Phase 1:

1. Read auth_service.py — locate `create_token_pair()` or token creation call
2. Verify security.py contains `get_active_key()` function (Phase 1 CRIT-03 implementation)
3. Confirm token payload includes `key_version` claim (should be integer field)
4. Trace: login() → create_token_pair() → get_active_key() → returns versioned key
5. Write integration test: Create token, decode it, verify `key_version` field exists and is integer
6. Run test and confirm passes
</action>

<acceptance_criteria>
- [ ] Token creation in auth_service.py calls `create_token_pair()` or equivalent (grep for function name)
- [ ] `create_token_pair()` calls `get_active_key()` from security.py (grep for "get_active_key")
- [ ] Token payload when decoded contains `key_version` field with integer value (test output shows this)
- [ ] No direct reference to `settings.SECRET_KEY` in token creation (should use get_active_key)
- [ ] Integration test creates token, decodes it, field exists: test passes
</acceptance_criteria>

**Files modified:** 
- backend/tests/integration/test_auth_api.py (add token version check if missing)

---

### Task 1-2: Verify Login Flow with Email Enumeration Protection
**UUID:** 2-1-2-user-login-verification
**Wave:** 1
**Depends on:** Task 1-1
**Autonomous:** Yes
**Estimated time:** 30 min

<read_first>
- backend/app/services/auth_service.py (login method — full implementation)
- backend/app/core/security.py (verify_password function)
- backend/tests/unit/test_auth_service.py (login tests if exist)
- backend/tests/integration/test_auth_api.py (login endpoint tests)
</read_first>

<action>
Verify login flow implements email enumeration protection:

1. Read auth_service.py login() method — should check: email exists AND password correct
2. Verify error message is SAME for both "email not found" and "wrong password" cases
3. Check that account active status is verified (is_active == True)
4. Verify password comparison uses bcrypt via verify_password()
5. Test: Try login with non-existent email → should get generic error
6. Test: Try login with wrong password → should get same generic error
7. Confirm both cases return 401 Unauthorized (not 404 for missing, 401 for wrong password)
</action>

<acceptance_criteria>
- [ ] login() method returns same error message for "email not found" AND "wrong password" (grep shows single error string used for both)
- [ ] Error message does not leak which field failed (contains "Invalid email or password" or similar generic text)
- [ ] verify_password() is called to check password hash (grep for "verify_password")
- [ ] Account active check: `if not user.is_active: raise AccountInactiveError` (grep for "is_active")
- [ ] Integration tests pass: wrong email returns 401, wrong password returns 401 (same status code)
</acceptance_criteria>

**Files modified:**
- None (verification only)

---

### Task 1-3: Verify Signup Flow and Role Defaults
**UUID:** 2-1-3-user-signup-verification
**Wave:** 1
**Depends on:** Task 1-1
**Autonomous:** Yes
**Estimated time:** 30 min

<read_first>
- backend/app/services/auth_service.py (register method — full implementation)
- backend/app/repositories/user_repository.py (create_with_password method)
- backend/tests/integration/test_auth_api.py (signup tests)
- backend/app/models/user.py (User model — role field default)
</read_first>

<action>
Verify signup flow prevents unauthorized role escalation:

1. Read register() method — should check for duplicate email BEFORE creating
2. Verify duplicate email raises EmailAlreadyExistsError (409 Conflict)
3. Confirm role defaults to BUYER (never ADMIN or SELLER without explicit assignment)
4. Verify password is hashed by repository using bcrypt 4.1.2
5. Check transaction boundaries: create, then commit
6. Test: Signup with BUYER role → should work
7. Test: Signup with ADMIN role → should either default to BUYER or reject with 403
8. Test: Duplicate email → should return 409 Conflict
</action>

<acceptance_criteria>
- [ ] register() method calls `email_exists()` BEFORE attempting create (grep order of operations)
- [ ] Duplicate email raises EmailAlreadyExistsError (grep for exception type)
- [ ] Default role is BUYER when not specified: `role=UserRole.BUYER` or similar (grep for role assignment)
- [ ] Password hashing uses bcrypt: repository calls `hash_password()` (grep for hash_password call)
- [ ] Integration test: signup with duplicate email returns 409 Conflict
- [ ] Integration test: new user created with BUYER role confirmed
</acceptance_criteria>

**Files modified:**
- None (verification only)

---

### Task 1-4: Verify Password Reset Flow
**UUID:** 2-1-4-user-password-reset-verification
**Wave:** 1
**Depends on:** Task 1-1
**Autonomous:** Yes
**Estimated time:** 30 min

<read_first>
- backend/app/services/auth_service.py (request_password_reset and confirm_password_reset methods)
- backend/app/core/security.py (generate_password_reset_token and verify_password_reset_token functions)
- backend/tests/integration/test_auth_api.py (password reset tests if exist)
</read_first>

<action>
Verify password reset implements email enumeration protection and secure token handling:

1. Read request_password_reset() — should return None (silent) if email not found
2. Verify confirmation doesn't leak whether email exists (generic "invalid token" error)
3. Check token expiration: should have time limit (typically 1 hour)
4. Verify confirm_password_reset() updates password hash via bcrypt
5. Test: Request reset with invalid email → should return silent success (no error)
6. Test: Try to reset with expired token → should return 400 Bad Request
7. Test: Reset with valid token → password should update and old password should not work
</action>

<acceptance_criteria>
- [ ] request_password_reset() returns None/silent success for non-existent email (grep for return value with email_exists check)
- [ ] confirm_password_reset() raises generic InvalidTokenError (not "user not found") — same error for expired/invalid/missing
- [ ] Token verification includes expiration check: `verify_password_reset_token()` checks time (grep for expiration logic)
- [ ] Password update calls hash_password() via repository: `update_password()` hashes input
- [ ] Integration test: valid reset → can login with new password, old password rejected
</acceptance_criteria>

**Files modified:**
- None (verification only)

---

### Task 1-5: Verify RBAC and Role-Based Access
**UUID:** 2-1-5-user-rbac-verification
**Wave:** 1
**Depends on:** Task 1-3
**Autonomous:** Yes
**Estimated time:** 30 min

<read_first>
- backend/app/core/dependencies.py (require_role function)
- backend/app/api/v1/endpoints/auth.py (endpoint access controls)
- backend/app/services/auth_service.py (all methods checking role)
- backend/app/models/user.py (UserRole enum — values)
- backend/tests/integration/test_auth_api.py (RBAC tests)
</read_first>

<action>
Verify role-based access controls are correctly enforced:

1. Read dependencies.py — locate `require_role()` function
2. Verify UserRole enum has: BUYER, SELLER, ADMIN (grep for enum values)
3. Confirm email verification accessible to any authenticated user
4. Confirm password reset accessible to unauthenticated users
5. Confirm signup accessible to anyone (no auth required)
6. Verify buyer-only endpoints check role == BUYER (or multiple acceptable roles)
7. Verify seller-only endpoints check role in (SELLER, ADMIN)
8. Verify admin-only endpoints check role == ADMIN
9. Test: Buyer accessing seller endpoint → should get 403 Forbidden
10. Test: Admin accessing buyer endpoint → should succeed (admins can do anything)
</action>

<acceptance_criteria>
- [ ] UserRole enum contains exactly: BUYER, SELLER, ADMIN (grep for enum definition)
- [ ] require_role() function exists in dependencies.py (grep for "def require_role")
- [ ] Seller-only endpoints use: `Depends(require_role(UserRole.SELLER, UserRole.ADMIN))` or similar
- [ ] Integration test: BUYER accessing SELLER endpoint returns 403 Forbidden
- [ ] Integration test: ADMIN accessing BUYER endpoint returns 200 OK
- [ ] Integration test: Unauthenticated user accessing protected endpoint returns 401 Unauthorized
</acceptance_criteria>

**Files modified:**
- backend/tests/integration/test_auth_api.py (add RBAC tests if missing)

---

### Task 1-6: Verify Rate Limiting on Auth Endpoints (Phase 1 CRIT-04)
**UUID:** 2-1-6-user-rate-limiting-verification
**Wave:** 1
**Depends on:** Task 1-2
**Autonomous:** Yes
**Estimated time:** 30 min

<read_first>
- backend/app/api/v1/endpoints/auth.py (all auth endpoint signatures)
- backend/app/core/dependencies.py (require_rate_limit function)
- backend/tests/integration/test_auth_api.py (rate limiting tests)
- backend/app/main.py (rate limit middleware confirmation)
</read_first>

<action>
Verify rate limiting is applied to auth endpoints per Phase 1 CRIT-04:

1. Read auth.py endpoints: login, signup, reset_password
2. Verify each endpoint has rate limit dependency: `Depends(require_rate_limit(...))`
3. Confirm rate limits are:
   - POST /login: 5 calls per 900 seconds (15 minutes)
   - POST /signup: 3 calls per 3600 seconds (1 hour)
   - POST /reset-password: 3 calls per 3600 seconds (1 hour)
4. Test: Make 5 login attempts → all succeed
5. Test: Make 6th login attempt → should get 429 Too Many Requests
6. Test: Check Retry-After header present in 429 response
7. Verify rate limiting is per IP address (not global)
</action>

<acceptance_criteria>
- [ ] POST /auth/login includes rate limit dependency: `Depends(require_rate_limit(...))` (grep for endpoint signature)
- [ ] POST /auth/signup includes rate limit dependency
- [ ] POST /auth/reset-password includes rate limit dependency
- [ ] Integration test: 5 login requests from same IP → all 200, 6th returns 429
- [ ] 429 response includes Retry-After header with retry delay (test verifies header present)
- [ ] Rate limiting is per-IP: different IPs have separate limits (if testable)
</acceptance_criteria>

**Files modified:**
- None (verification only, tests already exist from Phase 1)

---

## Wave 2: BookService Verification (SVCL-02)

### Task 2-1: Verify Book Creation and Ownership
**UUID:** 2-2-1-book-create-verification
**Wave:** 2
**Depends on:** Wave 1
**Autonomous:** Yes
**Estimated time:** 30 min

<read_first>
- backend/app/services/book_service.py (create_book method)
- backend/app/repositories/book_repository.py (create_for_seller method)
- backend/app/models/book.py (Book model — seller_id field)
- backend/tests/integration/test_books_api.py (create tests)
</read_first>

<action>
Verify book creation enforces seller ownership and role checks:

1. Read create_book() method — should verify requestor is SELLER or ADMIN
2. Confirm seller_id is bound to requestor.id (cannot create for another seller)
3. Verify NotSellerError raised if non-seller attempts to create
4. Check transaction boundaries: create, then commit
5. Test: BUYER attempting to create book → should get 403 Forbidden (NotSellerError)
6. Test: SELLER creating book → should succeed with seller_id bound to creator
7. Test: SELLER cannot pass seller_id in request (should be bound server-side)
</action>

<acceptance_criteria>
- [ ] create_book() checks `seller.role in (UserRole.SELLER, UserRole.ADMIN)` (grep for role check)
- [ ] Raises NotSellerError if non-seller (grep for exception type)
- [ ] create_for_seller() call includes seller.id as parameter: `create_for_seller(seller.id, ...)`
- [ ] Integration test: BUYER creating book returns 403 Forbidden
- [ ] Integration test: SELLER creating book succeeds with seller_id == creator.id
- [ ] No way for seller to override seller_id in request (endpoint doesn't accept seller_id param)
</acceptance_criteria>

**Files modified:**
- None (verification only)

---

### Task 2-2: Verify Book Search and Pagination
**UUID:** 2-2-2-book-search-pagination-verification
**Wave:** 2
**Depends on:** Wave 1
**Autonomous:** Yes
**Estimated time:** 45 min

<read_first>
- backend/app/services/book_service.py (search_books method)
- backend/app/repositories/book_repository.py (search method, search_count method)
- backend/tests/integration/test_books_api.py (search and pagination tests)
- backend/app/schemas/book.py (BookListResponse — pagination fields)
</read_first>

<action>
Verify search implements correct pagination and filtering:

1. Read search_books() — should accept: query, category, condition, min_price, max_price, seller_id, status, page, page_size, sort_by, sort_order
2. Verify page_size is capped at 100: `page_size = min(page_size, 100)`
3. Confirm skip/limit calculation: `skip = (page - 1) * page_size`
4. Verify soft-delete filtering: only active books returned (deleted_at IS NULL)
5. Verify BookStatus.ACTIVE is default status filter
6. Check that repository.search_count() is called (not len(items))
7. Test: Search with page_size=200 → should cap at 100 items returned
8. Test: Page 2 with page_size=50 → should skip 50 items (offset correct)
9. Test: Total count matches DB count (search_count() call verified)
10. Test: Deleted books excluded from search results
</action>

<acceptance_criteria>
- [ ] search_books() signature includes all filter parameters (grep for function signature)
- [ ] Page size capped: `page_size = min(page_size, 100)` (grep for min() call)
- [ ] Skip/limit calculated: `skip = (page - 1) * page_size` (grep for skip calculation)
- [ ] search() and search_count() called on repository (grep for both calls)
- [ ] Deleted books excluded: repository query includes `deleted_at IS NULL` check (grep for deleted_at filter)
- [ ] Integration test: page_size=200 request returns max 100 items
- [ ] Integration test: page=2 with page_size=50 skips first 50 items correctly
- [ ] Integration test: deleted book not in search results
</acceptance_criteria>

**Files modified:**
- None (verification only)

---

### Task 2-3: Verify Book Update and Soft Delete
**UUID:** 2-2-3-book-update-delete-verification
**Wave:** 2
**Depends on:** Task 2-1
**Autonomous:** Yes
**Estimated time:** 30 min

<read_first>
- backend/app/services/book_service.py (update_book method, delete_book method, _assert_ownership helper)
- backend/app/repositories/book_repository.py (delete method)
- backend/app/models/book.py (Book model — deleted_at field, soft delete mechanics)
- backend/tests/integration/test_books_api.py (update and delete tests)
</read_first>

<action>
Verify book updates and deletes enforce ownership and use soft delete:

1. Read update_book() — should verify ownership via _assert_ownership()
2. Verify _assert_ownership() raises NotBookOwnerError if not seller or admin
3. Confirm partial updates via `exclude_unset=True` (only changed fields)
4. Verify delete_book() sets deleted_at timestamp (soft delete, not hard delete)
5. Verify deletion enforces ownership
6. Test: SELLER1 updating SELLER2's book → should get 403 Forbidden
7. Test: SELLER updating own book → should succeed
8. Test: Deleted book not findable by ID (should return 404)
9. Test: Deleted book not in search results
</action>

<acceptance_criteria>
- [ ] update_book() calls _assert_ownership() (grep for method call)
- [ ] _assert_ownership() raises NotBookOwnerError for unauthorized users (grep for exception)
- [ ] Partial updates use `exclude_unset=True` (grep for Pydantic model_dump call)
- [ ] delete_book() calls repository.delete() which sets deleted_at (grep for deleted_at assignment)
- [ ] Integration test: non-owner updating book returns 403 Forbidden
- [ ] Integration test: owner updating book succeeds with only specified fields changed
- [ ] Integration test: deleted book returns 404 when fetched by ID
- [ ] Integration test: deleted book excluded from search results
</acceptance_criteria>

**Files modified:**
- None (verification only)

---

### Task 2-4: Verify Book Status Transitions
**UUID:** 2-2-4-book-status-verification
**Wave:** 2
**Depends on:** Task 2-3
**Autonomous:** Yes
**Estimated time:** 30 min

<read_first>
- backend/app/services/book_service.py (publish_book method, any status transition logic)
- backend/app/models/book.py (BookStatus enum, status field)
- backend/tests/integration/test_books_api.py (status transition tests)
</read_first>

<action>
Verify book status transitions are valid and controlled:

1. Read publish_book() — should transition DRAFT → ACTIVE only
2. Verify no backward transitions allowed (ACTIVE → DRAFT not possible)
3. Check ownership enforced on publish
4. Verify BookStatus enum has correct values (check for ACTIVE, DRAFT, SOLD_OUT, INACTIVE)
5. Test: Publishing draft book → should succeed
6. Test: Publishing already-published book → should either succeed (idempotent) or fail gracefully
7. Test: Non-owner publishing book → should get 403 Forbidden
</action>

<acceptance_criteria>
- [ ] publish_book() only allows DRAFT → ACTIVE transition (grep for status assignment, no other transitions in code)
- [ ] Ownership verified before publish (grep for _assert_ownership call)
- [ ] BookStatus enum contains: ACTIVE, DRAFT, SOLD_OUT, INACTIVE (grep for enum definition)
- [ ] Integration test: publishing draft book succeeds
- [ ] Integration test: non-owner publishing book returns 403 Forbidden
- [ ] Integration test: publishing active book either succeeds (idempotent) or fails with clear error
</acceptance_criteria>

**Files modified:**
- None (verification only)

---

## Wave 3: OrderService Verification & Priority Fix (SVCL-03)

### Task 3-1: FIX - Seller Order Pagination Bug (PRIORITY 1)
**UUID:** 2-3-1-order-seller-pagination-fix
**Wave:** 3
**Depends on:** Wave 1
**Autonomous:** Yes
**Estimated time:** 30 min
**PRIORITY:** HIGH

<read_first>
- backend/app/services/order_service.py (get_seller_orders method — FULL METHOD)
- backend/app/repositories/order_repository.py (entire file — find count_orders_for_seller or similar)
- backend/tests/integration/test_orders_api.py (seller orders pagination tests if exist)
</read_first>

<action>
Fix the pagination bug in seller orders list (Phase 2 RESEARCH finding):

**Bug:** `get_seller_orders()` uses `len(items)` for total count instead of DB count query.
**Impact:** Pagination breaks on page 2+ (total_count wrong, pagination links incorrect).
**Fix:** Replace `len(items)` with proper `count_orders_for_seller()` call.

Steps:
1. Read get_seller_orders() method completely
2. Locate line that calculates total: should currently be `len(items)` (wrong)
3. Check if repository has `count_orders_for_seller(seller_id, status=None)` method
4. If method exists: replace `len(items)` with `await self.order_repo.count_orders_for_seller(...)`
5. If method does NOT exist: implement it in order_repository.py
6. Implement in repository: COUNT query filtering by seller (via book.seller_id in order items)
7. Test: Get seller's orders page 1 (page_size=10) → verify total matches DB count, not item count
8. Test: Get seller's orders page 2 → verify correct items returned (skipped 10 from page 1)
</action>

<acceptance_criteria>
- [ ] get_seller_orders() in order_service.py does NOT use `len(items)` for total (grep shows it's removed)
- [ ] count_orders_for_seller() method exists in OrderRepository (grep for method name)
- [ ] Service calls: `total = await self.order_repo.count_orders_for_seller(seller_id, status=status)` (grep for call)
- [ ] Repository query uses SQL COUNT(*) (not Python len())
- [ ] Integration test: page 1 total count matches DB actual count
- [ ] Integration test: page 2 returns different orders (correct skip)
- [ ] Integration test: pagination across pages works correctly (no duplicates, no gaps)
</acceptance_criteria>

**Files modified:**
- backend/app/services/order_service.py (replace len(items) with count call)
- backend/app/repositories/order_repository.py (implement count_orders_for_seller if missing)

---

### Task 3-2: Verify Order Creation with Phase 1 Race Condition Fix
**UUID:** 2-3-2-order-create-race-condition-verification
**Wave:** 3
**Depends on:** Wave 1
**Autonomous:** Yes
**Estimated time:** 45 min

<read_first>
- backend/app/services/order_service.py (create_order method)
- backend/app/repositories/order_repository.py (create_with_items method — FULL METHOD including book locking)
- backend/app/models/book.py (Book model — quantity field, CHECK constraint)
- backend/tests/integration/test_orders_api.py (concurrent order tests if exist)
</read_first>

<action>
Verify Phase 1 CRIT-01 fix (race condition) is correctly integrated:

1. Read create_with_items() in repository — should use `with_for_update()` on book SELECT
2. Confirm line contains: `.with_for_update()` after book query (row-level lock)
3. Verify stock check happens AFTER lock is acquired (check quantity < requested)
4. Confirm quantity is deducted inside locked transaction
5. Verify service layer catches IntegrityError and maps to InsufficientStockError
6. Test: 5 concurrent orders on 2-qty book
   - Some should succeed (201), others should fail (409 Conflict)
   - Should NOT oversell (verify book quantity never goes negative)
7. Verify CHECK constraint exists on books table: `(quantity >= 0)`
</action>

<acceptance_criteria>
- [ ] Book SELECT in create_with_items includes `.with_for_update()` (grep for "with_for_update")
- [ ] Stock check: `if book.quantity < item.quantity: raise ValueError` (grep for quantity check)
- [ ] Quantity deduction: `book.quantity -= item.quantity` (grep for assignment)
- [ ] Service catches IntegrityError: `except IntegrityError ... raise InsufficientStockError` (grep for exception handling)
- [ ] CHECK constraint on Book.quantity: `CONSTRAINT ... CHECK (quantity >= 0)` (grep in migration or model)
- [ ] Concurrent test creates 5 tasks ordering same book with qty=1 each (qty available=2)
- [ ] Concurrent test results: 2 succeed (201), 3 fail (409)
- [ ] Book quantity never negative after concurrent orders
</acceptance_criteria>

**Files modified:**
- backend/tests/integration/test_orders_api.py (add concurrent order test if missing)

---

### Task 3-3: Verify Order State Machine
**UUID:** 2-3-3-order-state-machine-verification
**Wave:** 3
**Depends on:** Task 3-2
**Autonomous:** Yes
**Estimated time:** 45 min

<read_first>
- backend/app/services/order_service.py (_ALLOWED_TRANSITIONS dict, _assert_valid_transition method, update_order_status method)
- backend/app/models/order.py (OrderStatus enum)
- backend/tests/integration/test_orders_api.py (state transition tests)
</read_first>

<action>
Verify order state machine enforces all valid transitions and prevents invalid ones:

1. Read _ALLOWED_TRANSITIONS dictionary — should map each status to allowed next statuses
2. Verify transitions match spec:
   - PENDING → {PAYMENT_PROCESSING, CANCELLED}
   - PAYMENT_PROCESSING → {PAID, CANCELLED}
   - PAID → {SHIPPED, REFUNDED}
   - SHIPPED → {DELIVERED, REFUNDED}
   - DELIVERED → {REFUNDED}
   - CANCELLED → {} (terminal)
   - REFUNDED → {} (terminal)
3. Verify _assert_valid_transition() raises InvalidStatusTransitionError for invalid transitions
4. Check OrderStatus enum has all these values
5. Test: PENDING → PAYMENT_PROCESSING (valid) → should succeed
6. Test: PENDING → SHIPPED (invalid) → should fail with 422
7. Test: CANCELLED → PAID (invalid, terminal) → should fail with 422
8. Test: DELIVERED → CANCELLED (invalid, terminal) → should fail with 422
</action>

<acceptance_criteria>
- [ ] _ALLOWED_TRANSITIONS dictionary exists and maps all statuses (grep for dictionary definition)
- [ ] PENDING transitions include PAYMENT_PROCESSING and CANCELLED (grep for values)
- [ ] CANCELLED and REFUNDED have empty transition sets: `set()` (grep for terminal states)
- [ ] _assert_valid_transition() checks: `if new_status not in ALLOWED_TRANSITIONS[current_status]: raise InvalidStatusTransitionError`
- [ ] OrderStatus enum contains: PENDING, PAYMENT_PROCESSING, PAID, SHIPPED, DELIVERED, CANCELLED, REFUNDED
- [ ] Integration test: valid transition succeeds (PENDING → PAYMENT_PROCESSING)
- [ ] Integration test: invalid transition fails with 422 (PENDING → SHIPPED)
- [ ] Integration test: terminal state transition fails (CANCELLED → PAID returns 422)
</acceptance_criteria>

**Files modified:**
- None (verification only)

---

### Task 3-4: Verify Order Authorization
**UUID:** 2-3-4-order-authorization-verification
**Wave:** 3
**Depends on:** Task 3-3
**Autonomous:** Yes
**Estimated time:** 30 min

<read_first>
- backend/app/services/order_service.py (_assert_can_view method, get_order method)
- backend/app/models/order.py (Order model — buyer_id, items relationship)
- backend/tests/integration/test_orders_api.py (authorization tests)
</read_first>

<action>
Verify order visibility is correctly restricted by role and ownership:

1. Read _assert_can_view() method — should handle: buyer, seller, admin
2. Verify buyers can only view their own orders (buyer_id == requestor.id)
3. Verify sellers can view orders containing their books (check items[].book.seller_id)
4. Verify admins can view any order (role == ADMIN)
5. Verify NotOrderOwnerError raised for unauthorized access
6. Test: BUYER1 viewing BUYER2's order → should fail with 403
7. Test: BUYER viewing own order → should succeed
8. Test: SELLER1 viewing order with SELLER1's books → should succeed
9. Test: SELLER2 viewing order with SELLER1's books → should fail with 403
10. Test: ADMIN viewing any order → should succeed
</action>

<acceptance_criteria>
- [ ] _assert_can_view() method exists and takes (order, requestor) params (grep for method)
- [ ] Admin check: `if requestor.role == UserRole.ADMIN: return` (grep for admin bypass)
- [ ] Buyer check: `if order.buyer_id == requestor.id: return` (grep for buyer ownership)
- [ ] Seller check: `for item in order.items: if item.book.seller_id == requestor.id: return` (grep for seller iteration)
- [ ] Raises NotOrderOwnerError if none match (grep for exception)
- [ ] Integration test: unauthorized buyer viewing order returns 403 Forbidden
- [ ] Integration test: authorized seller viewing order with their books returns 200 OK
- [ ] Integration test: admin viewing any order returns 200 OK
</acceptance_criteria>

**Files modified:**
- None (verification only)

---

## Wave 4: PaymentService Verification (SVCL-04)

### Task 4-1: Verify Stripe Webhook Deduplication (Phase 1 CRIT-02)
**UUID:** 2-4-1-payment-webhook-dedup-verification
**Wave:** 4
**Depends on:** Wave 1
**Autonomous:** Yes
**Estimated time:** 45 min

<read_first>
- backend/app/services/payment_service.py (_check_webhook_dedup, _cache_webhook_result, handle_webhook methods)
- backend/app/core/config.py (STRIPE_WEBHOOK_SECRET configuration)
- backend/tests/integration/test_payments_api.py (webhook dedup tests if exist)
</read_first>

<action>
Verify Phase 1 CRIT-02 webhook deduplication is correctly implemented:

1. Read handle_webhook() — should call _check_webhook_dedup() BEFORE processing
2. Verify webhook signature validation: `stripe.Webhook.construct_event(payload, stripe_signature, webhook_secret)`
3. Confirm StripeWebhookError raised on signature failure
4. Read _check_webhook_dedup() — should check Redis cache with key format `webhook_event:{event_id}`
5. Read _cache_webhook_result() — should store result in Redis with 24-hour TTL (86400 seconds)
6. Verify duplicate webhook returns cached result without reprocessing
7. Test: Send webhook → processes and returns 200
8. Test: Send same webhook again (same event_id) → returns cached result without reprocessing
9. Test: Different webhook (different event_id) → processes normally
10. Test: Invalid signature → returns 400 Bad Request
</action>

<acceptance_criteria>
- [ ] _check_webhook_dedup() method exists in payment_service.py (grep for method)
- [ ] _cache_webhook_result() method exists (grep for method)
- [ ] Redis key format: `webhook_event:{event_id}` (grep for key pattern)
- [ ] TTL is 86400 seconds (24 hours): `await redis.setex(key, 86400, ...)` (grep for setex call with 86400)
- [ ] handle_webhook() calls _check_webhook_dedup() first: `cached = await self._check_webhook_dedup(event_id)` (grep for call order)
- [ ] If cached, returns early without reprocessing (grep for return statement)
- [ ] Stripe signature verified: `stripe.Webhook.construct_event(...)` (grep for construct_event)
- [ ] Integration test: duplicate webhook returns same result as first
- [ ] Integration test: invalid signature returns 400 Bad Request
</acceptance_criteria>

**Files modified:**
- backend/tests/integration/test_payments_api.py (add webhook dedup test if missing)

---

### Task 4-2: Verify Stripe Checkout Session Creation
**UUID:** 2-4-2-payment-checkout-verification
**Wave:** 4
**Depends on:** Wave 1
**Autonomous:** Yes
**Estimated time:** 45 min

<read_first>
- backend/app/services/payment_service.py (create_stripe_checkout method)
- backend/app/schemas/payment.py (CheckoutSession schema)
- backend/tests/integration/test_payments_api.py (checkout tests)
</read_first>

<action>
Verify Stripe checkout session creation is correct and secure:

1. Read create_stripe_checkout() — should validate order state before creating session
2. Verify order status check: only PENDING or PAYMENT_PROCESSING allowed
3. Verify line items correctly formatted: name, description, price_in_cents, quantity
4. Confirm price conversion: decimal → cents (multiply by 100): `int(item.price * 100)`
5. Verify order_id passed as metadata
6. Check order status updated to PAYMENT_PROCESSING after session creation
7. Verify session ID and payment ID persisted to order
8. Test: Create checkout for PENDING order → succeeds, returns session URL
9. Test: Create checkout for PAID order → should fail (invalid state)
10. Test: Line items correctly formatted in Stripe request (price in cents)
</action>

<acceptance_criteria>
- [ ] Order state validation: `if order.status not in (OrderStatus.PENDING, OrderStatus.PAYMENT_PROCESSING)` (grep for status check)
- [ ] Raises PaymentError if invalid state (grep for exception)
- [ ] Line items iterate: `for item in order.items` (grep for loop)
- [ ] Price conversion: `int(item.price_at_purchase * 100)` or similar (grep for cents conversion)
- [ ] Metadata includes order_id: `metadata={"order_id": str(order_id)}` (grep for metadata)
- [ ] Session stored: `await order_repo.set_payment_id(..., stripe_session_id=session.id)` (grep for storage)
- [ ] Order status updated: `await order_repo.update_status(..., OrderStatus.PAYMENT_PROCESSING)` (grep for status update)
- [ ] Integration test: PENDING order checkout succeeds
- [ ] Integration test: PAID order checkout fails with 402 Payment Required
- [ ] Integration test: returned session includes checkout_url
</acceptance_criteria>

**Files modified:**
- None (verification only)

---

### Task 4-3: Verify Webhook Event Handlers
**UUID:** 2-4-3-payment-webhook-handlers-verification
**Wave:** 4
**Depends on:** Task 4-1
**Autonomous:** Yes
**Estimated time:** 45 min

<read_first>
- backend/app/services/payment_service.py (handle_webhook, _handle_checkout_completed, _handle_payment_failed methods)
- backend/tests/integration/test_payments_api.py (webhook event handler tests)
</read_first>

<action>
Verify webhook event handlers correctly process Stripe events:

1. Read handle_webhook() — should route to appropriate handler based on event_type
2. Verify event types handled: "checkout.session.completed", "payment_intent.payment_failed"
3. Read _handle_checkout_completed() — should find order, verify payment_id matches, update status to PAID
4. Read _handle_payment_failed() — should find order, update status appropriately (stay in PAYMENT_PROCESSING or mark failed)
5. Verify order lookup uses stripe_payment_id or stripe_session_id from metadata
6. Test: checkout.session.completed event → order status changes to PAID
7. Test: payment_intent.payment_failed event → order marked with appropriate failure status
8. Test: Unknown event type → logged but doesn't crash (graceful handling)
</action>

<acceptance_criteria>
- [ ] handle_webhook() checks event_type: `if event_type == "checkout.session.completed"` (grep for event_type checks)
- [ ] Routes to handlers: _handle_checkout_completed, _handle_payment_failed (grep for method calls)
- [ ] _handle_checkout_completed updates order: `order.status = OrderStatus.PAID` (grep for status assignment)
- [ ] _handle_payment_failed handles failure scenario (grep for method)
- [ ] Unknown event type logged but doesn't raise: `logger.debug(...)` (grep for graceful handling)
- [ ] Integration test: webhook "checkout.session.completed" → order status == PAID
- [ ] Integration test: webhook "payment_intent.payment_failed" → order status indicates failure
- [ ] Integration test: unknown event type doesn't crash (returns 200)
</acceptance_criteria>

**Files modified:**
- None (verification only)

---

### Task 4-4: Verify Refund Logic
**UUID:** 2-4-4-payment-refund-verification
**Wave:** 4
**Depends on:** Task 4-2
**Autonomous:** Yes
**Estimated time:** 60 min

<read_first>
- backend/app/services/payment_service.py (refund_order method, full implementation)
- backend/app/services/order_service.py (refund-related updates if any)
- backend/tests/integration/test_payments_api.py (refund tests if exist)
- backend/app/repositories/order_repository.py (order refund handling)
</read_first>

<action>
Verify refund logic is implemented correctly (full vs. partial refunds):

1. Read refund_order() method completely (if exists, or note if missing)
2. Verify order state validation: only PAID, SHIPPED, DELIVERED can be refunded
3. Confirm refund amount calculation (full or partial)
4. Verify Stripe refund API called: `stripe.Refund.create(charge_id, amount=...)`
5. Check RefundError exception handling
6. Verify order status updated to REFUNDED after successful refund
7. Verify quantities restored to books after refund (items made available again)
8. Test: Refund PAID order (full) → Stripe called, order marked REFUNDED
9. Test: Refund DELIVERED order (full) → succeeds (allowed transition)
10. Test: Refund PENDING order → should fail (invalid state)
11. Test: Partial refund (if supported) → correct amount charged back
</action>

<acceptance_criteria>
- [ ] refund_order() method exists in payment_service.py (grep for method name)
- [ ] State validation: `if order.status not in (OrderStatus.PAID, OrderStatus.SHIPPED, OrderStatus.DELIVERED)` (grep for status check)
- [ ] Raises RefundError if invalid state (grep for exception)
- [ ] Stripe refund called: `stripe.Refund.create(...)` (grep for API call)
- [ ] Order marked REFUNDED: `order.status = OrderStatus.REFUNDED` (grep for status update)
- [ ] Book quantities restored: `book.quantity += item.quantity` (grep for restoration)
- [ ] Integration test: full refund on PAID order succeeds
- [ ] Integration test: refund updates order status to REFUNDED
- [ ] Integration test: refund on PENDING order fails with 402 Payment Required
- [ ] Integration test: book quantities increase after refund
</acceptance_criteria>

**Files modified:**
- None (verification only — refund logic may already exist)

---

## Wave 5: Exception Handling & Final Verification (SVCL-05 + Integration)

### Task 5-1: Verify All Services Use Typed Exceptions
**UUID:** 2-5-1-exception-typing-verification
**Wave:** 5
**Depends on:** Waves 1-4
**Autonomous:** Yes
**Estimated time:** 45 min

<read_first>
- backend/app/services/exceptions.py (full file — all exception definitions)
- backend/app/services/auth_service.py (exception usage)
- backend/app/services/book_service.py (exception usage)
- backend/app/services/order_service.py (exception usage)
- backend/app/services/payment_service.py (exception usage)
- backend/app/main.py (exception handler map, lines 54-72)
</read_first>

<action>
Verify all services raise only typed exceptions (no generic ValueError, RuntimeError, etc.):

1. Read exceptions.py — list all 14+ exception types (should inherit from ServiceError)
2. Grep each service file for `raise` statements:
   - auth_service.py — should use: EmailAlreadyExistsError, InvalidCredentialsError, InvalidTokenError, AccountInactiveError, OAuthError, OAuthNotConfiguredError
   - book_service.py — should use: BookNotFoundError, NotSellerError, NotBookOwnerError
   - order_service.py — should use: OrderNotFoundError, InsufficientStockError, InvalidStatusTransitionError, OrderNotCancellableError, NotOrderOwnerError
   - payment_service.py — should use: PaymentError, StripeWebhookError, RefundError
3. Verify NO bare `raise ValueError(...)` or `raise RuntimeError(...)` in service layer
4. Verify exception handler in main.py maps all exceptions to HTTP status codes
5. Test: Each exception type returns correct HTTP status (grep from _SERVICE_EXCEPTION_MAP)
</action>

<acceptance_criteria>
- [ ] exceptions.py defines at least 14 exception types (grep for class definitions)
- [ ] All exceptions inherit from ServiceError (grep for `class ... (ServiceError)`)
- [ ] auth_service.py uses only typed exceptions: grep shows NO bare ValueError/RuntimeError
- [ ] book_service.py uses only typed exceptions: grep shows NO bare ValueError/RuntimeError
- [ ] order_service.py uses only typed exceptions: grep shows NO bare ValueError/RuntimeError
- [ ] payment_service.py uses only typed exceptions: grep shows NO bare ValueError/RuntimeError
- [ ] main.py _SERVICE_EXCEPTION_MAP includes all exceptions (grep for all 14+ mappings)
- [ ] Each exception maps to correct HTTP status: 401 for auth errors, 403 for forbidden, 404 for not found, 409 for conflicts, 422 for validation, 402 for payments
</acceptance_criteria>

**Files modified:**
- None (verification only, but fix any found violations)

---

### Task 5-2: Verify HTTP Status Mappings Are Correct
**UUID:** 2-5-2-http-status-mapping-verification
**Wave:** 5
**Depends on:** Task 5-1
**Autonomous:** Yes
**Estimated time:** 30 min

<read_first>
- backend/app/main.py (exception handler, _SERVICE_EXCEPTION_MAP, lines 54-72)
- backend/app/services/exceptions.py (exception definitions with docstring comments about expected status)
</read_first>

<action>
Verify all exception types map to correct HTTP status codes per RESTful conventions:

1. Read _SERVICE_EXCEPTION_MAP — should have 14+ entries
2. Verify mappings:
   - EmailAlreadyExistsError → 409 Conflict ✓
   - InvalidCredentialsError → 401 Unauthorized ✓
   - InvalidTokenError → 400 Bad Request ✓
   - AccountInactiveError → 403 Forbidden ✓
   - OAuthNotConfiguredError → 503 Service Unavailable ✓
   - OAuthError → 502 Bad Gateway ✓
   - BookNotFoundError → 404 Not Found ✓
   - NotBookOwnerError → 403 Forbidden ✓
   - NotSellerError → 403 Forbidden ✓
   - OrderNotFoundError → 404 Not Found ✓
   - NotOrderOwnerError → 403 Forbidden ✓
   - InsufficientStockError → 409 Conflict ✓
   - OrderNotCancellableError → 422 Unprocessable Entity ✓
   - InvalidStatusTransitionError → 422 Unprocessable Entity ✓
   - PaymentError → 402 Payment Required ✓
   - StripeWebhookError → 400 Bad Request ✓
   - RefundError → 402 Payment Required ✓
3. Test: Each exception type returns correct status code
</action>

<acceptance_criteria>
- [ ] _SERVICE_EXCEPTION_MAP has exactly 17 entries (or verify count matches exception.py)
- [ ] EmailAlreadyExistsError maps to 409 (grep for HTTP_409_CONFLICT)
- [ ] InvalidCredentialsError maps to 401 (grep for HTTP_401_UNAUTHORIZED)
- [ ] BookNotFoundError maps to 404 (grep for HTTP_404_NOT_FOUND)
- [ ] InsufficientStockError maps to 409 (grep for HTTP_409_CONFLICT)
- [ ] InvalidStatusTransitionError maps to 422 (grep for HTTP_422_UNPROCESSABLE_ENTITY)
- [ ] PaymentError maps to 402 (grep for HTTP_402_PAYMENT_REQUIRED)
- [ ] Integration tests verify: each exception returns correct status code in response
</acceptance_criteria>

**Files modified:**
- None (verification only)

---

### Task 5-3: Verify Error Messages Don't Leak Sensitive Information
**UUID:** 2-5-3-error-information-leak-verification
**Wave:** 5
**Depends on:** Task 5-1
**Autonomous:** Yes
**Estimated time:** 30 min

<read_first>
- backend/app/main.py (error response formatting)
- backend/app/services/ (all exception raising — check messages)
- backend/tests/integration/ (check for tests that verify generic error messages)
</read_first>

<action>
Verify error messages don't reveal sensitive information:

1. Check error messages for email enumeration leaks:
   - login() should NOT say "email not found" vs "wrong password"
   - password_reset() should NOT say whether email exists
2. Check authorization error messages — should not reveal which resource exists
3. Verify no database details in error messages (table names, column names, SQL)
4. Verify no file paths or internal structure exposed
5. Test: Attempt login with non-existent email → generic message (not "email not found")
6. Test: Attempt login with wrong password → same generic message
7. Test: Attempt to access unauthorized resource → generic "not found" or "forbidden" (not details)
</action>

<acceptance_criteria>
- [ ] login error message is generic: contains "Invalid email or password" or similar (grep for message string)
- [ ] Does NOT say "email not found" OR "password incorrect" separately
- [ ] password_reset request returns same response for both valid and invalid emails (silent success)
- [ ] Authorization errors generic: "You do not have permission" or similar (grep for error messages)
- [ ] No SQL/database details in error messages (grep for column names, table names in exception messages)
- [ ] No file paths or stack traces in error responses
- [ ] Integration tests confirm: non-existent email and wrong password return same status (grep for test assertions)
</acceptance_criteria>

**Files modified:**
- None (verification only)

---

### Task 5-4: Run Full Test Suite and Verify Coverage
**UUID:** 2-5-4-full-test-suite-execution
**Wave:** 5
**Depends on:** All previous tasks
**Autonomous:** Yes
**Estimated time:** 60 min

<read_first>
- backend/pyproject.toml (test configuration, pytest settings)
- backend/tests/ (all test files)
- backend/conftest.py (test fixtures and setup)
</read_first>

<action>
Run full test suite and verify coverage meets standards:

1. Run all unit tests: `pytest tests/unit/ -q` → should all pass
2. Run all DB tests: `pytest tests/DB/ -q` → should all pass
3. Run all integration tests: `pytest tests/integration/ -q` → should all pass
4. Run with coverage: `pytest tests/unit/ tests/DB/ --cov=app --cov-report=term-missing` → coverage ≥ 75%
5. Verify coverage by module:
   - auth_service.py ≥ 75%
   - book_service.py ≥ 75%
   - order_service.py ≥ 75%
   - payment_service.py ≥ 75%
6. Check for any test failures or skipped tests (should be 0)
7. Verify no deprecation warnings (should be clean)
</action>

<acceptance_criteria>
- [ ] All unit tests pass: `pytest tests/unit/ -q` returns exit code 0 with all passed
- [ ] All DB tests pass: `pytest tests/DB/ -q` returns exit code 0 with all passed
- [ ] All integration tests pass: `pytest tests/integration/ -q` returns exit code 0 with all passed
- [ ] Overall coverage ≥ 75%: `--cov-report=term-missing` shows total ≥ 75%
- [ ] Service coverage:
  - auth_service.py ≥ 75% (grep coverage report)
  - book_service.py ≥ 75%
  - order_service.py ≥ 75%
  - payment_service.py ≥ 75%
- [ ] No skipped tests (all relevant tests run)
- [ ] No deprecation warnings (clean test output)
</acceptance_criteria>

**Files modified:**
- backend/tests/ (add tests as needed to reach coverage targets)

---

### Task 5-5: Code Quality Checks (Black, isort, flake8, mypy)
**UUID:** 2-5-5-code-quality-checks
**Wave:** 5
**Depends on:** All previous tasks
**Autonomous:** Yes
**Estimated time:** 30 min

<read_first>
- backend/app/services/ (all service files)
- backend/app/core/ (core files modified)
- backend/pyproject.toml (tool configurations)
</read_first>

<action>
Run code quality checks and ensure all pass:

1. Format check: `black app/ --check` → should pass (no reformatting needed)
2. Import sort check: `isort app/ --check-only` → should pass
3. Lint check: `flake8 app/` → should pass (no violations)
4. Type check: `mypy app/ --strict` (or configured strictness) → should pass (or pass with acceptable score)
5. If any checks fail, fix:
   - Black: auto-format with `black app/`
   - isort: auto-sort with `isort app/`
   - flake8: fix manually (read output)
   - mypy: fix type hints as needed
</action>

<acceptance_criteria>
- [ ] Black check passes: `black app/ --check` returns exit code 0 (no output)
- [ ] isort check passes: `isort app/ --check-only` returns exit code 0 (no output)
- [ ] flake8 check passes: `flake8 app/` returns no violations (exit code 0)
- [ ] mypy check passes: `mypy app/` returns acceptable result (per project config)
- [ ] All service files follow 88-char line length (Black default)
- [ ] All imports sorted (stdlib, third-party, local)
- [ ] No unused imports
- [ ] All functions have type hints (no `Any` in public APIs)
</acceptance_criteria>

**Files modified:**
- backend/app/services/*.py (format/lint fixes as needed)

---

### Task 5-6: Phase 1 Integration Verification (Complete Checklist)
**UUID:** 2-5-6-phase1-integration-final-check
**Wave:** 5
**Depends on:** All previous tasks
**Autonomous:** Yes
**Estimated time:** 30 min

<read_first>
- .planning/phases/01-critical-fixes/01-VERIFICATION.md (Phase 1 verification proof)
- backend/tests/integration/ (all integration tests including Phase 1)
</read_first>

<action>
Verify all Phase 1 fixes are still working correctly after Phase 2 changes:

1. CRIT-01 (Race condition): Run concurrent order test → 2 succeed, 3 fail on 2-qty book
   `pytest tests/integration/test_orders_api.py::test_order_concurrent_creation -v`
2. CRIT-02 (Webhook dedup): Run webhook replay test → same event_id processed once
   `pytest tests/integration/test_payments_api.py::test_webhook_replay_protection -v`
3. CRIT-03 (JWT rotation): Run token version test → tokens include key_version
   `pytest tests/integration/test_auth_api.py::test_token_version_claim -v`
4. CRIT-04 (Rate limiting): Run rate limit test → 429 on 6th login attempt
   `pytest tests/integration/test_auth_api.py::test_rate_limiting -v`
5. Verify no regressions: all Phase 1 tests still pass
</action>

<acceptance_criteria>
- [ ] CRIT-01 test passes: concurrent order test returns 2 successes, 3 conflicts
- [ ] CRIT-02 test passes: webhook replay returns same result without double-processing
- [ ] CRIT-03 test passes: token includes key_version claim
- [ ] CRIT-04 test passes: 6th login attempt returns 429 Too Many Requests
- [ ] All Phase 1 integration tests in `tests/integration/test_*` pass
- [ ] No regressions detected (all previously passing tests still pass)
</acceptance_criteria>

**Files modified:**
- None (verification only)

---

## Verification & Sign-Off

### Gate 1: All Tasks Completed (Before Test Run)
- [ ] Task 1-1 to 1-6: UserService verified
- [ ] Task 2-1 to 2-4: BookService verified
- [ ] Task 3-1 to 3-4: OrderService verified & bug fixed
- [ ] Task 4-1 to 4-4: PaymentService verified
- [ ] Task 5-1 to 5-3: Exception handling verified
- [ ] Code quality: Black, isort, flake8, mypy pass

### Gate 2: Test Execution (After Code Complete)
- [ ] Full test suite runs: `pytest tests/unit/ tests/DB/ tests/integration/ -q`
- [ ] Coverage ≥ 75%: `--cov-report=term-missing`
- [ ] All Phase 1 integration tests still pass
- [ ] No regressions detected

### Gate 3: Phase 2 Requirements Met
- [ ] SVCL-01 (UserService): ✓ All auth flows verified, JWT rotation integrated, rate limiting confirmed
- [ ] SVCL-02 (BookService): ✓ All CRUD operations verified, soft delete filtering, pagination working
- [ ] SVCL-03 (OrderService): ✓ Race condition fix verified, state machine enforced, seller pagination bug fixed
- [ ] SVCL-04 (PaymentService): ✓ Webhook dedup verified, checkout session correct, refund logic verified
- [ ] SVCL-05 (Exception handling): ✓ All typed exceptions, HTTP mapping correct, no info leaks

### Success Criteria

**Phase 2 is COMPLETE when:**

1. ✓ All 16 tasks completed with acceptance criteria met
2. ✓ All services audited and verified OR fixed
3. ✓ Seller order pagination bug FIXED (Priority 1)
4. ✓ Phase 1 integrations verified (CRIT-01 to CRIT-04 still working)
5. ✓ Full test suite passes with ≥75% coverage
6. ✓ Code quality checks pass (Black, isort, flake8, mypy)
7. ✓ No new bugs introduced
8. ✓ No breaking changes to API
9. ✓ Zero critical issues remaining

---

## Files Summary

### Modified Files
- backend/app/services/order_service.py (Task 3-1: fix seller order pagination)
- backend/app/repositories/order_repository.py (Task 3-1: implement count_orders_for_seller)
- backend/tests/integration/ (add missing tests for concurrency, webhooks, state transitions)

### Verified Files (No Changes Unless Fixing Issues)
- backend/app/services/auth_service.py
- backend/app/services/book_service.py
- backend/app/services/payment_service.py
- backend/app/core/security.py
- backend/app/core/keys.py
- backend/app/core/dependencies.py
- backend/app/main.py (exception handlers)
- backend/app/services/exceptions.py

---

## Timeline & Dependencies

**Wave 1 (Parallel):** Tasks 1-1 to 1-6 (6 tasks) — 3 hours
- Can run in parallel (all independent)
- UserService complete

**Wave 2 (Parallel):** Tasks 2-1 to 2-4 (4 tasks) — 2.5 hours
- Depends on Wave 1 (auth working, rate limiting verified)
- Can run in parallel (all independent)
- BookService complete

**Wave 3 (Parallel):** Tasks 3-1 to 3-4 (4 tasks) — 2.5 hours
- Task 3-1 (seller pagination fix) — 30 min, HIGH PRIORITY
- Can run in parallel (all independent)
- OrderService complete and bug fixed

**Wave 4 (Parallel):** Tasks 4-1 to 4-4 (4 tasks) — 3.5 hours
- Depends on Wave 3 (orders working)
- Can run in parallel (all independent)
- PaymentService complete

**Wave 5 (Sequential):** Tasks 5-1 to 5-6 (6 tasks) — 3.5 hours
- Task 5-4 (test suite) depends on all previous waves
- Task 5-6 (Phase 1 verification) depends on Task 5-4
- Tasks 5-1 to 5-3 can run in parallel with earlier waves

**Total Estimated Time:** 18-24 hours (depending on parallelization and complexity)

---

## Exit Criteria

This plan is **COMPLETE** when:

1. All 16 tasks have been executed
2. All acceptance criteria met for each task
3. Seller order pagination bug fixed
4. Phase 1 verifications passed (no regressions)
5. Full test suite passes
6. Code quality clean
7. Ready for Phase 3 (Backend Foundations audit)

---

## Handoff to Phase 3

When Phase 2 complete:
- [ ] Backend services verified and working
- [ ] All exceptions properly typed and mapped
- [ ] Test suite at ≥75% coverage
- [ ] Phase 1 fixes validated
- [ ] Ready to audit: repository layer, async patterns, error handling consistency
- [ ] Phase 3 can start: Repository audit (REPO-01 to REPO-05), async validation (ASYNC-01 to ASYNC-04), error handling (ERROR-01 to ERROR-04)

---

**Status:** ✓ Ready for Execution  
**Created:** 2026-04-18  
**Next Step:** Execute Wave 1 tasks in parallel  
**Executor:** `/gsd-execute-phase 2`

---

*Plan created with full traceability to REQUIREMENTS.md, ROADMAP.md, and Phase 1 verification.  
All tasks include read_first, action, and acceptance_criteria per deep work standards.*
