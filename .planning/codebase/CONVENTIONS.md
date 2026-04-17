# Books4All — Code Conventions & Patterns

**Last Updated:** 2026-04-18  
**Scope:** Backend (FastAPI/Python), Frontend (Next.js/TypeScript)

---

## Overview

This document captures the architectural patterns, naming conventions, error handling strategies, and style guidelines used throughout the Books4All codebase. All new code should follow these conventions to maintain consistency and cohesion.

---

## Backend (FastAPI / Python)

### Project Structure

```
backend/
├── app/
│   ├── api/v1/endpoints/        # FastAPI route handlers (auth, books, orders, etc.)
│   ├── core/                    # Infrastructure: config, database, security, dependencies
│   ├── models/                  # SQLAlchemy ORM models
│   ├── repositories/            # Async data-access layer
│   ├── schemas/                 # Pydantic v2 request/response schemas
│   ├── services/                # Business logic (auth, book, order, payment)
│   └── main.py                  # FastAPI app entry point + exception handlers
├── alembic/                     # Database migrations
├── tests/
│   ├── unit/                    # Pure Python tests (no DB, no HTTP)
│   ├── DB/                      # ORM/constraint tests (real DB, rollback)
│   └── integration/             # API tests (AsyncClient + real DB)
└── pyproject.toml
```

### Code Organization Principles

1. **Three-layer architecture**: Endpoints → Services → Repositories
   - **Endpoints** handle HTTP request/response mapping only
   - **Services** contain all business logic and raise typed exceptions
   - **Repositories** provide async SQLAlchemy queries with clean interfaces

2. **Dependency Injection**: FastAPI's `Depends()` injects:
   - `AsyncSession` (database)
   - `ActiveUser` (authenticated user with JWT verification)
   - Role-based dependencies: `RequireBuyer`, `RequireSeller`, `RequireAdmin`

3. **Session ownership**: The endpoint owns the database session's unit-of-work boundary
   - Services receive an `AsyncSession` parameter
   - Services call `await self.db.commit()` before returning
   - Repositories use `await self.db.flush()` (not commit) to keep transactions under service control

4. **No ORM objects in responses**: Always convert to Pydantic schemas
   ```python
   # ✗ Wrong: return User ORM object
   async def get_profile(current_user: ActiveUser) -> User:
       return current_user
   
   # ✓ Right: return Pydantic schema
   async def get_profile(current_user: ActiveUser) -> UserResponse:
       return UserResponse.model_validate(current_user)
   ```

### Naming Conventions

#### File & Module Names
- Snake case: `auth_service.py`, `user_repository.py`, `test_auth_api.py`
- Match class name to module: `UserService` in `user_service.py`
- Repository modules: `{model}_repository.py` (e.g., `book_repository.py`)
- Endpoints: `{resource}.py` (e.g., `auth.py`, `books.py`)

#### Class Names
- PascalCase: `UserService`, `BookRepository`, `AuthRequest`
- Enums: `UserRole`, `OrderStatus`, `BookCondition`
- Exception classes: `UserNotFoundError`, `InvalidCredentialsError` (suffix with `Error`)

#### Function/Method Names
- Snake case: `create_user()`, `get_by_email()`, `update_password()`
- Async functions: same snake case (no special prefix)
- Private methods/functions: prefix with `_`: `_map_auth_exception()`, `_assert_valid_transition()`
- Helpers: clear verb-noun pattern: `build_token_response()`, `verify_email()`

#### Variable Names
- Snake case: `user_id`, `book_title`, `order_status`
- Boolean variables: prefix with `is_`, `has_`, `can_`: `is_active`, `has_stock`, `can_publish`
- Constants: SCREAMING_SNAKE_CASE: `MAX_UPLOAD_SIZE`, `DEFAULT_PAGE_SIZE`
- Type variables: PascalCase: `ModelType`, `CreateSchemaType`, `UpdateSchemaType`

#### Database & Schema Naming
- Tables (plural): `users`, `books`, `orders`, `reviews`
- Columns (snake_case): `email`, `password_hash`, `created_at`, `is_active`
- Foreign keys: `{table}_id`: `seller_id`, `buyer_id`, `user_id`
- Enum column types: `{entity}_{enum}`: `user_role`, `order_status`

### Error Handling

#### Exception Hierarchy

```python
ServiceError (base)
├── EmailAlreadyExistsError
├── InvalidCredentialsError
├── InvalidTokenError
├── AccountInactiveError
├── BookNotFoundError
├── NotBookOwnerError
├── NotSellerError
├── OrderNotFoundError
├── NotOrderOwnerError
├── InsufficientStockError
├── InvalidStatusTransitionError
├── OrderNotCancellableError
├── PaymentError
├── RefundError
└── StripeWebhookError
```

#### Exception Design Rules

1. **Exceptions live in** `app/services/exceptions.py` — single source of truth
2. **Typed exceptions, not generic ones** — catch specific types, not base `Exception`
3. **Message in exception, not endpoint** — service includes context:
   ```python
   # ✓ Good: exception has message context
   raise InsufficientStockError(
       book_title="Python Guide",
       available=2,
       requested=5
   )
   
   # ✗ Wrong: message left to endpoint
   raise Exception(f"Not enough stock for {book_title}")
   ```

4. **Endpoints catch and map to HTTP** — global exception handlers convert to status codes:
   ```python
   # In app/main.py:
   _SERVICE_EXCEPTION_MAP: dict[type[ServiceError], int] = {
       EmailAlreadyExistsError: status.HTTP_409_CONFLICT,
       InvalidCredentialsError: status.HTTP_401_UNAUTHORIZED,
       BookNotFoundError: status.HTTP_404_NOT_FOUND,
       # ... etc
   }
   ```

5. **Prevent enumeration attacks** — same error for "not found" and "invalid password":
   ```python
   # ✓ Good: same error for both cases
   if user is None or not verify_password(password, user.password_hash):
       raise InvalidCredentialsError("Invalid email or password.")
   
   # ✗ Wrong: reveals whether email exists
   if user is None:
       raise InvalidCredentialsError("Email not found.")
   if not verify_password(password, user.password_hash):
       raise InvalidCredentialsError("Password incorrect.")
   ```

### Type Hints

- **Mandatory on all function signatures** — no `Any` in public APIs
- Use standard library types: `list[T]`, `dict[K, V]`, `Optional[T]`
- Use `Union` for multiple specific types (not `Any`)
- Async functions: return type applies to the awaited value, not `Coroutine`
  ```python
  # ✓ Right: return type is what you get when you await
  async def get_user(user_id: UUID) -> Optional[User]:
      # ... not -> Coroutine[Any, Any, Optional[User]]
  ```
- Generator returns: `AsyncGenerator[T, None]` for async context managers
  ```python
  async def get_db() -> AsyncGenerator[AsyncSession, None]:
      async with async_session_maker() as session:
          try:
              yield session
          finally:
              await session.close()
  ```

### Docstrings

- **Google-style docstrings** on all public methods in services and repositories
- Include `Args:`, `Returns:`, `Raises:` sections
- Example:
  ```python
  async def register(
      self,
      *,
      email: str,
      password: str,
      role: UserRole = UserRole.BUYER,
  ) -> AuthResponse:
      """
      Register a new user with email and password.

      Args:
          email: User email address.
          password: Plain-text password (validated by schema before reaching here).
          role: Role to assign (buyer or seller — admin cannot self-register).

      Returns:
          AuthResponse with tokens and user info.

      Raises:
          EmailAlreadyExistsError: If the email is already taken.
      """
  ```

### Code Style

#### Formatting
- **Line length:** 88 characters (Black default)
- **Formatter:** Black
- **Import sorter:** isort (profile=black)
- **Linter:** flake8

#### Import Organization
```python
# 1. Standard library
import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

# 2. Third-party (FastAPI, SQLAlchemy, etc.)
import httpx
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# 3. Local app imports
from app.core.config import settings
from app.core.security import verify_access_token
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.user import UserResponse
from app.services.exceptions import InvalidTokenError
```

#### Spacing & Formatting
- Two blank lines between top-level functions/classes
- One blank line between methods in a class
- No blank lines after imports
- Trailing commas in multi-line structures

#### Comments & Logging
- **Docstrings**, not inline comments, for explaining "why"
- Use `logger.info()`, `logger.warning()`, `logger.exception()` — never `print()`
- Log at INFO level for important business events (login, registration, payments)
- Log at WARNING level for recoverable errors
- Include context in logs: user IDs, resource IDs, status changes

#### Conditional Assertions
- Use comments for guards/preconditions:
  ```python
  # Guard: duplicate email
  if await self.user_repo.email_exists(email):
      raise EmailAlreadyExistsError(...)
  
  # Deliberate: same error for "not found" and "wrong password"
  if user is None or not verify_password(password, user.password_hash):
      raise InvalidCredentialsError(...)
  ```

#### Sections & Dividers
- Use dividers for major section boundaries:
  ```python
  # ─────────────────────────────────────────────
  # Registration
  # ─────────────────────────────────────────────
  
  async def register(...) -> AuthResponse:
      ...
  
  # ─────────────────────────────────────────────
  # Login
  # ─────────────────────────────────────────────
  ```

### SQLAlchemy / Async Patterns

#### Async Session Usage
- Always `await session.execute(...)` — never `.execute(...)`
- Use `AsyncSession` from `sqlalchemy.ext.asyncio`
- Never use sync driver (`psycopg2`) for app code (only Alembic: `SYNC_DATABASE_URL`)

#### Query Building
```python
# ✓ Good: use select() with type hints
from sqlalchemy import select

query = select(User).where(User.email == email)
result = await session.execute(query)
user = result.scalar_one_or_none()

# ✗ Wrong: legacy string queries or missing await
result = session.execute("SELECT * FROM users WHERE email = ?", [email])
```

#### Flushing vs. Committing
- **Repositories**: use `await db.flush()` to keep transaction control with the service
- **Services**: call `await db.commit()` after completing business logic
- **Endpoints**: don't call commit/flush — it's the service's responsibility

```python
# In repository:
async def create_user(...) -> User:
    user = User(...)
    db.add(user)
    await db.flush()  # ← not commit!
    await db.refresh(user)
    return user

# In service:
async def register(...) -> AuthResponse:
    user = await self.user_repo.create_user(...)
    await self.db.commit()  # ← service commits
    await self.db.refresh(user)
    return _build_token_response(user)
```

#### Models: Mapped Column Syntax
- Use `Mapped` with `mapped_column()` (SQLAlchemy 2.0 style):
  ```python
  from sqlalchemy.orm import Mapped, mapped_column
  
  class User(Base):
      id: Mapped[UUID] = mapped_column(
          UUID(as_uuid=True),
          primary_key=True,
          default=uuid.uuid4,
          doc="Unique identifier"
      )
      email: Mapped[str] = mapped_column(
          String(255),
          unique=True,
          nullable=False,
          index=True
      )
  ```

#### Relationships
- Always specify `back_populates` on both sides
- Lazy loading: `lazy="dynamic"` for list relationships (don't load by default)
- Use `TYPE_CHECKING` for forward references in circular dependencies:
  ```python
  from typing import TYPE_CHECKING
  
  if TYPE_CHECKING:
      from app.models.book import Book
  
  class User(Base):
      books: Mapped[list["Book"]] = relationship("Book", back_populates="seller")
  ```

### Pydantic v2 Schemas

#### BaseSchema Configuration
```python
class BaseSchema(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,        # Enable ORM mode
        populate_by_name=True,       # Allow field name or alias
        str_strip_whitespace=True,   # Auto-trim strings
        validate_assignment=True,    # Validate on assignment
        use_enum_values=True,        # Use enum values (not objects)
    )
```

#### Request vs. Response
- **Request schemas** (Create, Update): inherits from `BaseSchema`
- **Response schemas**: inherits from `ResponseSchema` (includes ID + timestamps)
- Example:
  ```python
  class BookCreate(BaseSchema):
      title: str
      author: str
      price: float
  
  class BookResponse(ResponseSchema):
      title: str
      author: str
      price: float
      seller_id: UUID
  ```

#### Field Validation
- Use Pydantic validators for complex validation:
  ```python
  from pydantic import field_validator
  
  class PasswordInput(BaseSchema):
      password: str
      
      @field_validator('password')
      @classmethod
      def validate_password(cls, v: str) -> str:
          if len(v) < 8:
              raise ValueError('Password must be at least 8 characters')
          return v
  ```

---

## Frontend (Next.js / TypeScript)

### Project Structure

```
frontend/
├── app/                         # Next.js App Router pages
│   ├── (auth)/                  # Route group for auth pages
│   ├── (marketplace)/           # Route group for public pages
│   ├── seller/                  # Seller dashboard
│   ├── buyer/                   # Buyer dashboard
│   └── layout.tsx
├── components/
│   ├── ui/                      # Reusable UI components (Button, Input, etc.)
│   └── features/                # Feature-specific components
├── lib/
│   ├── api/                     # API client functions
│   ├── hooks/                   # React hooks (useAuth, useCart, etc.)
│   ├── types/                   # TypeScript type definitions
│   └── utils/                   # Utility functions
├── styles/
│   └── globals.css              # Tailwind CSS + custom styles
└── tailwind.config.ts
```

### Naming Conventions

#### File & Folder Names
- Components: PascalCase: `UserProfile.tsx`, `BookCard.tsx`
- Pages: lowercase with hyphens: `[id].tsx`, `my-listings.tsx`
- Hooks: PascalCase prefixed with `use`: `useAuth.ts`, `useCart.ts`
- API functions: snake_case: `books.ts`, `orders.ts`, `auth.ts`
- Types: snake_case: `user.ts`, `book.ts`, `order.ts`
- Utils: snake_case: `formatPrice.ts`, `parseDate.ts`

#### Variable & Function Names
- React components: PascalCase: `const BookCard = (props) => { ... }`
- Props interfaces: `{ComponentName}Props`: `interface BookCardProps { ... }`
- Event handlers: prefix with `handle` or `on`: `handleSubmit()`, `onClose()`
- Custom hooks: `use{FeatureName}`: `useAuth()`, `useBookList()`
- Helper functions: camelCase verb-noun: `formatPrice()`, `parseDate()`, `truncateText()`

#### Type Names
- Interfaces: PascalCase: `User`, `Book`, `Order`, `AuthResponse`
- Types: PascalCase: `BookCondition`, `OrderStatus`
- Enums: PascalCase: `UserRole`, `BookStatus`

### TypeScript Conventions

#### Strict Mode
- All files in strict TypeScript mode (no `any` without justification)
- Always provide return types on functions:
  ```typescript
  // ✓ Good
  function getBooks(pageSize: number): Promise<Book[]> {
    // ...
  }
  
  // ✗ Wrong: no return type
  function getBooks(pageSize: number) {
    // ...
  }
  ```

#### Type Definitions
- Keep types in `lib/types/` organized by domain:
  ```
  lib/types/
  ├── user.ts       # User, UserRole, UserResponse
  ├── book.ts       # Book, BookCondition, BookResponse
  ├── order.ts      # Order, OrderStatus, OrderResponse
  └── auth.ts       # AuthResponse, LoginRequest, etc.
  ```

- Export all types from a barrel file:
  ```typescript
  // lib/types/index.ts
  export type { User, UserRole } from './user';
  export type { Book, BookCondition } from './book';
  export type { Order, OrderStatus } from './order';
  ```

#### Component Patterns

**Functional Components with Props Interface:**
```typescript
interface BookCardProps {
  book: Book;
  onSelect?: (id: string) => void;
}

export default function BookCard({ book, onSelect }: BookCardProps) {
  return <div onClick={() => onSelect?.(book.id)}>{book.title}</div>;
}
```

**Client Components:**
- Always use `"use client"` at the top for interactive components
- Separate from server components in the same folder if needed

**Props Destructuring:**
```typescript
// ✓ Good: destructure with type
function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  // ...
}

// Also good: use Props interface
interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function Sidebar({ isOpen, onClose }: SidebarProps) {
  // ...
}
```

### React & Next.js Patterns

#### Hooks Usage
- Use React Query (`@tanstack/react-query`) for server state:
  ```typescript
  const { data, isLoading, error } = useQuery({
    queryKey: ['books'],
    queryFn: () => booksApi.getBooks(),
  });
  ```

- Use `useState` for local UI state only (form inputs, modals, etc.)
- Use `useEffect` for side effects (watch dependencies carefully)

#### Error Handling
- API errors: catch and display via toast or inline error message
  ```typescript
  const onSubmit = async (data: LoginFormData) => {
    try {
      await login(data);
      toast.success('Login successful!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(message);
    }
  };
  ```

#### Form Handling
- Use React Hook Form with Zod validation:
  ```typescript
  import { useForm } from 'react-hook-form';
  import { zodResolver } from '@hookform/resolvers/zod';
  import { z } from 'zod';

  const schema = z.object({
    email: z.string().email('Invalid email'),
    password: z.string().min(8, 'Too short'),
  });

  type FormData = z.infer<typeof schema>;

  function LoginForm() {
    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
      resolver: zodResolver(schema),
    });

    return (
      <form onSubmit={handleSubmit(onSubmit)}>
        <input {...register('email')} />
        {errors.email && <p>{errors.email.message}</p>}
      </form>
    );
  }
  ```

#### State Management (if needed)
- Keep it minimal — React Query handles most server state
- Zustand or Context API for global UI state (theme, user session, cart)
- Avoid Redux-style complexity

### Styling

#### Tailwind CSS
- Use Tailwind utility classes — avoid custom CSS when possible
- Responsive classes: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- Dark mode support: `dark:` prefix

#### Custom CSS
- Keep in `styles/globals.css` or component module
- Use CSS custom properties for theme colors (coordinated with backend colors)
- Example color variables:
  ```css
  :root {
    --primary: #6366f1;
    --primary-container: #eef2ff;
    --on-primary: #ffffff;
    --surface: #fafafa;
    --surface-container-low: #f5f5f5;
    --on-surface: #1a1a1a;
    --outline: #999999;
    --error: #d32f2f;
  }
  ```

#### Component-Level Styles
- Avoid inline `style={}` — use Tailwind or CSS modules
- For complex conditional styles, build className strings:
  ```typescript
  const buttonClass = cn(
    'px-4 py-2 rounded-lg font-semibold transition-colors',
    isLoading && 'opacity-50 cursor-not-allowed',
    isError && 'bg-error text-white',
    !isError && 'bg-primary text-white hover:bg-primary/90',
  );
  ```

### API Integration

#### API Client Functions
- Keep in `lib/api/{resource}.ts`
- One file per domain (books, orders, auth, etc.)
- Use fetch or axios (whichever is configured)
- Example:
  ```typescript
  // lib/api/books.ts
  export async function getBooks(page?: number): Promise<Book[]> {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/books?page=${page || 1}`
    );
    if (!res.ok) throw new Error('Failed to fetch books');
    return res.json();
  }

  export async function getBook(id: string): Promise<Book> {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/books/${id}`
    );
    if (!res.ok) throw new Error('Book not found');
    return res.json();
  }
  ```

#### Authentication
- Store JWT in HTTP-only cookie or secure storage
- Add auth token to request headers in API layer:
  ```typescript
  export async function createBook(book: BookCreate): Promise<Book> {
    const token = getAuthToken(); // from storage or context
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/v1/books`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(book),
      }
    );
    if (!res.ok) throw new Error('Failed to create book');
    return res.json();
  }
  ```

---

## Cross-Cutting Concerns

### Logging

#### Backend Logging
- Use Python's `logging` module (configured in FastAPI lifespan)
- Log levels:
  - `DEBUG`: verbose info for development
  - `INFO`: important business events (login, registration, order created)
  - `WARNING`: recoverable errors (failed email send, rate limit hit)
  - `ERROR`: unrecoverable errors (DB connection lost)
  - `EXCEPTION`: caught exceptions with full traceback

#### Frontend Logging
- Use `console.log()`, `console.warn()`, `console.error()` during development
- In production, consider a logging service (e.g., Sentry)
- Log API errors and user actions for debugging

### Security

#### Backend
- **Password hashing**: bcrypt via passlib (min 72 bytes enforced)
- **JWT tokens**: include `type` claim (`access`, `refresh`, `password_reset`)
- **CORS**: configured in `main.py` with allowed origins
- **Rate limiting**: Redis-backed, excludes webhooks and health checks
- **Input validation**: Pydantic schemas for all inputs
- **SQL injection**: parameterized queries via SQLAlchemy
- **Secrets**: all sensitive config in environment variables (`.env`)

#### Frontend
- **Authentication**: store JWT securely (HTTP-only cookie preferred)
- **CSRF**: handled by Next.js automatically for same-origin requests
- **XSS**: React escapes content by default; be careful with `dangerouslySetInnerHTML`
- **API secrets**: never expose private keys in client code

### Testing

#### Backend Testing
- See [TESTING.md](./TESTING.md) for comprehensive testing conventions

#### Frontend Testing
- Unit tests: Jest + React Testing Library
- Integration tests: end-to-end flow testing via Cypress or Playwright
- Mock API responses in unit tests using Mock Service Worker (MSW)

---

## Summary Table

| Aspect | Convention | Example |
|--------|-----------|---------|
| **Backend File Names** | snake_case | `auth_service.py` |
| **Backend Classes** | PascalCase | `UserService` |
| **Backend Methods** | snake_case | `get_by_email()` |
| **Backend Constants** | SCREAMING_SNAKE_CASE | `MAX_UPLOAD_SIZE` |
| **Backend Exceptions** | PascalCase + `Error` suffix | `InvalidCredentialsError` |
| **Backend Databases** | snake_case, plural | `users`, `user_id` |
| **Frontend Components** | PascalCase | `BookCard.tsx` |
| **Frontend Pages** | lowercase-kebab-case | `my-listings.tsx` |
| **Frontend Hooks** | use{Name} | `useAuth.ts` |
| **Frontend Types** | PascalCase | `User`, `Book` |
| **Frontend Functions** | camelCase | `formatPrice()` |
| **Line Length** | 88 chars (Black) | N/A |
| **Type Hints** | Required in signatures | `async def get_user(...) -> User:` |
| **Exception Strategy** | Typed + service layer | Raise in service, catch in endpoint |
| **Form Validation** | Zod (frontend), Pydantic (backend) | `z.object({ ... })` |
| **Styling** | Tailwind CSS + custom CSS | `className="px-4 py-2 bg-primary"` |

---

## See Also

- [TESTING.md](./TESTING.md) — Testing framework, structure, and best practices
- `CLAUDE.md` — Project-specific context and known gotchas
- `pyproject.toml` — Backend dependencies and tool configuration
- `backend/app/main.py` — Global exception handlers and middleware
