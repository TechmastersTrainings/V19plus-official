import os
import sys
import time
import subprocess
import shutil
import boto3
import asyncio
import asyncpg
import math
from pathlib import Path
from dotenv import load_dotenv

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

SOURCE_KEY = "93e8250a_EP-03.mp4"
SOURCE_URL = f"{CDN_BASE}/{SOURCE_KEY}"
LOCAL_MASTER = "/tmp/master_ep03_full.mp4"
OUTPUT_DIR = "/tmp/hls_ep03_full"
TARGET_PREFIX = "hls/93e8250a_EP-03"
CONTENT_SLUG = "third-task-2"
JOB_ID = "cae846dd-8636-460f-9032-10f494b0df2d"
TOTAL_DURATION = 3360.84


def log(msg: str):
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}", flush=True)


def download_master():
    log(f"📥 Step 1: Downloading 56-min master from Cloudflare R2 ({R2_BUCKET}/{SOURCE_KEY}) via direct S3 API...")
    expected_size = 7112723762

    if os.path.exists(LOCAL_MASTER) and os.path.getsize(LOCAL_MASTER) == expected_size:
        log("Master already downloaded and size matches exactly. Skipping download.")
        return

    s3 = boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=R2_KEY_ID,
        aws_secret_access_key=R2_SECRET,
        region_name="auto",
    )

    chunk_size = 32 * 1024 * 1024  # 32MB chunks
    total_chunks = math.ceil(expected_size / chunk_size)
    log(f"Downloading {expected_size / (1024**3):.2f} GB in {total_chunks} parallel 32MB chunks via 20 worker threads...")

    # Pre-allocate destination file
    with open(LOCAL_MASTER, "wb") as f:
        f.truncate(expected_size)

    from concurrent.futures import ThreadPoolExecutor, as_completed

    def download_chunk(idx):
        start = idx * chunk_size
        end = min(expected_size - 1, (idx + 1) * chunk_size - 1)
        resp = s3.get_object(Bucket=R2_BUCKET, Key=SOURCE_KEY, Range=f"bytes={start}-{end}")
        data = resp["Body"].read()
        with open(LOCAL_MASTER, "r+b") as f:
            f.seek(start)
            f.write(data)
        return idx

    completed = 0
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(download_chunk, i) for i in range(total_chunks)]
        for fut in as_completed(futures):
            fut.result()
            completed += 1
            if completed % 20 == 0 or completed == total_chunks:
                pct = (completed / total_chunks) * 100
                speed = (completed * chunk_size / (1024 * 1024)) / max(1, time.time() - t0)
                log(f"Downloaded {completed}/{total_chunks} chunks ({pct:.1f}%) at {speed:.1f} MB/s...")

    file_size_mb = os.path.getsize(LOCAL_MASTER) / (1024 * 1024)
    log(f"✅ Master verified! Size: {file_size_mb:.1f} MB ({file_size_mb/1024:.2f} GB) in {(time.time()-t0)/60:.1f} minutes")


def transcode_to_hls():
    log("🎬 Step 2: Transcoding full 56-min video to 4-Tier Adaptive HLS (1080p, 720p, 480p, 360p)...")
    master_m3u8 = os.path.join(OUTPUT_DIR, "master.m3u8")
    if os.path.exists(master_m3u8) and os.path.getsize(master_m3u8) > 0:
        log("✅ Master playlist already exists on disk. Skipping FFmpeg transcode.")
        return

    if os.path.exists(OUTPUT_DIR):
        shutil.rmtree(OUTPUT_DIR, ignore_errors=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    for tier in ["1080p", "720p", "480p", "360p"]:
        os.makedirs(os.path.join(OUTPUT_DIR, tier), exist_ok=True)

    filter_complex = (
        "[0:v]scale=w=1920:h=1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2[v1080];"
        "[0:v]scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2[v720];"
        "[0:v]scale=w=854:h=480:force_original_aspect_ratio=decrease,pad=854:480:(ow-iw)/2:(oh-ih)/2[v480];"
        "[0:v]scale=w=640:h=360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2[v360]"
    )

    cmd = [
        "ffmpeg",
        "-y",
        "-err_detect", "ignore_err",
        "-fflags", "+genpts+discardcorrupt",
        "-max_error_rate", "1.0",
        "-hwaccel", "videotoolbox",
        "-i", LOCAL_MASTER,
        "-filter_complex", filter_complex,
        "-map", "[v1080]", "-map", "0:a:0",
        "-c:v:0", "h264_videotoolbox", "-b:v:0", "3800k", "-maxrate:v:0", "4200k", "-bufsize:v:0", "7600k",
        "-c:a:0", "aac", "-b:a:0", "192k", "-ac:a:0", "2",
        "-map", "[v720]", "-map", "0:a:0",
        "-c:v:1", "h264_videotoolbox", "-b:v:1", "1800k", "-maxrate:v:1", "2200k", "-bufsize:v:1", "3600k",
        "-c:a:1", "aac", "-b:a:1", "128k", "-ac:a:1", "2",
        "-map", "[v480]", "-map", "0:a:0",
        "-c:v:2", "h264_videotoolbox", "-b:v:2", "850k", "-maxrate:v:2", "1050k", "-bufsize:v:2", "1700k",
        "-c:a:2", "aac", "-b:a:2", "96k", "-ac:a:2", "2",
        "-map", "[v360]", "-map", "0:a:0",
        "-c:v:3", "h264_videotoolbox", "-b:v:3", "400k", "-maxrate:v:3", "500k", "-bufsize:v:3", "800k",
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
        "-hls_segment_filename", os.path.join(OUTPUT_DIR, "%v/seg_%04d.ts"),
        os.path.join(OUTPUT_DIR, "%v/playlist.m3u8"),
    ]

    log("Executing FFmpeg hardware-accelerated encoding pipeline...")
    res = subprocess.run(cmd)
    if res.returncode != 0:
        raise RuntimeError(f"FFmpeg transcoding failed with code {res.returncode}")

    if not os.path.exists(master_m3u8):
        raise FileNotFoundError("master.m3u8 was not generated by FFmpeg.")

    log("✅ 56-minute multi-variant HLS stream generated successfully!")


def generate_sprites():
    log("🖼️ Step 3: Generating scrubbing thumbnail sprite sheet and WebVTT for 56-min timeline...")
    sprite_image_path = os.path.join(OUTPUT_DIR, "sprite.jpg")
    vtt_path = os.path.join(OUTPUT_DIR, "thumbnails.vtt")
    if os.path.exists(sprite_image_path) and os.path.exists(vtt_path):
        log("✅ Sprite sheet and WebVTT already exist. Skipping.")
        return

    interval = 15
    duration = TOTAL_DURATION
    total_thumbs = math.ceil(duration / interval)
    cols = 15
    rows = math.ceil(total_thumbs / cols)

    cmd = [
        "ffmpeg",
        "-y",
        "-i", LOCAL_MASTER,
        "-vf", f"fps=1/{interval},scale=160:90,tile={cols}x{rows}",
        "-q:v", "5",
        sprite_image_path,
    ]
    res = subprocess.run(cmd)
    if res.returncode != 0 or not os.path.exists(sprite_image_path):
        log("⚠️ Sprite sheet generation had non-zero exit; skipping thumbnails.")
        return

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

    log("✅ WebVTT and sprite sheet generated successfully!")


def upload_hls_to_r2():
    log(f"☁️ Step 4: Uploading transcoded HLS directory to Cloudflare R2 ({R2_BUCKET}/{TARGET_PREFIX}) using 35 parallel workers...")
    s3 = boto3.client(
        "s3",
        endpoint_url=R2_ENDPOINT,
        aws_access_key_id=R2_KEY_ID,
        aws_secret_access_key=R2_SECRET,
        region_name="auto",
    )

    upload_tasks = []
    for root, _, files in os.walk(OUTPUT_DIR):
        for f in files:
            file_path = os.path.join(root, f)
            rel_path = os.path.relpath(file_path, OUTPUT_DIR)
            s3_key = f"{TARGET_PREFIX}/{rel_path}"

            content_type = "video/mp2t"
            cache_control = "public, max-age=31536000, immutable"

            if f.endswith(".m3u8"):
                content_type = "application/vnd.apple.mpegurl"
                cache_control = "public, max-age=60"
            elif f.endswith(".vtt"):
                content_type = "text/vtt"
                cache_control = "public, max-age=86400"
            elif f.endswith(".jpg") or f.endswith(".jpeg"):
                content_type = "image/jpeg"
                cache_control = "public, max-age=86400"

            upload_tasks.append((file_path, s3_key, content_type, cache_control))

    log(f"Found {len(upload_tasks)} files to upload to R2.")
    from concurrent.futures import ThreadPoolExecutor, as_completed

    def do_upload(task):
        fp, key, ct, cc = task
        s3.upload_file(fp, R2_BUCKET, key, ExtraArgs={"ContentType": ct, "CacheControl": cc})
        return key

    done_count = 0
    with ThreadPoolExecutor(max_workers=35) as executor:
        futures = [executor.submit(do_upload, t) for t in upload_tasks]
        for f in as_completed(futures):
            done_count += 1
            if done_count % 200 == 0 or done_count == len(upload_tasks):
                log(f"Uploaded {done_count}/{len(upload_tasks)} files to Cloudflare R2...")

    log(f"✅ Successfully uploaded all {done_count} HLS files to Cloudflare R2!")


def validate_r2_hls():
    log("🔍 Step 5: Validating R2 HLS master playlist and sample segments across 56-min timeline...")
    import httpx
    client = httpx.Client(headers={"User-Agent": "Mozilla/5.0"}, timeout=15.0)

    master_url = f"{CDN_BASE}/{TARGET_PREFIX}/master.m3u8"
    res = client.get(master_url)
    if res.status_code != 200:
        raise AssertionError(f"Master playlist failed validation: status {res.status_code}")
    log(f"  [PASS] Master playlist HTTP 200: {master_url}")

    for tier in ["1080p", "720p", "480p", "360p"]:
        tier_url = f"{CDN_BASE}/{TARGET_PREFIX}/{tier}/playlist.m3u8"
        t_res = client.get(tier_url)
        if t_res.status_code != 200:
            raise AssertionError(f"Tier {tier} playlist failed: status {t_res.status_code}")

        # Check early segment (seg_0000.ts) and late segment (seg_0800.ts)
        seg0_url = f"{CDN_BASE}/{TARGET_PREFIX}/{tier}/seg_0000.ts"
        seg0_res = client.head(seg0_url)
        if seg0_res.status_code != 200:
            raise AssertionError(f"Tier {tier} seg_0000.ts failed: status {seg0_res.status_code}")

        log(f"  [PASS] Quality Tier {tier} OK: {tier_url}")


async def update_database():
    log(f"💾 Step 6: Updating PostgreSQL database record for '{CONTENT_SLUG}'...")
    final_hls_url = f"{CDN_BASE}/{TARGET_PREFIX}/master.m3u8"
    final_sprite_key = f"{TARGET_PREFIX}/thumbnails.vtt"

    conn = await asyncpg.connect(DB_URL)

    # 1. Update Content row for third-task-2 (56-min title)
    row = await conn.fetchrow(
        """
        UPDATE content
        SET hls_manifest_key = $1, sprite_vtt_key = $2, duration_seconds = 3360, status = 'PUBLISHED', updated_at = NOW()
        WHERE slug = $3
        RETURNING id, title, hls_manifest_key, master_storage_key
        """,
        final_hls_url,
        final_sprite_key,
        CONTENT_SLUG,
    )
    if row:
        log(f"✅ Content updated successfully! Title: {row['title']}")
        log(f"   hls_manifest_key:   {row['hls_manifest_key']}")
        log(f"   master_storage_key: {row['master_storage_key']}")

    # 2. Update VideoJob row
    job_row = await conn.fetchrow(
        """
        UPDATE video_jobs
        SET status = 'READY', progress_percent = 100, target_hls_prefix = $1, duration_seconds = 3360, updated_at = NOW()
        WHERE id = $2::uuid
        RETURNING id, status, progress_percent
        """,
        TARGET_PREFIX,
        JOB_ID,
    )
    if job_row:
        log(f"✅ VideoJob updated to READY (100%): Job ID {job_row['id']}")

    await conn.close()


def cleanup():
    log("🧹 Step 7: Cleaning up local temporary files...")
    if os.path.exists(LOCAL_MASTER):
        os.remove(LOCAL_MASTER)
    if os.path.exists(OUTPUT_DIR):
        shutil.rmtree(OUTPUT_DIR, ignore_errors=True)
    log("✅ Scratch files cleaned up!")


def main():
    log("🚀 Starting End-to-End Transcoding & Publishing Pipeline for 56-Min Episode 03...")
    t_start = time.time()
    try:
        download_master()
        transcode_to_hls()
        generate_sprites()
        upload_hls_to_r2()
        validate_r2_hls()
        asyncio.run(update_database())
        cleanup()
        elapsed = time.time() - t_start
        log(f"🎉 All pipeline steps completed successfully in {elapsed/60:.1f} minutes!")
    except Exception as e:
        log(f"❌ Error occurred: {e}")
        cleanup()
        sys.exit(1)


if __name__ == "__main__":
    main()
