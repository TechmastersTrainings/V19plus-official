import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.database import Base, TimestampMixin


class SubscriptionPlan(Base, TimestampMixin):
    __tablename__ = "subscription_plans"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    description: Mapped[str] = mapped_column(String(500), default="", nullable=False)
    
    price_inr_paise: Mapped[int] = mapped_column(Integer, nullable=False) # e.g. 19900 = ₹199.00
    billing_interval: Mapped[str] = mapped_column(String(20), default="monthly", nullable=False) # monthly | yearly
    
    max_resolution: Mapped[str] = mapped_column(String(20), default="1080p", nullable=False) # 480p | 720p | 1080p | 4K
    max_concurrent_streams: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    entitlements: Mapped[List["Entitlement"]] = relationship(
        "Entitlement", back_populates="plan", cascade="all, delete-orphan"
    )
    subscriptions: Mapped[List["UserSubscription"]] = relationship(
        "UserSubscription", back_populates="plan"
    )


class Entitlement(Base, TimestampMixin):
    """Normalized granular permissions granted by a subscription plan"""
    __tablename__ = "entitlements"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subscription_plans.id", ondelete="CASCADE"), nullable=False, index=True
    )
    feature_key: Mapped[str] = mapped_column(String(100), nullable=False, index=True) # e.g. 'playback:hd', 'playback:4k', 'downloads:enabled'

    plan: Mapped[SubscriptionPlan] = relationship("SubscriptionPlan", back_populates="entitlements")


class UserSubscription(Base, TimestampMixin):
    __tablename__ = "user_subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subscription_plans.id"), nullable=False, index=True
    )
    
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False, index=True) # ACTIVE | CANCELLED | EXPIRED | PAST_DUE
    current_period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    current_period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    
    razorpay_subscription_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    plan: Mapped[SubscriptionPlan] = relationship("SubscriptionPlan", back_populates="subscriptions")
