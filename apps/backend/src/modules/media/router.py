import math
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.config import settings
from src.database import get_db_session
from src.dependencies import TokenUser, require_admin
from src.redis import get_redis_client
from src.core.exceptions import V19plusException
from src.modules.media.schemas import (
    CompleteMultipartUploadRequest,
    CompleteMultipartUploadResponse,
    InitiateMultipartUploadRequest,
    InitiateMultipartUploadResponse,
    PresignedPartUrl,
)
from src.modules.media.service import MediaStorageService
from src.modules.video_jobs.models import JobStatus, VideoJob
from src.modules.content.models import Content, ContentStatus, Episode

router = APIRouter(prefix="/media", tags=["Media Ingestion (Direct R2 Multipart)"])

# Standard part size: 64MB (67,108,864 bytes).
# Supports up to 640 GB with S3's 10,000 part limit.
CHUNK_SIZE_BYTES = 64 * 1024 * 1024


@router.post(
    "/upload/initiate",
    response_model=InitiateMultipartUploadResponse,
    dependencies=[Depends(require_admin)],
)
async def initiate_upload(req: InitiateMultipartUploadRequest):
    storage = MediaStorageService()
    
    # Generate structured S3 key: masters/{content_id}/{uuid}/{clean_filename}
    target_id = str(req.content_id or req.episode_id or uuid.uuid4())
    clean_filename = req.filename.replace(" ", "_").replace("/", "_")
    storage_key = f"masters/{target_id}/{uuid.uuid4().hex[:8]}_{clean_filename}"

    bucket = settings.R2_MASTERS_BUCKET
    upload_id = storage.create_multipart_upload(bucket, storage_key, req.content_type)

    total_parts = math.ceil(req.file_size_bytes / CHUNK_SIZE_BYTES)
    if total_parts > 10000:
        raise V19plusException("File size exceeds multipart capacity (>640GB). Contact platform engineering.")

    # Pre-generate the first batch of presigned part URLs (e.g., first 10 parts)
    initial_parts_count = min(10, total_parts)
    initial_parts = [
        PresignedPartUrl(
            part_number=part_num,
            url=storage.generate_presigned_part_url(bucket, storage_key, upload_id, part_num),
        )
        for part_num in range(1, initial_parts_count + 1)
    ]

    return InitiateMultipartUploadResponse(
        upload_id=upload_id,
        key=storage_key,
        bucket=bucket,
        part_size_bytes=CHUNK_SIZE_BYTES,
        total_parts=total_parts,
        initial_parts=initial_parts,
    )


@router.get(
    "/upload/part-url",
    response_model=PresignedPartUrl,
    dependencies=[Depends(require_admin)],
)
async def get_part_url(
    upload_id: str = Query(..., description="Multipart Upload ID"),
    key: str = Query(..., description="Target R2 storage key"),
    part_number: int = Query(..., ge=1, le=10000, description="Part number (1-indexed)"),
):
    storage = MediaStorageService()
    url = storage.generate_presigned_part_url(
        settings.R2_MASTERS_BUCKET, key, upload_id, part_number
    )
    return PresignedPartUrl(part_number=part_number, url=url)


@router.post(
    "/upload/complete",
    response_model=CompleteMultipartUploadResponse,
    dependencies=[Depends(require_admin)],
)
async def complete_upload(
    req: CompleteMultipartUploadRequest,
    db: AsyncSession = Depends(get_db_session),
):
    storage = MediaStorageService()
    parts_payload = [{"PartNumber": p.part_number, "ETag": p.etag} for p in req.parts]

    # 1. Finalize multipart assembly in Cloudflare R2
    storage.complete_multipart_upload(
        settings.R2_MASTERS_BUCKET, req.key, req.upload_id, parts_payload
    )

    # 2. Derive target streaming HLS prefix
    target_id = str(req.content_id or req.episode_id or uuid.uuid4())
    hls_prefix = f"hls/{target_id}"

    # 3. Create VideoJob in PostgreSQL
    job = VideoJob(
        content_id=req.content_id,
        episode_id=req.episode_id,
        source_bucket=settings.R2_MASTERS_BUCKET,
        source_file_key=req.key,
        source_file_size_bytes=req.file_size_bytes,
        target_bucket=settings.R2_STREAMING_BUCKET,
        target_hls_prefix=hls_prefix,
        status=JobStatus.QUEUED,
        progress_percent=0,
    )
    db.add(job)

    # 4. Update Content / Episode status
    if req.content_id:
        content = await db.get(Content, req.content_id)
        if content:
            content.master_storage_key = req.key
            content.status = ContentStatus.PROCESSING
    elif req.episode_id:
        episode = await db.get(Episode, req.episode_id)
        if episode:
            episode.master_storage_key = req.key
            episode.status = ContentStatus.PROCESSING

    await db.commit()
    await db.refresh(job)

    # 5. Dispatch task to Render Video Worker via ARQ / Redis
    redis = get_redis_client()
    if redis:
        try:
            # Enqueue task for ARQ video worker
            from arq import create_pool
            from arq.connections import RedisSettings
            # Push job ID to worker queue
            await redis.lpush("v19plus:video_jobs", str(job.id))
        except Exception:
            pass

    return CompleteMultipartUploadResponse(
        message="Master video uploaded and transcoding job queued successfully.",
        key=req.key,
        job_id=job.id,
        status=job.status.value,
    )
