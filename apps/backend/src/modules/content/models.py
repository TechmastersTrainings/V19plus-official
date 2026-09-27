import enum
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Table, Column, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.database import Base, TimestampMixin


class ContentType(str, enum.Enum):
    MOVIE = "MOVIE"
    SERIES = "SERIES"
    DOCUMENTARY = "DOCUMENTARY"
    EVENT = "EVENT"
    RECORDED_LONGFORM = "RECORDED_LONGFORM"


class ContentStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    UPLOADING = "UPLOADING"
    UPLOADED = "UPLOADED"
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    READY = "READY"
    REVIEW = "REVIEW"
    PUBLISHED = "PUBLISHED"
    ARCHIVED = "ARCHIVED"
    FAILED = "FAILED"


# Many-to-many association table for Content and Genre
content_genres = Table(
    "content_genres",
    Base.metadata,
    Column(
        "content_id",
        UUID(as_uuid=True),
        ForeignKey("content.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "genre_id",
        UUID(as_uuid=True),
        ForeignKey("genres.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Genre(Base, TimestampMixin):
    __tablename__ = "genres"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)

    contents: Mapped[List["Content"]] = relationship(
        "Content", secondary=content_genres, back_populates="genres"
    )


class Content(Base, TimestampMixin):
    __tablename__ = "content"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    
    content_type: Mapped[ContentType] = mapped_column(
        Enum(ContentType, name="content_type_enum"), default=ContentType.MOVIE, nullable=False
    )
    status: Mapped[ContentStatus] = mapped_column(
        Enum(ContentStatus, name="content_status_enum"), default=ContentStatus.DRAFT, nullable=False, index=True
    )
    
    release_year: Mapped[int] = mapped_column(Integer, default=2026, nullable=False)
    rating: Mapped[str] = mapped_column(String(20), default="U/A 13+", nullable=False)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    thumbnail_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    backdrop_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    trailer_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Master asset in Cloudflare R2 (Private bucket)
    master_storage_key: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    
    # Processed HLS Manifest Key in Cloudflare R2 (v19plus-streaming)
    hls_manifest_key: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    
    # VTT Scrubbing Sprite Key
    sprite_vtt_key: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    is_original: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    genres: Mapped[List[Genre]] = relationship(
        Genre, secondary=content_genres, back_populates="contents"
    )
    seasons: Mapped[List["Season"]] = relationship(
        "Season", back_populates="content", cascade="all, delete-orphan", order_by="Season.season_number"
    )


class Season(Base, TimestampMixin):
    __tablename__ = "seasons"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    content_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("content.id", ondelete="CASCADE"), nullable=False, index=True
    )
    season_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    content: Mapped[Content] = relationship("Content", back_populates="seasons")
    episodes: Mapped[List["Episode"]] = relationship(
        "Episode", back_populates="season", cascade="all, delete-orphan", order_by="Episode.episode_number"
    )


class Episode(Base, TimestampMixin):
    __tablename__ = "episodes"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    season_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("seasons.id", ondelete="CASCADE"), nullable=False, index=True
    )
    episode_number: Mapped[int] = mapped_column(Integer, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_seconds: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Master asset & HLS keys
    master_storage_key: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    hls_manifest_key: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    sprite_vtt_key: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    status: Mapped[ContentStatus] = mapped_column(
        Enum(ContentStatus, name="episode_status_enum"), default=ContentStatus.DRAFT, nullable=False
    )

    season: Mapped[Season] = relationship(Season, back_populates="episodes")
