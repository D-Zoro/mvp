"""
Database connection and session management.

Provides:
- Async SQLAlchemy engine configuration
- Session factory for dependency injection
- Database health check utility
"""

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.core.config import settings


def create_engine() -> AsyncEngine:
    """
    Create async SQLAlchemy engine.
    
    Configures connection pooling and echo settings based on environment.
    
    Returns:
        AsyncEngine: Configured async engine
    """
    return create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DATABASE_ECHO,
        pool_size=settings.DATABASE_POOL_SIZE,
        max_overflow=settings.DATABASE_MAX_OVERFLOW,
        pool_pre_ping=True,  # Verify connections before use
    )


def create_test_engine() -> AsyncEngine:
    """
    Create async SQLAlchemy engine for testing.
    
    Uses NullPool to avoid connection issues in tests.
    
    Returns:
        AsyncEngine: Test-configured async engine
    """
    return create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DATABASE_ECHO,
        poolclass=NullPool,
    )


# Global engine instance
engine = create_engine()


# Session factory
async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Get async database session.
    
    Context manager that yields a session and handles cleanup.
    
    Yields:
        AsyncSession: Database session
    """
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()


async def check_database_health() -> bool:
    """
    Check database connectivity.
    
    Executes a simple query to verify database is accessible.
    
    Returns:
        bool: True if database is healthy, False otherwise
    """
    try:
        async with async_session_maker() as session:
            from sqlalchemy import text
            await session.execute(text("SELECT 1"))
            return True
    except Exception:
        return False


async def init_database() -> None:
    """
    Initialize database tables.
    
    Creates all tables defined in models.
    Should only be used in development/testing.
    Production should use Alembic migrations.
    """
    from app.models.base import Base
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def drop_database() -> None:
    """
    Drop all database tables.
    
    WARNING: Destroys all data. Use only in testing.
    """
    from app.models.base import Base
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
