import hashlib
import hmac
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional
import razorpay
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.config import settings
from src.core.exceptions import NotFoundException, UnauthorizedException, V19plusException
from src.modules.payments.models import Payment, PaymentStatus, PaymentWebhook
from src.modules.payments.schemas import (
    CreateOrderRequest,
    CreateOrderResponse,
    VerifyPaymentRequest,
    VerifyPaymentResponse,
)
from src.modules.subscriptions.models import SubscriptionPlan, UserSubscription


class PaymentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.key_id = settings.RAZORPAY_KEY_ID
        self.key_secret = settings.RAZORPAY_KEY_SECRET

    def _get_razorpay_client(self):
        if not self.key_id or not self.key_secret:
            raise V19plusException("Razorpay gateway keys not configured on server.", status_code=500)
        return razorpay.Client(auth=(self.key_id, self.key_secret))

    async def get_plans(self) -> List[SubscriptionPlan]:
        stmt = (
            select(SubscriptionPlan)
            .where(SubscriptionPlan.is_active.is_(True))
            .order_by(SubscriptionPlan.price_inr_paise)
        )
        res = await self.db.execute(stmt)
        return list(res.scalars().all())

    async def get_current_subscription(self, user_id: uuid.UUID) -> Optional[UserSubscription]:
        now = datetime.now(timezone.utc)
        stmt = (
            select(UserSubscription)
            .options(selectinload(UserSubscription.plan))
            .where(
                UserSubscription.user_id == user_id,
                UserSubscription.status == "ACTIVE",
                UserSubscription.current_period_end > now,
            )
            .order_by(UserSubscription.current_period_end.desc())
            .limit(1)
        )
        res = await self.db.execute(stmt)
        return res.scalar_one_or_none()

    async def create_order(self, user_id: uuid.UUID, req: CreateOrderRequest) -> CreateOrderResponse:
        plan = await self.db.get(SubscriptionPlan, req.plan_id)
        if not plan or not plan.is_active:
            raise NotFoundException("SubscriptionPlan", req.plan_id)

        rzp = self._get_razorpay_client()
        order_data = {
            "amount": plan.price_inr_paise,
            "currency": "INR",
            "receipt": f"rcpt_{uuid.uuid4().hex[:12]}",
            "notes": {
                "user_id": str(user_id),
                "plan_id": str(plan.id),
                "plan_name": plan.name,
            },
        }

        try:
            rzp_order = rzp.order.create(data=order_data)
        except Exception as e:
            raise V19plusException(f"Failed to initiate order with Razorpay: {str(e)}", status_code=502)

        order_id = rzp_order["id"]

        # Insert pending payment ledger entry
        payment = Payment(
            user_id=user_id,
            razorpay_order_id=order_id,
            amount_paise=plan.price_inr_paise,
            currency="INR",
            status=PaymentStatus.PENDING,
        )
        self.db.add(payment)
        await self.db.commit()

        return CreateOrderResponse(
            order_id=order_id,
            amount=plan.price_inr_paise,
            currency="INR",
            key_id=self.key_id,
            plan_name=plan.name,
        )

    async def verify_payment(self, user_id: uuid.UUID, req: VerifyPaymentRequest) -> VerifyPaymentResponse:
        """
        Cryptographically verify the Razorpay signature server-side.
        RULE 16: Client applications cannot declare payment success.
        RULE 17: Payment status must be verified server-side.
        """
        message = f"{req.razorpay_order_id}|{req.razorpay_payment_id}"
        expected_sig = hmac.new(
            self.key_secret.encode("utf-8"),
            message.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected_sig, req.razorpay_signature):
            raise UnauthorizedException("Payment verification failed: cryptographic signature mismatch.")

        # Look up payment record
        stmt = select(Payment).where(Payment.razorpay_order_id == req.razorpay_order_id)
        res = await self.db.execute(stmt)
        payment = res.scalar_one_or_none()

        if not payment:
            raise NotFoundException("Payment order", req.razorpay_order_id)

        plan = await self.db.get(SubscriptionPlan, req.plan_id)
        if not plan:
            raise NotFoundException("SubscriptionPlan", req.plan_id)

        now = datetime.now(timezone.utc)
        duration_days = 365 if plan.billing_interval == "yearly" else 30
        period_end = now + timedelta(days=duration_days)

        # Create or update subscription in atomic transaction
        subscription = UserSubscription(
            user_id=user_id,
            plan_id=plan.id,
            status="ACTIVE",
            current_period_start=now,
            current_period_end=period_end,
            cancel_at_period_end=False,
        )
        self.db.add(subscription)
        await self.db.flush()

        # Update payment record
        payment.status = PaymentStatus.CAPTURED
        payment.razorpay_payment_id = req.razorpay_payment_id
        payment.razorpay_signature = req.razorpay_signature
        payment.subscription_id = subscription.id

        await self.db.commit()

        return VerifyPaymentResponse(
            message="Payment successfully verified and subscription activated.",
            subscription_id=subscription.id,
            status="ACTIVE",
        )

    async def handle_webhook(self, body_bytes: bytes, signature_header: str) -> dict:
        """Process incoming Razorpay webhooks with signature check and idempotency"""
        webhook_secret = settings.RAZORPAY_WEBHOOK_SECRET
        if not webhook_secret:
            raise V19plusException("Webhook secret not configured.", status_code=500)

        expected_sig = hmac.new(
            webhook_secret.encode("utf-8"),
            body_bytes,
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected_sig, signature_header):
            raise UnauthorizedException("Invalid webhook signature.")

        import json
        data = json.loads(body_bytes.decode("utf-8"))
        event_id = data.get("event_id") or data.get("id") or str(uuid.uuid4())
        event_type = data.get("event", "unknown")

        # Idempotency check
        existing = await self.db.execute(
            select(PaymentWebhook).where(PaymentWebhook.event_id == event_id)
        )
        if existing.scalar_one_or_none():
            return {"status": "already_processed"}

        webhook_log = PaymentWebhook(
            event_id=event_id,
            event_type=event_type,
            payload=data,
            is_processed=True,
        )
        self.db.add(webhook_log)
        await self.db.commit()
        return {"status": "acknowledged"}
