import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from src.modules.content.models import ContentStatus, ContentType


class GenreResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str

    class Config:
        from_attributes = True


class EpisodeResponse(BaseModel):
    id: uuid.UUID
    season_id: uuid.UUID
    episode_number: int
    title: str
    description: Optional[str]
    duration_seconds: Optional[int]
    thumbnail_url: Optional[str]
    status: ContentStatus
    hls_manifest_key: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class SeasonResponse(BaseModel):
    id: uuid.UUID
    content_id: uuid.UUID
    season_number: int
    title: Optional[str]
    episodes: List[EpisodeResponse] = []

    class Config:
        from_attributes = True


class ContentResponse(BaseModel):
    id: uuid.UUID
    title: str
    slug: str
    description: str
    content_type: ContentType
    status: ContentStatus
    release_year: int
    rating: str
    duration_seconds: Optional[int]
    thumbnail_url: Optional[str]
    backdrop_url: Optional[str]
    trailer_url: Optional[str]
    master_storage_key: Optional[str] = None
    hls_manifest_key: Optional[str] = None
    is_original: bool
    is_featured: bool
    is_published: bool
    genres: List[GenreResponse] = []
    seasons: List[SeasonResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


class ContentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = Field(default="")
    content_type: ContentType = ContentType.MOVIE
    release_year: int = 2026
    rating: str = "U/A 13+"
    duration_seconds: Optional[int] = None
    thumbnail_url: Optional[str] = None
    backdrop_url: Optional[str] = None
    trailer_url: Optional[str] = None
    master_storage_key: Optional[str] = None
    hls_manifest_key: Optional[str] = None
    is_original: bool = False
    is_featured: bool = False
    is_published: bool = True
    status: Optional[ContentStatus] = None
    genre_ids: List[uuid.UUID] = []


class ContentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    release_year: Optional[int] = None
    rating: Optional[str] = None
    duration_seconds: Optional[int] = None
    thumbnail_url: Optional[str] = None
    backdrop_url: Optional[str] = None
    trailer_url: Optional[str] = None
    is_original: Optional[bool] = None
    is_featured: Optional[bool] = None
    is_published: Optional[bool] = None
    status: Optional[ContentStatus] = None
    master_storage_key: Optional[str] = None
    hls_manifest_key: Optional[str] = None
    sprite_vtt_key: Optional[str] = None
    genre_ids: Optional[List[uuid.UUID]] = None


class SeasonCreate(BaseModel):
    season_number: int = Field(ge=1)
    title: Optional[str] = None


class EpisodeCreate(BaseModel):
    episode_number: int = Field(ge=1)
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    duration_seconds: Optional[int] = None
    thumbnail_url: Optional[str] = None


class SearchSuggestionResponse(BaseModel):
    title: str
    slug: str
    thumbnail_url: Optional[str] = None
    thumbnailUrl: Optional[str] = None
    type: str


class SearchResponse(BaseModel):
    results: List[ContentResponse]
    query: str
    total: int

