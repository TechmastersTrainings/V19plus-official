from typing import Optional
from fastapi import Cookie, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.exceptions import ForbiddenException, UnauthorizedException
from src.core.security import decode_token
from src.config import settings
from src.database import get_db_session


class TokenUser:
    """Lightweight representation of the authenticated user extracted from the JWT"""
    def __init__(self, user_id: str, role: str):
        self.id = user_id
        self.role = role

    @property
    def is_admin(self) -> bool:
        return self.role in ("ADMIN", "SUPERADMIN")


async def get_token_from_request(
    request: Request,
    authorization: Optional[str] = Header(None),
    access_token: Optional[str] = Cookie(None),
) -> str:
    """Extract token from either Bearer header (mobile apps) or HTTP-only cookie (web)"""
    if authorization and authorization.startswith("Bearer "):
        return authorization.split(" ")[1]
    if access_token:
        return access_token
    cookie_token = request.cookies.get("accessToken") or request.cookies.get("access_token")
    if cookie_token:
        return cookie_token
    raise UnauthorizedException("Authentication token missing")


async def get_optional_token(
    request: Request,
    authorization: Optional[str] = Header(None),
    access_token: Optional[str] = Cookie(None),
) -> Optional[str]:
    if authorization and authorization.startswith("Bearer "):
        return authorization.split(" ")[1]
    if access_token:
        return access_token
    cookie_token = request.cookies.get("accessToken") or request.cookies.get("access_token")
    if cookie_token:
        return cookie_token
    return None


async def get_current_user(
    token: str = Depends(get_token_from_request),
) -> TokenUser:
    """Validate JWT access token and return token user"""
    try:
        payload = decode_token(token, settings.JWT_ACCESS_SECRET)
        if payload.get("type") != "access":
            raise UnauthorizedException("Invalid token type")
        user_id = payload.get("sub")
        role = payload.get("role", "USER")
        if not user_id:
            raise UnauthorizedException("Malformed token subject")
        return TokenUser(user_id=user_id, role=role)
    except Exception as e:
        if isinstance(e, UnauthorizedException):
            raise
        raise UnauthorizedException("Token expired or signature invalid")


async def get_optional_current_user(
    token: Optional[str] = Depends(get_optional_token),
) -> Optional[TokenUser]:
    if not token:
        return None
    try:
        payload = decode_token(token, settings.JWT_ACCESS_SECRET)
        if payload.get("type") != "access":
            return None
        user_id = payload.get("sub")
        role = payload.get("role", "USER")
        if not user_id:
            return None
        return TokenUser(user_id=user_id, role=role)
    except Exception:
        return None


async def require_admin(
    current_user: TokenUser = Depends(get_current_user),
) -> TokenUser:
    """Enforce administrator permissions for CMS endpoints"""
    if not current_user.is_admin:
        raise ForbiddenException("Administrator privileges required")
    return current_user
