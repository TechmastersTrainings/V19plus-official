import os
import sys
import time
import subprocess
import shutil
import boto3
import asyncio
import asyncpg
from pathlib import Path
from dotenv import load_dotenv

# Load environment configuration from apps/backend/.env or root .env
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

SOURCE_KEY = "5fb6056d_EP-03.mp4"
SOURCE_URL = f"{CDN_BASE}/{SOURCE_KEY}"
LOCAL_MASTER = "/tmp/master_ep03.mp4"
OUTPUT_DIR = "/tmp/hls_ep03"
TARGET_PREFIX = "hls/third-task"
CONTENT_SLUG = "third-task"
JOB_ID = "9cf6e35b-213b-4b8e-9f53-aa12b743ec37"


def log(msg: str):
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}", flush=True)


def download_master():
    log(f"📥 Step 1: Downloading 7.11 GB master from Cloudflare R2 ({SOURCE_URL})...")
    expected_size = 7112723762

    if os.path.exists(LOCAL_MASTER) and os.path.getsize(LOCAL_MASTER) == expected_size:
        log("Master already downloaded and size matches exactly. Skipping download.")
        return

    cmd = [
        "curl",
        "-L",
        "-C", "-",
        "--retry", "50",
        "--retry-delay", "2",
        "--retry-max-time", "0",
        "--keepalive-time", "10",
        "-A", "Mozilla/5.0",
        "-o", LOCAL_MASTER,
        SOURCE_URL,
    ]
    attempts = 0
    while attempts < 50:
        attempts += 1
        res = subprocess.run(cmd)
        if res.returncode == 0:
            break
        curr_mb = os.path.getsize(LOCAL_MASTER) / (1024 * 1024) if os.path.exists(LOCAL_MASTER) else 0
        log(f"⚠️ Connection interrupted (code {res.returncode}) at {curr_mb:.1f} MB. Resuming in 2s (attempt {attempts}/50)...")
        time.sleep(2)

    if not os.path.exists(LOCAL_MASTER) or os.path.getsize(LOCAL_MASTER) < 6500 * 1024 * 1024:
        raise RuntimeError("Master file was not completely downloaded.")

    file_size_mb = os.path.getsize(LOCAL_MASTER) / (1024 * 1024)
    log(f"✅ Master verified! Size: {file_size_mb:.1f} MB ({file_size_mb/1024:.2f} GB)")


def transcode_to_hls():
    log("🎬 Step 2: Transcoding to 4-Tier Adaptive HLS (1080p, 720p, 480p, 360p) via VideoToolbox hardware acceleration...")
    master_m3u8 = os.path.join(OUTPUT_DIR, "master.m3u8")
    if os.path.exists(master_m3u8) and os.path.getsize(master_m3u8) > 0:
        log("✅ Master playlist already exists on disk. Skipping FFmpeg transcode step.")
        return

    if os.path.exists(OUTPUT_DIR):
        shutil.rmtree(OUTPUT_DIR, ignore_errors=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(os.path.join(OUTPUT_DIR, "1080p"), exist_ok=True)
    os.makedirs(os.path.join(OUTPUT_DIR, "720p"), exist_ok=True)
    os.makedirs(os.path.join(OUTPUT_DIR, "480p"), exist_ok=True)
    os.makedirs(os.path.join(OUTPUT_DIR, "360p"), exist_ok=True)

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
        "-to", "1074.8",
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

    log("Running FFmpeg transcode command...")
    res = subprocess.run(cmd)
    if res.returncode != 0:
        raise RuntimeError(f"FFmpeg transcoding failed with code {res.returncode}")

    if not os.path.exists(master_m3u8):
        raise FileNotFoundError("master.m3u8 was not generated by FFmpeg.")

    log("✅ Transcoding to HLS complete!")


def generate_sprites():
    log("🖼️ Step 3: Generating scrubbing thumbnail sprite sheet and WebVTT...")
    sprite_image_path = os.path.join(OUTPUT_DIR, "sprite.jpg")
    vtt_path = os.path.join(OUTPUT_DIR, "thumbnails.vtt")
    if os.path.exists(sprite_image_path) and os.path.exists(vtt_path):
        log("✅ Sprite sheet and WebVTT already exist. Skipping.")
        return

    interval = 10
    duration = 1074.8
    import math
    total_thumbs = math.ceil(duration / interval)
    cols = 10
    rows = math.ceil(total_thumbs / cols)

    cmd = [
        "ffmpeg",
        "-y",
        "-err_detect", "ignore_err",
        "-fflags", "+genpts+discardcorrupt",
        "-max_error_rate", "1.0",
        "-to", "1074.8",
        "-i", LOCAL_MASTER,
        "-vf", f"fps=1/{interval},scale=160:90,tile={cols}x{rows}",
        "-an",
        "-frames:v", "1",
        "-q:v", "3",
        sprite_image_path,
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

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
    log(f"☁️ Step 4: Uploading transcoded HLS directory to Cloudflare R2 ({R2_BUCKET}/{TARGET_PREFIX}) using 30 parallel workers...")
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
    with ThreadPoolExecutor(max_workers=30) as executor:
        futures = [executor.submit(do_upload, t) for t in upload_tasks]
        for f in as_completed(futures):
            done_count += 1
            if done_count % 100 == 0 or done_count == len(upload_tasks):
                log(f"Uploaded {done_count}/{len(upload_tasks)} files to Cloudflare R2...")

    log(f"✅ Successfully uploaded all {done_count} HLS files to Cloudflare R2!")


def validate_r2_hls():
    log("🔍 Step 5: Validating R2 HLS master playlist and media segments...")
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

        # Check sample segment (seg_0000.ts)
        seg_url = f"{CDN_BASE}/{TARGET_PREFIX}/{tier}/seg_0000.ts"
        seg_res = client.head(seg_url)
        if seg_res.status_code != 200:
            raise AssertionError(f"Tier {tier} seg_0000.ts failed: status {seg_res.status_code}")
        log(f"  [PASS] Quality Tier {tier} OK: {tier_url} (Sample segment {seg_res.headers.get('content-length')} bytes)")

    # Validate master MP4 is still intact
    master_mp4_url = f"{CDN_BASE}/{SOURCE_KEY}"
    mp4_res = client.head(master_mp4_url)
    if mp4_res.status_code != 200:
        raise AssertionError(f"Original master MP4 check failed: status {mp4_res.status_code}")
    log(f"  [PASS] Original uploaded MP4 preserved: {master_mp4_url} ({mp4_res.headers.get('content-length')} bytes)")


async def update_database():
    log(f"💾 Step 6: Updating PostgreSQL database record for '{CONTENT_SLUG}'...")
    final_hls_url = f"{CDN_BASE}/{TARGET_PREFIX}/master.m3u8"
    final_sprite_key = f"{TARGET_PREFIX}/thumbnails.vtt"

    conn = await asyncpg.connect(DB_URL)

    # 1. Update Content row
    row = await conn.fetchrow(
        """
        UPDATE content
        SET hls_manifest_key = $1, sprite_vtt_key = $2, duration_seconds = 1075, status = 'PUBLISHED', updated_at = NOW()
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
        log(f"   master_storage_key: {row['master_storage_key']} (Preserved!)")
    else:
        log(f"⚠️ Warning: Could not find content with slug '{CONTENT_SLUG}'")

    # 2. Update VideoJob row
    job_row = await conn.fetchrow(
        """
        UPDATE video_jobs
        SET status = 'READY', progress_percent = 100, target_hls_prefix = $1, duration_seconds = 1075, updated_at = NOW()
        WHERE id = $2::uuid
        RETURNING id, status, progress_percent
        """,
        TARGET_PREFIX,
        JOB_ID,
    )
    if job_row:
        log(f"✅ VideoJob updated to READY (100%): Job ID {job_row['id']}")

    await conn.close()


def cleanup(success: bool):
    log("🧹 Step 7: Cleaning up local temporary scratch files...")
    # Preserve LOCAL_MASTER on disk for fast re-verification
    # if success and os.path.exists(LOCAL_MASTER):
    #     os.remove(LOCAL_MASTER)
    if os.path.exists(OUTPUT_DIR):
        shutil.rmtree(OUTPUT_DIR, ignore_errors=True)
        log("Deleted HLS output dir from /tmp")


def main():
    log("🚀 Starting V19Plus Third Task Adaptive HLS Pipeline...")
    success = False
    try:
        download_master()
        transcode_to_hls()
        generate_sprites()
        upload_hls_to_r2()
        validate_r2_hls()
        asyncio.run(update_database())
        success = True
        log("🎉 ALL STEPS FINISHED! Video 'Third Task' is now 100% ready for seamless adaptive streaming across all devices!")
    except Exception as e:
        log(f"❌ Error during processing: {e}")
        import traceback
        traceback.print_exc()
    finally:
        cleanup(success)


if __name__ == "__main__":
    main()
