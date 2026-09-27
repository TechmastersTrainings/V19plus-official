import uuid
from typing import List, Optional
from fastapi import APIRouter, Cookie, Depends, Header, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.config import settings
from src.database import get_db_session
from src.dependencies import TokenUser, get_current_user
from src.modules.auth.schemas import (
    LoginRequest,
    ProfileCreate,
    ProfileResponse,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from src.modules.auth.service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


def set_auth_cookies(response: Response, tokens: TokenResponse):
    """Set secure HTTP-only cookies for web clients while still returning tokens in JSON for mobile clients"""
    response.set_cookie(
        key="access_token",
        value=tokens.access_token,
        max_age=tokens.expires_in_seconds,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=tokens.refresh_token,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        httponly=True,
        secure=settings.ENVIRONMENT == "production",
        samesite="lax",
        path="/",
    )


def clear_auth_cookies(response: Response):
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")


@router.post("/check-email")
async def check_email(
    payload: dict,
    db: AsyncSession = Depends(get_db_session),
):
    email = payload.get("email", "").lower().strip()
    from sqlalchemy import select
    from src.modules.users.models import User
    res = await db.execute(select(User).where(User.email == email))
    exists = res.scalar_one_or_none() is not None
    return {"exists": exists}


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    req: RegisterRequest,
    db: AsyncSession = Depends(get_db_session),
):
    service = AuthService(db)
    user = await service.register(req)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(
    req: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db_session),
):
    service = AuthService(db)
    tokens = await service.authenticate(req)
    set_auth_cookies(response, tokens)
    return tokens


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    req: Optional[RefreshRequest] = None,
    refresh_token_cookie: Optional[str] = Cookie(None, alias="refresh_token"),
    response: Response = None,
    db: AsyncSession = Depends(get_db_session),
):
    service = AuthService(db)
    token_str = (req.refresh_token if req else None) or refresh_token_cookie
    device_id = (req.device_id if req else None) or "web_browser"

    tokens = await service.refresh_tokens(token_str, device_id)
    if response:
        set_auth_cookies(response, tokens)
    return tokens


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    response: Response,
    current_user: TokenUser = Depends(get_current_user),
    refresh_token_cookie: Optional[str] = Cookie(None, alias="refresh_token"),
    db: AsyncSession = Depends(get_db_session),
):
    if refresh_token_cookie:
        service = AuthService(db)
        await service.logout(uuid.UUID(current_user.id), refresh_token_cookie)
    clear_auth_cookies(response)
    return {"message": "Successfully logged out."}


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: TokenUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    service = AuthService(db)
    return await service.get_me(uuid.UUID(current_user.id))


@router.post("/profiles", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_profile(
    req: ProfileCreate,
    current_user: TokenUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    service = AuthService(db)
    return await service.create_profile(uuid.UUID(current_user.id), req)
