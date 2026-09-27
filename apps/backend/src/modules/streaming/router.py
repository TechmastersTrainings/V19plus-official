import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.database import get_db_session
from src.dependencies import TokenUser, get_current_user, get_optional_current_user
from src.modules.streaming.schemas import (
    PlaybackAuthResponse,
    UpsertProgressRequest,
    WatchHistoryResponse,
)
from src.modules.streaming.service import StreamingService

router = APIRouter(prefix="/streaming", tags=["Streaming & Playback"])


@router.get("/playback/{content_id}", response_model=PlaybackAuthResponse)
async def get_playback_authorization(
    content_id: uuid.UUID,
    request: Request,
    episode_id: Optional[uuid.UUID] = Query(None, description="Optional episode ID for series"),
    current_user: Optional[TokenUser] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    service = StreamingService(db)
    client_ip = request.client.host if request.client else None
    user_id = uuid.UUID(current_user.id) if current_user else uuid.UUID("00000000-0000-0000-0000-000000000000")
    return await service.authorize_playback(
        user_id=user_id,
        content_id=content_id,
        episode_id=episode_id,
        client_ip=client_ip,
    )


@router.post("/progress", status_code=status.HTTP_204_NO_CONTENT)
@router.post("/history", status_code=status.HTTP_204_NO_CONTENT)
async def update_watch_progress(
    req: UpsertProgressRequest,
    current_user: TokenUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    service = StreamingService(db)
    await service.update_progress(uuid.UUID(current_user.id), req)


@router.get("/continue-watching", response_model=List[WatchHistoryResponse])
@router.get("/history", response_model=List[WatchHistoryResponse])
async def get_continue_watching(
    current_user: TokenUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    service = StreamingService(db)
    return await service.get_continue_watching(uuid.UUID(current_user.id))


@router.post("/watchlist/{content_id}")
async def toggle_watchlist(
    content_id: uuid.UUID,
    current_user: TokenUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    service = StreamingService(db)
    is_in_watchlist = await service.toggle_watchlist(uuid.UUID(current_user.id), content_id)
    return {"content_id": content_id, "in_watchlist": is_in_watchlist}
