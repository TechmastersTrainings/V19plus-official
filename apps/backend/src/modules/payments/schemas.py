import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from src.modules.payments.models import PaymentStatus


class PlanResponse(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    description: str
    price_inr_paise: int
    billing_interval: str
    max_resolution: str
    max_concurrent_streams: int

    class Config:
        from_attributes = True


class UserSubscriptionResponse(BaseModel):
    id: uuid.UUID
    plan: PlanResponse
    status: str
    current_period_start: datetime
    current_period_end: datetime
    cancel_at_period_end: bool

    class Config:
        from_attributes = True


class CreateOrderRequest(BaseModel):
    plan_id: uuid.UUID


class CreateOrderResponse(BaseModel):
    order_id: str
    amount: int
    currency: str
    key_id: str
    plan_name: str


class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    plan_id: uuid.UUID


class VerifyPaymentResponse(BaseModel):
    message: str
    subscription_id: uuid.UUID
    status: str
