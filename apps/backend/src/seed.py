import asyncio
import logging
import uuid
from sqlalchemy import select
from src.database import AsyncSessionLocal
from src.core.security import hash_password
from src.modules.users.models import User, Profile
from src.modules.content.models import Genre
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

        # 3. Seed Default Admin User
        admin_email = "admin@v19plus.com"
        res = await db.execute(select(User).where(User.email == admin_email))
        admin = res.scalar_one_or_none()
        if not admin:
            admin = User(
                email=admin_email,
                name="V19plus Administrator",
                hashed_password=hash_password("Admin@V19plus2026"),
                role="ADMIN",
                is_active=True,
                is_verified=True,
            )
            db.add(admin)
            await db.flush()

            # Create Admin Profile
            admin_profile = Profile(
                user_id=admin.id,
                name="Studio Admin",
                avatar_color="#FF5C00",
                is_kids=False,
            )
            db.add(admin_profile)
            await db.commit()
            logger.info(f"Created default admin account: {admin_email} (Password: Admin@V19plus2026)")
        else:
            logger.info(f"Admin account {admin_email} already exists.")

    logger.info("✅ Database seeding completed successfully!")


if __name__ == "__main__":
    asyncio.run(seed())
