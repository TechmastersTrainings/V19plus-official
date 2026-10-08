import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.database import get_db_session
from src.dependencies import TokenUser, require_admin
from src.modules.events.models import EventBooking, EventTicket
from src.modules.events.schemas import (
    AdminCancelBookingRequest,
    AdminEventStatsResponse,
    AdminUpdateEventCapacityRequest,
    AdminUpdateTicketTypeCapacityRequest,
    BookingDetailResponse,
    CheckInRequest,
    CheckInResponse,
    EventDetailResponse,
    TicketSummaryResponse,
    TicketTypeResponse,
)
from src.modules.events.service import EventService

admin_router = APIRouter(prefix="/admin/events", tags=["Admin Event Management & Check-in"])


@admin_router.post("/check-in", response_model=CheckInResponse)
async def check_in_attendee(
    req: CheckInRequest,
    db: AsyncSession = Depends(get_db_session),
    admin_user: TokenUser = Depends(require_admin),
):
    """
    Validate QR scan and record attendee check-in.
    Guarantees atomic protection against duplicate scans.
    """
    service = EventService(db)
    admin_uuid = uuid.UUID(admin_user.id) if admin_user and admin_user.id else None
    return await service.check_in_ticket(
        qr_token=req.qr_token,
        admin_user_id=admin_uuid,
        device_info=req.device_info,
    )


@admin_router.get("/{event_id}/stats", response_model=AdminEventStatsResponse)
async def get_event_statistics(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    admin_user: TokenUser = Depends(require_admin),
):
    """Real-time event capacity, tickets sold, tickets remaining, check-in count & revenue breakdown"""
    service = EventService(db)
    return await service.admin_get_event_stats(event_id)


@admin_router.patch("/{event_id}/capacity", response_model=EventDetailResponse)
async def update_event_capacity(
    event_id: uuid.UUID,
    req: AdminUpdateEventCapacityRequest,
    db: AsyncSession = Depends(get_db_session),
    admin_user: TokenUser = Depends(require_admin),
):
    """Dynamically adjust total event venue capacity"""
    service = EventService(db)
    return await service.admin_update_event_capacity(event_id, req)


@admin_router.patch("/ticket-types/{ticket_type_id}/capacity", response_model=TicketTypeResponse)
async def update_ticket_type_capacity(
    ticket_type_id: uuid.UUID,
    req: AdminUpdateTicketTypeCapacityRequest,
    db: AsyncSession = Depends(get_db_session),
    admin_user: TokenUser = Depends(require_admin),
):
    """Configure ticket tier capacity, price, and per-booking limits"""
    service = EventService(db)
    return await service.admin_update_ticket_type_capacity(ticket_type_id, req)


@admin_router.get("/{event_id}/bookings", response_model=List[BookingDetailResponse])
async def list_event_bookings(
    event_id: uuid.UUID,
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db_session),
    admin_user: TokenUser = Depends(require_admin),
):
    """List all bookings for an event with search & status filters"""
    stmt = (
        select(EventBooking)
        .options(
            selectinload(EventBooking.event),
            selectinload(EventBooking.ticket_type),
            selectinload(EventBooking.tickets),
        )
        .where(EventBooking.event_id == event_id)
        .order_by(EventBooking.created_at.desc())
    )
    if status:
        stmt = stmt.where(EventBooking.status == status)

    res = await db.execute(stmt)
    bookings = res.scalars().all()

    if search:
        q = search.lower().strip()
        bookings = [
            b
            for b in bookings
            if q in b.booking_reference.lower()
            or q in b.customer_name.lower()
            or q in b.customer_email.lower()
            or q in b.customer_phone.lower()
        ]

    results = []
    for b in bookings:
        evt = b.event
        tt = b.ticket_type
        results.append(
            BookingDetailResponse(
                id=b.id,
                booking_reference=b.booking_reference,
                event_id=evt.id,
                event_title=evt.title,
                event_slug=evt.slug,
                poster_url=evt.poster_url,
                venue_name=evt.venue_name,
                venue_address=evt.venue_address,
                start_time=evt.start_time,
                end_time=evt.end_time,
                restrictions=evt.restrictions,
                ticket_type_name=tt.name,
                customer_name=b.customer_name,
                customer_email=b.customer_email,
                customer_phone=b.customer_phone,
                quantity=b.quantity,
                unit_price_paise=b.unit_price_paise,
                total_amount_paise=b.total_amount_paise,
                total_amount_inr=b.total_amount_paise / 100,
                currency=b.currency,
                status=b.status.value,
                razorpay_order_id=b.razorpay_order_id,
                razorpay_payment_id=b.razorpay_payment_id,
                created_at=b.created_at,
                tickets=[
                    TicketSummaryResponse(
                        id=t.id,
                        ticket_number=t.ticket_number,
                        attendee_name=t.attendee_name,
                        attendee_phone=t.attendee_phone,
                        qr_token=t.qr_token,
                        status=t.status.value,
                        is_checked_in=t.is_checked_in,
                        checked_in_at=t.checked_in_at,
                        event_id=evt.id,
                        event_title=evt.title,
                        venue_name=evt.venue_name,
                        venue_address=evt.venue_address,
                        city=evt.city,
                        start_time=evt.start_time,
                        end_time=evt.end_time,
                        restrictions=evt.restrictions,
                        ticket_type_name=tt.name,
                        unit_price_paise=b.unit_price_paise,
                        unit_price_inr=b.unit_price_paise / 100,
                        booking_reference=b.booking_reference,
                    )
                    for t in b.tickets
                ],
            )
        )
    return results


@admin_router.post("/bookings/{booking_id}/cancel", response_model=BookingDetailResponse)
async def cancel_booking(
    booking_id: uuid.UUID,
    req: AdminCancelBookingRequest,
    db: AsyncSession = Depends(get_db_session),
    admin_user: TokenUser = Depends(require_admin),
):
    """Cancel booking, invalidate tickets, and record refund reference and audit trail"""
    service = EventService(db)
    admin_uuid = uuid.UUID(admin_user.id) if admin_user and admin_user.id else None
    return await service.admin_cancel_booking(booking_id, req, admin_user_id=admin_uuid)


@admin_router.get("/{event_id}/export-attendees.csv")
async def export_attendees_csv(
    event_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
    admin_user: TokenUser = Depends(require_admin),
):
    """Download CSV file of all registered attendees and their check-in status"""
    service = EventService(db)
    csv_content = await service.export_attendees_csv(event_id)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="attendees-event-{event_id}.csv"',
            "Cache-Control": "no-cache",
        },
    )
