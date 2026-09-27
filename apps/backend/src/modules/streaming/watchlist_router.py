import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from src.database import get_db_session
from src.dependencies import TokenUser, get_current_user
from src.modules.streaming.service import StreamingService

router = APIRouter(prefix="/watchlist", tags=["Watchlist"])


class WatchlistAddRequest(BaseModel):
    contentId: Optional[str] = None
    content_id: Optional[str] = None

    def get_content_id(self) -> uuid.UUID:
        raw_id = self.contentId or self.content_id
        if not raw_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="contentId or content_id is required",
            )
        try:
            return uuid.UUID(raw_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid UUID: {raw_id}",
            )


@router.get("", response_model=List[Dict[str, Any]])
async def get_watchlist(
    current_user: TokenUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    service = StreamingService(db)
    return await service.get_watchlist(uuid.UUID(current_user.id))


@router.post("", status_code=status.HTTP_201_CREATED)
async def add_to_watchlist(
    req: WatchlistAddRequest,
    current_user: TokenUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    service = StreamingService(db)
    content_uuid = req.get_content_id()
    return await service.add_to_watchlist(uuid.UUID(current_user.id), content_uuid)


@router.delete("/{content_id}")
async def remove_from_watchlist(
    content_id: uuid.UUID,
    current_user: TokenUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    service = StreamingService(db)
    return await service.remove_from_watchlist(uuid.UUID(current_user.id), content_id)
