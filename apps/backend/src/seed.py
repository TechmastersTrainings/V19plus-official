import asyncio
import logging
import uuid
from sqlalchemy import select
from src.database import AsyncSessionLocal
from src.core.security import hash_password
from src.modules.users.models import User, Profile
from src.modules.content.models import Genre, Content, ContentStatus, ContentType
from src.modules.subscriptions.models import SubscriptionPlan, Entitlement

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [Seed]: %(message)s")
logger = logging.getLogger("v19plus.seed")

GENRES_DATA = [
    {"name": "Action", "slug": "action"},
    {"name": "Drama", "slug": "drama"},
    {"name": "Thriller", "slug": "thriller"},
    {"name": "Comedy", "slug": "comedy"},
    {"name": "Documentary", "slug": "documentary"},
    {"name": "Sci-Fi", "slug": "sci-fi"},
    {"name": "Knowledge & Masterclasses", "slug": "knowledge"},
    {"name": "Spiritual & Devotional", "slug": "devotional"},
    {"name": "Recorded Long-Form Events", "slug": "events"},
]

PLANS_DATA = [
    {
        "name": "Mobile",
        "slug": "mobile",
        "description": "Stream on 1 mobile phone or tablet in standard definition (480p).",
        "price_inr_paise": 14900,
        "billing_interval": "monthly",
        "max_resolution": "480p",
        "max_concurrent_streams": 1,
        "entitlements": ["playback:sd", "streams:1", "device:mobile"],
    },
    {
        "name": "Standard HD",
        "slug": "standard-hd",
        "description": "Stream in Full HD (1080p) on 2 devices simultaneously (Phone, Tablet, Laptop, TV).",
        "price_inr_paise": 39900,
        "billing_interval": "monthly",
        "max_resolution": "1080p",
        "max_concurrent_streams": 2,
        "entitlements": ["playback:hd", "playback:1080p", "streams:2", "downloads:enabled", "device:all"],
    },
    {
        "name": "Premium 4K",
        "slug": "premium-4k",
        "description": "Stream in 4K Ultra HD on 4 devices simultaneously with Dolby Atmos & offline downloads.",
        "price_inr_paise": 79900,
        "billing_interval": "monthly",
        "max_resolution": "4K",
        "max_concurrent_streams": 4,
        "entitlements": ["playback:uhd", "playback:4k", "streams:4", "downloads:enabled", "audio:spatial", "device:all"],
    },
    {
        "name": "Annual VIP",
        "slug": "annual-vip",
        "description": "Best value: Full 4K Ultra HD access for 12 months with VIP support and priority releases.",
        "price_inr_paise": 299900,
        "billing_interval": "yearly",
        "max_resolution": "4K",
        "max_concurrent_streams": 4,
        "entitlements": ["playback:uhd", "playback:4k", "streams:4", "downloads:enabled", "billing:annual", "vip:priority"],
    },
]


async def seed():
    logger.info("🌱 Starting V19plus initial database seed...")

    async with AsyncSessionLocal() as db:
        # 1. Seed Genres
        for g_data in GENRES_DATA:
            res = await db.execute(select(Genre).where(Genre.slug == g_data["slug"]))
            genre = res.scalar_one_or_none()
            if not genre:
                genre = Genre(name=g_data["name"], slug=g_data["slug"])
                db.add(genre)
                logger.info(f"Added genre: {g_data['name']} ({g_data['slug']})")
        await db.commit()

        # 2. Seed Subscription Plans & Entitlements
        for p_data in PLANS_DATA:
            res = await db.execute(select(SubscriptionPlan).where(SubscriptionPlan.slug == p_data["slug"]))
            plan = res.scalar_one_or_none()
            if not plan:
                plan = SubscriptionPlan(
                    name=p_data["name"],
                    slug=p_data["slug"],
                    description=p_data["description"],
                    price_inr_paise=p_data["price_inr_paise"],
                    billing_interval=p_data["billing_interval"],
                    max_resolution=p_data["max_resolution"],
                    max_concurrent_streams=p_data["max_concurrent_streams"],
                    is_active=True,
                )
                db.add(plan)
                await db.flush()

                for feature in p_data["entitlements"]:
                    entitlement = Entitlement(plan_id=plan.id, feature_key=feature)
                    db.add(entitlement)

                logger.info(f"Added plan: {p_data['name']} (₹{p_data['price_inr_paise']/100}/mo) with {len(p_data['entitlements'])} entitlements.")
        await db.commit()

        # 3. Seed Default Admin Users
        admin_accounts = [
            ("techmastersinnovations@gmail.com", "TechMasters Innovations Admin"),
            ("support@techmastersinnovations.in", "TechMasters Support Admin"),
        ]
        for admin_email, admin_name in admin_accounts:
            res = await db.execute(select(User).where(User.email == admin_email))
            admin = res.scalar_one_or_none()
            if not admin:
                admin = User(
                    email=admin_email,
                    name=admin_name,
                    hashed_password=hash_password("Fri10Feb@2023"),
                    role="ADMIN",
                    is_active=True,
                    is_verified=True,
                )
                db.add(admin)
                await db.flush()

                admin_profile = Profile(
                    user_id=admin.id,
                    name="Studio Admin",
                    avatar_color="#FF5C00",
                    is_kids=False,
                )
                db.add(admin_profile)
                await db.commit()
                logger.info(f"Created default admin account: {admin_email} (Password: Fri10Feb@2023)")
            else:
                logger.info(f"Admin account {admin_email} already exists.")

        # 4. Seed/Restore All Catalog Videos with Cloudflare R2 HLS streams
        VIDEOS_DATA = [
            {
                "title": "EP-01 - Introduction to V19PLUS Platform",
                "slug": "ep-01",
                "description": "Episode 1 introduction to V19PLUS platform and content pipeline.",
                "content_type": ContentType.MOVIE,
                "status": ContentStatus.PUBLISHED,
                "release_year": 2026,
                "rating": "U/A 13+",
                "duration_seconds": 180,
                "thumbnail_url": "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80",
                "backdrop_url": "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1600&q=80",
                "master_storage_key": "b39e340c_EP-01.mp4",
                "hls_manifest_key": "https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/hls/video-1-test-streaming/master.m3u8",
                "is_featured": True,
                "is_original": True,
                "is_published": True,
            },
            {
                "title": "EP-02 - Race to the Finish Challenge",
                "slug": "second-task-race-to-the-finish",
                "description": "Episode 2 high-octane racing challenge with multi-tier ABR streaming.",
                "content_type": ContentType.MOVIE,
                "status": ContentStatus.PUBLISHED,
                "release_year": 2026,
                "rating": "U/A 13+",
                "duration_seconds": 240,
                "thumbnail_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
                "backdrop_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80",
                "master_storage_key": "1bb2905d_EP-03.mp4",
                "hls_manifest_key": "https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/hls/second-task-race-to-the-finish/master.m3u8",
                "is_featured": True,
                "is_original": True,
                "is_published": True,
            },
            {
                "title": "EP-03 - High Stakes Elimination Challenge",
                "slug": "third-task",
                "description": "Episode 3 intensive elimination session with 4-tier adaptive bitrate.",
                "content_type": ContentType.MOVIE,
                "status": ContentStatus.PUBLISHED,
                "release_year": 2026,
                "rating": "U/A 13+",
                "duration_seconds": 300,
                "thumbnail_url": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80",
                "backdrop_url": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80",
                "master_storage_key": "93e8250a_EP-03.mp4",
                "hls_manifest_key": "https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/hls/93e8250a_EP-03/master.m3u8",
                "is_featured": False,
                "is_original": True,
                "is_published": True,
            },
            {
                "title": "EP-04 - The Breakthrough Stage",
                "slug": "ep-04",
                "description": "Episode 4 breakthrough performance session.",
                "content_type": ContentType.MOVIE,
                "status": ContentStatus.PUBLISHED,
                "release_year": 2026,
                "rating": "U/A 13+",
                "duration_seconds": 360,
                "thumbnail_url": "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80",
                "backdrop_url": "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1600&q=80",
                "master_storage_key": "3a2e0bf5_EP-04.mp4",
                "hls_manifest_key": "https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/hls/3a2e0bf5_EP-04/master.m3u8",
                "is_featured": False,
                "is_original": True,
                "is_published": True,
            },
            {
                "title": "EP-05 - Endurance Arena",
                "slug": "ep-05",
                "description": "Episode 5 endurance arena battle with high bitrate master transcoding.",
                "content_type": ContentType.MOVIE,
                "status": ContentStatus.PUBLISHED,
                "release_year": 2026,
                "rating": "U/A 13+",
                "duration_seconds": 420,
                "thumbnail_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80",
                "backdrop_url": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80",
                "master_storage_key": "f0480269_EP-05.mp4",
                "hls_manifest_key": "https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/hls/f0480269_EP-05/master.m3u8",
                "is_featured": False,
                "is_original": True,
                "is_published": True,
            },
            {
                "title": "SIXTH TASK - DOOM SESSION | ELIMINATION CHALLENGE",
                "slug": "sixth-task",
                "description": "Episode 6 doom session elimination challenge.",
                "content_type": ContentType.MOVIE,
                "status": ContentStatus.PUBLISHED,
                "release_year": 2026,
                "rating": "U/A 13+",
                "duration_seconds": 480,
                "thumbnail_url": "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80",
                "backdrop_url": "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1600&q=80",
                "master_storage_key": "efd56f97_EP-06.mp4",
                "hls_manifest_key": "https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/hls/efd56f97_EP-06/master.m3u8",
                "is_featured": True,
                "is_original": True,
                "is_published": True,
            },
        ]

        # Fetch all genres to associate
        all_genres_res = await db.execute(select(Genre))
        all_genres = list(all_genres_res.scalars().all())

        for v_data in VIDEOS_DATA:
            res = await db.execute(select(Content).where(Content.slug == v_data["slug"]))
            existing_content = res.scalar_one_or_none()
            if not existing_content:
                new_c = Content(
                    title=v_data["title"],
                    slug=v_data["slug"],
                    description=v_data["description"],
                    content_type=v_data["content_type"],
                    status=v_data["status"],
                    release_year=v_data["release_year"],
                    rating=v_data["rating"],
                    duration_seconds=v_data["duration_seconds"],
                    thumbnail_url=v_data["thumbnail_url"],
                    backdrop_url=v_data["backdrop_url"],
                    master_storage_key=v_data["master_storage_key"],
                    hls_manifest_key=v_data["hls_manifest_key"],
                    is_featured=v_data["is_featured"],
                    is_original=v_data["is_original"],
                    is_published=v_data["is_published"],
                )
                if all_genres:
                    new_c.genres = all_genres[:2]
                db.add(new_c)
                logger.info(f"Restored video to catalog: {v_data['title']} ({v_data['slug']})")
            else:
                logger.info(f"Video {v_data['slug']} already exists in catalog.")
        await db.commit()

    logger.info("✅ Database seeding and catalog restoration completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
