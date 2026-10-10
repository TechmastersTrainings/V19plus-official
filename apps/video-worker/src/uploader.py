import os
import math
import mimetypes
from concurrent.futures import ThreadPoolExecutor, as_completed
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
        """
        Download master video from Cloudflare R2 using high-speed parallel chunk range requests.
        Falls back to standard download for smaller files (< 64MB).
        """
        os.makedirs(os.path.dirname(local_destination), exist_ok=True)
        head = self.s3_client.head_object(Bucket=bucket, Key=key)
        file_size = head.get("ContentLength", 0)

        chunk_size = 32 * 1024 * 1024  # 32MB chunks
        if file_size < chunk_size * 2:
            self.s3_client.download_file(bucket, key, local_destination)
            return

        total_chunks = math.ceil(file_size / chunk_size)
        with open(local_destination, "wb") as f:
            f.truncate(file_size)

        def download_chunk(idx):
            start = idx * chunk_size
            end = min(file_size - 1, (idx + 1) * chunk_size - 1)
            resp = self.s3_client.get_object(Bucket=bucket, Key=key, Range=f"bytes={start}-{end}")
            data = resp["Body"].read()
            with open(local_destination, "r+b") as f:
                f.seek(start)
                f.write(data)
            return idx

        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(download_chunk, i) for i in range(total_chunks)]
            for fut in as_completed(futures):
                fut.result()

    def upload_hls_directory(self, local_dir: str, bucket: str, s3_prefix: str) -> List[str]:
        """
        Recursively upload all HLS playlists and media segments to Cloudflare R2 using 35 parallel workers.
        Applies correct Content-Type and Cache-Control headers for high-performance CDN edge caching.
        """
        upload_tasks = []
        for root, _, files in os.walk(local_dir):
            for file in files:
                local_path = os.path.join(root, file)
                rel_path = os.path.relpath(local_path, local_dir)
                s3_key = f"{s3_prefix.rstrip('/')}/{rel_path}"

                # Content-Type and Caching headers
                content_type = "video/mp2t"
                cache_control = "public, max-age=31536000, immutable"  # Segments are immutable

                if file.endswith(".m3u8"):
                    content_type = "application/vnd.apple.mpegurl"
                    cache_control = "public, max-age=60"  # Playlists expire faster
                elif file.endswith(".ts"):
                    content_type = "video/mp2t"
                elif file.endswith(".vtt"):
                    content_type = "text/vtt"
                    cache_control = "public, max-age=86400"
                elif file.endswith(".jpg") or file.endswith(".jpeg"):
                    content_type = "image/jpeg"
                    cache_control = "public, max-age=86400"

                upload_tasks.append((local_path, s3_key, content_type, cache_control))

        def upload_single_file(task):
            fp, key, ct, cc = task
            self.s3_client.upload_file(
                fp,
                bucket,
                key,
                ExtraArgs={
                    "ContentType": ct,
                    "CacheControl": cc,
                },
            )
            return key

        uploaded_keys = []
        with ThreadPoolExecutor(max_workers=35) as executor:
            futures = [executor.submit(upload_single_file, t) for t in upload_tasks]
            for fut in as_completed(futures):
                uploaded_keys.append(fut.result())

        return uploaded_keys
