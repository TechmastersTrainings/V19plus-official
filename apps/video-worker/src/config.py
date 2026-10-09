import os
from pathlib import Path
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Locate environment file from worker, backend, or root directory
_env_files = [
    Path(__file__).resolve().parent.parent / ".env",
    Path(__file__).resolve().parent.parent.parent / "backend" / ".env",
    Path(__file__).resolve().parent.parent.parent.parent / ".env",
]
_active_env_file = next((str(p) for p in _env_files if p.exists()), ".env")


class WorkerSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_active_env_file,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ENVIRONMENT: str = "production"
    DATABASE_URL: str = "postgresql+asyncpg://v19plus_admin:v19plus_password@localhost:5432/v19plus_db"
    REDIS_URL: str = "redis://localhost:6379/0"

    # Cloudflare R2 Credentials
    R2_ACCOUNT_ID: str = "0145d381c72806d12af91fb516e91171"
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_MASTERS_BUCKET: str = "v19plus-r2-backend"
    R2_STREAMING_BUCKET: str = "v19plus-r2-backend"
    R2_ENDPOINT_URL: str = ""
    CDN_STREAMING_BASE_URL: str = "https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_url(cls, v: str) -> str:
        if v and v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    @property
    def r2_endpoint(self) -> str:
        if self.R2_ENDPOINT_URL:
            return self.R2_ENDPOINT_URL
        if self.R2_ACCOUNT_ID:
            return f"https://{self.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
        return ""

    WORKER_CONCURRENCY: int = 2
    SCRATCH_DIR: str = "/tmp/v19plus_transcode"


worker_settings = WorkerSettings()

