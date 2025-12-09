# Books4All Backend

FastAPI backend for the Books4All book marketplace.

## Prerequisites

- Python 3.12+
- PostgreSQL 16+
- Redis 7+

## Setup

### 1. Create Virtual Environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Environment Configuration

```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 4. Database Setup

Make sure PostgreSQL is running, then create the database:

```bash
createdb books4all
```

## Database Migrations

### Run Migrations

```bash
# Apply all migrations
alembic upgrade head

# Or apply specific migration
alembic upgrade 001_initial
```

### Create New Migration

```bash
# Auto-generate migration from model changes
alembic revision --autogenerate -m "description of changes"

# Create empty migration
alembic revision -m "description of changes"
```

### Migration Commands

```bash
# Check current migration version
alembic current

# View migration history
alembic history

# Downgrade one version
alembic downgrade -1

# Downgrade to specific version
alembic downgrade <revision_id>

# Downgrade to base (remove all)
alembic downgrade base
```

## Running the Application

### Development Mode

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Production Mode

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Documentation

Once running, access the API documentation at:

- Swagger UI: http://localhost:8000/api/v1/docs
- ReDoc: http://localhost:8000/api/v1/redoc

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app tests/

# Run specific test file
pytest tests/test_users.py
```

## Project Structure

```
backend/
├── alembic/                 # Database migrations
│   ├── versions/           # Migration files
│   └── env.py              # Alembic configuration
├── app/
│   ├── api/                # API routes
│   │   └── v1/
│   │       └── endpoints/
│   ├── core/               # Core configuration
│   │   ├── config.py       # Settings
│   │   ├── database.py     # DB connection
│   │   └── security.py     # Auth utilities
│   ├── models/             # SQLAlchemy models
│   ├── schemas/            # Pydantic schemas
│   ├── services/           # Business logic
│   └── main.py             # FastAPI app
├── tests/                  # Test suite
├── alembic.ini             # Alembic config
├── requirements.txt        # Dependencies
└── Dockerfile              # Container config
```

## Code Quality

```bash
# Format code
black app/ tests/

# Sort imports
isort app/ tests/

# Lint
flake8 app/ tests/

# Type check
mypy app/
```
