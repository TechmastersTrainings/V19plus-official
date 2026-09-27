import inspect
import uuid
from typing import Any, List, Optional
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.exceptions import NotFoundException
from src.modules.video_jobs.models import JobStatus, VideoJob
from src.redis import get_redis_client


class VideoJobService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_jobs(self, page: int = 1, limit: int = 50) -> List[VideoJob]:
        stmt = (
            select(VideoJob)
            .order_by(desc(VideoJob.created_at))
            .offset((page - 1) * limit)
            .limit(limit)
        )
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_job(self, job_id: uuid.UUID) -> VideoJob:
        job = await self.db.get(VideoJob, job_id)
        if not job:
            raise NotFoundException("VideoJob", job_id)
        return job

    async def retry_job(self, job_id: uuid.UUID) -> VideoJob:
        job = await self.get_job(job_id)
        job.status = JobStatus.QUEUED
        job.progress_percent = 0
        job.error_message = None
        job.retry_count += 1
        await self.db.commit()

        # Re-dispatch to Redis queue
        redis_client: Any = get_redis_client()
        if redis_client:
            try:
                task: Any = redis_client.lpush("v19plus:video_jobs", str(job.id))
                if inspect.isawaitable(task):
                    await task
            except Exception:
                pass

        return job
