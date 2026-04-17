# Change Log: Full Revision (Frontend-Backend Sync & S3)

## Summary
Performed a comprehensive audit and synchronization of the frontend and backend to address type mismatches, ensure authentication alignment (adding Google/GitHub support), and implement S3/MinIO for image storage.

## Changes

### 1. Backend Infrastructure & Storage
- **MinIO**: Added MinIO service to `docker-compose.dev.yml` for S3-compatible object storage.
- **Dependencies**: Added `boto3` and `python-multipart` to `backend/requirements.txt`.
- **Storage Service**: Implemented `backend/app/services/storage.py` to handle S3 uploads with public URL generation.
- **Upload Endpoint**: Created `POST /api/v1/upload` (in `endpoints/upload.py`) to accept file uploads and return URLs.
- **Router**: Registered the new upload router in `api.py`.

### 2. Frontend-Backend Synchronization
- **Type Definitions**: Updated `frontend/src/lib/api/types.ts` to strictly match backend Pydantic schemas:
  - Added `User` fields: `oauth_provider`, `avatar_url`.
  - Added Enums: `BookCondition` (LIKE_NEW, GOOD, FAIR, POOR), `BookStatus` (DRAFT, ACTIVE).
  - Synced `CreateBookRequest` with backend validation.
- **Auth Features**:
  - Added **Google** and **GitHub** OAuth buttons to the Login page (`app/login/page.tsx`), pointing to the existing backend endpoints (`/auth/google`, `/auth/github`).

### 3. Implementation Details
- **Image Handling**: The backend now supports a 2-step image upload process:
  1. Frontend uploads file to `/api/v1/upload` -> gets URL.
  2. Frontend sends URL in `create_book` payload (maintaining the JSONB array structure).
- **Auth**: Frontend now exposes the OAuth flows that were already present in the backend.

## Verification
- **Docker**: MinIO container configured on ports 9000/9001.
- **Types**: Frontend types now match backend `BookCreate` and `UserResponse` schemas.
