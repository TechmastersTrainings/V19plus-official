import asyncio
import logging
from datetime import datetime, timezone
import zoneinfo
from sqlalchemy import select
from src.database import AsyncSessionLocal
from src.modules.events.models import Event, EventStatus, TicketType

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("v19plus.seed_events")

# Indian Standard Time (UTC+5:30)
IST = zoneinfo.ZoneInfo("Asia/Kolkata")


async def seed_zingat_event():
    """
    Seed the initial production event:
    ZINGAT VOL-7 — Dandiya Festival 2K26
    Date: 17 October 2026, Saturday, 5:00 PM – 10:00 PM
    Venue: Beti Circle, Opp. National College, Inside Tagare Layout, Bidar
    Ticket: General Entry (Only For Ladies) - ₹299
    """
    async with AsyncSessionLocal() as db:
        slug = "zingat-vol-7-dandiya-festival-2k26"

        # Check if already seeded
        stmt = select(Event).where(Event.slug == slug)
        res = await db.execute(stmt)
        existing_event = res.scalar_one_or_none()

        # 17 October 2026, 5:00 PM IST (17:00 IST = 11:30 UTC)
        start_time = datetime(2026, 10, 17, 17, 0, 0, tzinfo=IST)
        # 17 October 2026, 10:00 PM IST (22:00 IST = 16:30 UTC)
        end_time = datetime(2026, 10, 17, 22, 0, 0, tzinfo=IST)
        # Gates open 4:30 PM IST
        gates_open = datetime(2026, 10, 17, 16, 30, 0, tzinfo=IST)

        if not existing_event:
            logger.info("Creating ZINGAT VOL-7 Dandiya Festival 2K26 event...")
            event = Event(
                title="ZINGAT VOL-7 — Dandiya Festival 2K26",
                slug=slug,
                description=(
                    "Join Bidar's most sensational and energetic festive celebration — "
                    "ZINGAT VOL-7 Dandiya Festival 2K26! An electrifying evening of high-energy Garba, "
                    "traditional Dandiya raas, live percussion, pulsating music, festive delicacies, and "
                    "exciting surprise prizes for Best Dressed & Best Dancer. "
                    "An exclusive, safe, and joyful festive haven for women."
                ),
                category="DANDIYA FESTIVAL",
                poster_url="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80",
                banner_url="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600&auto=format&fit=crop&q=80",
                venue_name="Inside Tagare Layout",
                venue_address="Beti Circle, Opp. National College, Inside Tagare Layout, Bidar, Karnataka",
                city="Bidar",
                start_time=start_time,
                end_time=end_time,
                gates_open_time=gates_open,
                restrictions="Only For Ladies",
                terms_and_conditions=(
                    "1. Entry is strictly restricted to ladies only. Verification may be performed at the entrance gate.\n"
                    "2. Each digital ticket pass contains a unique QR code valid for exactly one attendee entry.\n"
                    "3. Re-entry is not permitted once scanned.\n"
                    "4. Dandiya sticks are available inside the arena or attendees may bring their own wooden sticks.\n"
                    "5. Organizers reserve the right of admission."
                ),
                status=EventStatus.PUBLISHED,
                is_featured=True,
                total_capacity=500,  # Configurable from admin
            )
            db.add(event)
            await db.flush()

            # Create the ₹299 Ticket Type
            ticket_type = TicketType(
                event_id=event.id,
                name="General Entry — Ladies Pass",
                description="Official single-attendee entry pass to ZINGAT VOL-7 Dandiya Festival 2K26. Strictly Only For Ladies.",
                price_paise=29900,  # ₹299.00
                currency="INR",
                total_capacity=500,  # Configurable from admin
                sold_count=0,
                max_per_booking=5,
                sale_start_time=datetime.now(timezone.utc),
                sale_end_time=end_time,
                is_active=True,
            )
            db.add(ticket_type)
            await db.commit()
            logger.info("Successfully seeded ZINGAT VOL-7 event and ticket type!")
        else:
            logger.info("ZINGAT VOL-7 event is already seeded in the database.")


if __name__ == "__main__":
    asyncio.run(seed_zingat_event())
