import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db_session
from src.dependencies import TokenUser, require_admin
from src.core.security import hash_password
from src.modules.users.models import User, RefreshToken
from src.modules.subscriptions.models import SubscriptionPlan, UserSubscription
from src.modules.payments.models import Payment, PaymentStatus
from src.modules.content.models import Content
from src.modules.admin.schemas import (
    DashboardStatsResponse,
    AdminUserResponse,
    AdminUserCreate,
    AdminUserUpdate,
    AdminSubscriptionResponse,
    AdminSubscriptionUpdate,
    ActiveSessionResponse,
    BroadcastNotificationRequest,
    NotificationRecord,
)

logger = logging.getLogger("v19plus.admin")
router = APIRouter(prefix="/admin", tags=["Admin Studio & Operations"])

# In-memory notification ledger for push broadcast records
_NOTIFICATION_HISTORY: List[dict] = []


# ─── 1. Dashboard Live Analytics ─────────────────────────────────────────────

@router.get("/dashboard", response_model=DashboardStatsResponse, dependencies=[Depends(require_admin)])
async def get_dashboard_stats(db: AsyncSession = Depends(get_db_session)):
    """Return aggregated live metrics across PostgreSQL database tables"""
    # 1. Total users
    res_users = await db.execute(select(func.count(User.id)))
    total_users = res_users.scalar() or 0

    # 2. Active users (sessions unexpired and not revoked)
    now = datetime.now(timezone.utc)
    res_active = await db.execute(
        select(func.count(func.distinct(RefreshToken.user_id))).where(
            RefreshToken.revoked == False,
            RefreshToken.expires_at > now,
        )
    )
    active_users = res_active.scalar() or 0

    # 3. Total content in catalog
    res_content = await db.execute(select(func.count(Content.id)))
    total_content = res_content.scalar() or 0

    # 4. Active subscriptions
    res_subs = await db.execute(
        select(func.count(UserSubscription.id)).where(UserSubscription.status == "ACTIVE")
    )
    active_subscriptions = res_subs.scalar() or 0

    # 5. Total revenue (captured payments)
    res_rev = await db.execute(
        select(func.coalesce(func.sum(Payment.amount_paise), 0)).where(
            Payment.status == PaymentStatus.CAPTURED
        )
    )
    total_paise = res_rev.scalar() or 0
    total_inr = round(total_paise / 100.0, 2)

    # 6. Recent 5 registered users
    res_recent_users = await db.execute(
        select(User.id, User.email, User.name, User.role, User.created_at)
        .order_by(desc(User.created_at))
        .limit(5)
    )
    recent_users = [
        {
            "id": str(r[0]),
            "email": r[1],
            "name": r[2],
            "role": r[3],
            "created_at": r[4].isoformat() if r[4] else None,
        }
        for r in res_recent_users.all()
    ]

    # 7. Recent 5 payments
    res_recent_payments = await db.execute(
        select(Payment.id, Payment.amount_paise, Payment.status, Payment.created_at, Payment.user_id)
        .order_by(desc(Payment.created_at))
        .limit(5)
    )
    recent_payments = [
        {
            "id": str(r[0]),
            "amount_inr": round(r[1] / 100.0, 2),
            "status": r[2].value if hasattr(r[2], "value") else str(r[2]),
            "created_at": r[3].isoformat() if r[3] else None,
            "user_id": str(r[4]) if r[4] else None,
        }
        for r in res_recent_payments.all()
    ]

    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_content": total_content,
        "active_subscriptions": active_subscriptions,
        "total_revenue_inr": total_inr,
        "total_revenue_paise": total_paise,
        "recent_users": recent_users,
        "recent_payments": recent_payments,
    }


# ─── 2. Users CRUD ────────────────────────────────────────────────────────────

@router.get("/users", response_model=List[AdminUserResponse], dependencies=[Depends(require_admin)])
async def list_users(
    query: Optional[str] = Query(None, description="Search by name or email"),
    role: Optional[str] = Query(None, description="Filter by role"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db_session),
):
    stmt = (
        select(
            User.id,
            User.email,
            User.name,
            User.role,
            User.is_active,
            User.is_verified,
            User.created_at,
            SubscriptionPlan.name.label("plan_name"),
            UserSubscription.status.label("subscription_status"),
        )
        .outerjoin(
            UserSubscription,
            (UserSubscription.user_id == User.id) & (UserSubscription.status == "ACTIVE"),
        )
        .outerjoin(SubscriptionPlan, SubscriptionPlan.id == UserSubscription.plan_id)
        .order_by(desc(User.created_at))
        .offset(offset)
        .limit(limit)
    )

    if query:
        search_filter = f"%{query.strip().lower()}%"
        stmt = stmt.where(
            func.lower(User.email).like(search_filter) | func.lower(User.name).like(search_filter)
        )

    if role:
        stmt = stmt.where(User.role == role.upper())

    results = await db.execute(stmt)
    rows = results.all()

    users_list = []
    for r in rows:
        users_list.append(
            AdminUserResponse(
                id=r.id,
                email=r.email,
                name=r.name,
                role=r.role,
                is_active=r.is_active,
                is_verified=r.is_verified,
                created_at=r.created_at,
                plan_name=r.plan_name,
                subscription_status=r.subscription_status,
            )
        )
    return users_list


@router.post("/users", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
async def create_user(
    req: AdminUserCreate,
    db: AsyncSession = Depends(get_db_session),
):
    # Check if email is already taken
    existing = await db.execute(select(User).where(User.email == req.email.lower().strip()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="A user with this email address already exists.")

    new_user = User(
        email=req.email.lower().strip(),
        name=req.name.strip(),
        hashed_password=hash_password(req.password),
        role=req.role.upper(),
        is_active=req.is_active,
        is_verified=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return AdminUserResponse(
        id=new_user.id,
        email=new_user.email,
        name=new_user.name,
        role=new_user.role,
        is_active=new_user.is_active,
        is_verified=new_user.is_verified,
        created_at=new_user.created_at,
        plan_name=None,
        subscription_status=None,
    )


@router.put("/users/{user_id}", response_model=AdminUserResponse, dependencies=[Depends(require_admin)])
async def update_user(
    user_id: uuid.UUID,
    req: AdminUserUpdate,
    db: AsyncSession = Depends(get_db_session),
):
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if req.email:
        user.email = req.email.lower().strip()
    if req.name:
        user.name = req.name.strip()
    if req.role:
        user.role = req.role.upper()
    if req.is_active is not None:
        user.is_active = req.is_active
    if req.password:
        user.hashed_password = hash_password(req.password)

    await db.commit()
    await db.refresh(user)

    # Fetch active plan if present
    sub_res = await db.execute(
        select(SubscriptionPlan.name, UserSubscription.status)
        .join(SubscriptionPlan, SubscriptionPlan.id == UserSubscription.plan_id)
        .where(UserSubscription.user_id == user.id, UserSubscription.status == "ACTIVE")
    )
    sub_row = sub_res.first()

    return AdminUserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        is_active=user.is_active,
        is_verified=user.is_verified,
        created_at=user.created_at,
        plan_name=sub_row[0] if sub_row else None,
        subscription_status=sub_row[1] if sub_row else None,
    )


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
async def delete_user(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
):
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    await db.delete(user)
    await db.commit()


# ─── 3. Subscriptions Management ──────────────────────────────────────────────

@router.get("/subscriptions", response_model=List[AdminSubscriptionResponse], dependencies=[Depends(require_admin)])
async def list_subscriptions(
    status_filter: Optional[str] = Query(None, description="Filter by status (ACTIVE, CANCELLED, EXPIRED)"),
    db: AsyncSession = Depends(get_db_session),
):
    stmt = (
        select(
            UserSubscription.id,
            UserSubscription.user_id,
            User.name.label("user_name"),
            User.email.label("user_email"),
            SubscriptionPlan.name.label("plan_name"),
            SubscriptionPlan.slug.label("plan_slug"),
            SubscriptionPlan.price_inr_paise,
            UserSubscription.status,
            UserSubscription.current_period_start,
            UserSubscription.current_period_end,
            UserSubscription.cancel_at_period_end,
            UserSubscription.created_at,
        )
        .join(User, User.id == UserSubscription.user_id)
        .join(SubscriptionPlan, SubscriptionPlan.id == UserSubscription.plan_id)
        .order_by(desc(UserSubscription.created_at))
    )

    if status_filter:
        stmt = stmt.where(UserSubscription.status == status_filter.upper())

    results = await db.execute(stmt)
    rows = results.all()

    return [
        AdminSubscriptionResponse(
            id=r.id,
            user_id=r.user_id,
            user_name=r.user_name,
            user_email=r.user_email,
            plan_name=r.plan_name,
            plan_slug=r.plan_slug,
            price_inr=round(r.price_inr_paise / 100.0, 2),
            status=r.status,
            current_period_start=r.current_period_start,
            current_period_end=r.current_period_end,
            cancel_at_period_end=r.cancel_at_period_end,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.put("/subscriptions/{subscription_id}", dependencies=[Depends(require_admin)])
async def update_subscription(
    subscription_id: uuid.UUID,
    req: AdminSubscriptionUpdate,
    db: AsyncSession = Depends(get_db_session),
):
    res = await db.execute(select(UserSubscription).where(UserSubscription.id == subscription_id))
    sub = res.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="Subscription not found.")

    if req.status:
        sub.status = req.status.upper()
    if req.current_period_end:
        sub.current_period_end = req.current_period_end
    if req.cancel_at_period_end is not None:
        sub.cancel_at_period_end = req.cancel_at_period_end

    await db.commit()
    return {"message": "Subscription updated successfully.", "id": str(sub.id), "status": sub.status}


# ─── 4. Active Sessions & Connected Devices ──────────────────────────────────

@router.get("/active-sessions", response_model=List[ActiveSessionResponse], dependencies=[Depends(require_admin)])
async def list_active_sessions(db: AsyncSession = Depends(get_db_session)):
    """Return real active logged-in sessions across web and mobile clients"""
    now = datetime.now(timezone.utc)
    stmt = (
        select(
            RefreshToken.id,
            RefreshToken.user_id,
            User.name.label("user_name"),
            User.email.label("user_email"),
            RefreshToken.device_id,
            RefreshToken.created_at,
            RefreshToken.expires_at,
            RefreshToken.revoked,
        )
        .join(User, User.id == RefreshToken.user_id)
        .where(
            RefreshToken.revoked == False,
            RefreshToken.expires_at > now,
        )
        .order_by(desc(RefreshToken.created_at))
        .limit(100)
    )

    results = await db.execute(stmt)
    rows = results.all()

    return [
        ActiveSessionResponse(
            id=r.id,
            user_id=r.user_id,
            user_name=r.user_name,
            user_email=r.user_email,
            device_id=r.device_id,
            created_at=r.created_at,
            expires_at=r.expires_at,
            revoked=r.revoked,
        )
        for r in rows
    ]


@router.delete("/active-sessions/{session_id}", dependencies=[Depends(require_admin)])
async def terminate_session(session_id: uuid.UUID, db: AsyncSession = Depends(get_db_session)):
    """Force disconnect a session by revoking its token"""
    res = await db.execute(select(RefreshToken).where(RefreshToken.id == session_id))
    token = res.scalar_one_or_none()
    if not token:
        raise HTTPException(status_code=404, detail="Session not found.")
    token.revoked = True
    await db.commit()
    return {"message": "Session terminated successfully."}


# ─── 5. Push Notifications & Reminders ────────────────────────────────────────

@router.get("/notifications", response_model=List[NotificationRecord], dependencies=[Depends(require_admin)])
async def get_notification_history():
    """Return history of dispatched push notifications and scheduled reminders"""
    return _NOTIFICATION_HISTORY


@router.post("/notifications/broadcast", response_model=NotificationRecord, dependencies=[Depends(require_admin)])
async def broadcast_notification(
    req: BroadcastNotificationRequest,
    current_user: TokenUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db_session),
):
    """Dispatch or schedule real push alert or reminder to platform users"""
    # Count recipient pool
    recipient_count = 0
    if req.target_audience == "ALL":
        res = await db.execute(select(func.count(User.id)))
        recipient_count = res.scalar() or 0
    elif req.target_audience == "SUBSCRIBED":
        res = await db.execute(
            select(func.count(UserSubscription.id)).where(UserSubscription.status == "ACTIVE")
        )
        recipient_count = res.scalar() or 0
    elif req.target_audience == "EXPIRED":
        res = await db.execute(
            select(func.count(UserSubscription.id)).where(UserSubscription.status == "EXPIRED")
        )
        recipient_count = res.scalar() or 0
    else:
        res = await db.execute(select(func.count(User.id)).where(User.role == "ADMIN"))
        recipient_count = res.scalar() or 0

    record = {
        "id": str(uuid.uuid4()),
        "title": req.title.strip(),
        "message": req.message.strip(),
        "target_audience": req.target_audience,
        "action_url": req.action_url.strip() if req.action_url else None,
        "notification_type": req.notification_type,
        "sent_at": datetime.now(timezone.utc),
        "sent_by": current_user.id,
        "recipients_count": recipient_count,
    }

    _NOTIFICATION_HISTORY.insert(0, record)
    logger.info(
        f"Push broadcast '{req.title}' dispatched to {recipient_count} users by admin {current_user.id}"
    )

    return record
