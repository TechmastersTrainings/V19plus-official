import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field


class DashboardStatsResponse(BaseModel):
    total_users: int
    active_users: int
    total_content: int
    active_subscriptions: int
    total_revenue_inr: float
    total_revenue_paise: int
    recent_users: List[dict]
    recent_payments: List[dict]


class AdminUserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    role: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    plan_name: Optional[str] = None
    subscription_status: Optional[str] = None

    class Config:
        from_attributes = True


class AdminUserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str = Field(min_length=6)
    role: str = "USER"
    is_active: bool = True


class AdminUserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None


class AdminSubscriptionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    user_name: str
    user_email: str
    plan_name: str
    plan_slug: str
    price_inr: float
    status: str
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AdminSubscriptionUpdate(BaseModel):
    status: Optional[str] = None
    current_period_end: Optional[datetime] = None
    cancel_at_period_end: Optional[bool] = None


class ActiveSessionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    user_name: str
    user_email: str
    device_id: str
    created_at: datetime
    expires_at: datetime
    revoked: bool

    class Config:
        from_attributes = True


class BroadcastNotificationRequest(BaseModel):
    title: str
    message: str
    target_audience: str = "ALL"  # ALL, SUBSCRIBED, EXPIRED, ADMINS
    action_url: Optional[str] = None
    notification_type: str = "PUSH"  # PUSH, REMINDER, SYSTEM


class NotificationRecord(BaseModel):
    id: str
    title: str
    message: str
    target_audience: str
    action_url: Optional[str] = None
    notification_type: str
    sent_at: datetime
    sent_by: str
    recipients_count: int
