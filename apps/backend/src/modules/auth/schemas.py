import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, description="Minimum 8 characters")
    name: str = Field(min_length=2, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    device_id: str = "web_browser"


class RefreshRequest(BaseModel):
    refresh_token: str
    device_id: str = "web_browser"


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in_seconds: int = 900 # 15 minutes


class ProfileResponse(BaseModel):
    id: uuid.UUID
    name: str
    avatar_color: str
    is_kids: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ProfileCreate(BaseModel):
    name: str = Field(min_length=1, max_length=50)
    avatar_color: str = "#E50914"
    is_kids: bool = False
    pin: Optional[str] = None


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    role: str
    avatar_url: Optional[str]
    is_verified: bool
    profiles: List[ProfileResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True
