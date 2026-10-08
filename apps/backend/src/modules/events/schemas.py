import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


# -------------------------------------------------------------
# Ticket Type Schemas
# -------------------------------------------------------------
class TicketTypeBase(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    price_paise: int = Field(..., ge=0, description="Amount in Paise (e.g. 29900 for ₹299)")
    currency: str = Field(default="INR", max_length=10)
    total_capacity: int = Field(..., ge=1)
    max_per_booking: int = Field(default=5, ge=1, le=20)
    sale_start_time: Optional[datetime] = None
    sale_end_time: Optional[datetime] = None
    is_active: bool = True


class TicketTypeResponse(TicketTypeBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    event_id: uuid.UUID
    sold_count: int = 0
    available_quantity: int = 0
    price_inr: float = 0.0


# -------------------------------------------------------------
# Event Schemas
# -------------------------------------------------------------
class EventBase(BaseModel):
    title: str = Field(..., max_length=255)
    slug: str = Field(..., max_length=255)
    description: Optional[str] = None
    category: str = Field(default="FESTIVAL", max_length=100)
    banner_url: Optional[str] = None
    poster_url: Optional[str] = None
    venue_name: str = Field(..., max_length=255)
    venue_address: str = Field(..., max_length=1000)
    city: str = Field(default="Bidar", max_length=100)
    start_time: datetime
    end_time: datetime
    gates_open_time: Optional[datetime] = None
    restrictions: Optional[str] = Field(default="Only For Ladies", max_length=255)
    terms_and_conditions: Optional[str] = None
    status: str = Field(default="PUBLISHED")
    is_featured: bool = True
    total_capacity: int = Field(default=500, ge=1)


class EventListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    slug: str
    category: str
    poster_url: Optional[str] = None
    banner_url: Optional[str] = None
    venue_name: str
    venue_address: str
    city: str
    start_time: datetime
    end_time: datetime
    gates_open_time: Optional[datetime] = None
    restrictions: Optional[str] = None
    status: str
    is_featured: bool
    starting_price_paise: int
    starting_price_inr: float
    total_capacity: int
    total_sold: int
    is_sold_out: bool


class EventDetailResponse(EventBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    ticket_types: List[TicketTypeResponse] = []
    total_sold: int = 0
    remaining_capacity: int = 0
    is_sold_out: bool = False
    created_at: datetime
    updated_at: datetime


# -------------------------------------------------------------
# Booking Schemas
# -------------------------------------------------------------
class AttendeeItem(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)


class CreateEventBookingRequest(BaseModel):
    event_id: uuid.UUID
    ticket_type_id: uuid.UUID
    quantity: int = Field(..., ge=1, le=10)
    customer_name: str = Field(..., min_length=2, max_length=255)
    customer_email: EmailStr
    customer_phone: str = Field(..., min_length=10, max_length=20)
    attendees: Optional[List[AttendeeItem]] = None


class CreateEventBookingResponse(BaseModel):
    booking_id: uuid.UUID
    booking_reference: str
    order_id: str
    amount_paise: int
    amount_inr: float
    currency: str
    key_id: str
    event_title: str
    ticket_type_name: str
    quantity: int
    expires_at: datetime


class VerifyEventPaymentRequest(BaseModel):
    booking_id: uuid.UUID
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class TicketSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    ticket_number: str
    attendee_name: str
    attendee_phone: Optional[str] = None
    qr_token: str
    status: str
    is_checked_in: bool
    checked_in_at: Optional[datetime] = None
    event_id: uuid.UUID
    event_title: str
    venue_name: str
    venue_address: str
    city: str
    start_time: datetime
    end_time: datetime
    restrictions: Optional[str] = None
    ticket_type_name: str
    unit_price_paise: int
    unit_price_inr: float
    booking_reference: str


class VerifyEventPaymentResponse(BaseModel):
    booking_id: uuid.UUID
    booking_reference: str
    status: str
    total_amount_paise: int
    quantity: int
    tickets: List[TicketSummaryResponse]


class BookingDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    booking_reference: str
    event_id: uuid.UUID
    event_title: str
    event_slug: str
    poster_url: Optional[str] = None
    venue_name: str
    venue_address: str
    start_time: datetime
    end_time: datetime
    restrictions: Optional[str] = None
    ticket_type_name: str
    customer_name: str
    customer_email: str
    customer_phone: str
    quantity: int
    unit_price_paise: int
    total_amount_paise: int
    total_amount_inr: float
    currency: str
    status: str
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    created_at: datetime
    tickets: List[TicketSummaryResponse] = []


# -------------------------------------------------------------
# Check-in & Scanner Schemas
# -------------------------------------------------------------
class CheckInRequest(BaseModel):
    qr_token: str = Field(..., min_length=10, max_length=128)
    device_info: Optional[str] = Field(None, max_length=255)


class CheckInResponse(BaseModel):
    success: bool
    result_code: str  # CHECK_IN_SUCCESS, ALREADY_CHECKED_IN, INVALID_TICKET, CANCELLED_TICKET
    message: str
    ticket_id: Optional[uuid.UUID] = None
    ticket_number: Optional[str] = None
    attendee_name: Optional[str] = None
    attendee_phone: Optional[str] = None
    ticket_type_name: Optional[str] = None
    event_title: Optional[str] = None
    checked_in_at: Optional[datetime] = None
    already_checked_in_at: Optional[datetime] = None


# -------------------------------------------------------------
# Admin & Stats Schemas
# -------------------------------------------------------------
class AdminUpdateEventCapacityRequest(BaseModel):
    total_capacity: int = Field(..., ge=1)


class AdminUpdateTicketTypeCapacityRequest(BaseModel):
    total_capacity: int = Field(..., ge=1)
    max_per_booking: Optional[int] = Field(None, ge=1, le=50)
    is_active: Optional[bool] = None
    price_paise: Optional[int] = Field(None, ge=0)


class AdminCancelBookingRequest(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)
    refund_reference: Optional[str] = Field(None, max_length=100)


class TicketTypeStatsItem(BaseModel):
    ticket_type_id: uuid.UUID
    name: str
    price_paise: int
    price_inr: float
    total_capacity: int
    sold_count: int
    checked_in_count: int
    remaining_count: int


class AdminEventStatsResponse(BaseModel):
    event_id: uuid.UUID
    event_title: str
    total_capacity: int
    total_sold: int
    total_checked_in: int
    remaining_capacity: int
    total_revenue_paise: int
    total_revenue_inr: float
    sold_percentage: float
    check_in_percentage: float
    ticket_types: List[TicketTypeStatsItem]
