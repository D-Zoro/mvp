import pytest
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
)
import pytest_asyncio

from alembic import command
from alembic.config import Config

from app.core.config import settings




@pytest_asyncio.fixture(scope="session")
async def async_engine():
    engine = create_async_engine(settings.DATABASE_URL)

    # Run Alembic migrations ONCE
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

    command.upgrade(alembic_cfg, "head")

    yield engine

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(async_engine) :
    async with async_engine.connect() as conn:
        trans = await conn.begin()

        async_session = async_sessionmaker(
            bind=conn,
            expire_on_commit=False,
        )

        session = async_session()

        yield session

        await session.close()
        await trans.rollback()