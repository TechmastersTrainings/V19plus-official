import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import desc, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from src.config import settings
from src.core.exceptions import EntitlementRequiredException, NotFoundException
from src.core.security import generate_playback_token
from src.modules.content.models import Content, Episode
from src.modules.streaming.models import WatchHistory, Watchlist
from src.modules.streaming.schemas import PlaybackAuthResponse, UpsertProgressRequest
from src.modules.subscriptions.models import UserSubscription


class StreamingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def verify_entitlement(self, user_id: uuid.UUID) -> bool:
        """Verify user has an active, non-expired subscription"""
        now = datetime.now(timezone.utc)
        stmt = (
            select(UserSubscription)
            .where(
                UserSubscription.user_id == user_id,
                UserSubscription.status == "ACTIVE",
                UserSubscription.current_period_end > now,
            )
            .limit(1)
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none() is not None

    async def authorize_playback(
        self,
        user_id: uuid.UUID,
        content_id: uuid.UUID,
        episode_id: Optional[uuid.UUID] = None,
        client_ip: Optional[str] = None,
    ) -> PlaybackAuthResponse:
        content = await self.db.get(Content, content_id)
        if not content:
            raise NotFoundException("Content", content_id)

        target_title = content.title
        hls_manifest_key = content.hls_manifest_key
        sprite_vtt_key = content.sprite_vtt_key

        if episode_id:
            episode = await self.db.get(Episode, episode_id)
            if not episode or episode.season.content_id != content_id:
                raise NotFoundException("Episode", episode_id)
            target_title = f"{content.title} - {episode.title}"
            hls_manifest_key = episode.hls_manifest_key
            sprite_vtt_key = episode.sprite_vtt_key

        if not hls_manifest_key:
            raise NotFoundException(
                "Streaming Media",
                f"Content '{target_title}' is still processing or has no transcoded HLS asset.",
            )

        # Entitlement check (free tier bypass if flagged, else requires active subscription)
        is_entitled = await self.verify_entitlement(user_id)
        if not is_entitled and not getattr(content, "is_free", False):
            raise EntitlementRequiredException(
                f"An active subscription is required to stream '{target_title}'."
            )

        # Generate HMAC signed token
        token = generate_playback_token(
            content_id=str(content_id),
            user_id=str(user_id),
            client_ip=client_ip,
            expire_minutes=settings.PLAYBACK_TOKEN_EXPIRE_MINUTES,
        )

        cdn_base = settings.CDN_STREAMING_BASE_URL.rstrip("/")
        stream_url = f"{cdn_base}/{hls_manifest_key}?token={token}"
        sprite_vtt_url = f"{cdn_base}/{sprite_vtt_key}" if sprite_vtt_key else None

        return PlaybackAuthResponse(
            content_id=content_id,
            episode_id=episode_id,
            stream_url=stream_url,
            token=token,
            expires_in_seconds=settings.PLAYBACK_TOKEN_EXPIRE_MINUTES * 60,
            title=target_title,
            sprite_vtt_url=sprite_vtt_url,
        )

    async def update_progress(self, user_id: uuid.UUID, req: UpsertProgressRequest) -> None:
        completion_pct = int((req.progress_seconds / req.duration_seconds) * 100)
        is_completed = completion_pct >= 95 or req.progress_seconds >= (req.duration_seconds - 30)

        # Upsert into PostgreSQL with composite unique constraint
        stmt = insert(WatchHistory).values(
            user_id=user_id,
            content_id=req.content_id,
            episode_id=req.episode_id,
            progress_seconds=req.progress_seconds,
            duration_seconds=req.duration_seconds,
            completion_percentage=completion_pct,
            is_completed=is_completed,
            last_watched_at=datetime.now(timezone.utc),
        ).on_conflict_do_update(
            constraint="uq_user_content_episode_history",
            set_={
                "progress_seconds": req.progress_seconds,
                "duration_seconds": req.duration_seconds,
                "completion_percentage": completion_pct,
                "is_completed": is_completed,
                "last_watched_at": datetime.now(timezone.utc),
            },
        )
        await self.db.execute(stmt)
        await self.db.commit()

    async def get_continue_watching(self, user_id: uuid.UUID) -> List[WatchHistory]:
        stmt = (
            select(WatchHistory)
            .where(WatchHistory.user_id == user_id, WatchHistory.is_completed.is_(False))
            .order_by(desc(WatchHistory.last_watched_at))
            .limit(15)
        )
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def toggle_watchlist(self, user_id: uuid.UUID, content_id: uuid.UUID) -> bool:
        stmt = select(Watchlist).where(Watchlist.user_id == user_id, Watchlist.content_id == content_id)
        res = await self.db.execute(stmt)
        existing = res.scalar_one_or_none()

        if existing:
            await self.db.delete(existing)
            await self.db.commit()
            return False
        else:
            item = Watchlist(user_id=user_id, content_id=content_id)
            self.db.add(item)
            await self.db.commit()
            return True
