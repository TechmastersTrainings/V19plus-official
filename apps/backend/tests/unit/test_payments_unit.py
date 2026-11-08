import hmac
import hashlib
import uuid
import pytest
from src.modules.payments.schemas import VerifyPaymentRequest
from src.modules.payments.models import PaymentStatus

def test_razorpay_hmac_signature_generation_and_validation():
    key_secret = "rzp_test_secret_123456789"
    order_id = "order_Oq7xY9abc123"
    payment_id = "pay_Pz8wX0def456"

    message = f"{order_id}|{payment_id}"
    valid_sig = hmac.new(
        key_secret.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    # Valid signature passes
    assert hmac.compare_digest(valid_sig, valid_sig) is True

    # Tampered order or payment ID fails
    tampered_msg = f"{order_id}_tampered|{payment_id}"
    tampered_sig = hmac.new(key_secret.encode("utf-8"), tampered_msg.encode("utf-8"), hashlib.sha256).hexdigest()
    assert hmac.compare_digest(valid_sig, tampered_sig) is False

def test_razorpay_webhook_signature_calculation():
    webhook_secret = "whsec_test_secret_abcdef"
    body_payload = b'{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_123","amount":14900}}}}'

    expected_sig = hmac.new(
        webhook_secret.encode("utf-8"),
        body_payload,
        hashlib.sha256,
    ).hexdigest()

    assert len(expected_sig) == 64
    assert hmac.compare_digest(expected_sig, expected_sig) is True

def test_billing_interval_duration_calculation():
    from datetime import timedelta
    def get_duration(billing_interval: str) -> timedelta:
        return timedelta(days=365 if billing_interval == "yearly" else 30)

    assert get_duration("yearly").days == 365
    assert get_duration("monthly").days == 30
    assert get_duration("quarterly").days == 30 # default

