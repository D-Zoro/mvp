# Phase 3: Backend Foundations — Research Document

**Created:** 2026-04-18  
**Status:** Research Complete  
**Phase Objective:** Audit repository layer, validate async patterns, ensure error handling consistency  
**Requirements Addressed:** REPO-01 to REPO-05, ASYNC-01 to ASYNC-04, ERROR-01 to ERROR-04 (13 total)

---

## Executive Summary

Phase 3 builds on Phase 2's verified service layer to audit the repository and async layers. This research identifies:

1. **Repository audit strategy** — how to validate 5 repository classes for correct patterns
2. **Async/await validation approach** — detecting SQLAlchemy async antipatterns
3. **Error handling consistency** — validating all 14 typed exceptions work end-to-end
4. **Testing methodology** — unit, DB, and integration test approach for Phase 3
5. **Known patterns from Phase 2** — what we can build on, what to watch for

**Key Finding:** Phase 2 left the repository layer largely untouched (it audited services). Phase 3 must deeply validate repository queries, async session lifecycle, and transaction boundaries.

---

## 1. Repository Layer Audit Strategy

### 1.1 What Phase 2 Verified (and What It Didn't)

**What Phase 2 VERIFIED:**
- ✅ Service layer business logic (UserService, BookService, OrderService, PaymentService)
- ✅ Typed exceptions raised at service layer
- ✅ HTTP status code mappings (17 exceptions → 17 HTTP codes)
- ✅ Authorization checks in services
- ✅ Transaction boundaries at service level (`.commit()` in services, `.flush()` in repos)
- ✅ Phase 1 integration (race condition fix, webhook dedup, JWT versioning, rate limiting)

**What Phase 2 DID NOT VERIFY:**
- ❌ Repository query correctness (patterns, N+1 queries, soft delete filtering)
- ❌ Async/await patterns throughout repository layer
- ❌ Session lifecycle management (leaks, lifecycle issues)
- ❌ Orphaned record detection (e.g., orders without buyer, books without seller)
- ❌ Soft delete consistency (are all queries filtering `deleted_at IS NULL`?)
- ❌ State machine constraints at database level (CHECK constraints, triggers)
- ❌ Connection pooling behavior under load

**Action for Phase 3:** We must deeply audit what Phase 2 skipped.

---

### 1.2 Five Repository Classes to Audit (REPO-01 to REPO-05)

#### REPO-01: UserRepository Audit

**File:** `backend/app/repositories/user.py`

**Key Methods to Validate:**
1. `get_by_email(email: str) → Optional[User]`
   - Query pattern check: uses `select()`, not string queries
   - Soft delete filtering: `.where(User.deleted_at.is_(None))`
   - Test case: get deleted user → should return None

2. `create_with_password(email, password, ...) → User`
   - Password hashing: calls `hash_password()` from `app.core.security`
   - Commit handling: uses `.flush()` not `.commit()`
   - Duplicate email prevention: relies on UNIQUE(email) constraint or service-level check

3. `email_exists(email: str) → bool`
   - Uses `.exists()` or COUNT query, not full SELECT
   - Filters `deleted_at IS NULL` for consistency

4. `get_by_oauth_id(provider, oauth_id) → Optional[User]`
   - Handles OAuth users (nullable password_hash)
   - Soft delete filtering

**Validation Checklist:**
- [ ] All queries use `select()` from SQLAlchemy 2.0, not string queries
- [ ] All queries include `await` (async session execution)
- [ ] Soft delete filtering: all `.get()`, `.get_multi()`, `.search()` filter `deleted_at IS NULL`
- [ ] Password hashing uses `hash_password()` from security module
- [ ] `flush()` used, not `commit()`
- [ ] Type hints on all methods
- [ ] Google-style docstrings with Args/Returns/Raises
- [ ] No `Any` types in public APIs
- [ ] Relationships loaded correctly (eager vs lazy)

**Query Pattern Examples to Look For:**
```python
# ✓ Good: select(), await, soft delete filter
query = select(User).where(
    User.email == email,
    User.deleted_at.is_(None),
)
result = await self.db.execute(query)
return result.scalar_one_or_none()

# ✗ Wrong: missing await
result = self.db.execute(query)  # Not awaited!

# ✗ Wrong: no soft delete filter
query = select(User).where(User.email == email)  # Finds deleted users!

# ✗ Wrong: string query
result = await self.db.execute("SELECT * FROM users WHERE email = ?", [email])
```

---

#### REPO-02: BookRepository Audit

**File:** `backend/app/repositories/book.py`

**Key Methods to Validate:**
1. `search(seller_id, filters, skip, limit) → list[Book]`
   - Soft delete filtering: critical for list endpoints
   - Status filtering: only ACTIVE by default? Or respect filter param?
   - Condition filtering: BookCondition enum
   - Pagination: correct skip/limit usage
   - Query efficiency: eager load relationships if needed

2. `search_count(seller_id, filters) → int`
   - **CRITICAL:** Must use SQL COUNT, not Python `len()`
   - Same filters as `search()`
   - Soft delete filtering

3. `get_by_id(book_id) → Optional[Book]`
   - Soft delete filtering
   - Eager load relationships (seller, orders?)

4. `create_for_seller(seller_id, book_data) → Book`
   - Sets `seller_id` from parameter, never from request
   - Status: defaults to DRAFT or ACTIVE?
   - Commit handling: `.flush()` not `.commit()`

5. `delete(book_id) → bool` (soft delete)
   - Sets `deleted_at = datetime.utcnow()`
   - Atomicity: single UPDATE statement

6. `deduct_stock(book_id, quantity) → bool`
   - **CRITICAL:** Used in order creation
   - Checked in Phase 1 fix (race condition)
   - Verifies: quantity >= 0 via CHECK constraint
   - Updates: `Book.quantity -= quantity`
   - Handles: concurrent updates with row-level locks (via service layer)

**Orphaned Reference Detection:**
- Books with `seller_id` pointing to non-existent or deleted User
- Books without seller (NULL seller_id when not allowed)
- Query: `SELECT b.* FROM books b LEFT JOIN users u ON b.seller_id = u.id WHERE u.id IS NULL AND b.deleted_at IS NULL`

**Validation Checklist:**
- [ ] `search_count()` uses SQL COUNT, not `len()`
- [ ] All `.search()` queries filter `deleted_at IS NULL`
- [ ] Pagination: `skip = (page - 1) * page_size`, `limit = page_size`
- [ ] Soft delete: `.delete()` method sets `deleted_at`, not hard delete
- [ ] Status filtering: respects DRAFT/ACTIVE/SOLD_OUT/INACTIVE
- [ ] Condition filtering: correct enum values
- [ ] Foreign key constraint on `seller_id`: REFERENCES users(id)
- [ ] CHECK constraint: `quantity >= 0`
- [ ] Indexes on: `seller_id`, `status`, `deleted_at` (for soft delete queries)
- [ ] Eager loading: relationships loaded when needed (avoid N+1)

**Orphaned Reference Test Case:**
```python
# Test: book with non-existent seller
await book_repo.create_for_seller(
    seller_id=uuid.uuid4(),  # Non-existent user
    book_data=BookCreate(...)
)
# Expected: Should fail with FK constraint error
```

---

#### REPO-03: OrderRepository Audit

**File:** `backend/app/repositories/order.py`

**Key Methods to Validate:**
1. `create_with_items(buyer_id, items, shipping_address, notes) → Order`
   - **CRITICAL:** Atomic multi-step operation
   - Steps: Order row → OrderItem rows → deduct Book quantities
   - Rollback behavior: all-or-nothing
   - Phase 1 integration: row-level locks with `.with_for_update()`
   - Uses `.flush()`, not `.commit()`

2. `get_orders_for_seller(seller_id, skip, limit, status) → list[Order]`
   - **CRITICAL:** Phase 2 bug fix — now uses `count_orders_for_seller()` method
   - JOINs: Order → OrderItem → Book → seller_id
   - Filters: status, soft delete
   - Pagination: correct skip/limit

3. `count_orders_for_seller(seller_id, status) → int`
   - **CRITICAL:** Phase 2 added this method
   - SQL COUNT with proper DISTINCT (avoid double-counting)
   - JOINs: Order → OrderItem → Book
   - Filters: seller_id, order status, soft delete

4. `update_status(order_id, new_status) → Order`
   - State machine validation: service layer calls `_assert_valid_transition()`
   - Updates: Order.status = new_status
   - Timestamp update: updated_at auto-updated

5. `mark_paid(order_id, payment_intent_id, session_id) → Order`
   - Called after Stripe webhook
   - Updates: status → PAID, stripe_payment_id, stripe_session_id

6. `get_order_with_items(order_id) → Optional[Order]`
   - Eager load items: `Order.items` with related Books
   - Soft delete filtering on Order

**State Consistency Checks:**
- Orders in PENDING/PAYMENT_PROCESSING state should have no `stripe_payment_id`
- Orders in PAID/SHIPPED/DELIVERED state must have `stripe_payment_id`
- Orders in REFUNDED state must have refund timestamp
- OrderItems must reference valid Books (not deleted)

**Transaction Integrity Validation:**
```python
# Test: concurrent order creation with limited stock
# Create book with quantity=1
# Start two concurrent orders for same book
# Expected: One succeeds (quantity=0), one fails with 409 Conflict
# Verify: No negative quantity in database
```

**Validation Checklist:**
- [ ] `create_with_items()`: atomic, rolls back all changes on error
- [ ] Row-level locks: `with_for_update()` on Book SELECT
- [ ] Stock check inside lock: race condition impossible
- [ ] Relationship loading: eager load items/books
- [ ] Soft delete filtering: `Order.deleted_at IS NULL` in all queries
- [ ] Status filtering: correct OrderStatus enum values
- [ ] Foreign keys: buyer_id → users, book_id → books
- [ ] Indexes on: buyer_id, status, stripe_payment_id
- [ ] Order total: correctly calculated from items
- [ ] OrderItem: unit_price captured at time of order (immutable)

---

#### REPO-04: PaymentRepository Audit

**File:** `backend/app/repositories/payment.py` (if it exists) or methods in `OrderRepository`

**Key Methods to Validate:**
1. `set_payment_id(order_id, stripe_session_id, stripe_payment_id) → Order`
   - Called during checkout session creation
   - Updates both session_id and payment_id atomically
   - Sets status to PAYMENT_PROCESSING

2. `mark_payment_failed(stripe_payment_id) → Optional[Order]`
   - Finds order by stripe_payment_id (unique or indexed?)
   - Resets status to PENDING
   - Clears stripe_session_id? Or keeps for retry?

3. `mark_payment_completed(stripe_payment_id) → Order`
   - Sets status to PAID
   - Called by webhook handler
   - Idempotent: calling twice should be safe (same result)

**Transaction Integrity:**
- Idempotency key: Stripe webhook can fire multiple times
- Solution: Redis cache (Phase 2) + database state check
- Query: find order by stripe_payment_id, check if already PAID

**Validation Checklist:**
- [ ] `stripe_payment_id` is unique or indexed (fast lookup)
- [ ] Payment state updates are idempotent
- [ ] Order status never regresses (PAID → PENDING not allowed)
- [ ] Webhook deduplication: Redis cache checked first (Phase 2)
- [ ] Refund records: tracked separately (Order.status = REFUNDED)?
- [ ] Amount immutability: Order.total_amount never changes

---

#### REPO-05: Async/Await Patterns Validation (Cross-Repo)

**File:** All repositories in `backend/app/repositories/`

**Key Patterns to Check:**
1. **Every database call uses `await`**
   ```python
   # ✓ Good
   result = await self.db.execute(query)
   
   # ✗ Wrong (missing await)
   result = self.db.execute(query)
   ```

2. **AsyncSession, not sync Session**
   ```python
   # ✓ Good
   from sqlalchemy.ext.asyncio import AsyncSession
   self.db: AsyncSession
   
   # ✗ Wrong (sync session)
   from sqlalchemy.orm import Session
   self.db: Session
   ```

3. **No blocking I/O in async functions**
   ```python
   # ✗ Wrong (blocking time.sleep in async)
   async def get_user(user_id):
       time.sleep(1)  # Blocks event loop!
       return await self.db.execute(...)
   
   # ✓ Good (if delay needed, use await asyncio.sleep)
   import asyncio
   await asyncio.sleep(1)
   ```

4. **No sync context managers with async**
   ```python
   # ✗ Wrong (sync context with async)
   with open("file.txt") as f:
       return await self.db.execute(...)
   
   # ✓ Good (async context if supported)
   async with aiofiles.open("file.txt") as f:
       return await self.db.execute(...)
   ```

5. **Relationship loading: lazy vs eager**
   ```python
   # Check: how are relationships loaded?
   # book.seller → does this trigger separate query?
   # book.orders → does this load all orders?
   # order.items → does this load items with books?
   ```

**Detection Methods:**
- Use `grep` to find all `.execute()` calls and verify they have `await`
- Look for `import time` / `time.sleep()` in async functions
- Check relationship definitions: `lazy="dynamic"` vs `lazy="joined"`
- Verify: no blocking syscalls (socket, file I/O) in async code

---

### 1.3 Query Pattern Validation

**Common Patterns to Validate Across All Repos:**

#### Pattern 1: SELECT with Soft Delete Filtering
```python
# ✓ GOOD
query = select(Book).where(
    Book.id == book_id,
    Book.deleted_at.is_(None),
)
result = await self.db.execute(query)
return result.scalar_one_or_none()

# ✗ BAD: missing soft delete filter
query = select(Book).where(Book.id == book_id)

# ✗ BAD: using string column name
query = select(Book).where(Book.deleted_at == None)  # Wrong operator
```

#### Pattern 2: Pagination
```python
# ✓ GOOD
skip = (page - 1) * page_size
limit = page_size
query = select(Book).offset(skip).limit(limit)

# ✗ BAD: wrong skip calculation
skip = page * page_size  # Off by one error

# ✗ BAD: missing limit
query = select(Book).offset(skip)  # Could return millions of rows!
```

#### Pattern 3: COUNT Queries
```python
# ✓ GOOD (SQL COUNT)
query = select(func.count(Book.id)).where(Book.deleted_at.is_(None))
result = await self.db.execute(query)
return result.scalar() or 0

# ✗ BAD (Python len)
items = await book_repo.get_multi()
return len(items)  # Wrong for pagination!

# ✗ BAD (missing filter)
query = select(func.count(Book.id))  # Counts deleted books!
```

#### Pattern 4: Relationship Loading
```python
# ✓ GOOD (explicit loading)
query = select(Order).options(
    selectinload(Order.items).selectinload(OrderItem.book),
    selectinload(Order.buyer),
).where(Order.id == order_id)

# ✗ BAD (implicit lazy loading)
order = await order_repo.get(order_id)
for item in order.items:  # Separate query per item!
    print(item.book.title)

# ✗ BAD (dynamic relationship without explicit loading)
order = await order_repo.get(order_id)
items = order.items  # What gets loaded? Unclear!
```

#### Pattern 5: Transaction Boundaries
```python
# ✓ GOOD (service commits)
async def create_order(...) -> Order:
    order = await self.order_repo.create_with_items(...)
    await self.db.commit()  # Service commits
    return order

# ✗ BAD (repo commits)
async def create_with_items(...) -> Order:
    order = Order(...)
    db.add(order)
    await db.commit()  # Wrong layer!
    return order

# ✗ BAD (endpoint commits)
@router.post("/orders")
async def create_order(..., db: DBSession):
    order = await service.create_order(...)
    await db.commit()  # Service already committed!
```

---

## 2. Async/Await Patterns Validation (ASYNC-01 to ASYNC-04)

### 2.1 SQLAlchemy 2.0 Async Patterns (ASYNC-01)

**Requirement:** All SQLAlchemy queries use modern async patterns, not legacy sync patterns.

**Pattern 1: Engine Configuration**
```python
# ✓ GOOD (from backend/app/core/database.py)
engine = create_async_engine(
    settings.DATABASE_URL,  # Must be postgresql+asyncpg://
    echo=settings.DATABASE_ECHO,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
)

# ✗ BAD (sync driver)
engine = create_engine("postgresql://...")  # Not async!
```

**Validation:**
- [ ] `DATABASE_URL` uses `postgresql+asyncpg://`, not `postgresql://`
- [ ] Engine is created with `create_async_engine()`, not `create_engine()`
- [ ] Pool size: 20, max_overflow: 10 (configurable)
- [ ] `pool_pre_ping=True`: validates connections before use

**Pattern 2: Session Factory**
```python
# ✓ GOOD
async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

# ✗ BAD (sync sessionmaker)
from sqlalchemy.orm import sessionmaker  # Not async!
session_maker = sessionmaker(bind=engine)
```

**Validation:**
- [ ] `async_sessionmaker` used, not `sessionmaker`
- [ ] `class_=AsyncSession` specified
- [ ] `expire_on_commit=False`: objects remain usable after commit
- [ ] `autocommit=False`: explicit commit control
- [ ] `autoflush=False`: explicit flush control

**Pattern 3: Query Execution**
```python
# ✓ GOOD (SQLAlchemy 2.0 style)
from sqlalchemy import select
query = select(User).where(User.email == email)
result = await db.execute(query)
user = result.scalar_one_or_none()

# ✗ BAD (SQLAlchemy 1.x style)
user = await db.query(User).filter(User.email == email).first()

# ✗ BAD (missing await)
result = db.execute(query)  # Not awaited!
user = result.scalar_one_or_none()
```

**Validation Checklist:**
- [ ] All queries use `select()` constructor, not `.query()` method
- [ ] All `.execute()` calls are awaited
- [ ] Result extraction: `.scalar()`, `.scalar_one()`, `.scalar_one_or_none()` (not `.first()`)
- [ ] No `.all()` without pagination (can return millions of rows)

---

### 2.2 Session Lifecycle Management (ASYNC-02)

**Requirement:** Sessions are created, used, and closed correctly with no leaks.

**Pattern 1: Dependency Injection**
```python
# ✓ GOOD (from backend/app/core/dependencies.py)
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()

# ✗ BAD (session not closed)
async def get_db() -> AsyncSession:
    return await async_session_maker()  # Leak!

# ✗ BAD (no finally block)
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    session = await async_session_maker()
    yield session
    # Session never closed if exception occurs!
```

**Validation Checklist:**
- [ ] `get_db()` uses context manager (`async with`)
- [ ] `finally` block ensures `.close()` is called
- [ ] Generator yields session, not task
- [ ] No sessions created but not yielded

**Pattern 2: Session in Services**
```python
# ✓ GOOD (service receives session from dependency)
class OrderService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_order(...) -> Order:
        # Service uses provided session
        order = await self.order_repo.create_with_items(...)
        await self.db.commit()  # Service commits
        return order

# ✗ BAD (service creates session)
class OrderService:
    async def create_order(...) -> Order:
        async with async_session_maker() as db:  # Wrong layer!
            ...
```

**Validation Checklist:**
- [ ] Services receive `AsyncSession` via constructor
- [ ] Services never create sessions (`async_session_maker()`)
- [ ] Only endpoint dependencies create sessions
- [ ] Session passed to repository as `self.db`

**Pattern 3: Repository Usage**
```python
# ✓ GOOD (repo receives session)
class OrderRepository(BaseRepository):
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_with_items(...) -> Order:
        await self.db.flush()  # Not commit!
        return order

# ✗ BAD (repo creates session)
class OrderRepository:
    async def create_with_items(...) -> Order:
        async with async_session_maker() as db:  # Wrong!
```

**Validation Checklist:**
- [ ] Repositories receive `AsyncSession` in constructor
- [ ] Repositories never commit (only `.flush()`)
- [ ] All DB operations on `self.db`

---

### 2.3 Transaction Boundaries (ASYNC-03)

**Requirement:** Critical operations (orders, payments) respect transaction boundaries.

**Pattern 1: Order Creation (Multi-Step)**
```python
# ✓ GOOD (service commits atomically)
async def create_order(
    self,
    *,
    buyer: User,
    order_data: OrderCreate,
) -> OrderResponse:
    # 1. Validate stock
    for item in order_data.items:
        book = await self.book_repo.get(item.book_id)
        if book.quantity < item.quantity:
            raise InsufficientStockError(...)
    
    # 2. Create order (atomic)
    order = await self.order_repo.create_with_items(
        buyer_id=buyer.id,
        items=order_data.items,
        shipping_address=order_data.shipping_address,
        notes=order_data.notes,
    )
    
    # 3. Commit (all changes atomic)
    await self.db.commit()
    
    return OrderResponse.model_validate(order)

# ✗ BAD (commits inside repo)
async def create_with_items(...) -> Order:
    order = Order(...)
    db.add(order)
    await db.commit()  # Wrong! Service can't catch exception
    for item in items:
        db.add(OrderItem(...))
        await db.commit()  # Partial commit!
```

**Validation Checklist:**
- [ ] Service layer orchestrates multi-step operations
- [ ] All DB changes inside single `await db.commit()` call
- [ ] If any step fails, transaction rolls back
- [ ] Repositories use `.flush()`, not `.commit()`

**Pattern 2: Rollback Handling**
```python
# ✓ GOOD (exception handler catches and rolls back)
@app.exception_handler(ServiceError)
async def service_exception_handler(request, exc):
    await request.state.db.rollback()  # Explicit rollback
    return JSONResponse(status_code=status, body={...})

# ✓ GOOD (dependency finally block handles rollback)
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()  # Commit only if no exception
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# ✗ BAD (no rollback)
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    session = await async_session_maker()
    yield session
    await session.close()  # Doesn't rollback on error!
```

**Validation Checklist:**
- [ ] Dependency `get_db()` commits on success, rolls back on error
- [ ] Exception handlers don't double-rollback
- [ ] Connection is always closed (finally block)

**Pattern 3: Lock Handling (Phase 1 Integration)**
```python
# ✓ GOOD (from Phase 1 CRIT-01 fix)
async def create_with_items(...) -> Order:
    # Lock book row for update
    book_query = select(Book).where(
        Book.id == item.book_id,
        Book.deleted_at.is_(None),
    ).with_for_update()
    
    result = await self.db.execute(book_query)
    book = result.scalar_one_or_none()
    
    # Check stock inside lock
    if book.quantity < item.quantity:
        raise InsufficientStockError(...)
    
    # Deduct inside lock
    book.quantity -= item.quantity
    db.add(book)
    await db.flush()

# ✗ BAD (check without lock)
book = await self.book_repo.get(item.book_id)  # No lock!
if book.quantity < item.quantity:
    raise InsufficientStockError(...)
```

**Validation Checklist:**
- [ ] Stock-critical operations use `.with_for_update()` row-level lock
- [ ] Lock acquired before stock check
- [ ] Quantity deduction happens inside transaction
- [ ] CHECK constraint `quantity >= 0` at database level

---

### 2.4 Connection Pooling & Concurrency (ASYNC-04)

**Requirement:** Connection pool handles concurrent requests correctly.

**Configuration (from backend/app/core/database.py):**
```python
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=20,           # ← Number of pre-created connections
    max_overflow=10,        # ← Additional connections if needed
    pool_pre_ping=True,     # ← Check connection health
    pool_recycle=3600,      # ← Recycle connections after 1 hour
)
```

**Validation Checklist:**
- [ ] `pool_size=20`: reasonable for typical load (calculate: ~50 concurrent users / 2-3 requests each)
- [ ] `max_overflow=10`: allows burst traffic
- [ ] `pool_pre_ping=True`: prevents "connection closed" errors
- [ ] `pool_recycle=3600`: prevents stale connections (PostgreSQL defaults to closing after 30min)

**Pattern 1: Concurrent Request Handling**
```python
# ✓ GOOD (each request gets session from pool)
@app.get("/books/{book_id}")
async def get_book(
    book_id: UUID,
    db: DBSession,  # From pool
):
    book = await db.execute(...)
    return BookResponse.model_validate(book)

# Multiple concurrent requests:
# - Request 1: db=pool.checkout()
# - Request 2: db=pool.checkout()
# - Request 3: db=pool.checkout()  (waits if pool depleted)
# - Request 1 done: db.close() → pool.return()
```

**Validation Test Case:**
```python
# Test: 50 concurrent orders on same book with quantity=5
# Expected:
# - 5 orders succeed (quantity becomes 0)
# - 45 orders fail with 409 Conflict
# - No quantity < 0 in database
# - No connection pool exhaustion
```

**Concurrency Stress Test Strategy:**
```python
# Using pytest-asyncio and asyncio.gather
async def test_concurrent_orders_stress():
    tasks = [
        create_order(book_id=book.id, quantity=1)
        for _ in range(50)
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Count successes vs failures
    successes = sum(1 for r in results if not isinstance(r, Exception))
    failures = sum(1 for r in results if isinstance(r, Exception))
    
    # Should be approximately 5 successes, 45 failures
    assert successes <= 5
    assert book.quantity == 0  # All stock exhausted
```

---

## 3. Error Handling Consistency (ERROR-01 to ERROR-04)

### 3.1 Typed Exception Validation (ERROR-01)

**Requirement:** All 14+ typed exceptions are properly defined, raised, and caught.

**Exception Inventory (from Phase 2 VERIFICATION):**

| Exception Type | Inherit From | HTTP Status | Raised By | Purpose |
|---|---|---|---|---|
| EmailAlreadyExistsError | ServiceError | 409 Conflict | AuthService.register | Duplicate email |
| InvalidCredentialsError | ServiceError | 401 Unauthorized | AuthService.login | Wrong email or password |
| InvalidTokenError | ServiceError | 400 Bad Request | AuthService.verify_token | JWT invalid/expired |
| AccountInactiveError | ServiceError | 403 Forbidden | AuthService.login | Account deactivated |
| OAuthNotConfiguredError | ServiceError | 503 Service Unavailable | AuthService.oauth_* | Provider not configured |
| OAuthError | ServiceError | 502 Bad Gateway | AuthService.oauth_* | Provider API error |
| BookNotFoundError | ServiceError | 404 Not Found | BookService, OrderService | Book doesn't exist |
| NotBookOwnerError | ServiceError | 403 Forbidden | BookService | Not the seller |
| NotSellerError | ServiceError | 403 Forbidden | BookService | Not seller role |
| OrderNotFoundError | ServiceError | 404 Not Found | OrderService | Order doesn't exist |
| NotOrderOwnerError | ServiceError | 403 Forbidden | OrderService | Can't view/modify order |
| InsufficientStockError | ServiceError | 409 Conflict | OrderService | Stock exhausted |
| InvalidStatusTransitionError | ServiceError | 422 Unprocessable Entity | OrderService | State machine violation |
| OrderNotCancellableError | ServiceError | 422 Unprocessable Entity | OrderService | Can't cancel from current state |
| PaymentError | ServiceError | 402 Payment Required | PaymentService | Stripe failed |
| StripeWebhookError | ServiceError | 400 Bad Request | PaymentService | Webhook signature failed |
| RefundError | ServiceError | 402 Payment Required | PaymentService | Refund failed |

**Validation Checklist for Each Exception:**
- [ ] Defined in `app/services/exceptions.py`
- [ ] Inherits from `ServiceError`
- [ ] Has descriptive message
- [ ] Mapped to correct HTTP status in `app/main.py`
- [ ] Raised only from service layer, not endpoints
- [ ] Caught by global exception handler
- [ ] Test case verifies correct status code

**Pattern Validation:**
```python
# ✓ GOOD (from services/exceptions.py)
class EmailAlreadyExistsError(ServiceError):
    """Raised when attempting to register with duplicate email."""
    pass

# ✗ BAD (wrong inheritance)
class EmailAlreadyExistsError(Exception):
    pass

# ✗ BAD (raised from endpoint)
@router.post("/register")
async def register(...):
    if email_exists:
        raise EmailAlreadyExistsError(...)  # Wrong layer!

# ✓ GOOD (raised from service)
class AuthService:
    async def register(...) -> AuthResponse:
        if await self.user_repo.email_exists(email):
            raise EmailAlreadyExistsError(f"Email {email} already registered")
```

---

### 3.2 Error Response Consistency (ERROR-02)

**Requirement:** Error responses are consistent, with no information leaks.

**Response Format (standardized across all errors):**
```json
{
  "status_code": 409,
  "detail": "Email address is already registered."
}
```

**Or with validation errors (422):**
```json
{
  "status_code": 422,
  "detail": [
    {
      "field": "body → password",
      "message": "ensure this value has at least 8 characters",
      "type": "value_error.any_str.min_length"
    }
  ]
}
```

**No Information Leaks Checklist:**

1. **Email Enumeration Protection**
   - [ ] Login: same error for "email not found" and "wrong password"
   - [ ] Message: "Invalid email or password." (never "Email not found")
   - [ ] Status: 401 for both cases

2. **Authorization Errors**
   - [ ] No disclosure of whether resource exists
   - [ ] Message: "You do not have permission to perform this action." (generic)
   - [ ] Status: 403 Forbidden (not 404 Not Found)

3. **SQL/Technical Details**
   - [ ] No SQL error messages in responses
   - [ ] No database schema details
   - [ ] No stack traces (even in DEBUG mode for APIs)

4. **File Paths**
   - [ ] No file system paths
   - [ ] No module import paths
   - [ ] No configuration file locations

**Validation Test Cases:**
```python
# Test: Login with non-existent email vs wrong password
# Both should return 401 with "Invalid email or password."

# Test: Access order not owned
# Should return 403 (not 404)
# Message should not reveal order exists

# Test: Database error during query
# Should return 500 (not database exception)
# Message should not include SQL or table names
```

---

### 3.3 HTTP Status Code Mapping (ERROR-03)

**Requirement:** All endpoints return correct HTTP status codes per RESTful conventions.

**Complete Mapping (from Phase 2 VERIFICATION):**

| HTTP Status | Meaning | Exceptions | Example |
|---|---|---|---|
| 200 OK | Successful GET/PATCH | None | GET /api/v1/books/123 |
| 201 Created | Resource created | None | POST /api/v1/orders → 201 |
| 400 Bad Request | Malformed request | InvalidTokenError, StripeWebhookError | Bad JWT format |
| 401 Unauthorized | Auth required | InvalidCredentialsError | Wrong password |
| 402 Payment Required | Payment needed | PaymentError, RefundError | Stripe charge failed |
| 403 Forbidden | Access denied | AccountInactiveError, NotBookOwnerError, NotSellerError, NotOrderOwnerError | Can't modify others' books |
| 404 Not Found | Resource missing | BookNotFoundError, OrderNotFoundError | GET /api/v1/books/nonexistent |
| 409 Conflict | State conflict | EmailAlreadyExistsError, InsufficientStockError | Duplicate email, no stock |
| 422 Unprocessable Entity | Validation failed | InvalidStatusTransitionError, OrderNotCancellableError | Invalid request body |
| 429 Too Many Requests | Rate limited | (middleware) | 6th login attempt in 15 min |
| 500 Internal Server Error | Server error | Unhandled exceptions | Bug in code |
| 502 Bad Gateway | External API error | OAuthError | Google OAuth API down |
| 503 Service Unavailable | Service down | OAuthNotConfiguredError | OAuth not configured |

**Validation Checklist:**
- [ ] All service exceptions mapped in `app/main.py`
- [ ] Validation errors (Pydantic) return 422
- [ ] Rate limiting returns 429 with Retry-After header
- [ ] Authentication failures return 401 (not 403)
- [ ] Authorization failures return 403 (not 401)
- [ ] Missing resources return 404 (not 500)
- [ ] State conflicts return 409 (not 422)
- [ ] Invalid state transitions return 422 (not 409)

---

### 3.4 Edge Case Error Handling (ERROR-04)

**Requirement:** Error handling works correctly for edge cases and invalid inputs.

#### Edge Case 1: Concurrent Modification
```python
# Test: User deletes book while order being placed
# Expected: 404 Not Found (book was deleted)

# Test: Seller reduces book quantity to 0 while order pending
# Expected: Depends on lock strategy
# If order already locked book: order succeeds
# If order hasn't locked yet: 409 Conflict (insufficient stock)
```

#### Edge Case 2: Invalid State Transitions
```python
# Test: Try to cancel PAID order
# Expected: 422 Unprocessable Entity

# Test: Try to transition from DELIVERED to PENDING
# Expected: 422 Unprocessable Entity

# Test: Try to refund PENDING order
# Expected: 402 Payment Required (not PAID yet)
```

#### Edge Case 3: Malformed Requests
```python
# Test: Invalid UUID in URL
# Expected: 422 (validation error)

# Test: Missing required fields in request body
# Expected: 422 with field error details

# Test: Invalid enum value (e.g., status="invalid")
# Expected: 422 with enum validation error
```

#### Edge Case 4: Authentication Edge Cases
```python
# Test: Expired refresh token
# Expected: 401 Unauthorized

# Test: Using access token as refresh token
# Expected: 400 Bad Request (wrong token type)

# Test: Modifying JWT payload and re-signing with wrong key
# Expected: 401 Unauthorized (signature verification fails)
```

#### Edge Case 5: Pagination Edge Cases
```python
# Test: Page 0 (should be page 1)
# Expected: 422 validation error (page >= 1)

# Test: Page 1000000 with only 10 books
# Expected: 200 OK with empty list (not 404)

# Test: per_page > 100
# Expected: 422 validation error (max 100)
```

**Validation Test Pattern:**
```python
async def test_error_edge_case_concurrent_deletion():
    """Book deleted while order being placed."""
    book = await create_test_book(quantity=5)
    
    # Start order creation
    order_task = create_order(book_id=book.id, quantity=1)
    
    # Meanwhile, delete the book
    await delete_book(book.id)
    
    # Order should fail with 404 (book deleted)
    result = await order_task
    assert result.status_code == 404
    assert "not found" in result.json()["detail"].lower()
```

---

## 4. Testing Strategy for Phase 3

### 4.1 Unit Tests (Repository Logic)

**File:** `backend/tests/unit/test_repositories.py` (new or extended)

**Test Coverage:**
1. Query pattern validation
   - Soft delete filtering
   - Pagination calculations
   - Relationship loading

2. State consistency
   - Valid transitions
   - Constraint enforcement

3. Calculation correctness
   - Stock deduction
   - Total amount calculation
   - Pagination offsets

**Example Test Cases:**
```python
# test_repositories.py

def test_book_search_pagination_calculation():
    """Verify skip/limit calculation: page 2, per_page 20."""
    page, per_page = 2, 20
    expected_skip = (page - 1) * per_page
    
    assert expected_skip == 20
    # Page 1: skip=0, limit=20 (rows 0-19)
    # Page 2: skip=20, limit=20 (rows 20-39)

def test_soft_delete_filter_presence():
    """Verify all select queries filter deleted_at IS NULL."""
    # Use AST parsing or grep to verify
    # All select() calls should have:
    # .where(..., deleted_at.is_(None))

def test_order_state_machine_transitions():
    """Validate _ALLOWED_TRANSITIONS covers all states."""
    # All states should appear in _ALLOWED_TRANSITIONS
    # CANCELLED and REFUNDED should have empty transition sets

async def test_concurrent_order_creation():
    """Test with row-level locks prevents overselling."""
    # Use asyncio.gather() to create concurrent orders
    # Verify: exactly 5 succeed (quantity was 5)
    # Verify: rest fail with 409 Conflict
    # Verify: no negative quantity
```

---

### 4.2 Database Tests (Constraints, Migrations)

**File:** `backend/tests/DB/test_repositories_db.py` (new)

**Test Coverage:**
1. Constraint enforcement
   - UNIQUE(email) on User
   - FK constraints (seller_id, buyer_id, book_id)
   - CHECK(quantity >= 0) on Book
   - Enum column types

2. Soft delete behavior
   - Delete sets deleted_at
   - Queries filter deleted_at
   - Hard delete (if supported)

3. Relationship integrity
   - Cascade delete (seller deleted → books deleted?)
   - Orphaned detection

**Example Test Cases:**
```python
# test_repositories_db.py

@pytest.mark.asyncio
async def test_user_unique_email_constraint(db_session):
    """UNIQUE(email) constraint enforced."""
    user1 = User(email="test@example.com", ...)
    user2 = User(email="test@example.com", ...)
    
    db_session.add(user1)
    await db_session.commit()
    
    db_session.add(user2)
    with pytest.raises(IntegrityError):
        await db_session.commit()

@pytest.mark.asyncio
async def test_book_quantity_check_constraint(db_session):
    """CHECK(quantity >= 0) constraint."""
    book = Book(quantity=-1, ...)  # Violates constraint
    
    db_session.add(book)
    with pytest.raises(IntegrityError):
        await db_session.commit()

@pytest.mark.asyncio
async def test_soft_delete_filters_correctly(db_session):
    """Soft-deleted books not returned by queries."""
    book = await create_test_book()
    
    # Delete book (soft delete)
    book.deleted_at = datetime.utcnow()
    await db_session.commit()
    
    # Query should not find it
    query = select(Book).where(Book.id == book.id, Book.deleted_at.is_(None))
    result = await db_session.execute(query)
    assert result.scalar_one_or_none() is None

@pytest.mark.asyncio
async def test_book_foreign_key_constraint(db_session):
    """FK(seller_id) → users.id enforced."""
    seller_id = uuid.uuid4()  # Non-existent user
    book = Book(seller_id=seller_id, ...)
    
    db_session.add(book)
    with pytest.raises(IntegrityError):
        await db_session.commit()
```

---

### 4.3 Integration Tests (API Layer)

**File:** `backend/tests/integration/test_repositories_api.py` (extend existing)

**Test Coverage:**
1. Error responses end-to-end
2. No information leaks
3. Correct HTTP status codes
4. Edge cases with concurrent requests

**Example Test Cases:**
```python
# test_repositories_api.py

async def test_error_no_information_leak_login(async_client):
    """Same error for non-existent email vs wrong password."""
    await create_test_user(email="existing@example.com", password="Pass1234!")
    
    # Non-existent email
    resp1 = await async_client.post("/api/v1/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "Pass1234!",
    })
    
    # Wrong password
    resp2 = await async_client.post("/api/v1/auth/login", json={
        "email": "existing@example.com",
        "password": "WrongPassword",
    })
    
    # Both should be 401 with same message
    assert resp1.status_code == 401
    assert resp2.status_code == 401
    assert resp1.json()["detail"] == resp2.json()["detail"]

async def test_concurrent_order_creation_limited_stock(async_client):
    """Concurrent orders on limited stock book."""
    book = await create_test_book(quantity=5)
    
    # Try to create 10 concurrent orders
    tasks = [
        async_client.post("/api/v1/orders", json={
            "items": [{"book_id": str(book.id), "quantity": 1}],
            "shipping_address": {...},
        }, headers=buyer_headers)
        for _ in range(10)
    ]
    
    results = await asyncio.gather(*tasks)
    
    # Count 201 (success) vs 409 (conflict)
    successes = sum(1 for r in results if r.status_code == 201)
    conflicts = sum(1 for r in results if r.status_code == 409)
    
    assert successes == 5  # Only 5 items available
    assert conflicts == 5  # Rest get 409
    assert successes + conflicts == 10

async def test_soft_delete_book_not_found_in_search(async_client):
    """Deleted book doesn't appear in search."""
    seller_user = await create_test_user(role="seller")
    book = await create_test_book(seller=seller_user, title="Unique Title")
    
    # Search should find it
    resp = await async_client.get(f"/api/v1/books/search?query=Unique")
    assert len(resp.json()["data"]) == 1
    
    # Delete book
    await async_client.delete(f"/api/v1/books/{book.id}", headers=seller_headers)
    
    # Search should not find it
    resp = await async_client.get(f"/api/v1/books/search?query=Unique")
    assert len(resp.json()["data"]) == 0
```

---

## 5. Known Patterns from Phase 2

### 5.1 What Phase 2 Verified (Build On This)

**Service Layer Patterns (Verified):**
1. ✅ Typed exceptions raised from services
2. ✅ HTTP status mapping correct
3. ✅ Authorization checks (ownership, RBAC)
4. ✅ Transaction boundaries (`.commit()` in service)
5. ✅ Phase 1 integrations (race condition, webhook dedup, JWT versioning, rate limiting)

**What We Can Rely On:**
- Service layer code is correct
- All services call `.commit()` at the right time
- All services raise typed exceptions
- No service-layer bugs

**Watch Out For:**
- Repository layer might have async/await issues
- Queries might not have soft delete filtering
- Transaction boundaries might not be consistent
- Orphaned references might exist

### 5.2 Repository Integration Points

**How Services Use Repositories:**
```python
# Example: OrderService.create_order()
class OrderService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.order_repo = OrderRepository(db)  # ← Repo created here
        self.book_repo = BookRepository(db)     # ← Repo created here
    
    async def create_order(self, *, buyer: User, order_data: OrderCreate) -> Order:
        # 1. Validate stock (reads from book_repo)
        # 2. Call repo.create_with_items() (writes)
        # 3. Service commits (not repo)
        await self.db.commit()
```

**Key Integration Points:**
1. Services instantiate repositories with `AsyncSession`
2. Repositories use `await db.execute()`, `await db.flush()`
3. Services call `await db.commit()` after all changes
4. Exceptions propagate from repo → service → endpoint

---

### 5.3 Validation Architecture

**Layered Validation Approach:**

**Layer 1: Unit Tests (Pure Python)**
- Test query patterns (AST parsing, grep)
- Test state machine logic
- Test pagination calculations

**Layer 2: Database Tests (Real DB)**
- Test constraints (UNIQUE, FK, CHECK)
- Test soft delete filtering
- Test relationships

**Layer 3: Integration Tests (Full Stack)**
- Test API status codes
- Test error messages (no leaks)
- Test concurrent requests
- Test edge cases

**Layer 4: Manual Verification**
- Code review of async/await
- Code review of transaction boundaries
- Grep for common antipatterns

---

## 6. Automated Checks & Scripts

### 6.1 Async/Await Pattern Detection

**Script: Check all `.execute()` calls are awaited**
```bash
grep -r "\.execute(" backend/app/repositories/*.py | grep -v "await"
# Should return 0 results
```

**Script: Check no sync session usage**
```bash
grep -r "from sqlalchemy.orm import Session" backend/app/
# Should return 0 results in repositories

grep -r "from sqlalchemy.orm import sessionmaker" backend/app/
# Should return 0 results
```

**Script: Check all repositories inherit BaseRepository**
```bash
grep -r "class.*Repository" backend/app/repositories/*.py | grep -v BaseRepository
# Should return 0 results
```

---

### 6.2 Soft Delete Filtering Detection

**Script: Find select() calls without deleted_at filter**
```bash
# Find all select(User/Book/Order) statements
# Check if they include .where(..., deleted_at.is_(None))

# Manual: grep and visual inspection
grep -A5 "select(Book)" backend/app/repositories/book.py | grep -c deleted_at
```

---

### 6.3 Query Pattern Validation

**Checklist Template:**
```
□ All queries use select() constructor
□ All .execute() calls are awaited
□ Soft delete filtering present
□ Pagination: skip=(page-1)*size, limit=size
□ COUNT queries use SQL COUNT, not len()
□ Relationships loaded explicitly (selectinload)
□ Type hints on all methods
□ Docstrings on public methods
```

---

## 7. Success Criteria for Phase 3

### 7.1 Requirements Checklist

**REPO-01: UserRepository** ✓ Must validate:
- [ ] All queries use select()
- [ ] All .execute() calls awaited
- [ ] Soft delete filtering
- [ ] Email uniqueness constraint
- [ ] Password hashing correct

**REPO-02: BookRepository** ✓ Must validate:
- [ ] search_count() uses SQL COUNT
- [ ] Soft delete filtering
- [ ] Pagination correct
- [ ] Soft delete implementation
- [ ] Stock deduction with locks
- [ ] No orphaned books (FK constraint)

**REPO-03: OrderRepository** ✓ Must validate:
- [ ] create_with_items() atomic
- [ ] Row-level locks with .with_for_update()
- [ ] Pagination with correct count method
- [ ] Relationship loading

**REPO-04: PaymentRepository** ✓ Must validate:
- [ ] Idempotent payment state updates
- [ ] stripe_payment_id unique/indexed
- [ ] No state regressions

**REPO-05: Async Patterns** ✓ Must validate:
- [ ] All .execute() awaited
- [ ] AsyncSession, not Session
- [ ] No blocking I/O
- [ ] No sync context managers
- [ ] No N+1 queries

**ASYNC-01: SQLAlchemy 2.0** ✓ Must validate:
- [ ] select() constructor used
- [ ] AsyncSession configured
- [ ] Proper connection pooling

**ASYNC-02: Session Lifecycle** ✓ Must validate:
- [ ] get_db() creates/closes properly
- [ ] Finally block ensures cleanup
- [ ] No session leaks

**ASYNC-03: Transaction Boundaries** ✓ Must validate:
- [ ] Service commits, repo flushes
- [ ] Atomicity for multi-step ops
- [ ] Rollback on error

**ASYNC-04: Connection Pooling** ✓ Must validate:
- [ ] Pool size reasonable
- [ ] Concurrent requests handled
- [ ] No exhaustion under load

**ERROR-01: Typed Exceptions** ✓ Must validate:
- [ ] All 14+ exceptions defined
- [ ] Correct inheritance
- [ ] Proper raises/catches

**ERROR-02: No Info Leaks** ✓ Must validate:
- [ ] Email enumeration protected
- [ ] No SQL details
- [ ] No file paths
- [ ] No stack traces

**ERROR-03: HTTP Status Codes** ✓ Must validate:
- [ ] 401 vs 403 correct
- [ ] 404 vs 409 correct
- [ ] 422 vs 409 correct
- [ ] All 17 mappings tested

**ERROR-04: Edge Cases** ✓ Must validate:
- [ ] Concurrent modification
- [ ] Invalid transitions
- [ ] Malformed requests
- [ ] Authentication edge cases
- [ ] Pagination edge cases

---

## 8. Known Issues to Watch For

### From CONCERNS.md (Project Known Issues):

**CRITICAL (Relevant to Phase 3):**
- ❌ Order quantity race condition — Phase 1 fixed, but verify repository lock handling
- ❌ Order state transition validation — Must verify service layer + repository
- ❌ Audit logging gaps — May affect error handling consistency

**HIGH (Relevant to Phase 3):**
- ❌ Exception handling consistency — Phase 2 verified services, Phase 3 must verify repositories
- ❌ Pagination implementation — BookRepository.search_count() critical
- ❌ Orphaned order references — Check FK constraints

**MEDIUM (Relevant to Phase 3):**
- ❌ Pagination implementation — Already partially addressed
- ❌ Input sanitization — Repository layer should not sanitize (service layer does)
- ❌ Redis pool config — Rate limiter uses Redis (not critical for Phase 3)

---

## 9. Deliverables Checklist

**Phase 3 RESEARCH Deliverables (This Document):**
- ✅ Repository Layer Audit Strategy (5 repositories)
- ✅ Async/Await Patterns validation approach
- ✅ Error Handling Consistency methodology
- ✅ Testing Strategy (unit, DB, integration)
- ✅ Known Patterns from Phase 2
- ✅ Validation Architecture
- ✅ Success Criteria

**Next Phase (03-PLAN.md Will Define):**
- Repository audit tasks (REPO-01 to REPO-05)
- Async validation tasks (ASYNC-01 to ASYNC-04)
- Error handling tasks (ERROR-01 to ERROR-04)
- Test writing tasks
- Quality checks

---

## 10. Questions for Planning Phase

1. **Priority:** Which requirement matters most? (race condition, pagination, async)
2. **Scope:** Should we fix issues found, or just report?
3. **Coverage:** 100% coverage of all repos, or sample?
4. **Timeline:** How much time allocated for Phase 3?

---

**Research Completed:** 2026-04-18  
**Ready for:** Phase 3 Planning (03-PLAN.md)  
**Status:** ✅ Complete
