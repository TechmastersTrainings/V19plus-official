import os
import mimetypes
from typing import List
import boto3
from botocore.config import Config
from src.config import worker_settings


class R2MediaTransfer:
    def __init__(self):
        self.s3_client = boto3.client(
            "s3",
            endpoint_url=worker_settings.r2_endpoint,
            aws_access_key_id=worker_settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=worker_settings.R2_SECRET_ACCESS_KEY,
            region_name="auto",
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": "path"},
                retries={"max_attempts": 3, "mode": "standard"},
            ),
        )

    def download_master(self, bucket: str, key: str, local_destination: str) -> None:
        """Download master video from Cloudflare R2 to worker scratch disk"""
        os.makedirs(os.path.dirname(local_destination), exist_ok=True)
        self.s3_client.download_file(bucket, key, local_destination)

    def upload_hls_directory(self, local_dir: str, bucket: str, s3_prefix: str) -> List[str]:
        """
        Recursively upload all HLS playlists and media segments to Cloudflare R2.
        Applies correct Content-Type and Cache-Control headers for high-performance CDN edge caching.
        """
        uploaded_keys = []
        for root, _, files in os.walk(local_dir):
            for file in files:
                local_path = os.path.join(root, file)
                rel_path = os.path.relpath(local_path, local_dir)
                s3_key = f"{s3_prefix.rstrip('/')}/{rel_path}"

                # Content-Type and Caching headers
                content_type = "binary/octet-stream"
                cache_control = "public, max-age=31536000, immutable" # Segments are immutable

                if file.endswith(".m3u8"):
                    content_type = "application/vnd.apple.mpegurl"
                    cache_control = "public, max-age=60" # Playlists expire faster
                elif file.endswith(".ts"):
                    content_type = "video/mp2t"
                elif file.endswith(".vtt"):
                    content_type = "text/vtt"
                elif file.endswith(".jpg") or file.endswith(".jpeg"):
                    content_type = "image/jpeg"

                self.s3_client.upload_file(
                    local_path,
                    bucket,
                    s3_key,
                    ExtraArgs={
                        "ContentType": content_type,
                        "CacheControl": cache_control,
                    },
                )
                uploaded_keys.append(s3_key)

        return uploaded_keys
