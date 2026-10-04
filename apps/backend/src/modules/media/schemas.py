import uuid
from typing import List, Optional
from pydantic import BaseModel, Field


class PartUploadItem(BaseModel):
    part_number: int
    etag: str


class InitiateMultipartUploadRequest(BaseModel):
    filename: str
    file_size_bytes: int = Field(gt=0, description="Total file size in bytes (supports 20GB-100GB+)")
    content_type: str = "video/mp4"
    content_id: Optional[uuid.UUID] = None
    episode_id: Optional[uuid.UUID] = None


class PresignedPartUrl(BaseModel):
    part_number: int
    url: str


class InitiateMultipartUploadResponse(BaseModel):
    upload_id: str
    key: str
    bucket: str
    part_size_bytes: int
    total_parts: int
    initial_parts: List[PresignedPartUrl] = []


class CompleteMultipartUploadRequest(BaseModel):
    upload_id: str
    key: str
    parts: List[PartUploadItem]
    content_id: Optional[uuid.UUID] = None
    episode_id: Optional[uuid.UUID] = None
    file_size_bytes: int


class CompleteMultipartUploadResponse(BaseModel):
    message: str
    key: str
    job_id: uuid.UUID
    status: str


class AbortMultipartUploadRequest(BaseModel):
    upload_id: str
    key: str
    reason: Optional[str] = None


class AbortMultipartUploadResponse(BaseModel):
    status: str
    upload_id: str
    key: str
    message: str
