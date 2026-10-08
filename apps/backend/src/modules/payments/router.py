import hashlib
import hmac
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
import razorpay
from sqlalchemy.ext.asyncio import AsyncSession
from src.config import settings
from src.database import get_db_session
from src.dependencies import TokenUser, get_current_user
from src.modules.payments.schemas import (
    CreateOrderRequest,
    CreateOrderResponse,
    PlanResponse,
    StandardOrderCreateRequest,
    StandardOrderCreateResponse,
    StandardPaymentVerifyRequest,
    StandardPaymentVerifyResponse,
    UserSubscriptionResponse,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
)
from src.modules.payments.service import PaymentService

router = APIRouter(prefix="/subscription", tags=["Subscriptions & Payments"])
standard_payments_router = APIRouter(tags=["Razorpay Standard Checkout"])


# -------------------------------------------------------------
# Subscription & Plans Endpoints
# -------------------------------------------------------------
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


# -------------------------------------------------------------
# Razorpay Standard Web Checkout Endpoints
# -------------------------------------------------------------
@standard_payments_router.post(
    "/create-order",
    response_model=StandardOrderCreateResponse,
    status_code=status.HTTP_200_OK,
    summary="Create Razorpay Order for Standard Web Checkout",
)
@standard_payments_router.post(
    "/payments/create-order",
    response_model=StandardOrderCreateResponse,
    status_code=status.HTTP_200_OK,
    summary="Create Razorpay Order (Alias)",
)
async def create_standard_order(req: StandardOrderCreateRequest):
    """
    Step 1: Backend - Create Order
    Validates amount >= 100 paise, calls Razorpay API, and returns order details.
    """
    # 1. Minimum amount validation
    if req.amount < 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Minimum amount is 100 paise (₹1.00).",
        )

    # 2. Check Razorpay credentials
    key_id = settings.RAZORPAY_KEY_ID
    key_secret = settings.RAZORPAY_KEY_SECRET
    if not key_id or not key_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Razorpay API credentials not configured.",
        )

    # 3. Call Razorpay API: POST https://api.razorpay.com/v1/orders
    try:
        client = razorpay.Client(auth=(key_id, key_secret))
        order_payload = {
            "amount": req.amount,
            "currency": req.currency,
            "receipt": req.receipt or f"rcpt_{uuid.uuid4().hex[:12]}",
        }
        if req.notes:
            order_payload["notes"] = req.notes

        order = client.order.create(data=order_payload)
        return StandardOrderCreateResponse(
            order_id=order["id"],
            amount=order["amount"],
            currency=order["currency"],
            key_id=key_id,
        )
    except razorpay.errors.BadRequestError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except (razorpay.errors.ServerNotFoundError, razorpay.errors.GatewayError) as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Razorpay gateway communication error: {str(e)}",
        )
    except Exception as e:
        err_msg = str(e)
        if "Authentication failed" in err_msg or "Unauthorized" in err_msg or "401" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Razorpay authentication failed: Invalid Key ID or Key Secret.",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create Razorpay order: {err_msg}",
        )


@standard_payments_router.post(
    "/verify-payment",
    response_model=StandardPaymentVerifyResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify Razorpay Payment Signature for Standard Web Checkout",
)
@standard_payments_router.post(
    "/payments/verify-payment",
    response_model=StandardPaymentVerifyResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify Razorpay Payment Signature (Alias)",
)
async def verify_standard_payment(req: StandardPaymentVerifyRequest):
    """
    Step 3: Backend - Verify Signature
    Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    Compares generated signature with razorpay_signature.
    Returns success only if signatures match.
    """
    # 1. Missing fields check
    if not req.razorpay_order_id or not req.razorpay_payment_id or not req.razorpay_signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing required fields: razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.",
        )

    # 2. Key Secret configuration check
    key_secret = settings.RAZORPAY_KEY_SECRET
    if not key_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Razorpay secret key not configured on server.",
        )

    # 3. Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
    message = f"{req.razorpay_order_id}|{req.razorpay_payment_id}".encode("utf-8")
    expected_sig = hmac.new(
        key_secret.encode("utf-8"),
        message,
        hashlib.sha256,
    ).hexdigest()

    # 4. Compare generated signature with razorpay_signature
    if not hmac.compare_digest(expected_sig, req.razorpay_signature):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment verification failed: Signature mismatch. Do not mark as paid.",
        )

    return StandardPaymentVerifyResponse(
        status="success",
        message="Payment verified successfully.",
        order_id=req.razorpay_order_id,
        payment_id=req.razorpay_payment_id,
    )
