import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from src.modules.video_jobs.models import JobStatus


class VideoJobResponse(BaseModel):
    id: uuid.UUID
    content_id: Optional[uuid.UUID]
    episode_id: Optional[uuid.UUID]
    source_bucket: str
    source_file_key: str
    source_file_size_bytes: int
    target_bucket: str
    target_hls_prefix: str
    status: JobStatus
    progress_percent: int
    duration_seconds: Optional[float]
    source_metadata: Optional[dict]
    renditions_created: Optional[dict]
    error_message: Optional[str]
    retry_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
