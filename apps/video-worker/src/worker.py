import asyncio
import logging
import os
import shutil
import time
import uuid
import redis.asyncio as aioredis
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from src.config import worker_settings
from src.probe import MediaProbe
from src.sprites import SpriteGenerator
from src.transcoder import FFmpegTranscoder
from src.uploader import R2MediaTransfer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [VideoWorker]: %(message)s",
)
logger = logging.getLogger("v19plus.video_worker")

# PostgreSQL Engine for Worker status updates
engine = create_async_engine(
    worker_settings.DATABASE_URL,
    pool_size=5,
    pool_recycle=300,
)
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)


async def process_video_job(job_id_str: str) -> None:
    job_id = uuid.UUID(job_id_str)
    scratch_dir = os.path.join(worker_settings.SCRATCH_DIR, job_id_str)
    os.makedirs(scratch_dir, exist_ok=True)
    local_master = os.path.join(scratch_dir, "master.mp4")
    output_hls_dir = os.path.join(scratch_dir, "hls")

    async with SessionLocal() as db:
        # Import models locally to avoid circular dependencies
        from sqlalchemy import text
        res = await db.execute(
            text("SELECT id, source_bucket, source_file_key, target_bucket, target_hls_prefix, content_id, episode_id FROM video_jobs WHERE id = :job_id"),
            {"job_id": job_id},
        )
        row = res.mappings().first()
        if not row:
            logger.error(f"Job {job_id} not found in database.")
            return

        source_bucket = row["source_bucket"]
        source_key = row["source_file_key"]
        target_bucket = row["target_bucket"]
        target_prefix = row["target_hls_prefix"]
        content_id = row["content_id"]
        episode_id = row["episode_id"]

        try:
            logger.info(f"▶️ Starting job {job_id}: {source_key}")

            # 1. Update status: PROBING
            await db.execute(
                text("UPDATE video_jobs SET status = 'PROBING', progress_percent = 5, updated_at = NOW() WHERE id = :id"),
                {"id": job_id},
            )
            await db.commit()

            # 2. Download master from Cloudflare R2
            transfer = R2MediaTransfer()
            logger.info(f"Downloading master asset from {source_bucket}/{source_key}...")
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, transfer.download_master, source_bucket, source_key, local_master)

            # 3. Probe master video
            probe_data = await MediaProbe.inspect(local_master)
            ladder = MediaProbe.determine_abr_ladder(probe_data["width"], probe_data["height"])
            logger.info(f"Probed master: {probe_data['width']}x{probe_data['height']} ({probe_data['duration']}s). ABR Renditions: {[r['name'] for r in ladder]}")

            # 4. Update status: TRANSCODING
            await db.execute(
                text("UPDATE video_jobs SET status = 'TRANSCODING', source_metadata = :meta, progress_percent = 15, updated_at = NOW() WHERE id = :id"),
                {"id": job_id, "meta": str(probe_data)},
            )
            await db.commit()

            # 5. Execute FFmpeg Multi-Rendition HLS Transcoding with real-time progress
            async def progress_callback(pct: int):
                mapped_pct = min(90, 15 + int(pct * 0.75))
                async with SessionLocal() as progress_db:
                    await progress_db.execute(
                        text("UPDATE video_jobs SET progress_percent = :pct, updated_at = NOW() WHERE id = :id"),
                        {"id": job_id, "pct": mapped_pct},
                    )
                    await progress_db.commit()

            transcoder = FFmpegTranscoder(local_master, output_hls_dir, probe_data["duration"])
            await transcoder.transcode_to_hls(ladder, on_progress=progress_callback)

            # 6. Generate Scrubbing Preview Sprites & WebVTT
            logger.info("Generating scrubbing preview sprite sheets...")
            await SpriteGenerator.generate_sprites(local_master, output_hls_dir, probe_data["duration"])

            # 7. Update status: VALIDATING
            await db.execute(
                text("UPDATE video_jobs SET status = 'VALIDATING', progress_percent = 92, updated_at = NOW() WHERE id = :id"),
                {"id": job_id},
            )
            await db.commit()

            # 8. Upload HLS assets to Cloudflare R2
            logger.info(f"Uploading transcoded HLS assets to {target_bucket}/{target_prefix}...")
            await loop.run_in_executor(None, transfer.upload_hls_directory, output_hls_dir, target_bucket, target_prefix)

            # 9. Finalize VideoJob & Content records
            # 9. Finalize VideoJob & Content records
            master_key = f"{worker_settings.CDN_STREAMING_BASE_URL.rstrip('/')}/{target_prefix.rstrip('/')}/master.m3u8"
            sprite_key = f"{target_prefix.rstrip('/')}/thumbnails.vtt"

            await db.execute(
                text("""
                    UPDATE video_jobs 
                    SET status = 'READY', progress_percent = 100, duration_seconds = :duration, updated_at = NOW()
                    WHERE id = :id
                """),
                {"id": job_id, "duration": probe_data["duration"]},
            )

            # Auto-associate with Content if content_id was None (e.g. uploaded prior to catalog creation)
            if not content_id and not episode_id and source_key:
                c_res = await db.execute(
                    text("SELECT id FROM content WHERE master_storage_key = :key LIMIT 1"),
                    {"key": source_key},
                )
                c_row = c_res.mappings().first()
                if c_row:
                    content_id = c_row["id"]
                    logger.info(f"Associated job {job_id} with Content {content_id} via master_storage_key '{source_key}'.")
                else:
                    e_res = await db.execute(
                        text("SELECT id FROM episodes WHERE master_storage_key = :key LIMIT 1"),
                        {"key": source_key},
                    )
                    e_row = e_res.mappings().first()
                    if e_row:
                        episode_id = e_row["id"]
                        logger.info(f"Associated job {job_id} with Episode {episode_id} via master_storage_key '{source_key}'.")

            # Link master HLS manifest to Content or Episode only after successful validation
            if content_id:
                await db.execute(
                    text("""
                        UPDATE content 
                        SET hls_manifest_key = :manifest, sprite_vtt_key = :sprite, duration_seconds = :duration, status = 'PUBLISHED', updated_at = NOW()
                        WHERE id = :cid
                    """),
                    {
                        "manifest": master_key,
                        "sprite": sprite_key,
                        "duration": int(probe_data["duration"]),
                        "cid": content_id,
                    },
                )
            elif episode_id:
                await db.execute(
                    text("""
                        UPDATE episodes 
                        SET hls_manifest_key = :manifest, sprite_vtt_key = :sprite, duration_seconds = :duration, status = 'READY', updated_at = NOW()
                        WHERE id = :eid
                    """),
                    {
                        "manifest": master_key,
                        "sprite": sprite_key,
                        "duration": int(probe_data["duration"]),
                        "eid": episode_id,
                    },
                )

            await db.commit()
            logger.info(f"✅ Transcoding job {job_id} successfully finished! HLS Manifest: {master_key}")

        except Exception as e:
            logger.error(f"❌ Transcoding job {job_id} failed: {str(e)}", exc_info=True)
            await db.execute(
                text("""
                    UPDATE video_jobs 
                    SET status = 'FAILED', error_message = :err, updated_at = NOW()
                    WHERE id = :id
                """),
                {"id": job_id, "err": str(e)},
            )
            await db.commit()

        finally:
            # Clean up local scratch directory
            if os.path.exists(scratch_dir):
                shutil.rmtree(scratch_dir, ignore_errors=True)


async def run_worker_loop():
    """Background polling loop listening on Redis queue and PostgreSQL for pending video jobs"""
    logger.info(f"V19plus Video Worker initialized. Polling Redis ({worker_settings.REDIS_URL}) and PostgreSQL...")
    redis = None
    try:
        redis = aioredis.from_url(worker_settings.REDIS_URL, decode_responses=True)
    except Exception as e:
        logger.warning(f"Could not connect to Redis: {e}. Falling back to PostgreSQL polling mode.")

    while True:
        try:
            job_found = False

            # 1. Check Redis queue first
            if redis:
                try:
                    item = await redis.brpop("v19plus:video_jobs", timeout=2)
                    if item:
                        _, job_id_str = item
                        logger.info(f"Dequeued job {job_id_str} from Redis queue.")
                        job_found = True
                        await process_video_job(job_id_str)
                except Exception as re:
                    logger.debug(f"Redis poll warning: {re}")

            # 2. Check PostgreSQL for any orphan jobs in QUEUED status
            if not job_found:
                async with SessionLocal() as db:
                    res = await db.execute(
                        text("SELECT id FROM video_jobs WHERE status = 'QUEUED' ORDER BY created_at ASC LIMIT 1")
                    )
                    row = res.mappings().first()
                    if row:
                        orphan_id = str(row["id"])
                        logger.info(f"Picked up queued job {orphan_id} directly from PostgreSQL.")
                        await process_video_job(orphan_id)
                    else:
                        await asyncio.sleep(5)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.warning(f"Worker queue polling issue: {e}. Reconnecting in 3s...")
            await asyncio.sleep(3)


if __name__ == "__main__":
    try:
        asyncio.run(run_worker_loop())
    except KeyboardInterrupt:
        logger.info("Worker process stopped.")
