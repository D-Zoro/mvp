import boto3
from botocore.exceptions import ClientError
from fastapi import UploadFile
import os
from datetime import datetime
import uuid

class StorageService:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            endpoint_url=os.getenv('AWS_ENDPOINT_URL', 'http://minio:9000'),
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID', 'minioadmin'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY', 'minioadmin'),
            region_name=os.getenv('AWS_REGION', 'us-east-1')
        )
        self.bucket_name = os.getenv('AWS_BUCKET_NAME', 'books4all-uploads')
        self._bucket_initialized = False

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
        Upload a file to S3/MinIO and return the public URL.
        """
        # Ensure bucket exists on first use
        if not self._bucket_initialized:
            self._ensure_bucket_exists()
            self._bucket_initialized = True

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

            # Construct URL
            # In production, this would be the CloudFront/S3 URL
            # In dev, it's the MinIO URL accessible from the browser
            base_url = os.getenv('PUBLIC_STORAGE_URL', 'http://localhost:9000')
            return f"{base_url}/{self.bucket_name}/{filename}"

        except ClientError as e:
            print(f"Error uploading file: {e}")
            raise e

storage_service = StorageService()
