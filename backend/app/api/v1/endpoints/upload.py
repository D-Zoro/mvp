from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from app.core.config import settings
from app.core.dependencies import get_current_active_user
from app.services.storage import storage_service
from app.schemas.user import UserResponse

router = APIRouter()

@router.post("/upload", response_model=dict)
async def upload_file(
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(get_current_active_user),
):
    """
    Upload a file to storage (MinIO/S3).
    
    Returns:
        - key: Relative S3 key for database storage (prevents lock-in)
        - url: Full URL preview for immediate frontend display
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    
    try:
        # Get relative key (for database)
        relative_key = await storage_service.upload_file(file, folder="uploads")
        
        # Construct full URL (for frontend preview)
        full_url = f"{settings.PUBLIC_STORAGE_URL}/{settings.AWS_BUCKET_NAME}/{relative_key}"
        
        return {
            "key": relative_key,  # Store this in DB
            "url": full_url       # Use this for immediate preview in frontend
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
