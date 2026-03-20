# Books4All — Agent Memory

Books4All is a second-hand book marketplace. Sellers list used books; buyers browse, order, and pay. Payments go through Stripe.

## Stack

| Layer | Tech |
|-------|------|
| Backend | FastAPI 0.109, Python 3.12, SQLAlchemy 2 (async), Alembic, PostgreSQL |
| Auth | JWT (python-jose), passlib + bcrypt 4.1.2, Redis (rate limiting) |
| Payments | Stripe 7.11 |
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Infra | Docker Compose (dev/staging/prod), uv (Python packages) |

## Repo Layout

```
Books4All/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # auth, books, orders, payments, reviews
│   │   ├── core/               # config, database, dependencies, security, rate_limiter
│   │   ├── models/             # SQLAlchemy ORM models
│   │   ├── repositories/       # async DB access layer
│   │   ├── schemas/            # Pydantic v2 request/response schemas
│   │   └── services/           # business logic (auth, book, order, payment)
│   ├── alembic/                # migrations
│   ├── tests/
│   │   ├── DB/                 # model/constraint tests (real DB, rollback)
│   │   ├── unit/               # pure-Python tests (no DB, no HTTP)
│   │   └── integration/        # API tests (AsyncClient + real DB)
│   ├── pyproject.toml
│   └── requirements.txt
├── frontend/
│   └── app/                    # Next.js App Router pages
├── code_log/                   # per-step markdown change logs
└── docker-compose.*.yml
```

## Architecture

**Three-layer backend:**
```
Request → API endpoint (FastAPI router)
        → Service layer (business logic, raises typed exceptions)
        → Repository layer (async SQLAlchemy queries)
        → PostgreSQL
```

**Key patterns:**
- Services receive a `AsyncSession` injected via `Depends(get_db)` from `app.core.dependencies`.
- Repositories are instantiated inside services (`self.user_repo = UserRepository(db)`).
- Services raise exceptions from `app.services.exceptions` (e.g. `InvalidCredentialsError`, `BookNotFoundError`). Endpoints catch these and return the right HTTP status.
- Schemas live in `app.schemas.*`. Use `BookResponse`, `OrderResponse`, etc. for API output. Never return ORM objects directly.

## User Roles

`UserRole` enum: `BUYER`, `SELLER`, `ADMIN`

- Buyers: browse, purchase, review.
- Sellers: list books, fulfil orders containing their books.
- Admins: unrestricted access to everything.

Role is embedded in the JWT (`role` claim) and checked via `Depends(require_role(...))` in `app.core.dependencies`.

## Order State Machine

```
PENDING → PAYMENT_PROCESSING → PAID → SHIPPED → DELIVERED → REFUNDED
PENDING → CANCELLED          (buyer self-cancel only)
```

`OrderService._assert_valid_transition(from, to)` enforces this. `CANCELLED` and `REFUNDED` are terminal. Never skip states.

## Common Commands

```bash
# --- Backend ---
cd backend

# Start dev server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run all tests
.venv/bin/pytest tests/unit/ tests/DB/ -q

# Run with coverage
.venv/bin/pytest tests/unit/ tests/DB/ --cov=app --cov-report=term-missing

# New migration
alembic revision --autogenerate -m "describe_change"
alembic upgrade head

# Install a package (uses uv, not pip)
uv pip install <package>

# Format / lint
black app/ tests/
isort app/ tests/
flake8 app/

# --- Frontend ---
cd frontend
npm run dev          # http://localhost:3000
npm run build
npm run lint
```

## Environment Variables

Copy `backend/.env.example` → `backend/.env`. Key vars:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | async PostgreSQL URL (`postgresql+asyncpg://...`) |
| `SYNC_DATABASE_URL` | sync URL for Alembic (`postgresql+psycopg2://...`) |
| `SECRET_KEY` | JWT signing key (min 32 chars) |
| `STRIPE_SECRET_KEY` | Stripe API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `REDIS_URL` | Redis connection URL |

## Testing Conventions

- **Unit tests** (`tests/unit/`): no DB, no HTTP. Use `SimpleNamespace` to fake ORM objects (not `User.__new__` — SQLAlchemy requires mapper init).
- **DB tests** (`tests/DB/`): real DB, each test runs inside a rolled-back transaction.
- **Integration tests** (`tests/integration/`): `AsyncClient` + `ASGITransport` + overridden `get_db` dependency pointing at the rollback session.
- `asyncio_mode = "auto"` in `pyproject.toml` — no `@pytest.mark.asyncio` needed.
- Redis is mocked globally via `mock_redis` autouse fixture in `conftest.py`.

## Known Gotchas

- **bcrypt 5.x breaks passlib 1.7.4** — keep `bcrypt==4.1.2` pinned. Do not upgrade bcrypt.
- **SQLAlchemy async sessions** — always `await session.execute(...)`, not `.execute(...)`. Use `AsyncSession` from `sqlalchemy.ext.asyncio`.
- **Stripe webhooks** — raw body must be passed to `stripe.Webhook.construct_event`, not the parsed JSON. The `payments` endpoint reads `Request.body()` for this reason.
- **JWT type field** — tokens carry a `type` claim (`access` | `refresh` | `password_reset` | `email_verification`). Always verify the correct type before acting on a token.
- **Password hashing in tests** — Call `hash_password("ShortPass1")` (≤72 bytes). passlib/bcrypt raises `ValueError` for passwords approaching the bcrypt 72-byte limit during backend detection.
- **Alembic uses sync driver** — `SYNC_DATABASE_URL` must use `postgresql+psycopg2://`. `DATABASE_URL` uses `postgresql+asyncpg://` for the app runtime.

## Code Style

- Python: Black (line length 88), isort (profile=black), flake8.
- Type hints on every function signature; Pydantic v2 models for all I/O.
- No `Any` in public API surfaces.
- Docstrings on all public service methods.
- Frontend: TypeScript strict mode, ESLint.
