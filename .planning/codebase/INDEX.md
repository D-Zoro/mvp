# Books4All Codebase Documentation Index

**Generated:** 2026-04-18  
**Focus:** Architecture & Directory Structure

---

## Document Overview

### 📐 ARCHITECTURE.md (824 lines)
**Deep dive into how the system is designed and operates**

Best for:
- Understanding request flow from API to database
- Learning about business logic enforcement (order state machine, stock validation)
- Studying design patterns (DI, repositories, typed exceptions)
- Understanding authentication & authorization
- Reviewing error handling strategy

Key Sections:
- Three-layer architecture (API → Service → Repository → DB)
- Complete order creation data flow walkthrough
- JWT token structure and RBAC patterns
- Database soft delete pattern
- Concurrency & consistency safeguards
- Testing layers (unit, DB, integration)

**Start here if:** You need to understand "how does this system work?"

---

### 📂 STRUCTURE.md (1,304 lines)
**File-by-file breakdown of every directory and module**

Best for:
- Finding where to add new code
- Understanding naming conventions
- Learning file organization patterns
- Onboarding new developers
- Quick reference lookups

Key Sections:
- Complete repository root layout
- Backend modules:
  - `app/main.py` (FastAPI initialization)
  - `app/core/` (config, database, security, dependencies)
  - `app/models/` (all 6 ORM entities)
  - `app/schemas/` (request/response validation)
  - `app/repositories/` (data access layer)
  - `app/services/` (business logic)
  - `app/api/v1/endpoints/` (HTTP routes)
  - `alembic/` (database migrations)
  - `tests/` (unit, DB, integration)
- Frontend modules:
  - `app/` (Next.js App Router pages)
  - `src/components/` (React components)
  - `src/lib/` (API client, utilities)
  - `src/store/` (Zustand state management)
  - `src/providers/` (context providers)
- Naming conventions (Python, TypeScript)
- Feature addition checklist

**Start here if:** You need to know "where does this code go?"

---

## Quick Navigation by Task

### 🆕 "I want to add a new feature"

1. **Understand the flow:** Read ARCHITECTURE.md → "Complete Request Example"
2. **Find where to put code:** Read STRUCTURE.md → "Quick Checklist: Adding a New Feature"
3. **Follow patterns:** Check STRUCTURE.md → relevant section (services, models, etc.)

**Example: Add a "Book Wishlist" feature**
- Define Pydantic schemas in `app/schemas/wishlist.py`
- Create SQLAlchemy model in `app/models/wishlist.py`
- Create repository in `app/repositories/wishlist.py`
- Create service in `app/services/wishlist_service.py`
- Add endpoints in `app/api/v1/endpoints/wishlist.py`

### 🐛 "I'm debugging an issue"

1. **Understand the error:** Check ARCHITECTURE.md → "Exception Handling Strategy"
2. **Trace the request:** Read ARCHITECTURE.md → "Complete Request Example"
3. **Find the relevant code:** Use STRUCTURE.md → module breakdown

**Example: "OrderNotFoundError when fetching order"**
- API endpoint: `app/api/v1/endpoints/orders.py`
- Service logic: `app/services/order_service.py`
- Data access: `app/repositories/order.py`
- Model: `app/models/order.py`

### 📚 "I need to understand a component"

Use STRUCTURE.md to find the component, then:
1. Check its docstrings and type hints
2. Review examples in test files
3. Look at related components
4. Cross-reference ARCHITECTURE.md for patterns

### 🧪 "I'm writing tests"

1. **Test patterns:** ARCHITECTURE.md → "Testing Architecture"
2. **Test location:** STRUCTURE.md → "backend/tests/" section
3. **Dependency mocking:** Check existing tests in `tests/unit/`, `tests/DB/`, `tests/integration/`

### 🔧 "I'm refactoring code"

1. **File size limits:** STRUCTURE.md → "File Size Guidelines"
2. **Naming conventions:** STRUCTURE.md → "Naming Conventions"
3. **Import organization:** STRUCTURE.md → "Import Organization"

---

## Architecture Highlights

### Three-Layer Pattern
```
HTTP Request
    ↓
API Endpoint (FastAPI router)
    ├─ Validate request (Pydantic schema)
    ├─ Extract auth context (current user, role)
    └─ Call service
    ↓
Service Layer (business logic)
    ├─ Enforce business rules
    ├─ Call repositories
    └─ Raise typed exceptions
    ↓
Repository Layer (data access)
    ├─ Execute async SQLAlchemy queries
    ├─ Handle soft delete filtering
    └─ Return ORM objects
    ↓
PostgreSQL Database
```

### Key Abstractions

**1. Typed Exceptions**
- Service layer raises `ServiceError` subclasses
- Global handler maps to HTTP status codes
- Example: `InsufficientStockError` → 409 Conflict

**2. Dependency Injection**
```python
# Endpoint receives dependencies automatically
async def create_order(
    order_data: OrderCreate,
    current_user: CurrentUser,        # From JWT token
    db: DBSession,                    # From get_db()
    pagination: Pagination,           # From query params
):
    service = OrderService(db)
    return await service.create_order(buyer=current_user, ...)
```

**3. Generic Repository Pattern**
```python
class BaseRepository[M, C, U]:
    async def get(id) → Optional[M]
    async def get_multi(skip, limit) → list[M]
    async def create(obj_in) → M
    async def update(obj, obj_in) → M
    # ... etc
```

**4. Soft Delete**
- All models have `deleted_at` timestamp
- Active records: `deleted_at IS NULL`
- Deleted records: `deleted_at IS NOT NULL`
- Queries filter by default, can include deleted with flag

---

## File Location Quick Reference

| What I Need | Location | File |
|---|---|---|
| Authentication logic | Service | `app/services/auth_service.py` |
| User model | Model | `app/models/user.py` |
| User creation endpoint | Endpoint | `app/api/v1/endpoints/auth.py` |
| User CRUD operations | Repository | `app/repositories/user.py` |
| User validation schema | Schema | `app/schemas/user.py` |
| Database config | Core | `app/core/config.py` |
| JWT signing | Core | `app/core/security.py` |
| Dependency injection | Core | `app/core/dependencies.py` |
| Exception hierarchy | Service | `app/services/exceptions.py` |
| Global exception handlers | Main | `app/main.py` |
| Order state machine | Service | `app/services/order_service.py` |
| Stock deduction logic | Repository | `app/repositories/order.py` |
| API response structure | Schema | `app/schemas/order.py` |
| Database migrations | Migrations | `alembic/versions/` |
| Unit tests | Tests | `tests/unit/` |
| DB tests | Tests | `tests/DB/` |
| API tests | Tests | `tests/integration/` |
| React components | Frontend | `frontend/src/components/` |
| API client | Frontend | `frontend/src/lib/api/` |
| State management | Frontend | `frontend/src/store/` |
| Pages/routes | Frontend | `frontend/app/` |

---

## Common Patterns & Code Snippets

### Service Method Pattern
```python
async def create_thing(self, user: User, data: ThingCreate) -> ThingResponse:
    """
    Create thing.
    
    Args:
        user: Current authenticated user
        data: Validated request data
        
    Returns:
        ThingResponse with created thing
        
    Raises:
        NotSellerError: if user is not seller
        InvalidCredentialsError: if authorization fails
    """
    # Check authorization
    if user.role != UserRole.SELLER:
        raise NotSellerError()
    
    # Validate business logic
    if data.value < 0:
        raise ValueError("Value must be positive")
    
    # Call repository
    thing = await self.repo.create(data)
    
    # Return response
    return ThingResponse.from_orm(thing)
```

### Endpoint Pattern
```python
@router.post("/things", response_model=ThingResponse)
async def create_thing(
    thing_data: ThingCreate,
    current_user: CurrentUser,  # Auto-injected
    db: DBSession,              # Auto-injected
):
    """Create a new thing."""
    service = ThingService(db)
    return await service.create_thing(user=current_user, data=thing_data)
```

### Repository Method Pattern
```python
async def create_with_relations(self, **kwargs) -> Model:
    """Create model with related objects (atomic operation)."""
    # Create main object
    obj = self.model(**kwargs)
    self.db.add(obj)
    
    # Create related objects
    for rel_data in kwargs['relations']:
        rel = RelatedModel(**rel_data)
        self.db.add(rel)
    
    # Atomic flush (not commit)
    await self.db.flush()
    await self.db.refresh(obj)
    return obj
```

### Component Pattern (React)
```typescript
interface ComponentProps {
  id: string;
  onSuccess?: () => void;
}

export const Component: FC<ComponentProps> = ({ id, onSuccess }) => {
  const { data, loading, error } = useQuery(`/api/v1/things/${id}`);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return <div>{data.name}</div>;
};
```

---

## Directory Tree (Quick Reference)

```
backend/app/
├── main.py                 ← FastAPI app init
├── core/
│   ├── config.py          ← Settings
│   ├── database.py        ← DB engine, session
│   ├── security.py        ← JWT, password hashing
│   ├── dependencies.py    ← DI functions
│   └── rate_limiter.py    ← Redis rate limiting
├── models/
│   ├── base.py            ← Base model (id, timestamps, soft delete)
│   ├── user.py            ← User model
│   ├── book.py            ← Book model
│   ├── order.py           ← Order + OrderItem models
│   ├── review.py          ← Review model
│   └── message.py         ← Message model
├── schemas/
│   ├── base.py            ← Pydantic base classes
│   ├── user.py            ← User schemas
│   ├── book.py            ← Book schemas
│   ├── order.py           ← Order schemas
│   ├── review.py          ← Review schemas
│   ├── auth.py            ← Auth request/response
│   ├── error.py           ← Error schemas
│   └── pagination.py      ← Pagination schemas
├── repositories/
│   ├── base.py            ← BaseRepository generic class
│   ├── user.py            ← User repository
│   ├── book.py            ← Book repository
│   ├── order.py           ← Order repository
│   ├── review.py          ← Review repository
│   └── message.py         ← Message repository
├── services/
│   ├── auth_service.py    ← Auth logic
│   ├── book_service.py    ← Book logic
│   ├── order_service.py   ← Order logic
│   ├── payment_service.py ← Stripe integration
│   ├── review_service.py  ← Review logic
│   ├── exceptions.py      ← Typed exceptions
│   └── storage.py         ← File uploads
└── api/v1/
    ├── router.py          ← Router aggregation
    └── endpoints/
        ├── auth.py        ← Auth routes
        ├── books.py       ← Book routes
        ├── orders.py      ← Order routes
        ├── payments.py    ← Payment routes
        ├── reviews.py     ← Review routes
        └── upload.py      ← Upload routes
```

---

## Next Steps

1. **First time?** Start with ARCHITECTURE.md Executive Summary
2. **Need to add code?** Go to STRUCTURE.md → your feature → checklist
3. **Debugging?** Use ARCHITECTURE.md → data flow → trace relevant files
4. **Understanding existing code?** Use STRUCTURE.md → find file → check patterns

---

## Questions & Troubleshooting

**Q: How do I add a new field to a model?**
A: See STRUCTURE.md → "Quick Checklist: Adding a New Field to User"

**Q: What exceptions should I raise?**
A: See STRUCTURE.md → "backend/app/services/exceptions.py" section

**Q: Where do API routes go?**
A: See STRUCTURE.md → "backend/app/api/v1/endpoints/" section

**Q: How do I test this feature?**
A: See ARCHITECTURE.md → "Testing Architecture" section

**Q: What's the naming convention for files?**
A: See STRUCTURE.md → "Naming Conventions" section

---

Generated: 2026-04-18 | Part of Books4All Codebase Documentation
