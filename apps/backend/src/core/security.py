import base64
import hashlib
import hmac
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import bcrypt
import jwt
from src.config import settings


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"), hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def create_access_token(
    subject: str,
    role: str = "USER",
    claims: Optional[Dict[str, Any]] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a short-lived stateless JWT access token (default 15 minutes)."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: Dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "type": "access",
    }
    if claims:
        payload.update(claims)

    return jwt.encode(
        payload, settings.JWT_ACCESS_SECRET, algorithm=settings.JWT_ALGORITHM
    )


def create_refresh_token(
    subject: str,
    device_id: str = "default",
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a long-lived JWT refresh token (default 7 days)."""
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    payload = {
        "sub": str(subject),
        "device_id": device_id,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
        "type": "refresh",
    }
    return jwt.encode(
        payload, settings.JWT_REFRESH_SECRET, algorithm=settings.JWT_ALGORITHM
    )


def decode_token(token: str, secret: str) -> Dict[str, Any]:
    """Decode and validate a JWT token."""
    return jwt.decode(token, secret, algorithms=[settings.JWT_ALGORITHM])


def generate_playback_token(
    content_id: str,
    user_id: str,
    client_ip: Optional[str] = None,
    expire_minutes: Optional[int] = None,
) -> str:
    """
    Generate an HMAC-SHA256 signed playback token for Cloudflare Edge CDN.
    Validates content entitlement and prevents hotlinking and URL sharing.
    """
    if expire_minutes is None:
        expire_minutes = settings.PLAYBACK_TOKEN_EXPIRE_MINUTES

    expires_at = int(time.time()) + (expire_minutes * 60)
    # Message format: content_id:user_id:expires_at:client_ip
    message = f"{content_id}:{user_id}:{expires_at}:{client_ip or '*'}"
    signature = hmac.new(
        settings.PLAYBACK_TOKEN_SECRET.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    # Base64url encode the composite token: payload.signature
    raw_token = f"{content_id}~{user_id}~{expires_at}~{signature}"
    return base64.urlsafe_b64encode(raw_token.encode("utf-8")).decode("utf-8")


def verify_playback_token(
    token_str: str, content_id: str, client_ip: Optional[str] = None
) -> bool:
    """Verify playback token expiration and HMAC signature."""
    try:
        decoded = base64.urlsafe_b64decode(token_str.encode("utf-8")).decode("utf-8")
        token_content_id, user_id, expires_at_str, signature = decoded.split("~")

        if token_content_id != content_id:
            return False

        expires_at = int(expires_at_str)
        if time.time() > expires_at:
            return False

        message = f"{token_content_id}:{user_id}:{expires_at}:{client_ip or '*'}"
        expected_sig = hmac.new(
            settings.PLAYBACK_TOKEN_SECRET.encode("utf-8"),
            message.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(expected_sig, signature)
    except Exception:
        return False
