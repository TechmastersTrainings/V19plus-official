import csv
import hashlib
import hmac
import io
import json
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple
import razorpay
from sqlalchemy import func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from src.config import settings
from src.core.exceptions import (
    ForbiddenException,
    NotFoundException,
    UnauthorizedException,
    V19plusException,
)
from src.modules.events.models import (
    BookingStatus,
    Event,
    EventBooking,
    EventStatus,
    EventTicket,
    TicketAuditLog,
    TicketStatus,
    TicketType,
)
from src.modules.events.schemas import (
    AdminCancelBookingRequest,
    AdminEventStatsResponse,
    AdminUpdateEventCapacityRequest,
    AdminUpdateTicketTypeCapacityRequest,
    BookingDetailResponse,
    CheckInResponse,
    CreateEventBookingRequest,
    CreateEventBookingResponse,
    EventDetailResponse,
    EventListItem,
    TicketSummaryResponse,
    TicketTypeResponse,
    TicketTypeStatsItem,
    VerifyEventPaymentRequest,
    VerifyEventPaymentResponse,
)


class EventService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.key_id = settings.RAZORPAY_KEY_ID
        self.key_secret = settings.RAZORPAY_KEY_SECRET
        self.token_secret = settings.PLAYBACK_TOKEN_SECRET or "v19plus_event_ticket_signing_secret_2026"

    def _get_razorpay_client(self):
        if not self.key_id or not self.key_secret:
            raise V19plusException("Razorpay gateway keys not configured on server.", status_code=500)
        return razorpay.Client(auth=(self.key_id, self.key_secret))

    def _generate_qr_token(self, ticket_number: str) -> str:
        """Generate cryptographically signed, URL-safe QR token"""
        random_part = secrets.token_urlsafe(32)
        message = f"{ticket_number}:{random_part}"
        sig = hmac.new(
            self.token_secret.encode("utf-8"),
            message.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()[:16]
        return f"{random_part}_{sig}"

    # -------------------------------------------------------------
    # Public Event Queries
    # -------------------------------------------------------------
    async def get_public_events(self) -> List[EventListItem]:
        """List active published events with starting prices and live capacities"""
        stmt = (
            select(Event)
            .options(selectinload(Event.ticket_types))
            .where(Event.status.in_([EventStatus.PUBLISHED, EventStatus.SOLD_OUT]))
            .order_by(Event.is_featured.desc(), Event.start_time.asc())
        )
        res = await self.db.execute(stmt)
        events = res.scalars().all()

        items = []
        for evt in events:
            active_types = [t for t in evt.ticket_types if t.is_active]
            starting_price = min([t.price_paise for t in active_types]) if active_types else 0
            total_sold = sum([t.sold_count for t in active_types])
            is_sold_out = total_sold >= evt.total_capacity or evt.status == EventStatus.SOLD_OUT

            items.append(
                EventListItem(
                    id=evt.id,
                    title=evt.title,
                    slug=evt.slug,
                    category=evt.category,
                    poster_url=evt.poster_url,
                    banner_url=evt.banner_url,
                    venue_name=evt.venue_name,
                    venue_address=evt.venue_address,
                    city=evt.city,
                    start_time=evt.start_time,
                    end_time=evt.end_time,
                    gates_open_time=evt.gates_open_time,
                    restrictions=evt.restrictions,
                    status=evt.status.value,
                    is_featured=evt.is_featured,
                    starting_price_paise=starting_price,
                    starting_price_inr=starting_price / 100,
                    total_capacity=evt.total_capacity,
                    total_sold=total_sold,
                    is_sold_out=is_sold_out,
                )
            )
        return items

    async def get_event_by_slug(self, slug: str) -> EventDetailResponse:
        """Get complete event details and ticket types with real-time capacity calculations"""
        stmt = (
            select(Event)
            .options(selectinload(Event.ticket_types))
            .where(Event.slug == slug)
        )
        res = await self.db.execute(stmt)
        evt = res.scalar_one_or_none()
        if not evt:
            raise NotFoundException("Event", slug)

        now = datetime.now(timezone.utc)
        ticket_type_responses = []
        total_sold = 0

        for tt in evt.ticket_types:
            total_sold += tt.sold_count
            # Count currently active pending reservation holds (expires_at > now)
            pending_stmt = (
                select(func.coalesce(func.sum(EventBooking.quantity), 0))
                .where(
                    EventBooking.ticket_type_id == tt.id,
                    EventBooking.status == BookingStatus.PENDING,
                    EventBooking.expires_at > now,
                )
            )
            pending_res = await self.db.execute(pending_stmt)
            pending_reserved = pending_res.scalar() or 0

            avail = max(0, tt.total_capacity - tt.sold_count - pending_reserved)

            ticket_type_responses.append(
                TicketTypeResponse(
                    id=tt.id,
                    event_id=tt.event_id,
                    name=tt.name,
                    description=tt.description,
                    price_paise=tt.price_paise,
                    price_inr=tt.price_paise / 100,
                    currency=tt.currency,
                    total_capacity=tt.total_capacity,
                    sold_count=tt.sold_count,
                    available_quantity=avail,
                    max_per_booking=tt.max_per_booking,
                    sale_start_time=tt.sale_start_time,
                    sale_end_time=tt.sale_end_time,
                    is_active=tt.is_active,
                )
            )

        remaining = max(0, evt.total_capacity - total_sold)

        return EventDetailResponse(
            id=evt.id,
            title=evt.title,
            slug=evt.slug,
            description=evt.description,
            category=evt.category,
            banner_url=evt.banner_url,
            poster_url=evt.poster_url,
            venue_name=evt.venue_name,
            venue_address=evt.venue_address,
            city=evt.city,
            start_time=evt.start_time,
            end_time=evt.end_time,
            gates_open_time=evt.gates_open_time,
            restrictions=evt.restrictions,
            terms_and_conditions=evt.terms_and_conditions,
            status=evt.status.value,
            is_featured=evt.is_featured,
            total_capacity=evt.total_capacity,
            ticket_types=ticket_type_responses,
            total_sold=total_sold,
            remaining_capacity=remaining,
            is_sold_out=remaining <= 0 or evt.status == EventStatus.SOLD_OUT,
            created_at=evt.created_at,
            updated_at=evt.updated_at,
        )

    # -------------------------------------------------------------
    # Booking & Razorpay Order Creation (Concurrency Protected)
    # -------------------------------------------------------------
    async def create_booking_order(
        self,
        req: CreateEventBookingRequest,
        user_id: Optional[uuid.UUID] = None,
    ) -> CreateEventBookingResponse:
        """
        Concurrency-protected booking initiation.
        Uses row-level locking on ticket_types, creates a 15-minute pending reservation hold,
        and generates a Razorpay Order.
        """
        now = datetime.now(timezone.utc)

        # 1. Fetch Event and TicketType with lock to prevent race-condition overselling
        tt_stmt = (
            select(TicketType)
            .where(TicketType.id == req.ticket_type_id, TicketType.event_id == req.event_id)
            .with_for_update()
        )
        tt_res = await self.db.execute(tt_stmt)
        ticket_type = tt_res.scalar_one_or_none()

        if not ticket_type or not ticket_type.is_active:
            raise NotFoundException("Ticket Type", req.ticket_type_id)

        evt_stmt = select(Event).where(Event.id == req.event_id)
        evt_res = await self.db.execute(evt_stmt)
        event = evt_res.scalar_one_or_none()
        if not event or event.status not in (EventStatus.PUBLISHED,):
            raise V19plusException("Event is not currently open for ticket booking.", status_code=400)

        # Check booking limit per transaction
        if req.quantity > ticket_type.max_per_booking:
            raise V19plusException(
                f"Maximum {ticket_type.max_per_booking} tickets allowed per booking for {ticket_type.name}.",
                status_code=400,
            )

        # 2. Check Capacity & Pending Reservations
        pending_stmt = (
            select(func.coalesce(func.sum(EventBooking.quantity), 0))
            .where(
                EventBooking.ticket_type_id == ticket_type.id,
                EventBooking.status == BookingStatus.PENDING,
                EventBooking.expires_at > now,
            )
        )
        pending_res = await self.db.execute(pending_stmt)
        pending_reserved = pending_res.scalar() or 0

        available = ticket_type.total_capacity - ticket_type.sold_count - pending_reserved
        if available < req.quantity:
            raise V19plusException(
                f"Requested ticket quantity ({req.quantity}) exceeds remaining availability ({max(0, available)} left).",
                status_code=409,
            )

        # 3. Calculate Totals
        unit_price = ticket_type.price_paise
        total_amount = unit_price * req.quantity
        expires_at = now + timedelta(minutes=15)

        # Human-readable reference: ZGT-7-XXXXXXXX
        prefix = "ZGT-7" if "zingat" in event.slug.lower() else "EVT"
        booking_ref = f"{prefix}-{uuid.uuid4().hex[:8].upper()}"

        # 4. Create Razorpay Order
        order_notes = {
            "booking_reference": booking_ref,
            "event_title": event.title,
            "ticket_type": ticket_type.name,
            "quantity": str(req.quantity),
            "customer_email": req.customer_email,
            "customer_phone": req.customer_phone,
        }
        if user_id:
            order_notes["user_id"] = str(user_id)

        rzp = self._get_razorpay_client()
        try:
            rzp_order = rzp.order.create(
                data={
                    "amount": total_amount,
                    "currency": "INR",
                    "receipt": f"rcpt_{booking_ref[:20]}",
                    "notes": order_notes,
                }
            )
            order_id = rzp_order["id"]
        except Exception as e:
            raise V19plusException(f"Failed to initiate order with Razorpay payment gateway: {str(e)}", status_code=502)

        # 5. Insert Booking Ledger Record
        booking = EventBooking(
            booking_reference=booking_ref,
            event_id=event.id,
            user_id=user_id,
            ticket_type_id=ticket_type.id,
            customer_name=req.customer_name.strip(),
            customer_email=req.customer_email.lower().strip(),
            customer_phone=req.customer_phone.strip(),
            quantity=req.quantity,
            unit_price_paise=unit_price,
            total_amount_paise=total_amount,
            currency="INR",
            status=BookingStatus.PENDING,
            payment_gateway="RAZORPAY",
            razorpay_order_id=order_id,
            expires_at=expires_at,
        )
        self.db.add(booking)
        await self.db.flush()

        # Audit log
        audit = TicketAuditLog(
            booking_id=booking.id,
            action="ORDER_CREATED",
            actor_id=user_id,
            actor_role="USER" if user_id else "GUEST",
            details={
                "order_id": order_id,
                "amount_paise": total_amount,
                "quantity": req.quantity,
                "expires_at": expires_at.isoformat(),
                "attendees": [a.model_dump() for a in req.attendees] if req.attendees else [],
            },
        )
        self.db.add(audit)
        await self.db.commit()

        return CreateEventBookingResponse(
            booking_id=booking.id,
            booking_reference=booking.booking_reference,
            order_id=order_id,
            amount_paise=total_amount,
            amount_inr=total_amount / 100,
            currency="INR",
            key_id=self.key_id or "rzp_test_placeholder",
            event_title=event.title,
            ticket_type_name=ticket_type.name,
            quantity=req.quantity,
            expires_at=expires_at,
        )

    # -------------------------------------------------------------
    # Payment Verification & Atomic Ticket Generation (Strictly Idempotent)
    # -------------------------------------------------------------
    async def verify_booking_payment(
        self,
        req: VerifyEventPaymentRequest,
        attendees: Optional[List[dict]] = None,
    ) -> VerifyEventPaymentResponse:
        """
        Cryptographic HMAC verification + Idempotent Ticket Generation.
        Duplicate calls return the existing confirmed tickets safely.
        """
        # Cryptographic verification
        if self.key_secret:
            message = f"{req.razorpay_order_id}|{req.razorpay_payment_id}"
            expected_sig = hmac.new(
                self.key_secret.encode("utf-8"),
                message.encode("utf-8"),
                hashlib.sha256,
            ).hexdigest()

            if not hmac.compare_digest(expected_sig, req.razorpay_signature):
                raise UnauthorizedException("Payment verification signature mismatch.")

        # Find Booking with row lock
        stmt = (
            select(EventBooking)
            .options(
                selectinload(EventBooking.event),
                selectinload(EventBooking.ticket_type),
                selectinload(EventBooking.tickets),
            )
            .where(EventBooking.id == req.booking_id)
            .with_for_update()
        )
        res = await self.db.execute(stmt)
        booking = res.scalar_one_or_none()

        if not booking:
            raise NotFoundException("Event Booking", req.booking_id)

        # Idempotency: If already confirmed, return existing tickets immediately
        if booking.status == BookingStatus.CONFIRMED:
            return self._build_verify_response(booking)

        # Check if expired before payment
        now = datetime.now(timezone.utc)
        if booking.status == BookingStatus.EXPIRED:
            raise V19plusException("Booking reservation expired before payment completed.", status_code=400)

        # Update booking status
        booking.status = BookingStatus.CONFIRMED
        booking.razorpay_payment_id = req.razorpay_payment_id
        booking.razorpay_signature = req.razorpay_signature

        # Update sold_count on ticket_type atomically
        tt_stmt = (
            select(TicketType)
            .where(TicketType.id == booking.ticket_type_id)
            .with_for_update()
        )
        tt_res = await self.db.execute(tt_stmt)
        tt = tt_res.scalar_one()
        tt.sold_count += booking.quantity

        # Retrieve attendees saved during order creation
        attendees = []
        audit_stmt = (
            select(TicketAuditLog)
            .where(TicketAuditLog.booking_id == booking.id, TicketAuditLog.action == "ORDER_CREATED")
            .order_by(TicketAuditLog.created_at.desc())
        )
        audit_res = await self.db.execute(audit_stmt)
        audit_log = audit_res.scalars().first()
        if audit_log and audit_log.details and isinstance(audit_log.details, dict):
            attendees = audit_log.details.get("attendees", [])

        # Create individual tickets
        created_tickets = []
        for i in range(booking.quantity):
            attendee_name = booking.customer_name
            attendee_phone = booking.customer_phone

            if attendees and i < len(attendees):
                att = attendees[i]
                if att.get("name"):
                    attendee_name = att["name"].strip()
                if att.get("phone"):
                    attendee_phone = att["phone"].strip()

            ticket_num = f"TKT-{booking.booking_reference}-{i + 1:02d}"
            qr_token = self._generate_qr_token(ticket_num)

            ticket = EventTicket(
                booking_id=booking.id,
                event_id=booking.event_id,
                ticket_type_id=booking.ticket_type_id,
                ticket_number=ticket_num,
                attendee_name=attendee_name,
                attendee_phone=attendee_phone,
                qr_token=qr_token,
                status=TicketStatus.VALID,
                is_checked_in=False,
            )
            self.db.add(ticket)
            created_tickets.append(ticket)

        # Audit logs
        self.db.add(
            TicketAuditLog(
                booking_id=booking.id,
                action="PAYMENT_SUCCESS",
                actor_id=booking.user_id,
                actor_role="USER" if booking.user_id else "GUEST",
                details={
                    "payment_id": req.razorpay_payment_id,
                    "order_id": req.razorpay_order_id,
                    "amount_paise": booking.total_amount_paise,
                    "quantity": booking.quantity,
                },
            )
        )

        await self.db.commit()

        # Re-fetch with all relationships loaded for response
        booking.tickets = created_tickets
        return self._build_verify_response(booking)

    def _build_verify_response(self, booking: EventBooking) -> VerifyEventPaymentResponse:
        evt = booking.event
        tt = booking.ticket_type
        ticket_items = [
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
                unit_price_paise=booking.unit_price_paise,
                unit_price_inr=booking.unit_price_paise / 100,
                booking_reference=booking.booking_reference,
            )
            for t in booking.tickets
        ]
        return VerifyEventPaymentResponse(
            booking_id=booking.id,
            booking_reference=booking.booking_reference,
            status=booking.status.value,
            total_amount_paise=booking.total_amount_paise,
            quantity=booking.quantity,
            tickets=ticket_items,
        )

    # -------------------------------------------------------------
    # QR Check-In Scanner (Atomic Duplicate-Protection)
    # -------------------------------------------------------------
    async def check_in_ticket(
        self,
        qr_token: str,
        admin_user_id: Optional[uuid.UUID] = None,
        device_info: Optional[str] = None,
    ) -> CheckInResponse:
        """
        Atomic QR Code Validation and Check-In.
        Guarantees that a single ticket cannot be checked in more than once.
        Logs every scan attempt to TicketAuditLog.
        """
        token_clean = qr_token.strip()

        # Look up ticket with row lock
        stmt = (
            select(EventTicket)
            .options(
                selectinload(EventTicket.event),
                selectinload(EventTicket.ticket_type),
                selectinload(EventTicket.booking),
            )
            .where(EventTicket.qr_token == token_clean)
            .with_for_update()
        )
        res = await self.db.execute(stmt)
        ticket = res.scalar_one_or_none()

        # Case 1: Ticket not found
        if not ticket:
            self.db.add(
                TicketAuditLog(
                    action="CHECK_IN_FAILED_NOT_FOUND",
                    actor_id=admin_user_id,
                    actor_role="ADMIN" if admin_user_id else "SCANNER",
                    details={"token_attempted": token_clean[:12] + "..."},
                )
            )
            await self.db.commit()
            return CheckInResponse(
                success=False,
                result_code="INVALID_TICKET",
                message="Invalid or unrecognized ticket QR code. Access denied.",
            )

        evt = ticket.event
        tt = ticket.ticket_type

        # Case 2: Ticket cancelled or refunded
        if ticket.status in (TicketStatus.CANCELLED, TicketStatus.REFUNDED):
            self.db.add(
                TicketAuditLog(
                    ticket_id=ticket.id,
                    booking_id=ticket.booking_id,
                    action="CHECK_IN_FAILED_CANCELLED",
                    actor_id=admin_user_id,
                    actor_role="ADMIN" if admin_user_id else "SCANNER",
                    details={"status": ticket.status.value},
                )
            )
            await self.db.commit()
            return CheckInResponse(
                success=False,
                result_code="CANCELLED_TICKET",
                message="This ticket has been cancelled or refunded. Entry denied.",
                ticket_id=ticket.id,
                ticket_number=ticket.ticket_number,
                attendee_name=ticket.attendee_name,
                event_title=evt.title,
            )

        # Case 3: Already checked in! (ATOMIC DUPLICATE PROTECTION)
        if ticket.is_checked_in:
            self.db.add(
                TicketAuditLog(
                    ticket_id=ticket.id,
                    booking_id=ticket.booking_id,
                    action="CHECK_IN_DUPLICATE_ATTEMPT",
                    actor_id=admin_user_id,
                    actor_role="ADMIN" if admin_user_id else "SCANNER",
                    details={
                        "original_checked_in_at": ticket.checked_in_at.isoformat() if ticket.checked_in_at else None,
                        "device_info": device_info,
                    },
                )
            )
            await self.db.commit()

            already_time_str = (
                ticket.checked_in_at.strftime("%I:%M %p")
                if ticket.checked_in_at
                else "earlier"
            )
            return CheckInResponse(
                success=False,
                result_code="ALREADY_CHECKED_IN",
                message=f"DUPLICATE ENTRY DETECTED! Ticket was already checked in at {already_time_str}.",
                ticket_id=ticket.id,
                ticket_number=ticket.ticket_number,
                attendee_name=ticket.attendee_name,
                attendee_phone=ticket.attendee_phone,
                ticket_type_name=tt.name,
                event_title=evt.title,
                already_checked_in_at=ticket.checked_in_at,
            )

        # Case 4: Valid Check-In Success!
        now = datetime.now(timezone.utc)
        ticket.is_checked_in = True
        ticket.checked_in_at = now
        ticket.checked_in_by = admin_user_id
        ticket.status = TicketStatus.CHECKED_IN
        ticket.check_in_device_info = device_info

        self.db.add(
            TicketAuditLog(
                ticket_id=ticket.id,
                booking_id=ticket.booking_id,
                action="CHECK_IN_SUCCESS",
                actor_id=admin_user_id,
                actor_role="ADMIN" if admin_user_id else "SCANNER",
                details={
                    "checked_in_at": now.isoformat(),
                    "device_info": device_info,
                },
            )
        )
        await self.db.commit()

        return CheckInResponse(
            success=True,
            result_code="CHECK_IN_SUCCESS",
            message=f"CHECK-IN APPROVED! Welcome {ticket.attendee_name}.",
            ticket_id=ticket.id,
            ticket_number=ticket.ticket_number,
            attendee_name=ticket.attendee_name,
            attendee_phone=ticket.attendee_phone,
            ticket_type_name=tt.name,
            event_title=evt.title,
            checked_in_at=now,
        )

    # -------------------------------------------------------------
    # User Tickets / My Tickets
    # -------------------------------------------------------------
    async def get_booking_by_id(self, booking_id: uuid.UUID) -> BookingDetailResponse:
        stmt = (
            select(EventBooking)
            .options(
                selectinload(EventBooking.event),
                selectinload(EventBooking.ticket_type),
                selectinload(EventBooking.tickets),
            )
            .where(EventBooking.id == booking_id)
        )
        res = await self.db.execute(stmt)
        b = res.scalar_one_or_none()
        if not b:
            raise NotFoundException("Event Booking", booking_id)

        evt = b.event
        tt = b.ticket_type

        return BookingDetailResponse(
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

    async def get_user_bookings(self, user_id: uuid.UUID, email: Optional[str] = None) -> List[BookingDetailResponse]:
        """Fetch confirmed bookings for an authenticated user or matching email"""
        conditions = [EventBooking.user_id == user_id]
        if email:
            conditions.append(EventBooking.customer_email == email.lower().strip())

        stmt = (
            select(EventBooking)
            .options(
                selectinload(EventBooking.event),
                selectinload(EventBooking.ticket_type),
                selectinload(EventBooking.tickets),
            )
            .where(or_(*conditions), EventBooking.status == BookingStatus.CONFIRMED)
            .order_by(EventBooking.created_at.desc())
        )
        res = await self.db.execute(stmt)
        bookings = res.scalars().all()

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

    async def get_ticket_for_pdf(self, ticket_id: uuid.UUID) -> Tuple[EventTicket, EventBooking, Event, TicketType]:
        stmt = (
            select(EventTicket)
            .options(
                selectinload(EventTicket.booking),
                selectinload(EventTicket.event),
                selectinload(EventTicket.ticket_type),
            )
            .where(EventTicket.id == ticket_id)
        )
        res = await self.db.execute(stmt)
        ticket = res.scalar_one_or_none()
        if not ticket:
            raise NotFoundException("Event Ticket", ticket_id)
        return ticket, ticket.booking, ticket.event, ticket.ticket_type

    # -------------------------------------------------------------
    # Admin Management & Statistics
    # -------------------------------------------------------------
    async def admin_get_event_stats(self, event_id: uuid.UUID) -> AdminEventStatsResponse:
        stmt = (
            select(Event)
            .options(selectinload(Event.ticket_types))
            .where(Event.id == event_id)
        )
        res = await self.db.execute(stmt)
        evt = res.scalar_one_or_none()
        if not evt:
            raise NotFoundException("Event", event_id)

        # Total Checked in
        ci_stmt = (
            select(func.count(EventTicket.id))
            .where(EventTicket.event_id == event_id, EventTicket.is_checked_in.is_(True))
        )
        ci_res = await self.db.execute(ci_stmt)
        total_checked_in = ci_res.scalar() or 0

        # Total Revenue & Total Sold
        total_sold = 0
        total_rev = 0
        type_stats = []

        for tt in evt.ticket_types:
            total_sold += tt.sold_count
            tt_rev = tt.sold_count * tt.price_paise
            total_rev += tt_rev

            # Checked in per type
            tt_ci_stmt = (
                select(func.count(EventTicket.id))
                .where(EventTicket.ticket_type_id == tt.id, EventTicket.is_checked_in.is_(True))
            )
            tt_ci_res = await self.db.execute(tt_ci_stmt)
            tt_ci_count = tt_ci_res.scalar() or 0

            type_stats.append(
                TicketTypeStatsItem(
                    ticket_type_id=tt.id,
                    name=tt.name,
                    price_paise=tt.price_paise,
                    price_inr=tt.price_paise / 100,
                    total_capacity=tt.total_capacity,
                    sold_count=tt.sold_count,
                    checked_in_count=tt_ci_count,
                    remaining_count=max(0, tt.total_capacity - tt.sold_count),
                )
            )

        sold_pct = round((total_sold / evt.total_capacity * 100), 1) if evt.total_capacity > 0 else 0.0
        check_in_pct = round((total_checked_in / total_sold * 100), 1) if total_sold > 0 else 0.0

        return AdminEventStatsResponse(
            event_id=evt.id,
            event_title=evt.title,
            total_capacity=evt.total_capacity,
            total_sold=total_sold,
            total_checked_in=total_checked_in,
            remaining_capacity=max(0, evt.total_capacity - total_sold),
            total_revenue_paise=total_rev,
            total_revenue_inr=total_rev / 100,
            sold_percentage=sold_pct,
            check_in_percentage=check_in_pct,
            ticket_types=type_stats,
        )

    async def admin_update_event_capacity(
        self, event_id: uuid.UUID, req: AdminUpdateEventCapacityRequest
    ) -> EventDetailResponse:
        stmt = select(Event).where(Event.id == event_id)
        res = await self.db.execute(stmt)
        evt = res.scalar_one_or_none()
        if not evt:
            raise NotFoundException("Event", event_id)

        evt.total_capacity = req.total_capacity
        await self.db.commit()
        return await self.get_event_by_slug(evt.slug)

    async def admin_update_ticket_type_capacity(
        self, ticket_type_id: uuid.UUID, req: AdminUpdateTicketTypeCapacityRequest
    ) -> TicketTypeResponse:
        stmt = select(TicketType).where(TicketType.id == ticket_type_id)
        res = await self.db.execute(stmt)
        tt = res.scalar_one_or_none()
        if not tt:
            raise NotFoundException("Ticket Type", ticket_type_id)

        tt.total_capacity = req.total_capacity
        if req.max_per_booking is not None:
            tt.max_per_booking = req.max_per_booking
        if req.is_active is not None:
            tt.is_active = req.is_active
        if req.price_paise is not None:
            tt.price_paise = req.price_paise

        await self.db.commit()

        return TicketTypeResponse(
            id=tt.id,
            event_id=tt.event_id,
            name=tt.name,
            description=tt.description,
            price_paise=tt.price_paise,
            price_inr=tt.price_paise / 100,
            currency=tt.currency,
            total_capacity=tt.total_capacity,
            sold_count=tt.sold_count,
            available_quantity=max(0, tt.total_capacity - tt.sold_count),
            max_per_booking=tt.max_per_booking,
            sale_start_time=tt.sale_start_time,
            sale_end_time=tt.sale_end_time,
            is_active=tt.is_active,
        )

    async def admin_cancel_booking(
        self,
        booking_id: uuid.UUID,
        req: AdminCancelBookingRequest,
        admin_user_id: Optional[uuid.UUID] = None,
    ) -> BookingDetailResponse:
        stmt = (
            select(EventBooking)
            .options(
                selectinload(EventBooking.tickets),
                selectinload(EventBooking.ticket_type),
            )
            .where(EventBooking.id == booking_id)
            .with_for_update()
        )
        res = await self.db.execute(stmt)
        b = res.scalar_one_or_none()
        if not b:
            raise NotFoundException("Event Booking", booking_id)

        if b.status in (BookingStatus.CANCELLED, BookingStatus.REFUNDED):
            raise V19plusException("Booking is already cancelled or refunded.", status_code=400)

        was_confirmed = b.status == BookingStatus.CONFIRMED

        b.status = BookingStatus.CANCELLED if not req.refund_reference else BookingStatus.REFUNDED
        b.cancellation_reason = req.reason
        b.refund_reference = req.refund_reference

        # Cancel all individual tickets
        for t in b.tickets:
            t.status = TicketStatus.CANCELLED if not req.refund_reference else TicketStatus.REFUNDED

        # Restore ticket type sold count if it was previously confirmed
        if was_confirmed:
            tt = b.ticket_type
            tt.sold_count = max(0, tt.sold_count - b.quantity)

        # Audit log
        self.db.add(
            TicketAuditLog(
                booking_id=b.id,
                action="TICKET_CANCELLED" if not req.refund_reference else "TICKET_REFUNDED",
                actor_id=admin_user_id,
                actor_role="ADMIN",
                details={
                    "reason": req.reason,
                    "refund_reference": req.refund_reference,
                    "quantity": b.quantity,
                },
            )
        )
        await self.db.commit()

        return await self.get_booking_by_id(booking_id)

    async def export_attendees_csv(self, event_id: uuid.UUID) -> str:
        """Export complete attendee and check-in roster as CSV format"""
        stmt = (
            select(EventTicket)
            .options(
                selectinload(EventTicket.booking),
                selectinload(EventTicket.ticket_type),
                selectinload(EventTicket.event),
            )
            .where(EventTicket.event_id == event_id)
            .order_by(EventTicket.created_at.asc())
        )
        res = await self.db.execute(stmt)
        tickets = res.scalars().all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "Ticket Number",
                "Booking Reference",
                "Attendee Name",
                "Attendee Phone",
                "Customer Email",
                "Customer Phone",
                "Ticket Tier",
                "Price (INR)",
                "Status",
                "Checked In",
                "Checked In At (UTC)",
                "Booked At (UTC)",
            ]
        )

        for t in tickets:
            b = t.booking
            tt = t.ticket_type
            writer.writerow(
                [
                    t.ticket_number,
                    b.booking_reference,
                    t.attendee_name,
                    t.attendee_phone or "",
                    b.customer_email,
                    b.customer_phone,
                    tt.name,
                    f"{(tt.price_paise / 100):.2f}",
                    t.status.value,
                    "YES" if t.is_checked_in else "NO",
                    t.checked_in_at.isoformat() if t.checked_in_at else "",
                    t.created_at.isoformat(),
                ]
            )

        return output.getvalue()
