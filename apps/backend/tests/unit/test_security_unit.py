import time
import base64
import uuid
import pytest
from src.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    generate_playback_token,
    verify_playback_token,
)
from src.config import settings

def test_password_hashing_and_verification():
    raw_pwd = "SuperSecretPassword2026!"
    hashed = hash_password(raw_pwd)
    assert hashed != raw_pwd
    assert verify_password(raw_pwd, hashed) is True
    assert verify_password("WrongPassword123", hashed) is False

def test_access_token_creation_and_payload():
    user_id = str(uuid.uuid4())
    token = create_access_token(subject=user_id, role="USER")
    payload = decode_token(token, settings.JWT_ACCESS_SECRET)
    assert payload["sub"] == user_id
    assert payload["role"] == "USER"
    assert payload["type"] == "access"
    assert payload["exp"] > time.time()

def test_refresh_token_creation_and_payload():
    user_id = str(uuid.uuid4())
    device_id = "device_macbook_pro"
    token = create_refresh_token(subject=user_id, device_id=device_id)
    payload = decode_token(token, settings.JWT_REFRESH_SECRET)
    assert payload["sub"] == user_id
    assert payload["device_id"] == device_id
    assert payload["type"] == "refresh"
    assert payload["exp"] > time.time()

def test_playback_token_generation_and_valid_verification():
    content_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    token = generate_playback_token(content_id=content_id, user_id=user_id)
    assert token is not None
    assert len(token) > 20
    # Valid verification
    is_valid = verify_playback_token(token, content_id=content_id)
    assert is_valid is True

def test_playback_token_rejects_mismatched_content_id():
    content_id = str(uuid.uuid4())
    other_content_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    token = generate_playback_token(content_id=content_id, user_id=user_id)
    assert verify_playback_token(token, content_id=other_content_id) is False

def test_playback_token_rejects_expired_token():
    content_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    # Generate expired token (-1 minute)
    token = generate_playback_token(content_id=content_id, user_id=user_id, expire_minutes=-1)
    assert verify_playback_token(token, content_id=content_id) is False

def test_playback_token_rejects_tampered_signature():
    content_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    token = generate_playback_token(content_id=content_id, user_id=user_id)
    raw = base64.urlsafe_b64decode(token.encode("utf-8")).decode("utf-8")
    parts = raw.split("~")
    # Tamper the expiration or signature
    parts[2] = str(int(parts[2]) + 999999) # extend expiration fraudulently
    tampered_raw = "~".join(parts)
    tampered_token = base64.urlsafe_b64encode(tampered_raw.encode("utf-8")).decode("utf-8")
    assert verify_playback_token(tampered_token, content_id=content_id) is False

def test_playback_token_rejects_malformed_garbage():
    assert verify_playback_token("not-a-valid-token-string", content_id="some_id") is False
    assert verify_playback_token("", content_id="some_id") is False
    assert verify_playback_token(base64.urlsafe_b64encode(b"a~b~c").decode("utf-8"), content_id="some_id") is False

def test_playback_token_ip_binding():
    content_id = str(uuid.uuid4())
    user_id = str(uuid.uuid4())
    client_ip = "203.0.113.195"
    token = generate_playback_token(content_id=content_id, user_id=user_id, client_ip=client_ip)
    # Verification with matching IP must succeed
    assert verify_playback_token(token, content_id=content_id, client_ip=client_ip) is True
    # Verification with spoofed/different IP must fail
    assert verify_playback_token(token, content_id=content_id, client_ip="198.51.100.4") is False
