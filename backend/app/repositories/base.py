"""
Base repository with generic CRUD operations.

Provides a reusable base class for all repositories with common
database operations using async SQLAlchemy.
"""

from typing import Any, Generic, Optional, Type, TypeVar, Union
from uuid import UUID

from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import Base

# Type variables for generic repository
ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)


class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    Generic repository with common CRUD operations.
    
    Provides base implementation for:
    - get: Retrieve single record by ID
    - get_multi: Retrieve multiple records with pagination
    - create: Create new record
    - update: Update existing record
    - delete: Soft delete record
    - hard_delete: Permanently delete record
    - count: Count records with optional filters
    
    Type Parameters:
        ModelType: SQLAlchemy model class
        CreateSchemaType: Pydantic schema for creation
        UpdateSchemaType: Pydantic schema for updates
        
    Example:
        class UserRepository(BaseRepository[User, UserCreate, UserUpdate]):
            def __init__(self, db: AsyncSession):
                super().__init__(User, db)
    """
    
    def __init__(self, model: Type[ModelType], db: AsyncSession):
        """
        Initialize repository.
        
        Args:
            model: SQLAlchemy model class
            db: Async database session
        """
        self.model = model
        self.db = db
    
    async def get(
        self,
        id: UUID,
        *,
        include_deleted: bool = False,
    ) -> Optional[ModelType]:
        """
        Get a single record by ID.
        
        Args:
            id: Record UUID
            include_deleted: Include soft-deleted records
            
        Returns:
            Model instance or None if not found
        """
        query = select(self.model).where(self.model.id == id)
        
        if not include_deleted:
            query = query.where(self.model.deleted_at.is_(None))
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_by_ids(
        self,
        ids: list[UUID],
        *,
        include_deleted: bool = False,
    ) -> list[ModelType]:
        """
        Get multiple records by IDs.
        
        Args:
            ids: List of record UUIDs
            include_deleted: Include soft-deleted records
            
        Returns:
            List of model instances
        """
        if not ids:
            return []
        
        query = select(self.model).where(self.model.id.in_(ids))
        
        if not include_deleted:
            query = query.where(self.model.deleted_at.is_(None))
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def get_multi(
        self,
        *,
        skip: int = 0,
        limit: int = 100,
        order_by: Optional[str] = None,
        order_desc: bool = True,
        filters: Optional[dict[str, Any]] = None,
        include_deleted: bool = False,
    ) -> list[ModelType]:
        """
        Get multiple records with pagination and filtering.
        
        Args:
            skip: Number of records to skip
            limit: Maximum records to return
            order_by: Field name to order by
            order_desc: Order descending if True
            filters: Dict of field_name: value for filtering
            include_deleted: Include soft-deleted records
            
        Returns:
            List of model instances
        """
        query = select(self.model)
        
        if not include_deleted:
            query = query.where(self.model.deleted_at.is_(None))
        
        # Apply filters
        if filters:
            for field, value in filters.items():
                if hasattr(self.model, field) and value is not None:
                    query = query.where(getattr(self.model, field) == value)
        
        # Apply ordering
        if order_by and hasattr(self.model, order_by):
            order_column = getattr(self.model, order_by)
            query = query.order_by(order_column.desc() if order_desc else order_column)
        else:
            query = query.order_by(self.model.created_at.desc())
        
        # Apply pagination
        query = query.offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def create(
        self,
        obj_in: Union[CreateSchemaType, dict[str, Any]],
    ) -> ModelType:
        """
        Create a new record.
        
        Args:
            obj_in: Pydantic schema or dict with creation data
            
        Returns:
            Created model instance
        """
        if isinstance(obj_in, dict):
            create_data = obj_in
        else:
            create_data = obj_in.model_dump(exclude_unset=True)
        
        db_obj = self.model(**create_data)
        self.db.add(db_obj)
        await self.db.flush()
        await self.db.refresh(db_obj)
        return db_obj
    
    async def update(
        self,
        db_obj: ModelType,
        obj_in: Union[UpdateSchemaType, dict[str, Any]],
    ) -> ModelType:
        """
        Update an existing record.
        
        Args:
            db_obj: Existing model instance
            obj_in: Pydantic schema or dict with update data
            
        Returns:
            Updated model instance
        """
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            if hasattr(db_obj, field):
                setattr(db_obj, field, value)
        
        self.db.add(db_obj)
        await self.db.flush()
        await self.db.refresh(db_obj)
        return db_obj
    
    async def delete(
        self,
        id: UUID,
    ) -> bool:
        """
        Soft delete a record by ID.
        
        Args:
            id: Record UUID
            
        Returns:
            True if deleted, False if not found
        """
        db_obj = await self.get(id)
        if db_obj is None:
            return False
        
        db_obj.soft_delete()
        self.db.add(db_obj)
        await self.db.flush()
        return True
    
    async def hard_delete(
        self,
        id: UUID,
    ) -> bool:
        """
        Permanently delete a record by ID.
        
        Args:
            id: Record UUID
            
        Returns:
            True if deleted, False if not found
        """
        db_obj = await self.get(id, include_deleted=True)
        if db_obj is None:
            return False
        
        await self.db.delete(db_obj)
        await self.db.flush()
        return True
    
    async def restore(
        self,
        id: UUID,
    ) -> Optional[ModelType]:
        """
        Restore a soft-deleted record.
        
        Args:
            id: Record UUID
            
        Returns:
            Restored model instance or None if not found
        """
        db_obj = await self.get(id, include_deleted=True)
        if db_obj is None:
            return None
        
        db_obj.restore()
        self.db.add(db_obj)
        await self.db.flush()
        await self.db.refresh(db_obj)
        return db_obj
    
    async def count(
        self,
        *,
        filters: Optional[dict[str, Any]] = None,
        include_deleted: bool = False,
    ) -> int:
        """
        Count records with optional filtering.
        
        Args:
            filters: Dict of field_name: value for filtering
            include_deleted: Include soft-deleted records
            
        Returns:
            Number of matching records
        """
        query = select(func.count()).select_from(self.model)
        
        if not include_deleted:
            query = query.where(self.model.deleted_at.is_(None))
        
        if filters:
            for field, value in filters.items():
                if hasattr(self.model, field) and value is not None:
                    query = query.where(getattr(self.model, field) == value)
        
        result = await self.db.execute(query)
        return result.scalar() or 0
    
    async def exists(
        self,
        id: UUID,
        *,
        include_deleted: bool = False,
    ) -> bool:
        """
        Check if a record exists.
        
        Args:
            id: Record UUID
            include_deleted: Include soft-deleted records
            
        Returns:
            True if exists, False otherwise
        """
        query = select(func.count()).select_from(self.model).where(self.model.id == id)
        
        if not include_deleted:
            query = query.where(self.model.deleted_at.is_(None))
        
        result = await self.db.execute(query)
        count = result.scalar() or 0
        return count > 0
