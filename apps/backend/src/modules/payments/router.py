import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Header, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.database import get_db_session
from src.dependencies import TokenUser, get_current_user
from src.modules.payments.schemas import (
    CreateOrderRequest,
    CreateOrderResponse,
    PlanResponse,
    UserSubscriptionResponse,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
)
from src.modules.payments.service import PaymentService

router = APIRouter(prefix="/subscription", tags=["Subscriptions & Payments"])


@router.get("/plans", response_model=List[PlanResponse])
async def get_subscription_plans(db: AsyncSession = Depends(get_db_session)):
    service = PaymentService(db)
    return await service.get_plans()


@router.get("/current", response_model=Optional[UserSubscriptionResponse])
async def get_current_subscription(
    current_user: TokenUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    service = PaymentService(db)
    return await service.get_current_subscription(uuid.UUID(current_user.id))


@router.post("/razorpay/order", response_model=CreateOrderResponse)
async def create_razorpay_order(
    req: CreateOrderRequest,
    current_user: TokenUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    service = PaymentService(db)
    return await service.create_order(uuid.UUID(current_user.id), req)


@router.post("/razorpay/verify", response_model=VerifyPaymentResponse)
async def verify_razorpay_payment(
    req: VerifyPaymentRequest,
    current_user: TokenUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    service = PaymentService(db)
    return await service.verify_payment(uuid.UUID(current_user.id), req)


@router.post("/webhook")
async def razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(..., description="Razorpay Webhook Signature"),
    db: AsyncSession = Depends(get_db_session),
):
    body = await request.body()
    service = PaymentService(db)
    return await service.handle_webhook(body, x_razorpay_signature)
