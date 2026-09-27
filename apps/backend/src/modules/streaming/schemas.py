import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class PlaybackAuthResponse(BaseModel):
    content_id: uuid.UUID
    episode_id: Optional[uuid.UUID] = None
    stream_url: str
    token: str
    expires_in_seconds: int
    title: str
    sprite_vtt_url: Optional[str] = None


class UpsertProgressRequest(BaseModel):
    content_id: uuid.UUID
    episode_id: Optional[uuid.UUID] = None
    progress_seconds: int = Field(ge=0)
    duration_seconds: int = Field(ge=1)


from src.modules.content.schemas import ContentResponse


class WatchHistoryResponse(BaseModel):
    id: uuid.UUID
    content_id: uuid.UUID
    episode_id: Optional[uuid.UUID] = None
    progress_seconds: int
    duration_seconds: int
    completion_percentage: int
    is_completed: bool
    last_watched_at: datetime
    content: Optional[ContentResponse] = None

    class Config:
        from_attributes = True
