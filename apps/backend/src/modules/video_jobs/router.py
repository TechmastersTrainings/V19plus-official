import uuid
from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from src.database import get_db_session
from src.dependencies import require_admin
from src.modules.video_jobs.schemas import VideoJobResponse
from src.modules.video_jobs.service import VideoJobService

router = APIRouter(prefix="/jobs", tags=["Video Processing Jobs (Admin)"])


@router.get("", response_model=List[VideoJobResponse], dependencies=[Depends(require_admin)])
async def list_jobs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db_session),
):
    service = VideoJobService(db)
    return await service.list_jobs(page=page, limit=limit)


@router.get("/{id}", response_model=VideoJobResponse, dependencies=[Depends(require_admin)])
async def get_job(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
):
    service = VideoJobService(db)
    return await service.get_job(id)


@router.post("/{id}/retry", response_model=VideoJobResponse, dependencies=[Depends(require_admin)])
async def retry_job(
    id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
):
    service = VideoJobService(db)
    return await service.retry_job(id)
