import os
from typing import List, Union
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Database (Render Singapore PostgreSQL)
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://v19plus_admin:v19plus_password@localhost:5432/v19plus_db",
        description="Async connection string for PostgreSQL",
    )
    DATABASE_SYNC_URL: str = Field(
        default="postgresql://v19plus_admin:v19plus_password@localhost:5432/v19plus_db",
        description="Sync connection string for Alembic migrations",
    )

    # Redis (Render Key-Value Singapore)
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT Authentication
    JWT_ACCESS_SECRET: str = "dev_access_secret_min_32_characters_long_for_security"
    JWT_REFRESH_SECRET: str = "dev_refresh_secret_min_32_characters_long_for_security"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Playback Security (HMAC Tokens)
    PLAYBACK_TOKEN_SECRET: str = "dev_playback_token_secret_min_32_characters"
    PLAYBACK_TOKEN_EXPIRE_MINUTES: int = 30
    CDN_STREAMING_BASE_URL: str = "https://stream.v19plus.com"

    # Cloudflare R2 Object Storage
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

    # Razorpay Payment Gateway
    RAZORPAY_KEY_ID: str = "rzp_live_Tbb4iLspKtfxWT"
    RAZORPAY_KEY_SECRET: str = "ZXTUeRfIiuZwNG3MoJP26iCH"
    RAZORPAY_WEBHOOK_SECRET: str = ""

    # Observability
    SENTRY_DSN: str = ""
    POSTHOG_API_KEY: str = ""
    POSTHOG_HOST: str = "https://app.posthog.com"

    # CORS Allowed Origins
    ALLOWED_ORIGINS: Union[str, List[str]] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://v19plus.com",
        "https://www.v19plus.com",
        "https://admin.v19plus.com",
        "https://v19-plus.web.app",
        "https://v19plus.web.app",
        "capacitor://localhost",
    ]

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_url(cls, v: str) -> str:
        if isinstance(v, str):
            if v.startswith("postgres://"):
                v = v.replace("postgres://", "postgresql+asyncpg://", 1)
            elif v.startswith("postgresql://") and not v.startswith("postgresql+asyncpg://"):
                v = v.replace("postgresql://", "postgresql+asyncpg://", 1)
            if "sslmode=" in v:
                import re
                v = re.sub(r"([?&])sslmode=([^&]+)", r"\1ssl=\2", v)
        return v

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    @field_validator("RAZORPAY_KEY_ID", mode="before")
    @classmethod
    def assemble_razorpay_key(cls, v: str) -> str:
        if not v or "placeholder" in v or "rzp_test_" in v:
            return "rzp_live_Tbb4iLspKtfxWT"
        return v

    @field_validator("RAZORPAY_KEY_SECRET", mode="before")
    @classmethod
    def assemble_razorpay_secret(cls, v: str) -> str:
        if not v or "placeholder" in v or v == "aDxkWf4l23hOqIjAf0ZR6jZH":
            return "ZXTUeRfIiuZwNG3MoJP26iCH"
        return v


settings = Settings()
