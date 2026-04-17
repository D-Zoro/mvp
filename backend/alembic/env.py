"""
Alembic Environment Configuration

This module configures the Alembic migration environment.
It imports all models to ensure they are registered for autogenerate.
"""

import os
import sys
from logging.config import fileConfig

##async driver
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine

from sqlalchemy import engine_from_config, pool

from alembic import context

# Add the backend directory to the path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import all models to register them with SQLAlchemy 
# #dev-note E402-import not at top, F401-unused import <lint error suppression>>
from app.models import Base  # noqa: E402
from app.models import (  # noqa: E402, F401
    User,
    Book,
    Order,
    OrderItem,
    Review,
    Message,
)

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# add your model's MetaData object here
# for 'autogenerate' support
target_metadata = Base.metadata


def get_url() -> str:
    """Get database URL from environment variable or config file."""
    return os.getenv(
        "DATABASE_URL",
        config.get_main_option("sqlalchemy.url", "postgresql://postgres:postgres@localhost:5432/books4all")
    )


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.
    """
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.
    """
    cmd_line_url = get_url()

    connectable = create_async_engine(cmd_line_url)
    
    async def do_run_migrations():
        async with connectable.connect() as connection:
            # This 'run_sync' is the magic that fixes your error
            await connection.run_sync(do_run_metadata_migrations)
        await connectable.dispose()

    def do_run_metadata_migrations(connection):
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )
        with context.begin_transaction():
            context.run_migrations()

    # Run the async function
    asyncio.run(do_run_migrations())

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
