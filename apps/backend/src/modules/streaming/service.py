import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import delete, desc, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.config import settings
from src.core.exceptions import EntitlementRequiredException, NotFoundException
from src.core.security import generate_playback_token
from src.modules.content.models import Content, ContentStatus, Episode, Season
from src.modules.streaming.models import WatchHistory, Watchlist
from src.modules.streaming.schemas import PlaybackAuthResponse, UpsertProgressRequest
from src.modules.subscriptions.models import UserSubscription


from src.modules.users.models import User


class StreamingService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def verify_entitlement(self, user_id: uuid.UUID) -> bool:
        """Subscription integration deferred per user directive - all users are entitled to stream."""
        return True

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

        # Generate HMAC signed token
        token = generate_playback_token(
            content_id=str(content_id),
            user_id=str(user_id),
            client_ip=client_ip,
            expire_minutes=settings.PLAYBACK_TOKEN_EXPIRE_MINUTES,
        )

        cdn_base = settings.CDN_STREAMING_BASE_URL.rstrip("/")

        # Check for locally uploaded video file or explicit stream key
        import os
        media_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../media_storage"))
        local_filename = os.path.basename(content.master_storage_key or "")
        local_path = os.path.join(media_dir, local_filename) if local_filename else None

        is_valid_hls = bool(
            hls_manifest_key and (hls_manifest_key.endswith(".m3u8") or ".m3u8" in hls_manifest_key or "/hls/" in hls_manifest_key)
        )

        is_processing = False
        is_hls = False

        if is_valid_hls:
            is_hls = True
            is_processing = False
            if hls_manifest_key.startswith("http://") or hls_manifest_key.startswith("https://") or hls_manifest_key.startswith("/api/"):
                if "127.0.0.1:8001" in hls_manifest_key:
                    stream_url = hls_manifest_key.replace("http://127.0.0.1:8001", "")
                else:
                    stream_url = hls_manifest_key
            elif "/" in hls_manifest_key:
                stream_url = f"{cdn_base}/{hls_manifest_key.lstrip('/')}"
            else:
                stream_url = f"{cdn_base}/{hls_manifest_key}"
        elif local_path and os.path.exists(local_path):
            is_hls = False
            is_processing = False
            stream_url = f"/api/media/stream/{local_filename}"
        elif content.master_storage_key:
            # Valid master storage key present in Cloudflare R2: HLS transcoding is in progress / pending
            is_hls = False
            is_processing = True
            stream_url = f"{cdn_base}/{content.master_storage_key}"
        else:
            is_hls = True
            is_processing = False
            stream_url = f"https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8?token={token}"

        sprite_vtt_url = f"{cdn_base}/{sprite_vtt_key}" if sprite_vtt_key else None

        return PlaybackAuthResponse(
            content_id=content_id,
            episode_id=episode_id,
            stream_url=stream_url,
            token=token,
            expires_in_seconds=settings.PLAYBACK_TOKEN_EXPIRE_MINUTES * 60,
            title=target_title,
            sprite_vtt_url=sprite_vtt_url,
            is_hls=is_hls,
            is_processing=is_processing,
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

    async def get_continue_watching(self, user_id: uuid.UUID) -> List[dict]:
        stmt = (
            select(WatchHistory, Content)
            .join(Content, WatchHistory.content_id == Content.id)
            .options(
                selectinload(Content.genres),
                selectinload(Content.seasons).selectinload(Season.episodes),
            )
            .where(
                WatchHistory.user_id == user_id,
                WatchHistory.is_completed.is_(False),
                Content.is_published.is_(True),
                Content.status == ContentStatus.PUBLISHED,
            )
            .order_by(desc(WatchHistory.last_watched_at))
            .limit(15)
        )
        res = await self.db.execute(stmt)
        items = []
        seen_content_ids = set()
        for wh, cnt in res.all():
            if str(cnt.id) in seen_content_ids:
                continue
            seen_content_ids.add(str(cnt.id))
            items.append({
                "id": wh.id,
                "content_id": wh.content_id,
                "episode_id": wh.episode_id,
                "progress_seconds": wh.progress_seconds,
                "duration_seconds": wh.duration_seconds,
                "completion_percentage": wh.completion_percentage,
                "is_completed": wh.is_completed,
                "last_watched_at": wh.last_watched_at,
                "content": cnt,
            })
        return items

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

    async def get_watchlist(self, user_id: uuid.UUID) -> List[dict]:
        stmt = (
            select(Watchlist, Content)
            .join(Content, Watchlist.content_id == Content.id)
            .options(
                selectinload(Content.genres),
                selectinload(Content.seasons).selectinload(Season.episodes),
            )
            .where(Watchlist.user_id == user_id)
            .order_by(desc(Watchlist.created_at))
        )
        res = await self.db.execute(stmt)
        items = []
        for wl, cnt in res.all():
            items.append({
                "id": str(wl.id),
                "content_id": str(wl.content_id),
                "content": {
                    "id": str(cnt.id),
                    "title": cnt.title,
                    "slug": cnt.slug,
                    "description": cnt.description,
                    "content_type": cnt.content_type.value if hasattr(cnt.content_type, "value") else str(cnt.content_type),
                    "status": cnt.status.value if hasattr(cnt.status, "value") else str(cnt.status),
                    "release_year": cnt.release_year,
                    "rating": cnt.rating,
                    "duration_seconds": cnt.duration_seconds,
                    "thumbnail_url": cnt.thumbnail_url,
                    "backdrop_url": cnt.backdrop_url,
                    "is_original": cnt.is_original,
                    "is_featured": cnt.is_featured,
                    "genres": [
                        {"id": str(g.id), "name": g.name, "slug": g.slug} for g in cnt.genres
                    ],
                },
                "created_at": wl.created_at.isoformat() if wl.created_at else None,
            })
        return items

    async def add_to_watchlist(self, user_id: uuid.UUID, content_id: uuid.UUID) -> dict:
        stmt = select(Watchlist).where(Watchlist.user_id == user_id, Watchlist.content_id == content_id)
        res = await self.db.execute(stmt)
        existing = res.scalar_one_or_none()
        if not existing:
            item = Watchlist(user_id=user_id, content_id=content_id)
            self.db.add(item)
            await self.db.commit()
            await self.db.refresh(item)
            return {"id": str(item.id), "content_id": str(content_id), "status": "added"}
        return {"id": str(existing.id), "content_id": str(content_id), "status": "already_exists"}

    async def remove_from_watchlist(self, user_id: uuid.UUID, content_id: uuid.UUID) -> dict:
        stmt = delete(Watchlist).where(Watchlist.user_id == user_id, Watchlist.content_id == content_id)
        await self.db.execute(stmt)
        await self.db.commit()
        return {"content_id": str(content_id), "status": "removed"}
