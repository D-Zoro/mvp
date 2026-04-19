---
wave: 1
depends_on:
  - "Phase 2 SUMMARY (service layer verified)"
files_modified:
  - "backend/app/repositories/user_repository.py"
  - "backend/app/repositories/book_repository.py"
  - "backend/app/repositories/order_repository.py"
  - "backend/tests/unit/test_repositories.py"
  - "backend/tests/DB/test_repositories_db.py"
autonomous: true
---

# Phase 3 — Wave 1: Repository Audit (REPO-01 to REPO-05)

**Wave:** 1 of 3  
**Requirements:** REPO-01, REPO-02, REPO-03, REPO-04, REPO-05  
**Goal:** Audit all 5 repository classes for correct patterns, soft delete filtering, async/await compliance, and transaction boundaries.  
**Status:** Ready to execute  

---

## Executive Summary

Wave 1 audits the repository layer across all 5 classes (User, Book, Order, Payment). Phase 2 verified that services correctly call `.commit()` and raise typed exceptions. **Phase 2 did not validate repository implementation details** — that's Wave 1's responsibility.

This wave ensures:
1. ✅ All queries use `select()` constructor and `await`
2. ✅ Soft delete filtering on all read operations
3. ✅ Stock deduction with row-level locks (Phase 1 integration)
4. ✅ No orphaned references via FK constraints
5. ✅ Pagination calculations correct (skip, limit)

---

## Task 1-1: UserRepository Query Audit (REPO-01)

### `<read_first>`
- `backend/app/repositories/user_repository.py` (current implementation)
- `backend/app/repositories/base_repository.py` (base class patterns)
- `backend/app/models/user.py` (User ORM model and soft delete column)
- `backend/app/core/database.py` (session configuration)
- `.planning/phases/03-backend-foundations/03-RESEARCH.md` (section 1.2 REPO-01)

### `<action>`

Audit UserRepository for these patterns:

**Pattern 1: `get_by_email()` method**
- Verify query uses `select(User)` constructor (SQLAlchemy 2.0 style)
- Verify all `.execute()` calls are `await`ed
- Verify soft delete filtering: `.where(..., User.deleted_at.is_(None))`
- Must NOT find deleted users

**Pattern 2: `create_with_password()` method**
- Verify password hashing uses `hash_password()` from `app.core.security`
- Verify uses `.flush()` not `.commit()`
- Verify password bytes don't exceed 72 bytes (bcrypt limit)

**Pattern 3: `email_exists()` method**
- Verify uses SQL `EXISTS` or COUNT query, not full SELECT
- Verify includes soft delete filter

**Pattern 4: `get_by_oauth_id()` method**
- Verify handles nullable `password_hash` (OAuth users)
- Verify soft delete filtering

**Expected Code Patterns:**
```python
# ✓ GOOD pattern for all user queries
query = select(User).where(
    User.email == email,
    User.deleted_at.is_(None),
)
result = await self.db.execute(query)
return result.scalar_one_or_none()

# ✗ BAD pattern (missing await)
result = self.db.execute(query)

# ✗ BAD pattern (no soft delete filter)
query = select(User).where(User.email == email)
```

**Verification Checklist:**
- [ ] All queries use `select()` from SQLAlchemy 2.0 imports
- [ ] All `.execute()` calls have `await` keyword
- [ ] Soft delete filtering: `.where(..., deleted_at.is_(None))` on all read queries
- [ ] Password hashing uses `hash_password()` from security module
- [ ] `.flush()` used in create methods, not `.commit()`
- [ ] Type hints on all method signatures
- [ ] Google-style docstrings with Args/Returns/Raises
- [ ] No `Any` types in public APIs

### `<acceptance_criteria>`

Command: `grep -n "select(User)" backend/app/repositories/user_repository.py | head -10`
- Result: Shows all User query patterns; each must have `await` on next few lines

Command: `grep -c "await self.db.execute" backend/app/repositories/user_repository.py`
- Result: Count of awaited execute calls (should be all DB operations)

Command: `grep -c "deleted_at.is_(None)" backend/app/repositories/user_repository.py`
- Result: Should appear on all SELECT queries (at least 3+)

Code read: All 4 methods (`get_by_email`, `create_with_password`, `email_exists`, `get_by_oauth_id`) follow patterns above

---

## Task 1-2: BookRepository Query Audit (REPO-02)

### `<read_first>`
- `backend/app/repositories/book_repository.py` (current implementation)
- `backend/app/models/book.py` (Book ORM model, soft delete, BookCondition enum, BookStatus enum)
- `backend/app/repositories/base_repository.py` (base class patterns)
- `.planning/phases/03-backend-foundations/03-RESEARCH.md` (section 1.2 REPO-02)
- Phase 2 SUMMARY (verified book search pagination in services)

### `<action>`

Audit BookRepository for these critical patterns:

**Pattern 1: `search()` method (read-heavy, most complex)**
- Verify returns list of Books (not count)
- Verify filters soft delete: `.where(..., Book.deleted_at.is_(None))`
- Verify status filtering: only ACTIVE by default (or respects filter param)
- Verify condition filtering: uses BookCondition enum correctly
- Verify pagination: `skip = (page - 1) * page_size`, `limit = page_size`
- Verify query efficiency: loads relationships with selectinload if needed

**Pattern 2: `search_count()` method (CRITICAL)**
- **THIS IS THE PAGINATION BUG FIX FROM PHASE 2**
- Verify uses SQL COUNT query, NOT `len(items)` in Python
- Verify same filters as `search()` (soft delete, status, condition)
- Should return integer count for pagination

**Pattern 3: `get_by_id()` method**
- Verify soft delete filtering
- Verify eager loads relationships (seller, orders if needed)

**Pattern 4: `create_for_seller()` method**
- Verify sets `seller_id` from parameter only (never from request)
- Verify status defaults (ACTIVE or DRAFT?)
- Verify uses `.flush()` not `.commit()`

**Pattern 5: `delete()` method (soft delete)**
- Verify sets `deleted_at = datetime.utcnow()`
- Verify atomic single UPDATE statement
- NOT hard delete

**Pattern 6: `deduct_stock()` method (Phase 1 race condition integration)**
- Verify called with row-level lock: `.with_for_update()`
- Verify quantity check happens INSIDE lock
- Verify UPDATE: `Book.quantity -= quantity`
- Verify CHECK constraint at DB level: `quantity >= 0`

**Orphaned Reference Detection:**
- Verify FK constraint `seller_id → users(id)`
- Verify can't create book with non-existent seller_id
- Verify deleted books still satisfy constraints

**Expected Code Patterns:**
```python
# ✓ GOOD: search_count uses SQL COUNT
query = select(func.count(Book.id)).where(Book.deleted_at.is_(None), ...)
result = await self.db.execute(query)
return result.scalar() or 0

# ✗ BAD: search_count using Python len()
items = await self.search(seller_id, filters, skip=0, limit=99999)
return len(items)  # Wrong!

# ✓ GOOD: search pagination
skip = (page - 1) * page_size
limit = page_size
query = select(Book).offset(skip).limit(limit)

# ✗ BAD: pagination off-by-one
skip = page * page_size  # Wrong!
```

**Verification Checklist:**
- [ ] `search_count()` uses SQL `COUNT`, not Python `len()`
- [ ] All `.search()` queries filter `deleted_at.is_(None)`
- [ ] Pagination: `skip = (page - 1) * page_size`, `limit = page_size`
- [ ] Soft delete: `.delete()` method sets `deleted_at`, never hard deletes
- [ ] Status filtering: respects DRAFT/ACTIVE/SOLD_OUT/INACTIVE enum
- [ ] Condition filtering: uses BookCondition enum correctly
- [ ] FK constraint on `seller_id`: REFERENCES users(id) EXISTS
- [ ] CHECK constraint: `quantity >= 0` EXISTS
- [ ] Indexes on: `seller_id`, `status`, `deleted_at`
- [ ] Stock deduction uses `.with_for_update()` row-level lock

### `<acceptance_criteria>`

Command: `grep -n "def search_count" backend/app/repositories/book_repository.py`
- Result: Shows method definition; next 10 lines must contain `func.count()` (SQL COUNT), no `len()`

Command: `grep -A3 "def search_count" backend/app/repositories/book_repository.py | grep -c "func.count"`
- Result: 1 (uses SQL COUNT)

Command: `grep -c "func.count()" backend/app/repositories/book_repository.py`
- Result: At least 1 (for search_count)

Command: `grep -n "with_for_update" backend/app/repositories/book_repository.py | grep -i stock`
- Result: Shows deduct_stock method uses lock; should find at least 1 match

Code read: Verify all 6 methods follow patterns above with async/await on all `.execute()`

---

## Task 1-3: OrderRepository Query Audit (REPO-03)

### `<read_first>`
- `backend/app/repositories/order_repository.py` (current implementation)
- `backend/app/models/order.py` (Order, OrderItem ORM models, OrderStatus enum)
- `backend/app/models/book.py` (Book model, for context on stock checking)
- `.planning/phases/03-backend-foundations/03-RESEARCH.md` (section 1.2 REPO-03)
- Phase 2 SUMMARY (seller order pagination fix: `count_orders_for_seller()` method)

### `<action>`

Audit OrderRepository for these patterns:

**Pattern 1: `create_with_items()` method (CRITICAL — atomic multi-step operation)**
- Verify atomic all-or-nothing semantics
- Verify row-level lock: `select(Book).with_for_update()` before stock check
- Verify stock check happens INSIDE lock (Phase 1 CRIT-01 integration)
- Verify all OrderItem rows created
- Verify Book quantities decremented
- Verify uses `.flush()` not `.commit()`
- Verify returns Order with relationships loaded

**Pattern 2: `get_orders_for_seller()` method**
- Verify JOINs: Order → OrderItem → Book → seller_id (correct relationship chain)
- Verify filters: order status, soft delete on Order
- Verify pagination: skip/limit calculation correct
- Verify calls `count_orders_for_seller()` for total (Phase 2 bug fix)

**Pattern 3: `count_orders_for_seller()` method (PHASE 2 BUG FIX)**
- Verify uses SQL COUNT with proper DISTINCT (avoid double-counting on JOIN)
- Verify same JOINs as `get_orders_for_seller()`: Order → OrderItem → Book
- Verify filters: seller_id, order status, soft delete
- Returns integer count

**Pattern 4: `update_status()` method**
- Verify state machine validation in service (not repo)
- Verify updates Order.status = new_status
- Verify `updated_at` auto-updated (SQLAlchemy Column with default/onupdate)

**Pattern 5: `mark_paid()` method**
- Verify called after Stripe webhook
- Verify updates status → PAID, stripe_payment_id, stripe_session_id
- Verify idempotent: calling twice is safe

**Pattern 6: `get_order_with_items()` method**
- Verify eager loads items: `selectinload(Order.items).selectinload(OrderItem.book)`
- Verify soft delete filtering on Order

**State Consistency Rules:**
- Orders in PENDING/PAYMENT_PROCESSING: NO stripe_payment_id
- Orders in PAID/SHIPPED/DELIVERED: MUST have stripe_payment_id
- Orders in REFUNDED: MUST have refund timestamp
- OrderItems: must reference valid (non-deleted) Books

**Expected Code Patterns:**
```python
# ✓ GOOD: lock then check then deduct
query = select(Book).where(
    Book.id == item.book_id,
    Book.deleted_at.is_(None),
).with_for_update()
book = result.scalar_one_or_none()
if book.quantity < item.quantity:
    raise InsufficientStockError(...)
book.quantity -= item.quantity

# ✓ GOOD: count_orders_for_seller uses DISTINCT
query = select(func.count(distinct(Order.id))).where(
    Book.seller_id == seller_id,
    # ... filters
)

# ✓ GOOD: relationship loading
query = select(Order).options(
    selectinload(Order.items).selectinload(OrderItem.book)
)
```

**Verification Checklist:**
- [ ] `create_with_items()`: atomic, rolls back on error
- [ ] Row-level locks: `with_for_update()` on Book SELECT
- [ ] Stock check inside lock: race condition impossible
- [ ] Relationship loading: eager load items/books with selectinload
- [ ] Soft delete filtering: `Order.deleted_at.is_(None)` in all read queries
- [ ] Status filtering: uses OrderStatus enum correctly
- [ ] `count_orders_for_seller()` exists and uses SQL COUNT
- [ ] FK constraints: buyer_id → users, book_id → books
- [ ] Indexes on: buyer_id, status, stripe_payment_id

### `<acceptance_criteria>`

Command: `grep -n "count_orders_for_seller" backend/app/repositories/order_repository.py`
- Result: Shows method exists; within 5 lines should contain `func.count()` (SQL COUNT)

Command: `grep -n "with_for_update" backend/app/repositories/order_repository.py | head -3`
- Result: Shows row-level lock used in create_with_items (should see at least 1)

Command: `grep -c "selectinload" backend/app/repositories/order_repository.py`
- Result: At least 1 (for eager loading relationships)

Code read: Verify all 6 methods follow patterns above; `create_with_items` is most critical (check lock, stock check, quantity deduction)

---

## Task 1-4: PaymentRepository Query Audit (REPO-04)

### `<read_first>`
- `backend/app/repositories/order_repository.py` (or payment_repository.py if separate)
- `backend/app/models/order.py` (Order model with stripe_payment_id, stripe_session_id)
- `.planning/phases/03-backend-foundations/03-RESEARCH.md` (section 1.2 REPO-04)
- Phase 2 SUMMARY (webhook deduplication verified in PaymentService)

### `<action>`

Audit payment-related repository methods for these patterns:

**Pattern 1: `set_payment_id()` method**
- Verify called during Stripe checkout session creation
- Verify updates both `stripe_session_id` and `stripe_payment_id` atomically
- Verify sets status to PAYMENT_PROCESSING
- Verify uses `.flush()` not `.commit()`

**Pattern 2: `mark_payment_failed()` method**
- Verify finds order by stripe_payment_id
- Verify `stripe_payment_id` is indexed or unique (fast lookup)
- Verify resets status to PENDING
- Verify idempotent: calling twice returns same result

**Pattern 3: `mark_payment_completed()` method**
- Verify called by webhook handler
- Verify sets status to PAID
- Verify idempotent: can be called multiple times safely (Phase 1 webhook dedup handles most, but DB state must also be idempotent)

**Transaction Integrity:**
- Idempotency: Stripe webhook can fire multiple times
- Solution: Phase 2 Redis cache (webhook dedup) + database state check
- Query: find order by stripe_payment_id, check if already PAID

**Expected Code Patterns:**
```python
# ✓ GOOD: idempotent payment completion
async def mark_payment_completed(self, stripe_payment_id: str) -> Order:
    query = select(Order).where(
        Order.stripe_payment_id == stripe_payment_id,
        Order.deleted_at.is_(None),
    )
    order = await self.db.execute(query).scalar_one_or_none()
    if order and order.status != OrderStatus.PAID:
        order.status = OrderStatus.PAID
        await self.db.flush()
    return order

# ✗ BAD: not idempotent (would re-process)
async def mark_payment_completed(self, stripe_payment_id: str) -> Order:
    order.status = OrderStatus.PAID  # No check if already PAID!
```

**Verification Checklist:**
- [ ] `stripe_payment_id` is unique or indexed (fast lookup)
- [ ] Payment state updates are idempotent
- [ ] Order status never regresses (PAID → PENDING not allowed)
- [ ] Webhook deduplication: Redis cache checked first (Phase 2)
- [ ] Refund records: tracked separately (Order.status = REFUNDED)
- [ ] Amount immutability: Order.total_amount never changes after creation

### `<acceptance_criteria>`

Command: `grep -n "stripe_payment_id" backend/app/repositories/order_repository.py | head -5`
- Result: Shows stripe_payment_id used in queries; should see at least 2-3 references

Code read: Verify all 3 methods exist and follow idempotency patterns; no state regressions

---

## Task 1-5: Cross-Repository Async/Await Validation (REPO-05)

### `<read_first>`
- All repository files: `backend/app/repositories/*.py`
- `backend/app/core/database.py` (AsyncSession configuration)
- `.planning/phases/03-backend-foundations/03-RESEARCH.md` (section 1.2 REPO-05)

### `<action>`

Perform systematic audit for async/await correctness across ALL repositories:

**Check 1: Every database call uses `await`**
```bash
# Script: find all .execute() calls without await
grep -n "\.execute(" backend/app/repositories/*.py | grep -v "await"
```
Expected result: 0 matches (all must be awaited)

**Check 2: AsyncSession, not sync Session**
```bash
# Script: verify no sync Session imports
grep -n "from sqlalchemy.orm import Session" backend/app/repositories/
grep -n "from sqlalchemy import Session" backend/app/repositories/
grep -n "Session\[" backend/app/repositories/
```
Expected result: 0 matches in repository layer (only `AsyncSession` allowed)

**Check 3: No blocking I/O in async functions**
```bash
# Script: find blocking calls
grep -n "time\.sleep" backend/app/repositories/
grep -n "open(" backend/app/repositories/
grep -n "requests\." backend/app/repositories/
```
Expected result: 0 matches (use async alternatives or run in thread pool)

**Check 4: Relationship loading patterns**
- Verify no N+1 queries via lazy loading
- For each `.get()` that returns objects with relationships, verify:
  - Relationships use `selectinload()` or `joinedload()` or
  - Relationships marked `lazy="dynamic"` to avoid loading
  - No implicit lazy loading (would require new DB call per object)

**Expected Code Patterns:**
```python
# ✓ GOOD: AsyncSession with await
from sqlalchemy.ext.asyncio import AsyncSession
self.db: AsyncSession
result = await self.db.execute(query)

# ✗ BAD: sync Session
from sqlalchemy.orm import Session

# ✓ GOOD: explicit relationship loading
query = select(Order).options(selectinload(Order.items))

# ✗ BAD: implicit lazy loading
order = await order_repo.get(order_id)
for item in order.items:  # Separate query per item!
```

**Verification Checklist:**
- [ ] All `.execute()` calls are `await`ed
- [ ] All `.flush()` calls are `await`ed
- [ ] No sync `Session` imports in repositories
- [ ] No blocking I/O (time.sleep, open(), requests)
- [ ] Relationships loaded explicitly (selectinload/joinedload)
- [ ] Type hint: `self.db: AsyncSession` in repository classes

### `<acceptance_criteria>`

Command: `grep "\.execute(" backend/app/repositories/*.py | grep -v "await" | wc -l`
- Result: 0 (all execute calls must be awaited)

Command: `grep "\.flush(" backend/app/repositories/*.py | grep -v "await" | wc -l`
- Result: 0 (all flush calls must be awaited)

Command: `grep -r "from sqlalchemy.orm import Session" backend/app/repositories/ | wc -l`
- Result: 0 (no sync Session in repos)

Command: `grep -r "time\.sleep\|^[[:space:]]*open(" backend/app/repositories/ | wc -l`
- Result: 0 (no blocking I/O)

---

## Task 1-6: Repository Test Suite Audit & Gaps

### `<read_first>`
- `backend/tests/unit/test_repositories.py` (or similar)
- `backend/tests/DB/test_repositories_db.py` (or similar)
- `.planning/phases/03-backend-foundations/03-RESEARCH.md` (section 4.1 and 4.2)

### `<action>`

Audit existing test coverage for repository layer. Create/extend test files to cover:

**Unit Test Coverage (no DB):**

1. **Pagination calculation tests:**
   ```python
   def test_book_search_pagination_page_2():
       """Page 2, per_page 20: skip=20, limit=20."""
       page, per_page = 2, 20
       skip = (page - 1) * per_page
       assert skip == 20
   ```

2. **Soft delete filter presence tests:**
   - Verify all `.search()` queries include `deleted_at.is_(None)`
   - Use grep to detect any SELECT queries without filter

3. **Order state machine tests:**
   - Verify `_ALLOWED_TRANSITIONS` covers all 7 states
   - Verify CANCELLED and REFUNDED are terminal
   - Verify no invalid transitions exist

**Database Test Coverage (real PostgreSQL):**

1. **UNIQUE constraint test:**
   ```python
   async def test_user_unique_email_constraint(db_session):
       user1 = User(email="test@example.com", ...)
       user2 = User(email="test@example.com", ...)
       db_session.add(user1)
       await db_session.commit()
       db_session.add(user2)
       # Should raise IntegrityError
   ```

2. **CHECK constraint test:**
   ```python
   async def test_book_quantity_check_constraint(db_session):
       book = Book(quantity=-1, ...)
       db_session.add(book)
       # Should raise IntegrityError
   ```

3. **Soft delete behavior test:**
   ```python
   async def test_soft_delete_filters_correctly(db_session):
       book = await create_test_book()
       book.deleted_at = datetime.utcnow()
       await db_session.commit()
       query = select(Book).where(
           Book.id == book.id,
           Book.deleted_at.is_(None)
       )
       result = await db_session.execute(query)
       assert result.scalar_one_or_none() is None
   ```

4. **FK constraint test:**
   ```python
   async def test_book_foreign_key_constraint(db_session):
       seller_id = uuid.uuid4()
       book = Book(seller_id=seller_id, ...)
       db_session.add(book)
       # Should raise IntegrityError
   ```

5. **Concurrent order stress test:**
   ```python
   async def test_concurrent_orders_with_limited_stock():
       book = await create_test_book(quantity=5)
       tasks = [
           create_order(book_id=book.id, quantity=1)
           for _ in range(50)
       ]
       results = await asyncio.gather(*tasks, return_exceptions=True)
       successes = sum(1 for r in results if not isinstance(r, Exception))
       assert successes <= 5
   ```

**Verification Checklist:**
- [ ] Unit tests exist for pagination calculations
- [ ] Unit tests verify soft delete filtering is present
- [ ] Unit tests verify state machine transitions
- [ ] DB tests verify UNIQUE(email) constraint
- [ ] DB tests verify CHECK(quantity >= 0) constraint
- [ ] DB tests verify soft delete query filtering
- [ ] DB tests verify FK constraints
- [ ] DB tests verify concurrent order handling
- [ ] All tests use `@pytest.mark.asyncio` (or asyncio_mode="auto")
- [ ] Tests use rollback session for cleanup

### `<acceptance_criteria>`

Command: `pytest backend/tests/unit/ -k repository -v`
- Result: All unit repository tests PASS

Command: `pytest backend/tests/DB/ -k repository -v`
- Result: All DB constraint tests PASS

Command: `pytest backend/tests/ --cov=app.repositories --cov-report=term-missing | grep -E "repositories.*%"`
- Result: Repository coverage ≥75%

Code read: Verify test files exist and cover at least the 8 test patterns above

---

## Verification Criteria (Wave 1 Complete)

All tasks in this wave must pass these checks:

### Requirement Coverage
- ✅ REPO-01: UserRepository audit complete, all queries validated
- ✅ REPO-02: BookRepository audit complete, search_count verified uses SQL COUNT
- ✅ REPO-03: OrderRepository audit complete, create_with_items validated with locks
- ✅ REPO-04: Payment repository audit complete, idempotency verified
- ✅ REPO-05: Async/await patterns validated across all repos

### Code Quality
- ✅ All queries use `select()` constructor (SQLAlchemy 2.0)
- ✅ All `.execute()` calls have `await`
- ✅ Soft delete filtering present on all read queries
- ✅ No async/await antipatterns detected
- ✅ Type hints on all repository methods

### Test Coverage
- ✅ Unit tests exist for pagination, constraints, state machine
- ✅ DB tests verify UNIQUE, FK, CHECK constraints
- ✅ Integration tests verify end-to-end error handling
- ✅ Concurrent order stress test passes

### Must-Haves (Goal-Backward Verification)
- ✅ **No overselling possible:** Race condition fix from Phase 1 verified in `create_with_items()`
- ✅ **Pagination works on page 2+:** `search_count()` uses SQL COUNT, not Python `len()`
- ✅ **Soft deletes hidden:** All queries filter `deleted_at.is_(None)`
- ✅ **No orphaned records:** FK constraints prevent invalid references
- ✅ **Async/await correct:** All DB operations properly awaited

---

**Wave 1 Status:** Ready to execute  
**Executor:** /gsd-execute-phase (Wave 1)  
**Next:** Wave 2 (Async patterns validation) depends on Wave 1 completion
