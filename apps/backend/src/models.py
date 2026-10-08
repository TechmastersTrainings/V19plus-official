# Centralized Model Registry for Alembic and SQLAlchemy metadata
from src.database import Base
from src.modules.users.models import User, Profile, RefreshToken
from src.modules.content.models import Content, Season, Episode, Genre, content_genres
from src.modules.video_jobs.models import VideoJob
from src.modules.subscriptions.models import SubscriptionPlan, Entitlement, UserSubscription
from src.modules.payments.models import Payment, PaymentWebhook
from src.modules.streaming.models import WatchHistory, Watchlist
from src.modules.events.models import (
    Event,
    TicketType,
    EventBooking,
    EventTicket,
    TicketAuditLog,
)

__all__ = [
    "Base",
    "User",
    "Profile",
    "RefreshToken",
    "Content",
    "Season",
    "Episode",
    "Genre",
    "content_genres",
    "VideoJob",
    "SubscriptionPlan",
    "Entitlement",
    "UserSubscription",
    "Payment",
    "PaymentWebhook",
    "WatchHistory",
    "Watchlist",
    "Event",
    "TicketType",
    "EventBooking",
    "EventTicket",
    "TicketAuditLog",
]
