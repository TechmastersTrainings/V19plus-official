import re
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import delete, desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.core.exceptions import ConflictException, NotFoundException
from src.modules.content.models import (
    Content,
    ContentStatus,
    ContentType,
    Episode,
    Genre,
    Season,
    content_genres,
)
from src.modules.content.schemas import (
    ContentCreate,
    ContentUpdate,
    EpisodeCreate,
    SeasonCreate,
)


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-")


class ContentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_content(
        self,
        content_type: Optional[ContentType] = None,
        genre_slug: Optional[str] = None,
        only_published: bool = True,
        page: int = 1,
        limit: int = 24,
    ) -> List[Content]:
        stmt = (
            select(Content)
            .options(
                selectinload(Content.genres),
                selectinload(Content.seasons).selectinload(Season.episodes),
            )
            .order_by(desc(Content.created_at))
        )
        if only_published:
            stmt = stmt.where(Content.is_published.is_(True), Content.status == ContentStatus.PUBLISHED)
        if content_type:
            stmt = stmt.where(Content.content_type == content_type)
        if genre_slug:
            stmt = stmt.join(Content.genres).where(Genre.slug == genre_slug)

        offset = (page - 1) * limit
        stmt = stmt.offset(offset).limit(limit)

        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_featured(self) -> List[Content]:
        stmt = (
            select(Content)
            .options(selectinload(Content.genres))
            .where(
                Content.is_published.is_(True),
                Content.is_featured.is_(True),
                Content.status == ContentStatus.PUBLISHED,
            )
            .order_by(desc(Content.created_at))
            .limit(10)
        )
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_trending(self) -> List[Content]:
        stmt = (
            select(Content)
            .options(selectinload(Content.genres))
            .where(
                Content.is_published.is_(True),
                Content.status == ContentStatus.PUBLISHED,
            )
            .order_by(desc(Content.created_at))
            .limit(20)
        )
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_by_slug(self, slug: str) -> Content:
        stmt = (
            select(Content)
            .options(
                selectinload(Content.genres),
                selectinload(Content.seasons).selectinload(Season.episodes),
            )
            .where(Content.slug == slug)
        )
        res = await self.db.execute(stmt)
        content = res.scalar_one_or_none()
        if not content:
            raise NotFoundException("Content", slug)
        return content

    async def get_by_id(self, content_id: uuid.UUID) -> Content:
        stmt = (
            select(Content)
            .options(
                selectinload(Content.genres),
                selectinload(Content.seasons).selectinload(Season.episodes),
            )
            .where(Content.id == content_id)
        )
        res = await self.db.execute(stmt)
        content = res.scalar_one_or_none()
        if not content:
            raise NotFoundException("Content", content_id)
        return content

    async def create_content(self, req: ContentCreate) -> Content:
        base_slug = slugify(req.title)
        slug = base_slug
        # Ensure slug uniqueness
        counter = 1
        while True:
            existing = await self.db.execute(select(Content).where(Content.slug == slug))
            if not existing.scalar_one_or_none():
                break
            counter += 1
            slug = f"{base_slug}-{counter}"

        content = Content(
            title=req.title,
            slug=slug,
            description=req.description,
            content_type=req.content_type,
            status=ContentStatus.DRAFT,
            release_year=req.release_year,
            rating=req.rating,
            duration_seconds=req.duration_seconds,
            thumbnail_url=req.thumbnail_url,
            backdrop_url=req.backdrop_url,
            trailer_url=req.trailer_url,
            is_original=req.is_original,
            is_featured=req.is_featured,
            is_published=False,
        )

        if req.genre_ids:
            genres_res = await self.db.execute(select(Genre).where(Genre.id.in_(req.genre_ids)))
            content.genres = list(genres_res.scalars().all())

        self.db.add(content)
        await self.db.commit()
        return await self.get_by_id(content.id)

    async def update_content(self, content_id: uuid.UUID, req: ContentUpdate) -> Content:
        content = await self.get_by_id(content_id)

        update_data = req.model_dump(exclude_unset=True, exclude={"genre_ids"})
        for field, value in update_data.items():
            setattr(content, field, value)

        if req.status == ContentStatus.PUBLISHED or req.is_published is True:
            content.is_published = True
            content.status = ContentStatus.PUBLISHED
            if not content.published_at:
                content.published_at = datetime.now(timezone.utc)

        if req.genre_ids is not None:
            genres_res = await self.db.execute(select(Genre).where(Genre.id.in_(req.genre_ids)))
            content.genres = list(genres_res.scalars().all())

        await self.db.commit()
        return await self.get_by_id(content.id)

    async def delete_content(self, content_id: uuid.UUID) -> None:
        content = await self.get_by_id(content_id)
        await self.db.delete(content)
        await self.db.commit()

    async def add_season(self, content_id: uuid.UUID, req: SeasonCreate) -> Season:
        await self.get_by_id(content_id)
        season = Season(
            content_id=content_id,
            season_number=req.season_number,
            title=req.title,
        )
        self.db.add(season)
        await self.db.commit()
        await self.db.refresh(season, ["episodes"])
        return season

    async def add_episode(self, season_id: uuid.UUID, req: EpisodeCreate) -> Episode:
        episode = Episode(
            season_id=season_id,
            episode_number=req.episode_number,
            title=req.title,
            description=req.description,
            duration_seconds=req.duration_seconds,
            thumbnail_url=req.thumbnail_url,
            status=ContentStatus.DRAFT,
        )
        self.db.add(episode)
        await self.db.commit()
        await self.db.refresh(episode)
        return episode
