---
wave: 2
depends_on:
  - "Phase 2 SUMMARY (service layer verified)"
  - "PLAN-WAVE-1 (repositories audited)"
files_modified:
  - "backend/app/core/database.py"
  - "backend/app/core/dependencies.py"
  - "backend/app/repositories/*.py"
  - "backend/tests/integration/test_async_patterns.py"
  - "backend/tests/DB/test_session_lifecycle.py"
autonomous: true
---

# Phase 3 — Wave 2: Async Patterns & Session Lifecycle (ASYNC-01 to ASYNC-04)

**Wave:** 2 of 3  
**Requirements:** ASYNC-01, ASYNC-02, ASYNC-03, ASYNC-04  
**Goal:** Validate SQLAlchemy 2.0 async patterns, session lifecycle management, transaction boundaries, and connection pooling.  
**Status:** Ready to execute (can run in parallel with Wave 1)  

---

## Executive Summary

Wave 2 validates the async foundation across the backend. Phase 2 verified that services call `.commit()` correctly, but didn't validate:

1. ✅ SQLAlchemy 2.0 async configuration (engine, session factory)
2. ✅ Session lifecycle (creation, cleanup, no leaks)
3. ✅ Transaction boundaries for critical operations
4. ✅ Connection pooling under concurrent load

This wave ensures the async system is production-ready.

---

## Task 2-1: SQLAlchemy 2.0 Async Configuration (ASYNC-01)

### `<read_first>`
- `backend/app/core/database.py` (engine, session factory configuration)
- `backend/app/core/dependencies.py` (get_db dependency function)
- `backend/app/main.py` (app initialization, lifespan)
- `.planning/phases/03-backend-foundations/03-RESEARCH.md` (section 2.1 ASYNC-01)

### `<action>`

Validate SQLAlchemy 2.0 async configuration across the app:

**Pattern 1: Engine Configuration**

Verify `backend/app/core/database.py` contains:

```python
from sqlalchemy.ext.asyncio import create_async_engine

engine = create_async_engine(
    settings.DATABASE_URL,  # Must be postgresql+asyncpg://
    echo=settings.DATABASE_ECHO,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
)
```

**Required Checks:**
- `DATABASE_URL` environment variable format:
  - ✅ `postgresql+asyncpg://user:pass@host:5432/db` (correct async driver)
  - ❌ `postgresql://...` (wrong, sync driver)
  - ❌ `postgresql+psycopg2://...` (wrong, sync driver — this is for Alembic only)
- Engine uses `create_async_engine()`, not `create_engine()`
- Pool configuration:
  - `pool_size=20` (or reasonable value for expected concurrency)
  - `max_overflow=10` (allows bursting beyond pool_size)
  - `pool_pre_ping=True` (validates connections before use)
  - Optional: `pool_recycle=3600` (recycle after 1 hour)

**Pattern 2: Session Factory**

Verify session factory configuration:

```python
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)
```

**Required Checks:**
- Uses `async_sessionmaker`, not `sessionmaker`
- `class_=AsyncSession` (async session class)
- `expire_on_commit=False` (objects remain usable after commit)
- `autocommit=False` (explicit commit control)
- `autoflush=False` (explicit flush control)

**Pattern 3: Query Patterns**

Verify all query patterns in codebase use SQLAlchemy 2.0 style:

```python
# ✓ GOOD: select() constructor
from sqlalchemy import select
query = select(User).where(User.email == email)
result = await db.execute(query)
user = result.scalar_one_or_none()

# ✗ BAD: SQLAlchemy 1.x style
user = await db.query(User).filter(User.email == email).first()
```

**Verification Checklist:**
- [ ] `DATABASE_URL` uses `postgresql+asyncpg://` in dev/test
- [ ] Engine: `create_async_engine()` used (not `create_engine()`)
- [ ] Pool size: 20 (or documented reason for different value)
- [ ] Max overflow: 10 (allows bursting)
- [ ] `pool_pre_ping=True` (validates connections)
- [ ] Session factory: `async_sessionmaker` with `AsyncSession` class
- [ ] All queries use `select()` constructor
- [ ] All `.execute()` calls are `await`ed
- [ ] Result extraction: `.scalar()`, `.scalar_one_or_none()`, `.all()` (not `.first()`)

### `<acceptance_criteria>`

Command: `grep "DATABASE_URL" backend/app/core/database.py`
- Result: Should contain `asyncpg://` (async driver indicator)

Command: `grep "create_async_engine\|create_engine" backend/app/core/database.py`
- Result: Should show `create_async_engine` (not create_engine)

Command: `grep "pool_size\|pool_pre_ping" backend/app/core/database.py`
- Result: Should show `pool_size=20` (or documented value) and `pool_pre_ping=True`

Command: `grep "async_sessionmaker\|sessionmaker" backend/app/core/database.py`
- Result: Should show `async_sessionmaker` (not plain sessionmaker)

File read: Verify `backend/app/core/database.py` contains full configuration as shown above

---

## Task 2-2: Session Lifecycle Management (ASYNC-02)

### `<read_first>`
- `backend/app/core/dependencies.py` (get_db function)
- `backend/app/core/database.py` (async_session_maker)
- `backend/app/main.py` (exception handlers, lifespan)
- `.planning/phases/03-backend-foundations/03-RESEARCH.md` (section 2.2 ASYNC-02)

### `<action>`

Validate session creation, lifecycle, and cleanup:

**Pattern 1: Dependency Injection (get_db)**

Verify `backend/app/core/dependencies.py` contains:

```python
from sqlalchemy.ext.asyncio import AsyncSession
from typing import AsyncGenerator

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
```

**Required Checks:**
- Uses `async with` context manager for automatic resource management
- `try/finally` ensures `.close()` is called even on exception
- Yields the session (not returns)
- Returns `AsyncGenerator[AsyncSession, None]` type
- No manual commit/rollback in dependency (that's handled elsewhere)

**Pattern 2: Endpoint Session Usage**

Verify endpoints receive session via dependency injection:

```python
@router.post("/orders")
async def create_order(
    order_data: OrderCreate,
    current_user: ActiveUser,
    db: DBSession,  # From get_db() dependency
):
    service = OrderService(db)
    order = await service.create_order(buyer=current_user, order_data=order_data)
    return order
```

**Required Checks:**
- Endpoints receive `db` from `Depends(get_db)`
- Services receive `AsyncSession` in constructor
- Services never create sessions
- Session passed to repositories

**Pattern 3: Service Session Usage**

Verify services receive session and manage transaction boundary:

```python
class OrderService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.order_repo = OrderRepository(db)
    
    async def create_order(...) -> OrderResponse:
        # Service uses session
        order = await self.order_repo.create_with_items(...)
        await self.db.commit()  # Service commits!
        return OrderResponse.model_validate(order)
```

**Required Checks:**
- Services receive `AsyncSession` (not create it)
- Services call `await self.db.commit()` after business logic
- Repositories use `await self.db.flush()` (not commit)
- Commit happens at service layer (transaction boundary)

**Pattern 4: Exception Handling & Rollback**

Verify exception handling includes rollback:

```python
@app.exception_handler(ServiceError)
async def service_exception_handler(request, exc):
    # Rollback on error
    if hasattr(request.state, 'db'):
        await request.state.db.rollback()
    return JSONResponse(
        status_code=_SERVICE_EXCEPTION_MAP[type(exc)],
        content={"detail": str(exc)}
    )
```

**OR** (better approach): Let get_db's finally block handle it via the context manager.

**Required Checks:**
- Exception handlers don't crash if DB not available
- Session closed in finally block (even on exception)
- Rollback happens automatically if commit not called
- No double-rollback

**Verification Checklist:**
- [ ] `get_db()` uses `async with async_session_maker() as session:`
- [ ] `finally` block ensures `await session.close()`
- [ ] Type: `AsyncGenerator[AsyncSession, None]`
- [ ] Endpoints receive `db: DBSession` from `Depends(get_db)`
- [ ] Services receive session in `__init__`, never create it
- [ ] Repositories never create sessions
- [ ] Services call `await self.db.commit()` after logic
- [ ] Repositories call `await self.db.flush()` (not commit)
- [ ] Exception handlers don't double-rollback

### `<acceptance_criteria>`

Command: `grep -A8 "async def get_db" backend/app/core/dependencies.py`
- Result: Shows context manager with try/finally block

Command: `grep "async with async_session_maker" backend/app/core/dependencies.py`
- Result: 1 match (context manager used)

Command: `grep -c "await session.close()" backend/app/core/dependencies.py`
- Result: 1 (in finally block)

Code read: Verify get_db() follows pattern above with context manager, try/finally, yields session

---

## Task 2-3: Transaction Boundaries (ASYNC-03)

### `<read_first>`
- `backend/app/services/order_service.py` (create_order, state transitions)
- `backend/app/services/payment_service.py` (webhook handling)
- `backend/app/repositories/order_repository.py` (create_with_items)
- `.planning/phases/03-backend-foundations/03-RESEARCH.md` (section 2.3 ASYNC-03)
- Phase 2 SUMMARY (service layer commit/flush verified)

### `<action>`

Validate transaction boundaries for critical multi-step operations:

**Pattern 1: Order Creation (Multi-Step Atomic Operation)**

Verify OrderService.create_order() pattern:

```python
async def create_order(
    self,
    *,
    buyer: User,
    order_data: OrderCreate,
) -> OrderResponse:
    # 1. Validate stock (reads from repos)
    for item in order_data.items:
        book = await self.book_repo.get(item.book_id)
        if book.quantity < item.quantity:
            raise InsufficientStockError(...)
    
    # 2. Create order (calls repo with lock)
    order = await self.order_repo.create_with_items(
        buyer_id=buyer.id,
        items=order_data.items,
        shipping_address=order_data.shipping_address,
        notes=order_data.notes,
    )
    
    # 3. Commit ONCE for all changes
    await self.db.commit()
    
    # 4. Return response
    return OrderResponse.model_validate(order)
```

**Required Checks:**
- All database changes happen within single `await self.db.commit()` call
- If any step fails (exception), transaction rolls back automatically
- Repository calls use `await self.db.flush()` (not commit)
- Service commits after all steps succeed
- Exception propagates back to endpoint exception handler

**Pattern 2: Rollback on Error**

Verify exception flow:

```python
# If exception occurs:
# 1. Service catches and re-raises typed exception
# 2. Endpoint doesn't call commit (exception propagates)
# 3. get_db() finally block closes session
# 4. Session auto-rollbacks (because commit never called)
```

**Required Checks:**
- Exceptions propagate from repo → service → endpoint
- No catch-and-hide anywhere
- Commit only happens on success path
- Rollback automatic (no explicit rollback needed)

**Pattern 3: Lock Handling (Phase 1 Integration)**

Verify row-level locks in create_with_items:

```python
async def create_with_items(...) -> Order:
    for item in items:
        # 1. Lock the book row
        book_query = select(Book).where(
            Book.id == item.book_id,
            Book.deleted_at.is_(None),
        ).with_for_update()
        
        result = await self.db.execute(book_query)
        book = result.scalar_one_or_none()
        
        # 2. Check stock INSIDE lock
        if book.quantity < item.quantity:
            raise InsufficientStockError(...)
        
        # 3. Deduct quantity INSIDE lock
        book.quantity -= item.quantity
        self.db.add(book)
        await self.db.flush()
    
    # 4. Create order and items
    order = Order(...)
    for item in items:
        order_item = OrderItem(...)
        order.items.append(order_item)
    
    self.db.add(order)
    await self.db.flush()
    return order
```

**Required Checks:**
- `.with_for_update()` used on Book SELECT
- Stock check happens AFTER lock acquired
- Quantity deduction happens INSIDE transaction
- CHECK constraint `quantity >= 0` at DB level
- Lock released when transaction commits

**Pattern 4: Idempotency (Webhook Handling)**

Verify payment webhook handling:

```python
async def mark_payment_completed(self, stripe_payment_id: str) -> Order:
    # 1. Find order by stripe_payment_id
    order = await self.order_repo.get_by_stripe_payment_id(stripe_payment_id)
    
    # 2. Check current status
    if order.status == OrderStatus.PAID:
        # Already processed, return
        return order
    
    # 3. Update status
    order.status = OrderStatus.PAID
    await self.db.flush()
    
    # 4. Commit (or service commits after this returns)
    await self.db.commit()
    
    return order
```

**Required Checks:**
- Idempotent: calling twice returns same result
- State never regresses (PAID → PENDING not allowed)
- Redis cache (Phase 2) prevents duplicate webhook processing
- Database state also idempotent (in case cache misses)

**Verification Checklist:**
- [ ] Order creation: all changes in single `await db.commit()` call
- [ ] Payment updates: idempotent (safe to call multiple times)
- [ ] Exceptions propagate: no catch-and-hide
- [ ] Commit only on success: rollback automatic on error
- [ ] Locks acquired before stock checks
- [ ] Lock duration: minimal (released at commit)
- [ ] No nested transactions (PostgreSQL doesn't support them well)
- [ ] Service commits after all repos return

### `<acceptance_criteria>`

Code read: OrderService.create_order() contains all 4 steps in correct order
- Step 1: Validate stock (reads only)
- Step 2: Call repo.create_with_items (repo flushes)
- Step 3: `await self.db.commit()` (single call)
- Step 4: Return response

Code read: PaymentService.mark_payment_completed() is idempotent
- Checks current status before updating
- Returns early if already PAID

Code read: OrderRepository.create_with_items() uses locks
- `.with_for_update()` on Book SELECT
- Stock check after lock

---

## Task 2-4: Connection Pooling & Concurrency (ASYNC-04)

### `<read_first>`
- `backend/app/core/database.py` (pool_size, max_overflow, pool_pre_ping config)
- `.planning/phases/03-backend-foundations/03-RESEARCH.md` (section 2.4 ASYNC-04)
- Backend test infrastructure for concurrent testing

### `<action>`

Validate connection pool handles concurrent requests correctly:

**Configuration Validation:**

Verify pool configuration in `backend/app/core/database.py`:

```python
engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=20,           # Pre-created connections
    max_overflow=10,        # Additional connections on demand
    pool_pre_ping=True,     # Validate connections before use
    pool_recycle=3600,      # Recycle after 1 hour (optional)
)
```

**Configuration Sizing:**

Reasonable pool_size calculation:
- Estimate concurrent users: 100
- Avg requests per user: 2-3
- Total concurrent DB operations: ~50-150
- Pool size: 20 handles baseline + queue for queue
- Max overflow: 10 handles burst traffic

**Verification Checklist:**
- [ ] `pool_size=20` (or documented reason for different value)
- [ ] `max_overflow=10` (allow bursting)
- [ ] `pool_pre_ping=True` (prevent stale connection errors)
- [ ] `pool_recycle=3600` (optional, recycle after 1 hour)
- [ ] No hardcoded connection strings (use env vars)

**Concurrent Request Pattern:**

Verify behavior under concurrent load:

```python
# Each incoming request:
# 1. FastAPI dispatcher assigns request to async task
# 2. Dependency injection calls get_db()
# 3. get_db() calls async_session_maker()
# 4. Session factory checks out connection from pool
# 5. Request executes with session
# 6. Finally block closes session, returns connection to pool

# Pool behavior:
# - Up to pool_size (20) concurrent requests: each gets connection
# - 21st request: waits in queue
# - If max overflow (10): up to 30 total concurrent connections
# - 31st request: waits or fails (depends on timeout config)
```

**Stress Test Pattern:**

Design test for concurrent order creation:

```python
async def test_concurrent_orders_with_pool_exhaustion():
    """Test: 50 concurrent orders on book with quantity=5."""
    book = await create_test_book(quantity=5)
    
    # Create 50 concurrent order requests
    tasks = [
        create_order(book_id=book.id, quantity=1)
        for _ in range(50)
    ]
    
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Verify results:
    successes = sum(1 for r in results if not isinstance(r, Exception))
    failures = sum(1 for r in results if isinstance(r, Exception))
    
    # Should have:
    # - ~5 successes (quantity=5)
    # - ~45 failures (InsufficientStockError)
    # - 0 unhandled exceptions (connection exhaustion)
    assert successes <= 5
    assert failures >= 45
    assert book.quantity == 0
```

**Verification Checklist:**
- [ ] Pool configuration reasonable for expected load
- [ ] Pre-ping enabled (catches stale connections)
- [ ] Pool recycling configured (prevents PostgreSQL 30min timeout)
- [ ] Concurrent requests handled without exhaustion
- [ ] Stress test passes (50 concurrent requests on 5 items)
- [ ] No "connection pool exhausted" errors
- [ ] No connection leaks (sessions properly closed)

### `<acceptance_criteria>`

Command: `grep "pool_size\|max_overflow\|pool_pre_ping" backend/app/core/database.py`
- Result: Shows pool configuration with reasonable values

Code read: Verify pool configuration meets checklist items above

Test run: `pytest backend/tests/DB/test_session_lifecycle.py -v`
- Result: All session lifecycle tests PASS

Test run: `pytest backend/tests/integration/test_async_patterns.py::test_concurrent_orders -v`
- Result: Concurrent stress test PASSES without pool exhaustion

---

## Task 2-5: Async Pattern Automated Checks

### `<read_first>`
- All repository files: `backend/app/repositories/*.py`
- All service files: `backend/app/services/*.py`
- `.planning/phases/03-backend-foundations/03-RESEARCH.md` (section 6 Automated Checks)

### `<action>`

Run systematic automated checks for async/await antipatterns:

**Check 1: Missing await on .execute()**

```bash
# Find all .execute() calls without await
grep -n "\.execute(" backend/app/repositories/*.py backend/app/services/*.py | grep -v "await"
```

Expected result: 0 matches

**Check 2: Missing await on .flush()**

```bash
# Find all .flush() calls without await
grep -n "\.flush(" backend/app/repositories/*.py backend/app/services/*.py | grep -v "await"
```

Expected result: 0 matches

**Check 3: Missing await on .commit()**

```bash
# Find all .commit() calls without await
grep -n "\.commit(" backend/app/services/*.py | grep -v "await"
```

Expected result: 0 matches (all in services should be awaited)

**Check 4: Sync Session imports**

```bash
# Find sync Session usage in async files
grep -n "from sqlalchemy.orm import Session" backend/app/repositories/*.py backend/app/services/*.py
grep -n "from sqlalchemy import Session" backend/app/repositories/*.py backend/app/services/*.py
```

Expected result: 0 matches (only AsyncSession allowed in async code)

**Check 5: Sync session creation**

```bash
# Find sync sessionmaker
grep -n "sessionmaker(" backend/app/repositories/*.py backend/app/services/*.py | grep -v "async_sessionmaker"
```

Expected result: 0 matches

**Check 6: Blocking I/O**

```bash
# Find time.sleep or synchronous file operations
grep -n "time\.sleep\|import time" backend/app/repositories/*.py backend/app/services/*.py
grep -n "^[[:space:]]*open(" backend/app/repositories/*.py backend/app/services/*.py
grep -n "requests\." backend/app/repositories/*.py backend/app/services/*.py
```

Expected result: 0 matches (use async alternatives or run_in_executor)

**Check 7: Implicit lazy loading**

```bash
# Find potential N+1 patterns (property access on ORM object)
# This requires manual review, grep can't detect it reliably
# Look for patterns like: order.items without explicit load
```

Manual check: Review large loop patterns in services/repositories for potential N+1 queries

**Check 8: AsyncSession type hints**

```bash
# Verify all repositories type hint self.db as AsyncSession
grep -n "self\.db:" backend/app/repositories/*.py | grep -v "AsyncSession"
```

Expected result: 0 matches (all must be `self.db: AsyncSession`)

### `<acceptance_criteria>`

Command: `grep "\.execute(" backend/app/repositories/*.py backend/app/services/*.py | grep -v "await" | wc -l`
- Result: 0

Command: `grep "\.flush(" backend/app/repositories/*.py backend/app/services/*.py | grep -v "await" | wc -l`
- Result: 0

Command: `grep "\.commit(" backend/app/services/*.py | grep -v "await" | wc -l`
- Result: 0

Command: `grep -r "from sqlalchemy.orm import Session" backend/app/repositories/ backend/app/services/ | wc -l`
- Result: 0

Command: `grep -r "time\.sleep" backend/app/repositories/ backend/app/services/ | wc -l`
- Result: 0

Manual code review: Verify no obvious N+1 patterns in service/repository code

---

## Task 2-6: Async Pattern Test Suite

### `<read_first>`
- `backend/tests/DB/test_session_lifecycle.py` (or create new)
- `backend/tests/integration/test_async_patterns.py` (or create new)
- `.planning/phases/03-backend-foundations/03-RESEARCH.md` (section 4.3 Integration Tests)

### `<action>`

Create/extend test suite for async patterns and session lifecycle:

**Test Suite 1: Session Lifecycle Tests**

```python
# backend/tests/DB/test_session_lifecycle.py

@pytest.mark.asyncio
async def test_session_creation_and_cleanup(async_session_factory):
    """Session created and closed properly."""
    session = async_session_factory()
    assert session is not None
    await session.close()

@pytest.mark.asyncio
async def test_session_rollback_on_exception():
    """Exception in transaction causes rollback."""
    user = await create_test_user(email="test@example.com")
    
    try:
        async with async_session_factory() as session:
            new_user = User(email="test@example.com", ...)  # Duplicate
            session.add(new_user)
            await session.commit()  # Should fail
    except IntegrityError:
        pass  # Expected
    
    # Verify: user still single (rollback worked)
    count = await count_users_with_email("test@example.com")
    assert count == 1

@pytest.mark.asyncio
async def test_session_commit_on_success():
    """Successful operation commits data."""
    user = await create_test_user(email="newuser@example.com")
    
    async with async_session_factory() as session:
        query = select(User).where(User.email == "newuser@example.com")
        result = await session.execute(query)
        found = result.scalar_one_or_none()
        assert found is not None
        assert found.id == user.id
```

**Test Suite 2: Transaction Boundary Tests**

```python
# backend/tests/DB/test_transaction_boundaries.py

@pytest.mark.asyncio
async def test_order_creation_atomicity():
    """Order creation all-or-nothing."""
    book = await create_test_book(quantity=1)
    
    # This should fail (2 items but only 1 available)
    with pytest.raises(InsufficientStockError):
        await create_order_with_items([
            {"book_id": book.id, "quantity": 1},
            {"book_id": book.id, "quantity": 1},
        ])
    
    # Verify: book.quantity unchanged (no partial deduction)
    book = await get_book(book.id)
    assert book.quantity == 1

@pytest.mark.asyncio
async def test_order_with_lock_prevents_overselling():
    """Row-level locks prevent concurrent overselling."""
    book = await create_test_book(quantity=2)
    
    # Start two concurrent orders
    tasks = [
        create_order(book_id=book.id, quantity=1),
        create_order(book_id=book.id, quantity=1),
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Both should succeed (total 2)
    successes = sum(1 for r in results if not isinstance(r, Exception))
    assert successes == 2
    
    # Verify: book.quantity now 0
    book = await get_book(book.id)
    assert book.quantity == 0

@pytest.mark.asyncio
async def test_payment_webhook_idempotency():
    """Webhook handling idempotent."""
    order = await create_test_order(status=OrderStatus.PAYMENT_PROCESSING)
    stripe_payment_id = "pi_12345"
    
    # First webhook
    result1 = await mark_payment_completed(stripe_payment_id)
    assert result1.status == OrderStatus.PAID
    
    # Duplicate webhook
    result2 = await mark_payment_completed(stripe_payment_id)
    assert result2.status == OrderStatus.PAID
    
    # No error, same result
    assert result1.id == result2.id
```

**Test Suite 3: Concurrent Load Tests**

```python
# backend/tests/integration/test_async_patterns.py

@pytest.mark.asyncio
async def test_concurrent_orders_stress():
    """50 concurrent orders on book with quantity=5."""
    book = await create_test_book(quantity=5)
    
    tasks = [
        create_order(book_id=book.id, quantity=1)
        for _ in range(50)
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    successes = sum(1 for r in results if not isinstance(r, Exception))
    failures = sum(1 for r in results if isinstance(r, Exception))
    
    assert successes == 5  # Only 5 items available
    assert failures == 45  # Rest get InsufficientStockError
    
    # Verify: no negative quantity
    book = await get_book(book.id)
    assert book.quantity == 0

@pytest.mark.asyncio
async def test_concurrent_user_signup():
    """100 concurrent signup attempts."""
    email = f"concurrent{uuid.uuid4()}@example.com"
    
    tasks = [
        signup(email=email, password="TestPass1")
        for _ in range(100)
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    successes = sum(1 for r in results if not isinstance(r, Exception))
    failures = sum(1 for r in results if isinstance(r, Exception))
    
    assert successes == 1  # Only first should succeed
    assert failures == 99  # Rest get EmailAlreadyExistsError
    
    # Verify: single user created
    count = await count_users_with_email(email)
    assert count == 1
```

**Verification Checklist:**
- [ ] Session lifecycle tests: creation, closure, cleanup
- [ ] Rollback tests: exception causes rollback
- [ ] Commit tests: success persists data
- [ ] Atomicity tests: multi-step operations all-or-nothing
- [ ] Lock tests: concurrent operations correct
- [ ] Idempotency tests: duplicate operations safe
- [ ] Concurrent stress tests: 50-100 concurrent ops
- [ ] All tests async: `@pytest.mark.asyncio` or `asyncio_mode="auto"`
- [ ] All tests pass: no timeouts, no connection exhaustion

### `<acceptance_criteria>`

Command: `pytest backend/tests/DB/test_session_lifecycle.py -v`
- Result: All tests PASS

Command: `pytest backend/tests/integration/test_async_patterns.py -v`
- Result: All tests PASS, including concurrent stress tests

Command: `pytest backend/tests/DB/ backend/tests/integration/ --timeout=30 -v`
- Result: All tests complete within timeout (no hangs from pool exhaustion)

---

## Verification Criteria (Wave 2 Complete)

All tasks in this wave must pass these checks:

### Requirement Coverage
- ✅ ASYNC-01: SQLAlchemy 2.0 async patterns validated
- ✅ ASYNC-02: Session lifecycle management correct
- ✅ ASYNC-03: Transaction boundaries validated
- ✅ ASYNC-04: Connection pooling verified

### Code Quality
- ✅ All `.execute()` calls awaited
- ✅ All `.flush()` and `.commit()` calls awaited
- ✅ AsyncSession used throughout (no sync Session)
- ✅ No blocking I/O in async functions
- ✅ No N+1 queries via lazy loading

### Test Coverage
- ✅ Session lifecycle tests pass
- ✅ Transaction atomicity tests pass
- ✅ Concurrent stress tests pass (50+ concurrent ops)
- ✅ Idempotency tests pass
- ✅ No connection pool exhaustion errors

### Must-Haves (Goal-Backward Verification)
- ✅ **Async correctness:** All DB operations properly awaited
- ✅ **Session cleanup:** Sessions always closed, even on error
- ✅ **Transaction safety:** Multi-step ops atomic (all-or-nothing)
- ✅ **Concurrent safety:** Row-level locks prevent race conditions
- ✅ **Scalability:** Pool handles 50+ concurrent requests without exhaustion

---

**Wave 2 Status:** Ready to execute  
**Executor:** /gsd-execute-phase (Wave 2)  
**Can Run In Parallel With:** Wave 1 (Wave 1 depends on Wave 2, so careful ordering needed)  
**Next:** Wave 3 (Error handling consistency) depends on Wave 1 & 2 completion
