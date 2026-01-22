from sqlalchemy import text 
import pytest

@pytest.mark.asyncio
async def test_db_connection(db_session):
  
    result =await db_session.execute(text("SELECT 1"))
    value = result.scalar()
    print(db_session.bind.engine.url)
    assert value == 1


