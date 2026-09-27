import math
from typing import Dict, List, Optional
import boto3
from botocore.config import Config
from src.config import settings
from src.core.exceptions import V19plusException


class MediaStorageService:
    def __init__(self):
        self.endpoint_url = settings.r2_endpoint
        self.access_key = settings.R2_ACCESS_KEY_ID
        self.secret_key = settings.R2_SECRET_ACCESS_KEY

        # Boto3 client configured for Cloudflare R2 S3 compatibility
        self.s3_client = boto3.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name="auto",
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": "path"},
                retries={"max_attempts": 3, "mode": "standard"},
            ),
        )

    def is_mock_mode(self) -> bool:
        return not self.access_key or self.access_key.startswith("mock_") or not self.endpoint_url or "mock" in self.endpoint_url

    def create_multipart_upload(self, bucket: str, key: str, content_type: str = "video/mp4") -> str:
        """Initiate S3 multipart upload in Cloudflare R2"""
        if self.is_mock_mode():
            import uuid
            return f"mock_r2_upload_{uuid.uuid4().hex[:16]}"

        try:
            res = self.s3_client.create_multipart_upload(
                Bucket=bucket,
                Key=key,
                ContentType=content_type,
            )
            return res["UploadId"]
        except Exception as e:
            raise V19plusException(f"Failed to initiate multipart upload in R2: {str(e)}", status_code=500)

    def generate_presigned_part_url(
        self, bucket: str, key: str, upload_id: str, part_number: int, expires_in: int = 3600
    ) -> str:
        """Generate presigned PUT URL for a specific part so browser/admin uploads directly to R2"""
        if self.is_mock_mode():
            return f"https://r2.v19plus.com/{bucket}/{key}?uploadId={upload_id}&partNumber={part_number}&mock_token=valid"

        try:
            url = self.s3_client.generate_presigned_url(
                ClientMethod="upload_part",
                Params={
                    "Bucket": bucket,
                    "Key": key,
                    "UploadId": upload_id,
                    "PartNumber": part_number,
                },
                ExpiresIn=expires_in,
            )
            return url
        except Exception as e:
            raise V19plusException(f"Failed to generate presigned part URL: {str(e)}", status_code=500)

    def complete_multipart_upload(
        self, bucket: str, key: str, upload_id: str, parts: List[Dict[str, any]]
    ) -> Dict[str, any]:
        """Finalize multipart upload in R2 assembling all parts"""
        if self.is_mock_mode():
            return {
                "Location": f"https://stream.v19plus.com/{bucket}/{key}",
                "Bucket": bucket,
                "Key": key,
                "ETag": '"mock_etag_assembled_complete"',
            }
        try:
            # S3 API expects sorted parts with PartNumber and ETag
            sorted_parts = sorted(parts, key=lambda x: x["PartNumber"])
            formatted_parts = [
                {"PartNumber": p["PartNumber"], "ETag": p["ETag"].strip('"')}
                for p in sorted_parts
            ]
            res = self.s3_client.complete_multipart_upload(
                Bucket=bucket,
                Key=key,
                UploadId=upload_id,
                MultipartUpload={"Parts": formatted_parts},
            )
            return res
        except Exception as e:
            raise V19plusException(f"Failed to complete multipart assembly in R2: {str(e)}", status_code=500)

    def abort_multipart_upload(self, bucket: str, key: str, upload_id: str) -> None:
        """Abort an in-progress multipart upload to prevent orphan chunk storage charges"""
        try:
            self.s3_client.abort_multipart_upload(
                Bucket=bucket,
                Key=key,
                UploadId=upload_id,
            )
        except Exception:
            pass
