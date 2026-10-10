import inspect
import logging
import math
import os
import re
import shutil
import uuid
from typing import Any, List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Query, status, File, UploadFile, Request, HTTPException, Form, Body
from fastapi.responses import FileResponse, StreamingResponse
from starlette.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession
from src.config import settings
from src.database import get_db_session
from src.dependencies import TokenUser, require_admin
from src.redis import get_redis_client
from src.core.exceptions import V19plusException
from src.modules.media.schemas import (
    AbortMultipartUploadRequest,
    AbortMultipartUploadResponse,
    CompleteMultipartUploadRequest,
    CompleteMultipartUploadResponse,
    InitiateMultipartUploadRequest,
    InitiateMultipartUploadResponse,
    PresignedPartUrl,
)
from src.modules.media.service import MediaStorageService
from src.modules.video_jobs.models import JobStatus, VideoJob
from src.modules.content.models import Content, ContentStatus, Episode

logger = logging.getLogger("v19plus.media")

router = APIRouter(prefix="/media", tags=["Media Ingestion (Direct & Multipart)"])

# Local persistent media storage for uploads from Mac / External HDD
MEDIA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../media_storage"))
os.makedirs(MEDIA_DIR, exist_ok=True)

# Standard part size: 64MB (67,108,864 bytes).
CHUNK_SIZE_BYTES = 64 * 1024 * 1024


@router.post("/upload/file")
async def upload_direct_file(
    file: UploadFile = File(...),
):
    """
    Directly ingest and store a video file from local storage or external HDD.
    Saves to media_storage and makes it immediately streamable in the player.
    """
    raw_name = file.filename or "video.mp4"
    clean_name = re.sub(r"[^\w\.-]", "_", raw_name)
    unique_key = f"{uuid.uuid4().hex[:8]}_{clean_name}"
    target_path = os.path.join(MEDIA_DIR, unique_key)

    with open(target_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_size = os.path.getsize(target_path)
    stream_url = f"/api/media/stream/{unique_key}"

    # Sync to Cloudflare R2 bucket for permanent persistence across container deploys
    try:
        if settings.R2_ACCOUNT_ID and settings.R2_ACCESS_KEY_ID:
            storage = MediaStorageService()
            bucket_target = settings.R2_STREAMING_BUCKET or settings.R2_MASTERS_BUCKET
            await run_in_threadpool(
                storage.s3_client.upload_file,
                target_path,
                bucket_target,
                unique_key,
                ExtraArgs={"ContentType": file.content_type or "video/mp4"},
            )
            logger.info(f"Video {unique_key} successfully synced to Cloudflare R2 bucket '{bucket_target}'.")
            if settings.CDN_STREAMING_BASE_URL:
                stream_url = f"{settings.CDN_STREAMING_BASE_URL.rstrip('/')}/{unique_key}"

            # Clean up ephemeral local file in production to preserve container disk
            if settings.ENVIRONMENT == "production" and os.path.exists(target_path):
                try:
                    os.remove(target_path)
                except Exception:
                    pass
    except Exception as e:
        logger.warning(f"Could not sync file to Cloudflare R2: {e}")

    return {
        "storage_key": unique_key,
        "filename": raw_name,
        "file_size_bytes": file_size,
        "stream_url": stream_url,
        "content_type": file.content_type or "video/mp4",
    }


class ChunkInitiateRequest(BaseModel):
    filename: str
    file_size_bytes: int
    content_type: Optional[str] = "video/mp4"


class PartInfo(BaseModel):
    part_number: int
    etag: str


class ChunkCompleteRequest(BaseModel):
    upload_id: str
    key: str
    parts: List[PartInfo]
    file_size_bytes: int
    content_id: Optional[str] = None
    episode_id: Optional[str] = None


@router.post("/upload/chunked/initiate")
async def initiate_chunked_upload(
    req: ChunkInitiateRequest,
):
    """
    Initiate a multipart upload in Cloudflare R2 for resilient chunked streaming.
    Bypasses proxy payload limits, allowing files of any size (up to hundreds of GBs).
    """
    storage = MediaStorageService()
    raw_name = req.filename or "video.mp4"
    clean_name = re.sub(r"[^\w\.-]", "_", raw_name)
    unique_key = f"{uuid.uuid4().hex[:8]}_{clean_name}"
    bucket = settings.R2_STREAMING_BUCKET or settings.R2_MASTERS_BUCKET

    upload_id = await run_in_threadpool(
        storage.create_multipart_upload,
        bucket,
        unique_key,
        req.content_type or "video/mp4",
    )

    return {
        "upload_id": upload_id,
        "key": unique_key,
        "chunk_size": 20 * 1024 * 1024,
    }


@router.post("/upload/chunked/part")
async def upload_chunked_part(
    upload_id: str = Form(...),
    key: str = Form(...),
    part_number: int = Form(...),
    chunk: UploadFile = File(...),
):
    """
    Ingest a single 20MB chunk into Cloudflare R2 multipart upload.
    Streams directly to R2 without touching container disk or exceeding proxy payload limits.
    """
    storage = MediaStorageService()
    bucket = settings.R2_STREAMING_BUCKET or settings.R2_MASTERS_BUCKET

    chunk_data = await chunk.read()
    etag = await run_in_threadpool(
        storage.upload_part,
        bucket,
        key,
        upload_id,
        part_number,
        chunk_data,
    )

    return {
        "part_number": part_number,
        "etag": etag,
    }


@router.post("/upload/chunked/complete")
async def complete_chunked_upload(
    req: ChunkCompleteRequest,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Finalize multipart assembly in Cloudflare R2 and queue background ABR HLS transcoding.
    Follows Netflix/YouTube ingest pipeline: raw master is stored safely, and an
    asynchronous multi-rendition HLS transcoding job is dispatched to eliminate buffering.
    """
    storage = MediaStorageService()
    bucket = settings.R2_STREAMING_BUCKET or settings.R2_MASTERS_BUCKET
    parts_payload = [{"PartNumber": p.part_number, "ETag": p.etag} for p in req.parts]

    is_completed = False
    try:
        await run_in_threadpool(
            storage.complete_multipart_upload,
            bucket,
            req.key,
            req.upload_id,
            parts_payload,
        )
        is_completed = True
    except Exception as e:
        logger.error(
            f"[R2 CLEANUP] complete_chunked_upload failed assembling R2 parts for key '{req.key}', upload_id '{req.upload_id}': {e}"
        )
        # Abort the multipart upload to prevent orphan chunk storage charges
        await run_in_threadpool(
            storage.safe_abort_multipart_upload,
            bucket,
            req.key,
            req.upload_id,
        )
        raise V19plusException(f"Failed to assemble chunked video in Cloudflare R2: {str(e)}", status_code=500)

    clean_key_name = re.sub(r"[^\w\.-]", "_", req.key).replace(".mp4", "").replace(".mov", "")
    target_id = req.content_id or req.episode_id or clean_key_name
    hls_prefix = f"hls/{target_id}"
    cdn_base = (settings.CDN_STREAMING_BASE_URL or "").rstrip("/")

    stream_url = f"/api/media/stream/{req.key}"
    if cdn_base:
        stream_url = f"{cdn_base}/{req.key}"

    hls_manifest_url = f"{cdn_base}/{hls_prefix}/master.m3u8" if cdn_base else stream_url

    # Automatically queue VideoJob for transcoding master into adaptive HLS
    # NOTE: Since R2 assembly succeeded, we never abort the completed video object even if downstream job registration logs an issue
    job_id = None
    try:
        content_uuid = uuid.UUID(req.content_id) if req.content_id else None
        episode_uuid = uuid.UUID(req.episode_id) if req.episode_id else None

        job = VideoJob(
            content_id=content_uuid,
            episode_id=episode_uuid,
            source_bucket=bucket,
            source_file_key=req.key,
            source_file_size_bytes=req.file_size_bytes,
            target_bucket=bucket,
            target_hls_prefix=hls_prefix,
            status=JobStatus.PENDING,
            progress_percent=0,
        )
        db.add(job)
        await db.commit()
        await db.refresh(job)
        job_id = str(job.id)

        # Dispatch to Redis queue for video-worker
        redis_client: Any = get_redis_client()
        if redis_client:
            try:
                queue_task: Any = redis_client.lpush("v19plus:video_jobs", str(job.id))
                if inspect.isawaitable(queue_task):
                    await queue_task
            except Exception as e:
                logger.warning(f"Could not push chunked video job to Redis: {e}")
    except Exception as e:
        logger.warning(f"Notice during chunked upload VideoJob registration: {e}")

    return {
        "storage_key": req.key,
        "stream_url": stream_url,
        "hls_manifest_url": hls_manifest_url,
        "job_id": job_id,
        "file_size_bytes": req.file_size_bytes,
    }


@router.post("/upload/chunked/abort", response_model=AbortMultipartUploadResponse)
async def abort_chunked_upload(
    req: AbortMultipartUploadRequest,
):
    """
    Explicitly abort an in-progress chunked multipart upload in Cloudflare R2.
    Frees all stored part chunks immediately to prevent orphan storage charges.
    Safe and idempotent.
    """
    storage = MediaStorageService()
    bucket = settings.R2_STREAMING_BUCKET or settings.R2_MASTERS_BUCKET
    logger.warning(
        f"[R2 CLEANUP] Explicit chunked abort requested. Key: '{req.key}', UploadId: '{req.upload_id}', Reason: '{req.reason}'"
    )
    await run_in_threadpool(
        storage.safe_abort_multipart_upload,
        bucket,
        req.key,
        req.upload_id,
    )
    return AbortMultipartUploadResponse(
        status="aborted",
        upload_id=req.upload_id,
        key=req.key,
        message="In-progress chunked multipart upload aborted and orphan chunks purged from R2.",
    )


@router.api_route("/stream/{filename}", methods=["GET", "HEAD"])
async def stream_video_file(filename: str, request: Request):
    """
    Stream uploaded video files directly with HTTP Range (byte-range) support
    for smooth scrubbing, seeking, and instant playback in HTML5 video & HLS players.
    """
    clean_filename = os.path.basename(filename)
    file_path = os.path.join(MEDIA_DIR, clean_filename)

    if not os.path.exists(file_path):
        # Graceful fallback: Redirect to Cloudflare R2 CDN if local file is missing on container
        if settings.CDN_STREAMING_BASE_URL:
            r2_cdn_url = f"{settings.CDN_STREAMING_BASE_URL.rstrip('/')}/{clean_filename}"
            from fastapi.responses import RedirectResponse
            return RedirectResponse(r2_cdn_url, status_code=307)
        raise HTTPException(status_code=404, detail="Media file not found on disk.")

    file_size = os.path.getsize(file_path)
    range_header = request.headers.get("range")

    if range_header:
        parts = range_header.replace("bytes=", "").split("-")
        start = int(parts[0])
        end = int(parts[1]) if (len(parts) > 1 and parts[1]) else file_size - 1
        end = min(end, file_size - 1)
        chunk_size = (end - start) + 1

        def iterfile():
            with open(file_path, "rb") as f:
                f.seek(start)
                bytes_left = chunk_size
                while bytes_left > 0:
                    read_bytes = min(bytes_left, 1024 * 1024)
                    data = f.read(read_bytes)
                    if not data:
                        break
                    bytes_left -= len(data)
                    yield data

        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(chunk_size),
            "Content-Type": "video/mp4",
        }
        return StreamingResponse(iterfile(), status_code=206, headers=headers)

    return FileResponse(file_path, media_type="video/mp4", headers={"Accept-Ranges": "bytes"})


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
    is_completed = False
    try:
        storage.complete_multipart_upload(
            settings.R2_MASTERS_BUCKET, req.key, req.upload_id, parts_payload
        )
        is_completed = True
    except Exception as e:
        logger.error(
            f"[R2 CLEANUP] complete_upload failed assembling R2 parts for key '{req.key}', upload_id '{req.upload_id}': {e}"
        )
        # Abort the multipart upload to prevent orphan chunk storage charges
        storage.safe_abort_multipart_upload(settings.R2_MASTERS_BUCKET, req.key, req.upload_id)
        raise V19plusException(f"Failed to assemble master video in R2: {str(e)}", status_code=500)

    # 2. Derive target streaming HLS prefix
    target_id = str(req.content_id or req.episode_id or uuid.uuid4())
    hls_prefix = f"hls/{target_id}"

    # 3. Create VideoJob in PostgreSQL
    # NOTE: Since R2 assembly succeeded, we never abort the completed video object even if downstream DB/Redis operations encounter an error
    job = VideoJob(
        content_id=req.content_id,
        episode_id=req.episode_id,
        source_bucket=settings.R2_MASTERS_BUCKET,
        source_file_key=req.key,
        source_file_size_bytes=req.file_size_bytes,
        target_bucket=settings.R2_STREAMING_BUCKET,
        target_hls_prefix=hls_prefix,
        status=JobStatus.PENDING,
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
    redis_client: Any = get_redis_client()
    if redis_client:
        try:
            # Push job ID to worker queue
            queue_task: Any = redis_client.lpush("v19plus:video_jobs", str(job.id))
            if inspect.isawaitable(queue_task):
                await queue_task
        except Exception:
            pass

    return CompleteMultipartUploadResponse(
        message="Master video uploaded and transcoding job queued successfully.",
        key=req.key,
        job_id=job.id,
        status=job.status.value,
    )


@router.post(
    "/upload/abort",
    response_model=AbortMultipartUploadResponse,
    dependencies=[Depends(require_admin)],
)
async def abort_upload(
    req: AbortMultipartUploadRequest,
):
    """
    Explicitly abort an in-progress multipart master upload in Cloudflare R2.
    Frees all stored part chunks immediately to prevent orphan storage charges.
    Safe and idempotent.
    """
    storage = MediaStorageService()
    logger.warning(
        f"[R2 CLEANUP] Admin explicit abort requested for master upload. Key: '{req.key}', UploadId: '{req.upload_id}', Reason: '{req.reason}'"
    )
    storage.safe_abort_multipart_upload(settings.R2_MASTERS_BUCKET, req.key, req.upload_id)
    return AbortMultipartUploadResponse(
        status="aborted",
        upload_id=req.upload_id,
        key=req.key,
        message="In-progress multipart master upload aborted and orphan chunks purged from R2.",
    )
