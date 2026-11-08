import pytest
from pydantic import ValidationError
from src.modules.auth.schemas import RegisterRequest, LoginRequest, ProfileCreate

def test_register_schema_validation():
    # Valid registration
    reg = RegisterRequest(
        email="viewer@example.com",
        password="SecurePassword123!",
        name="Test Viewer",
    )
    assert reg.email == "viewer@example.com"
    assert reg.name == "Test Viewer"

    # Invalid email format should be rejected
    with pytest.raises(ValidationError):
        RegisterRequest(
            email="invalid-email-address",
            password="SecurePassword123!",
            name="Test",
        )

def test_login_schema_validation():
    login = LoginRequest(
        email="viewer@example.com",
        password="SecurePassword123!",
        device_id="android_tv_10",
    )
    assert login.device_id == "android_tv_10"

def test_profile_create_schema_validation():
    prof = ProfileCreate(
        name="Kids Profile",
        avatar_color="#FF5C00",
        is_kids=True,
    )
    assert prof.is_kids is True
    assert prof.avatar_color == "#FF5C00"

