import asyncio
import os
import ssl
import uuid
import re
from datetime import datetime, timezone
import asyncpg
from dotenv import load_dotenv

load_dotenv("apps/backend/.env")

async def register():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    db_url = os.getenv("DATABASE_URL").replace("+asyncpg", "")
    db_url = re.sub(r"[?&]sslmode=[^&]+", "", db_url)
    conn = await asyncpg.connect(db_url, ssl=ctx)

    slug = "elevanth-task"
    master_key = "b66577be_EP-11.mp4"
    duration = 3660
    file_size = 12665188766

    existing = await conn.fetchrow(
        "SELECT id, slug FROM content WHERE slug = $1 OR master_storage_key = $2",
        slug,
        master_key,
    )

    if existing:
        content_id = existing["id"]
        print(f"Content row already exists: {content_id}")
        await conn.execute(
            """
            UPDATE content SET
                title = 'ELEVANTH TASK',
                description = 'The epic eleventh task of the ultimate championship arena, featuring complete 4-tier adaptive bitrate streaming.',
                content_type = 'MOVIE',
                status = 'QUEUED',
                release_year = 2026,
                rating = 'U/A 18+',
                duration_seconds = $1,
                master_storage_key = $2,
                thumbnail_url = 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/ep10_thumbnail.jpg',
                backdrop_url = 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/ep10_backdrop.jpg',
                is_original = TRUE,
                is_featured = TRUE,
                is_published = TRUE,
                published_at = NOW(),
                updated_at = NOW()
            WHERE id = $3
            """,
            duration,
            master_key,
            content_id,
        )
    else:
        content_id = uuid.uuid4()
        await conn.execute(
            """
            INSERT INTO content (
                id, title, slug, description, content_type, status,
                release_year, rating, duration_seconds,
                thumbnail_url, backdrop_url, master_storage_key,
                is_original, is_featured, is_published,
                published_at, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9,
                $10, $11, $12,
                $13, $14, $15,
                NOW(), NOW(), NOW()
            )
            """,
            content_id,
            "ELEVANTH TASK",
            slug,
            "The epic eleventh task of the ultimate championship arena, featuring complete 4-tier adaptive bitrate streaming.",
            "MOVIE",
            "QUEUED",
            2026,
            "U/A 18+",
            duration,
            "https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/ep10_thumbnail.jpg",
            "https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/ep10_backdrop.jpg",
            master_key,
            True,
            True,
            True,
        )
        print(f"Created content row: {content_id}")

    # Associate genres: Action & Drama
    action_genre = uuid.UUID("ef3ccdd8-983c-44f0-8ecc-ca13f72bcac6")
    drama_genre = uuid.UUID("120b73aa-99a4-4fcc-a9b8-708df7c41b10")
    for g in [action_genre, drama_genre]:
        await conn.execute(
            """
            INSERT INTO content_genres (content_id, genre_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
            """,
            content_id,
            g,
        )
    print("Linked genres Action and Drama.")

    # Register video job
    job = await conn.fetchrow(
        "SELECT id FROM video_jobs WHERE source_file_key = $1", master_key
    )
    if not job:
        job_id = uuid.uuid4()
        await conn.execute(
            """
            INSERT INTO video_jobs (
                id, content_id, source_bucket, source_file_key, source_file_size_bytes,
                target_bucket, target_hls_prefix, status, progress_percent, retry_count,
                created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6, $7, $8, 0, 0,
                NOW(), NOW()
            )
            """,
            job_id,
            content_id,
            "v19plus-r2-backend",
            master_key,
            file_size,
            "v19plus-r2-backend",
            "hls/b66577be_EP-11",
            "QUEUED",
        )
        print(f"Created video job: {job_id}")
    else:
        print(f"Video job already exists: {job['id']}")
        await conn.execute(
            """
            UPDATE video_jobs SET
                status = 'QUEUED',
                progress_percent = 0,
                content_id = $1,
                target_hls_prefix = 'hls/b66577be_EP-11',
                updated_at = NOW()
            WHERE id = $2
            """,
            content_id,
            job["id"],
        )

    await conn.close()
    print("✓ Registration complete!")

if __name__ == "__main__":
    asyncio.run(register())

