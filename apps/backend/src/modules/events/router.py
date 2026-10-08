import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, Header, Request, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from src.database import get_db_session
from src.dependencies import TokenUser, get_current_user, get_optional_current_user
from src.modules.events.pdf_service import TicketPDFService
from src.modules.events.schemas import (
    BookingDetailResponse,
    CreateEventBookingRequest,
    CreateEventBookingResponse,
    EventDetailResponse,
    EventListItem,
    VerifyEventPaymentRequest,
    VerifyEventPaymentResponse,
)
from src.modules.events.service import EventService

router = APIRouter(prefix="/events", tags=["Events & Ticketing"])


@router.get("", response_model=List[EventListItem])
async def list_public_events(
    db: AsyncSession = Depends(get_db_session),
):
    """List all active public events (such as ZINGAT VOL-7 Dandiya Festival)"""
    service = EventService(db)
    return await service.get_public_events()


@router.get("/{slug}", response_model=EventDetailResponse)
async def get_event_details(
    slug: str,
    db: AsyncSession = Depends(get_db_session),
):
    """Get rich event details, venue information, guidelines, and live ticket tiers"""
    service = EventService(db)
    return await service.get_event_by_slug(slug)


@router.post("/bookings/create-order", response_model=CreateEventBookingResponse)
async def create_booking_order(
    req: CreateEventBookingRequest,
    db: AsyncSession = Depends(get_db_session),
    current_user: Optional[TokenUser] = Depends(get_optional_current_user),
):
    """
    Reserve tickets and create a Razorpay payment order.
    Protected against race conditions and overselling with row-level locks and 15-minute holds.
    """
    service = EventService(db)
    user_id = uuid.UUID(current_user.id) if current_user and current_user.id else None
    return await service.create_booking_order(req, user_id=user_id)


@router.post("/bookings/verify-payment", response_model=VerifyEventPaymentResponse)
async def verify_booking_payment(
    req: VerifyEventPaymentRequest,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Cryptographically verify Razorpay signature and issue individual tickets with secure QR tokens.
    Idempotent: Re-calling with identical payment credentials returns existing tickets without duplicates.
    """
    body = await request.json()
    attendees = body.get("attendees")
    service = EventService(db)
    return await service.verify_booking_payment(req, attendees=attendees)


@router.get("/bookings/{booking_id}", response_model=BookingDetailResponse)
async def get_booking_status(
    booking_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
):
    """Retrieve full booking confirmation, payment state, and generated tickets"""
    service = EventService(db)
    return await service.get_booking_by_id(booking_id)


@router.get("/user/my-tickets", response_model=List[BookingDetailResponse])
async def get_my_tickets(
    db: AsyncSession = Depends(get_db_session),
    current_user: TokenUser = Depends(get_current_user),
):
    """List all confirmed event bookings and ticket passes for the authenticated user"""
    service = EventService(db)
    user_uuid = uuid.UUID(current_user.id)
    return await service.get_user_bookings(user_uuid)


@router.get("/tickets/{ticket_id}/pdf")
async def download_ticket_pdf(
    ticket_id: uuid.UUID,
    db: AsyncSession = Depends(get_db_session),
):
    """
    Generate and stream a vector PDF ticket pass with embedded QR code.
    Suitable for mobile wallet saving and physical printing.
    """
    service = EventService(db)
    ticket, booking, event, ticket_type = await service.get_ticket_for_pdf(ticket_id)
    pdf_bytes = TicketPDFService.generate_ticket_pdf(ticket, booking, event, ticket_type)

    filename = f"V19PLUS-{ticket.ticket_number}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "private, max-age=3600",
        },
    )
