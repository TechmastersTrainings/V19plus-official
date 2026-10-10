"""
V19PLUS Automated Video Transcoding & Publishing Pipeline
Processes pending video uploads from Cloudflare R2 into high-speed Adaptive Bitrate (ABR) HLS streams.

Usage:
  # Process all pending queued jobs or content missing HLS:
  apps/backend/.venv/bin/python scripts/process_all_pending_videos.py

  # Process a specific content slug:
  apps/backend/.venv/bin/python scripts/process_all_pending_videos.py --slug <content-slug>

  # Process a specific master R2 key:
  apps/backend/.venv/bin/python scripts/process_all_pending_videos.py --key <r2-key.mp4>
"""

import os
import sys
import time
import math
import shutil
import argparse
import subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import boto3
import httpx
import asyncpg
import asyncio
from dotenv import load_dotenv

# Load backend environment variables
env_path = Path(__file__).resolve().parent.parent / "apps" / "backend" / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    load_dotenv()

R2_ENDPOINT = os.getenv("R2_ENDPOINT_URL", "https://0145d381c72806d12af91fb516e91171.r2.cloudflarestorage.com")
R2_KEY_ID = os.getenv("R2_ACCESS_KEY_ID", "517169524a3f3d5dfbef949b4b1fa110")
R2_SECRET = os.getenv("R2_SECRET_ACCESS_KEY", "2d0e286b5871db369143c6405281a099143177b4b20235f5e4653452e82a6771")
R2_BUCKET = os.getenv("R2_STREAMING_BUCKET", "v19plus-r2-backend")
CDN_BASE = os.getenv("CDN_STREAMING_BASE_URL", "https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev").rstrip("/")

DB_URL = os.getenv("DATABASE_SYNC_URL") or os.getenv("DATABASE_URL", "")
if "+asyncpg" in DB_URL:
    DB_URL = DB_URL.replace("+asyncpg", "")


def log(msg: str):
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}", flush=True)


def get_s3():
    return boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=R2_KEY_ID,
        aws_secret_access_key=R2_SECRET,
        region_name="auto",
    )


def download_master_parallel(source_key: str, dest_path: str):
    log(f"📥 Downloading master video from R2: {R2_BUCKET}/{source_key}...")
    s3 = get_s3()
    head = s3.head_object(Bucket=R2_BUCKET, Key=source_key)
    file_size = head["ContentLength"]

    chunk_size = 32 * 1024 * 1024  # 32MB chunks
    total_chunks = math.ceil(file_size / chunk_size)
    log(f"  Size: {file_size / (1024**3):.2f} GB in {total_chunks} chunks via 20 parallel workers...")

    with open(dest_path, "wb") as f:
        f.truncate(file_size)

    def download_chunk(idx):
        start = idx * chunk_size
        end = min(file_size - 1, (idx + 1) * chunk_size - 1)
        resp = s3.get_object(Bucket=R2_BUCKET, Key=source_key, Range=f"bytes={start}-{end}")
        data = resp["Body"].read()
        with open(dest_path, "r+b") as f:
            f.seek(start)
            f.write(data)
        return idx

    t0 = time.time()
    completed = 0
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(download_chunk, i) for i in range(total_chunks)]
        for fut in as_completed(futures):
            fut.result()
            completed += 1
            if completed % 20 == 0 or completed == total_chunks:
                pct = (completed / total_chunks) * 100
                speed = (completed * chunk_size / (1024 * 1024)) / max(1, time.time() - t0)
                log(f"  Downloaded {completed}/{total_chunks} chunks ({pct:.1f}%) at {speed:.1f} MB/s...")

    log(f"  ✓ Master download completed in {(time.time()-t0):.1f}s!")


def probe_video(video_path: str):
    import json
    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        video_path,
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        raise RuntimeError(f"FFprobe failed on {video_path}")
    data = json.loads(res.stdout)
    duration = float(data.get("format", {}).get("duration", 0))
    video_stream = next((s for s in data.get("streams", []) if s.get("codec_type") == "video"), None)
    width = int(video_stream.get("width", 1920)) if video_stream else 1920
    height = int(video_stream.get("height", 1080)) if video_stream else 1080
    return {"duration": duration, "width": width, "height": height}


def transcode_hls(local_master: str, output_dir: str):
    log("🎬 Transcoding to 4-Tier Adaptive HLS (1080p, 720p, 480p, 360p)...")
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir, ignore_errors=True)
    os.makedirs(output_dir, exist_ok=True)
    for tier in ["1080p", "720p", "480p", "360p"]:
        os.makedirs(os.path.join(output_dir, tier), exist_ok=True)

    filter_complex = (
        "[0:v]scale=w=1920:h=1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2[v1080];"
        "[0:v]scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2[v720];"
        "[0:v]scale=w=854:h=480:force_original_aspect_ratio=decrease,pad=854:480:(ow-iw)/2:(oh-ih)/2[v480];"
        "[0:v]scale=w=640:h=360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2[v360]"
    )

    is_macos = sys.platform == "darwin"
    codec = "h264_videotoolbox" if is_macos else "libx264"

    cmd = [
        "ffmpeg",
        "-y",
        "-err_detect", "ignore_err",
        "-fflags", "+genpts+discardcorrupt",
        "-max_error_rate", "1.0",
    ]
    if is_macos:
        cmd.extend(["-hwaccel", "videotoolbox"])

    cmd.extend([
        "-i", local_master,
        "-filter_complex", filter_complex,
        "-map", "[v1080]", "-map", "0:a:0?",
        "-c:v:0", codec, "-b:v:0", "3800k", "-maxrate:v:0", "4200k", "-bufsize:v:0", "7600k",
        "-c:a:0", "aac", "-b:a:0", "192k", "-ac:a:0", "2",
        "-map", "[v720]", "-map", "0:a:0?",
        "-c:v:1", codec, "-b:v:1", "1800k", "-maxrate:v:1", "2200k", "-bufsize:v:1", "3600k",
        "-c:a:1", "aac", "-b:a:1", "128k", "-ac:a:1", "2",
        "-map", "[v480]", "-map", "0:a:0?",
        "-c:v:2", codec, "-b:v:2", "850k", "-maxrate:v:2", "1050k", "-bufsize:v:2", "1700k",
        "-c:a:2", "aac", "-b:a:2", "96k", "-ac:a:2", "2",
        "-map", "[v360]", "-map", "0:a:0?",
        "-c:v:3", codec, "-b:v:3", "400k", "-maxrate:v:3", "500k", "-bufsize:v:3", "800k",
        "-c:a:3", "aac", "-b:a:3", "64k", "-ac:a:3", "2",
        "-g", "48",
        "-keyint_min", "48",
        "-sc_threshold", "0",
        "-f", "hls",
        "-hls_time", "4",
        "-hls_playlist_type", "vod",
        "-hls_flags", "independent_segments",
        "-master_pl_name", "master.m3u8",
        "-var_stream_map", "v:0,a:0,name:1080p v:1,a:1,name:720p v:2,a:2,name:480p v:3,a:3,name:360p",
        "-hls_segment_filename", os.path.join(output_dir, "%v/seg_%04d.ts"),
        os.path.join(output_dir, "%v/playlist.m3u8"),
    ])

    t0 = time.time()
    res = subprocess.run(cmd)
    if res.returncode != 0:
        raise RuntimeError(f"FFmpeg transcode failed (exit code {res.returncode})")
    log(f"  ✓ HLS transcode completed in {(time.time()-t0)/60:.1f} minutes!")


def generate_sprites(local_master: str, output_dir: str, duration: float):
    log("🖼️ Generating scrubbing thumbnail sprite sheet and WebVTT...")
    sprite_path = os.path.join(output_dir, "sprite.jpg")
    vtt_path = os.path.join(output_dir, "thumbnails.vtt")

    interval = 15
    total_thumbs = math.ceil(duration / interval)
    cols = 15
    rows = math.ceil(total_thumbs / cols)

    cmd = [
        "ffmpeg", "-y",
        "-i", local_master,
        "-vf", f"fps=1/{interval},scale=160:90,tile={cols}x{rows}",
        "-q:v", "5",
        sprite_path,
    ]
    subprocess.run(cmd)

    def fmt_time(seconds: float) -> str:
        hrs = int(seconds // 3600)
        mins = int((seconds % 3600) // 60)
        secs = seconds % 60
        return f"{hrs:02d}:{mins:02d}:{secs:06.3f}"

    with open(vtt_path, "w", encoding="utf-8") as f:
        f.write("WEBVTT\n\n")
        for idx in range(total_thumbs):
            start = idx * interval
            end = min(duration, (idx + 1) * interval)
            col = idx % cols
            row = idx // cols
            x = col * 160
            y = row * 90
            f.write(f"{fmt_time(start)} --> {fmt_time(end)}\n")
            f.write(f"sprite.jpg#xywh={x},{y},160,90\n\n")

    log("  ✓ WebVTT and sprite sheet ready!")


def upload_to_r2_parallel(output_dir: str, target_prefix: str):
    log(f"☁️ Uploading HLS directory to R2 ({R2_BUCKET}/{target_prefix}) using 35 parallel workers...")
    s3 = get_s3()
    upload_tasks = []
    for root, _, files in os.walk(output_dir):
        for f in files:
            fp = os.path.join(root, f)
            rel = os.path.relpath(fp, output_dir)
            s3_key = f"{target_prefix.rstrip('/')}/{rel}"

            ct = "video/mp2t"
            cc = "public, max-age=31536000, immutable"
            if f.endswith(".m3u8"):
                ct = "application/vnd.apple.mpegurl"
                cc = "public, max-age=60"
            elif f.endswith(".vtt"):
                ct = "text/vtt"
                cc = "public, max-age=86400"
            elif f.endswith(".jpg"):
                ct = "image/jpeg"
                cc = "public, max-age=86400"

            upload_tasks.append((fp, s3_key, ct, cc))

    def do_upload(task):
        fp, key, ct, cc = task
        s3.upload_file(fp, R2_BUCKET, key, ExtraArgs={"ContentType": ct, "CacheControl": cc})
        return key

    t0 = time.time()
    count = 0
    with ThreadPoolExecutor(max_workers=35) as executor:
        futures = [executor.submit(do_upload, t) for t in upload_tasks]
        for fut in as_completed(futures):
            fut.result()
            count += 1
            if count % 200 == 0 or count == len(upload_tasks):
                log(f"  Uploaded {count}/{len(upload_tasks)} files...")

    log(f"  ✓ Uploaded all {count} files in {(time.time()-t0):.1f}s!")


def validate_r2(target_prefix: str):
    log("🔍 Validating R2 CDN master playlist and quality renditions...")
    client = httpx.Client(headers={"User-Agent": "Mozilla/5.0"}, timeout=15.0)
    master_url = f"{CDN_BASE}/{target_prefix}/master.m3u8"
    res = client.get(master_url)
    if res.status_code != 200:
        raise AssertionError(f"Master manifest validation failed: status {res.status_code}")
    log(f"  ✓ Master playlist HTTP 200: {master_url}")

    for tier in ["1080p", "720p", "480p", "360p"]:
        tier_url = f"{CDN_BASE}/{target_prefix}/{tier}/playlist.m3u8"
        t_res = client.get(tier_url)
        if t_res.status_code != 200:
            raise AssertionError(f"Rendition {tier} failed: status {t_res.status_code}")
        log(f"  ✓ Quality Tier {tier} OK: {tier_url}")


async def sync_database(content_id: str, slug: str, target_prefix: str, duration: int, job_id: str = None):
    log(f"💾 Updating PostgreSQL database for '{slug or content_id}'...")
    master_url = f"{CDN_BASE}/{target_prefix}/master.m3u8"
    sprite_key = f"{target_prefix}/thumbnails.vtt"

    conn = await asyncpg.connect(DB_URL)
    if slug:
        await conn.execute(
            """
            UPDATE content
            SET hls_manifest_key = $1, sprite_vtt_key = $2, duration_seconds = $3, status = 'PUBLISHED', updated_at = NOW()
            WHERE slug = $4
            """,
            master_url, sprite_key, duration, slug
        )
    elif content_id:
        await conn.execute(
            """
            UPDATE content
            SET hls_manifest_key = $1, sprite_vtt_key = $2, duration_seconds = $3, status = 'PUBLISHED', updated_at = NOW()
            WHERE id = $4::uuid
            """,
            master_url, sprite_key, duration, content_id
        )

    if job_id:
        await conn.execute(
            """
            UPDATE video_jobs
            SET status = 'READY', progress_percent = 100, target_hls_prefix = $1, duration_seconds = $2, updated_at = NOW()
            WHERE id = $3::uuid
            """,
            target_prefix, duration, job_id
        )
    await conn.close()
    log("  ✓ Database updated to PUBLISHED / READY!")


async def process_one(content_id: str, slug: str, source_key: str, job_id: str = None):
    log(f"\n=======================================================")
    log(f"🎬 Processing Video: {slug or source_key}")
    log(f"=======================================================")

    stem = Path(source_key).stem
    target_prefix = f"hls/{stem}"
    scratch_dir = f"/tmp/v19_job_{stem}"
    local_master = os.path.join(scratch_dir, "master.mp4")
    output_hls = os.path.join(scratch_dir, "hls")

    os.makedirs(scratch_dir, exist_ok=True)
    try:
        download_master_parallel(source_key, local_master)
        meta = probe_video(local_master)
        duration_sec = int(meta["duration"])
        log(f"Probed duration: {duration_sec}s ({duration_sec/60:.1f} mins) | Resolution: {meta['width']}x{meta['height']}")

        transcode_hls(local_master, output_hls)
        generate_sprites(local_master, output_hls, meta["duration"])
        upload_to_r2_parallel(output_hls, target_prefix)
        validate_r2(target_prefix)
        await sync_database(content_id, slug, target_prefix, duration_sec, job_id)
        log(f"🎉 Successfully transcoded and published {slug or source_key}!")
    except Exception as e:
        log(f"❌ Processing failed for {slug or source_key}: {e}")
        conn = await asyncpg.connect(DB_URL)
        if job_id:
            await conn.execute(
                "UPDATE video_jobs SET status = 'FAILED', error_message = $1, updated_at = NOW() WHERE id = $2::uuid",
                str(e), job_id
            )
        if content_id:
            await conn.execute(
                "UPDATE content SET status = 'FAILED', updated_at = NOW() WHERE id = $1::uuid AND (status != 'PUBLISHED' OR hls_manifest_key IS NULL)",
                content_id
            )
        elif slug:
            await conn.execute(
                "UPDATE content SET status = 'FAILED', updated_at = NOW() WHERE slug = $1 AND (status != 'PUBLISHED' OR hls_manifest_key IS NULL)",
                slug
            )
        await conn.close()
        log(f"Recorded failure in database. Content remains unpublished for safe retry.")
        raise
    finally:
        if os.path.exists(scratch_dir):
            shutil.rmtree(scratch_dir, ignore_errors=True)
            log("  ✓ Cleaned up scratch files.")


async def main():
    parser = argparse.ArgumentParser(description="V19plus Automated Video Pipeline")
    parser.add_argument("--slug", help="Process a specific content slug")
    parser.add_argument("--key", help="Process a specific source key")
    args = parser.parse_args()

    conn = await asyncpg.connect(DB_URL)

    if args.slug:
        row = await conn.fetchrow("SELECT id, slug, master_storage_key FROM content WHERE slug = $1", args.slug)
        if not row or not row["master_storage_key"]:
            log(f"No content with master_storage_key found for slug: {args.slug}")
            return
        await conn.close()
        await process_one(str(row["id"]), row["slug"], row["master_storage_key"])
        return

    if args.key:
        row = await conn.fetchrow("SELECT id, slug, master_storage_key FROM content WHERE master_storage_key = $1", args.key)
        await conn.close()
        content_id = str(row["id"]) if row else None
        slug = row["slug"] if row else None
        await process_one(content_id, slug, args.key)
        return

    # Process all PENDING or QUEUED jobs in video_jobs
    jobs = await conn.fetch("SELECT id, source_file_key, content_id FROM video_jobs WHERE status IN ('PENDING', 'QUEUED') ORDER BY created_at ASC")
    log(f"Found {len(jobs)} pending/queued video jobs in PostgreSQL.")
    for j in jobs:
        c_row = await conn.fetchrow("SELECT slug FROM content WHERE id = $1", j["content_id"]) if j["content_id"] else None
        slug = c_row["slug"] if c_row else None
        try:
            await process_one(str(j["content_id"]) if j["content_id"] else None, slug, j["source_file_key"], str(j["id"]))
        except Exception:
            log(f"Skipping to next job after failure on job {j['id']}...")

    await conn.close()
    log("All tasks completed.")


if __name__ == "__main__":
    asyncio.run(main())
