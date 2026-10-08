import enum
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.database import Base, TimestampMixin


class EventStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    SOLD_OUT = "SOLD_OUT"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class BookingStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"
    REFUNDED = "REFUNDED"


class TicketStatus(str, enum.Enum):
    VALID = "VALID"
    CHECKED_IN = "CHECKED_IN"
    CANCELLED = "CANCELLED"
    REFUNDED = "REFUNDED"


class Event(Base, TimestampMixin):
    __tablename__ = "events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(100), default="FESTIVAL", nullable=False)
    banner_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    poster_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    venue_name: Mapped[str] = mapped_column(String(255), nullable=False)
    venue_address: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[str] = mapped_column(String(100), default="Bidar", nullable=False)

    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    gates_open_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    restrictions: Mapped[Optional[str]] = mapped_column(String(255), default="Only For Ladies", nullable=True)
    terms_and_conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    status: Mapped[EventStatus] = mapped_column(
        Enum(EventStatus, name="event_status_enum"), default=EventStatus.PUBLISHED, index=True, nullable=False
    )
    is_featured: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    total_capacity: Mapped[int] = mapped_column(Integer, default=500, nullable=False)

    # Relationships
    ticket_types: Mapped[List["TicketType"]] = relationship(
        "TicketType", back_populates="event", cascade="all, delete-orphan", order_by="TicketType.price_paise"
    )
    bookings: Mapped[List["EventBooking"]] = relationship("EventBooking", back_populates="event")
    tickets: Mapped[List["EventTicket"]] = relationship("EventTicket", back_populates="event")


class TicketType(Base, TimestampMixin):
    __tablename__ = "ticket_types"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    price_paise: Mapped[int] = mapped_column(Integer, nullable=False)  # In paise: e.g. 29900 = ₹299
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)

    total_capacity: Mapped[int] = mapped_column(Integer, default=500, nullable=False)
    sold_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_per_booking: Mapped[int] = mapped_column(Integer, default=5, nullable=False)

    sale_start_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    sale_end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    event: Mapped["Event"] = relationship("Event", back_populates="ticket_types")
    bookings: Mapped[List["EventBooking"]] = relationship("EventBooking", back_populates="ticket_type")


class EventBooking(Base, TimestampMixin):
    __tablename__ = "event_bookings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    booking_reference: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True
    )
    ticket_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ticket_types.id", ondelete="RESTRICT"), index=True, nullable=False
    )

    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    customer_phone: Mapped[str] = mapped_column(String(50), nullable=False)

    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    total_amount_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), default="INR", nullable=False)

    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus, name="event_booking_status_enum"), default=BookingStatus.PENDING, index=True, nullable=False
    )
    payment_gateway: Mapped[str] = mapped_column(String(50), default="RAZORPAY", nullable=False)
    razorpay_order_id: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True, nullable=True)
    razorpay_payment_id: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True, nullable=True)
    razorpay_signature: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    cancellation_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    refund_reference: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Relationships
    event: Mapped["Event"] = relationship("Event", back_populates="bookings")
    ticket_type: Mapped["TicketType"] = relationship("TicketType", back_populates="bookings")
    tickets: Mapped[List["EventTicket"]] = relationship(
        "EventTicket", back_populates="booking", cascade="all, delete-orphan"
    )
    audit_logs: Mapped[List["TicketAuditLog"]] = relationship("TicketAuditLog", back_populates="booking")


class EventTicket(Base, TimestampMixin):
    __tablename__ = "event_tickets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    booking_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("event_bookings.id", ondelete="CASCADE"), index=True, nullable=False
    )
    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id", ondelete="RESTRICT"), index=True, nullable=False
    )
    ticket_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ticket_types.id", ondelete="RESTRICT"), index=True, nullable=False
    )

    ticket_number: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    attendee_name: Mapped[str] = mapped_column(String(255), nullable=False)
    attendee_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    qr_token: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)

    status: Mapped[TicketStatus] = mapped_column(
        Enum(TicketStatus, name="event_ticket_status_enum"), default=TicketStatus.VALID, index=True, nullable=False
    )
    is_checked_in: Mapped[bool] = mapped_column(Boolean, default=False, index=True, nullable=False)
    checked_in_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    checked_in_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    check_in_device_info: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relationships
    booking: Mapped["EventBooking"] = relationship("EventBooking", back_populates="tickets")
    event: Mapped["Event"] = relationship("Event", back_populates="tickets")
    ticket_type: Mapped["TicketType"] = relationship("TicketType")
    audit_logs: Mapped[List["TicketAuditLog"]] = relationship("TicketAuditLog", back_populates="ticket")


class TicketAuditLog(Base):
    __tablename__ = "ticket_audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    ticket_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("event_tickets.id", ondelete="SET NULL"), index=True, nullable=True
    )
    booking_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("event_bookings.id", ondelete="SET NULL"), index=True, nullable=True
    )
    action: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    actor_role: Mapped[str] = mapped_column(String(50), default="SYSTEM", nullable=False)
    details: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    ip_address: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    ticket: Mapped[Optional["EventTicket"]] = relationship("EventTicket", back_populates="audit_logs")
    booking: Mapped[Optional["EventBooking"]] = relationship("EventBooking", back_populates="audit_logs")
