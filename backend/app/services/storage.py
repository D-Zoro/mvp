import boto3
from botocore.exceptions import ClientError
from fastapi import UploadFile
from app.core.config import settings
import os
from datetime import datetime
import uuid

class StorageService:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            endpoint_url=settings.AWS_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        self.bucket_name = settings.AWS_BUCKET_NAME
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
        except ClientError:
            try:
                self.s3_client.create_bucket(Bucket=self.bucket_name)
                # Set public read policy for development
                policy = {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Sid": "PublicRead",
                            "Effect": "Allow",
                            "Principal": "*",
                            "Action": ["s3:GetObject"],
                            "Resource": [f"arn:aws:s3:::{self.bucket_name}/*"]
                        }
                    ]
                }
                import json
                self.s3_client.put_bucket_policy(
                    Bucket=self.bucket_name,
                    Policy=json.dumps(policy)
                )
            except ClientError as e:
                print(f"Error creating bucket: {e}")

    async def upload_file(self, file: UploadFile, folder: str = "books") -> str:
        """
        Upload a file to S3/MinIO and return only the relative S3 key.
        
        This prevents database lock-in to specific storage providers.
        The relative key can be combined with PUBLIC_STORAGE_URL by clients
        or computed fields in response schemas.
        
        Returns:
            str: Relative S3 key (e.g., 'uploads/2026/05/uuid.jpg')
        """
        # Generate unique filename
        ext = os.path.splitext(file.filename)[1]
        filename = f"{folder}/{datetime.now().strftime('%Y/%m')}/{uuid.uuid4()}{ext}"
        
        try:
            # Upload file
            self.s3_client.upload_fileobj(
                file.file,
                self.bucket_name,
                filename,
                ExtraArgs={'ContentType': file.content_type}
            )
            
            # Return only the relative key (not the full URL)
            # This allows frontend/schemas to construct URLs dynamically
            return filename
            
        except ClientError as e:
            print(f"Error uploading file: {e}")
            raise e

storage_service = StorageService()
