from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
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
    Returns the public URL of the uploaded file.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    
    try:
        url = await storage_service.upload_file(file, folder="uploads")
        return {"url": url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
