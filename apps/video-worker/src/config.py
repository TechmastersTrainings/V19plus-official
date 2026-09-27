import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class WorkerSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ENVIRONMENT: str = "production"
    DATABASE_URL: str = "postgresql+asyncpg://v19plus_admin:v19plus_password@localhost:5432/v19plus_db"
    REDIS_URL: str = "redis://localhost:6379/0"

    # Cloudflare R2 Credentials
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_MASTERS_BUCKET: str = "v19plus-masters"
    R2_STREAMING_BUCKET: str = "v19plus-streaming"
    R2_ENDPOINT_URL: str = ""

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
