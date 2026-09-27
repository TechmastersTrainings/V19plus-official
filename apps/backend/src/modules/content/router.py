import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.database import get_db_session
from src.dependencies import require_admin
from src.modules.content.models import ContentType
from src.modules.content.schemas import (
    ContentCreate,
    ContentResponse,
    ContentUpdate,
    EpisodeCreate,
    EpisodeResponse,
    SeasonCreate,
    SeasonResponse,
)
from src.modules.content.service import ContentService

router = APIRouter(prefix="/content", tags=["Content & Catalog"])


# ─── Public Consumer Discovery ───────────────────────────────────────────────

@router.get("", response_model=List[ContentResponse])
async def list_content(
    type: Optional[ContentType] = Query(None, description="Filter by content type"),
    genre: Optional[str] = Query(None, description="Filter by genre slug"),
    page: int = Query(1, ge=1),
    limit: int = Query(24, ge=1, le=100),
    db: AsyncSession = Depends(get_db_session),
):
    service = ContentService(db)
    return await service.list_content(
        content_type=type, genre_slug=genre, only_published=True, page=page, limit=limit
    )


@router.get("/featured", response_model=List[ContentResponse])
async def get_featured(db: AsyncSession = Depends(get_db_session)):
    service = ContentService(db)
    return await service.get_featured()


@router.get("/trending", response_model=List[ContentResponse])
async def get_trending(db: AsyncSession = Depends(get_db_session)):
    service = ContentService(db)
    return await service.get_trending()


@router.get("/originals", response_model=List[ContentResponse])
async def get_originals(db: AsyncSession = Depends(get_db_session)):
    service = ContentService(db)
    from sqlalchemy import select, desc
    from src.modules.content.models import Content, ContentStatus
    from sqlalchemy.orm import selectinload
    stmt = (
        select(Content)
        .options(selectinload(Content.genres))
        .where(Content.is_original.is_(True), Content.is_published.is_(True), Content.status == ContentStatus.PUBLISHED)
        .order_by(desc(Content.created_at))
        .limit(20)
    )
    res = await db.execute(stmt)
    return list(res.scalars().all())


@router.get("/slug/{slug}", response_model=ContentResponse)
@router.get("/{slug}", response_model=ContentResponse)
async def get_by_slug(
    slug: str,
    db: AsyncSession = Depends(get_db_session),
):
    service = ContentService(db)
    return await service.get_by_slug(slug)


# ─── Administrative CMS Endpoints ───────────────────────────────────────────

@router.post(
    "",
    response_model=ContentResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
async def create_content(
    req: ContentCreate,
    db: AsyncSession = Depends(get_db_session),
):
    service = ContentService(db)
    return await service.create_content(req)


@router.put(
    "/{id}",
    response_model=ContentResponse,
    dependencies=[Depends(require_admin)],
)
async def update_content(
    id: uuid.UUID,
    req: ContentUpdate,
    db: AsyncSession = Depends(get_db_session),
):
    service = ContentService(db)
    return await service.update_content(id, req)


@router.delete(
    "/{id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
async def delete_content(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
):
    service = ContentService(db)
    await service.delete_content(id)


@router.post(
    "/{id}/seasons",
    response_model=SeasonResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
async def create_season(
    id: uuid.UUID,
    req: SeasonCreate,
    db: AsyncSession = Depends(get_db_session),
):
    service = ContentService(db)
    return await service.add_season(id, req)


@router.post(
    "/seasons/{season_id}/episodes",
    response_model=EpisodeResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_admin)],
)
async def create_episode(
    season_id: uuid.UUID,
    req: EpisodeCreate,
    db: AsyncSession = Depends(get_db_session),
):
    service = ContentService(db)
    return await service.add_episode(season_id, req)
