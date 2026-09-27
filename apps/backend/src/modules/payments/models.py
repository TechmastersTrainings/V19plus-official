import enum
import uuid
from typing import Optional
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from src.database import Base, TimestampMixin


class PaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    AUTHORIZED = "AUTHORIZED"
    CAPTURED = "CAPTURED"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class Payment(Base, TimestampMixin):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    subscription_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("user_subscriptions.id", ondelete="SET NULL"), nullable=True
    )

    razorpay_order_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    razorpay_payment_id: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True, nullable=True)
    razorpay_signature: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    amount_paise: Mapped[int] = mapped_column(Integer, nullable=False) # In Paise (e.g. ₹199.00 = 19900)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status_enum"), default=PaymentStatus.PENDING, nullable=False, index=True
    )
    
    error_code: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    error_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)


class PaymentWebhook(Base, TimestampMixin):
    """Immutable ledger of received payment gateway webhooks for strict idempotency"""
    __tablename__ = "payment_webhooks"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    is_processed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
