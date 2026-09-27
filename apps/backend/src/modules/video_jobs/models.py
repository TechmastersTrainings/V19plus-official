import enum
import uuid
from typing import Optional
from sqlalchemy import BigInteger, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.database import Base, TimestampMixin


class JobStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    PROBING = "PROBING"
    TRANSCODING = "TRANSCODING"
    GENERATING_ASSETS = "GENERATING_ASSETS"
    VALIDATING = "VALIDATING"
    READY = "READY"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class VideoJob(Base, TimestampMixin):
    __tablename__ = "video_jobs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    content_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("content.id", ondelete="SET NULL"), nullable=True, index=True
    )
    episode_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("episodes.id", ondelete="SET NULL"), nullable=True, index=True
    )

    source_bucket: Mapped[str] = mapped_column(String(100), default="v19plus-masters", nullable=False)
    source_file_key: Mapped[str] = mapped_column(String(512), nullable=False)
    source_file_size_bytes: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)

    target_bucket: Mapped[str] = mapped_column(String(100), default="v19plus-streaming", nullable=False)
    target_hls_prefix: Mapped[str] = mapped_column(String(512), nullable=False)

    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, name="video_job_status_enum"), default=JobStatus.QUEUED, nullable=False, index=True
    )
    progress_percent: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    duration_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Probe and Rendition Metadata
    source_metadata: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    renditions_created: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    worker_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
