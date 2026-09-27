import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.config import settings
from src.core.exceptions import ConflictException, NotFoundException, UnauthorizedException
from src.core.security import create_access_token, create_refresh_token, decode_token, hash_password, verify_password
from src.modules.users.models import Profile, RefreshToken, User
from src.modules.auth.schemas import LoginRequest, ProfileCreate, RegisterRequest, TokenResponse, UserResponse


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    def _hash_token(self, token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    async def register(self, req: RegisterRequest) -> User:
        # Check existing email
        stmt = select(User).where(User.email == req.email.lower().strip())
        res = await self.db.execute(stmt)
        if res.scalar_one_or_none():
            raise ConflictException(f"Account with email '{req.email}' already exists.")

        user = User(
            email=req.email.lower().strip(),
            hashed_password=hash_password(req.password),
            name=req.name.strip(),
            role="USER",
            is_active=True,
            is_verified=False,
        )
        self.db.add(user)
        await self.db.flush()

        # Create initial default profile
        default_profile = Profile(
            user_id=user.id,
            name=user.name.split(" ")[0] or "Viewer",
            avatar_color="#E50914",
            is_kids=False,
        )
        self.db.add(default_profile)
        await self.db.commit()
        await self.db.refresh(user, ["profiles"])
        return user

    async def authenticate(self, req: LoginRequest) -> TokenResponse:
        stmt = (
            select(User)
            .options(selectinload(User.profiles))
            .where(User.email == req.email.lower().strip())
        )
        res = await self.db.execute(stmt)
        user = res.scalar_one_or_none()

        if not user or not verify_password(req.password, user.hashed_password):
            raise UnauthorizedException("Invalid email or password.")

        if not user.is_active:
            raise UnauthorizedException("Account is disabled. Contact support.")

        access_token = create_access_token(subject=str(user.id), role=user.role)
        refresh_token = create_refresh_token(subject=str(user.id), device_id=req.device_id)

        # Record RefreshToken in DB
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        token_record = RefreshToken(
            user_id=user.id,
            token_hash=self._hash_token(refresh_token),
            device_id=req.device_id,
            expires_at=expires_at,
            revoked=False,
        )
        self.db.add(token_record)
        await self.db.commit()

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=UserResponse.model_validate(user),
        )

    async def refresh_tokens(self, refresh_token_str: str, device_id: str) -> TokenResponse:
        try:
            payload = decode_token(refresh_token_str, settings.JWT_REFRESH_SECRET)
            if payload.get("type") != "refresh":
                raise UnauthorizedException("Invalid token type.")
            user_id = uuid.UUID(payload.get("sub"))
        except Exception:
            raise UnauthorizedException("Refresh token is invalid or expired.")

        token_hash = self._hash_token(refresh_token_str)
        stmt = select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.user_id == user_id,
            RefreshToken.revoked.is_(False),
        )
        res = await self.db.execute(stmt)
        record = res.scalar_one_or_none()

        if not record or record.expires_at < datetime.now(timezone.utc):
            raise UnauthorizedException("Refresh token revoked or expired.")

        # Revoke old refresh token (Token Rotation)
        record.revoked = True

        # Fetch user
        user = await self.db.get(User, user_id)
        if not user or not user.is_active:
            raise UnauthorizedException("User account inactive.")

        # Issue new token pair
        new_access_token = create_access_token(subject=str(user.id), role=user.role)
        new_refresh_token = create_refresh_token(subject=str(user.id), device_id=device_id)

        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        new_record = RefreshToken(
            user_id=user.id,
            token_hash=self._hash_token(new_refresh_token),
            device_id=device_id,
            expires_at=expires_at,
            revoked=False,
        )
        self.db.add(new_record)
        await self.db.commit()

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            expires_in_seconds=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        )

    async def logout(self, user_id: uuid.UUID, refresh_token_str: str) -> None:
        token_hash = self._hash_token(refresh_token_str)
        stmt = (
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.token_hash == token_hash)
            .values(revoked=True)
        )
        await self.db.execute(stmt)
        await self.db.commit()

    async def get_me(self, user_id: uuid.UUID) -> User:
        stmt = (
            select(User)
            .options(selectinload(User.profiles))
            .where(User.id == user_id)
        )
        res = await self.db.execute(stmt)
        user = res.scalar_one_or_none()
        if not user:
            raise NotFoundException("User", user_id)
        return user

    async def create_profile(self, user_id: uuid.UUID, req: ProfileCreate) -> Profile:
        profile = Profile(
            user_id=user_id,
            name=req.name.strip(),
            avatar_color=req.avatar_color,
            is_kids=req.is_kids,
            pin=req.pin,
        )
        self.db.add(profile)
        await self.db.commit()
        await self.db.refresh(profile)
        return profile
