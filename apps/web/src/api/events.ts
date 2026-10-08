import api, { getBaseURL } from './axios';

export interface TicketTypeItem {
  id: string;
  event_id: string;
  name: string;
  description?: string | null;
  price_paise: number;
  price_inr: number;
  currency: string;
  total_capacity: number;
  sold_count: number;
  available_quantity: number;
  max_per_booking: number;
  sale_start_time?: string | null;
  sale_end_time?: string | null;
  is_active: boolean;
}

export interface EventDetail {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  category: string;
  poster_url?: string | null;
  banner_url?: string | null;
  venue_name: string;
  venue_address: string;
  city: string;
  start_time: string;
  end_time: string;
  gates_open_time?: string | null;
  restrictions?: string | null;
  terms_and_conditions?: string | null;
  status: string;
  is_featured: boolean;
  total_capacity: number;
  total_sold: number;
  remaining_capacity: number;
  is_sold_out: boolean;
  starting_price_paise?: number;
  starting_price_inr?: number;
  ticket_types?: TicketTypeItem[];
}

export interface AttendeeInput {
  name: string;
  phone?: string;
}

export interface CreateBookingPayload {
  event_id: string;
  ticket_type_id: string;
  quantity: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  attendees?: AttendeeInput[];
}

export interface CreateBookingOrderResponse {
  booking_id: string;
  booking_reference: string;
  order_id: string;
  amount_paise: number;
  amount_inr: number;
  currency: string;
  key_id: string;
  event_title: string;
  ticket_type_name: string;
  quantity: number;
  expires_at: string;
}

export interface VerifyPaymentPayload {
  booking_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  attendees?: AttendeeInput[];
}

export interface TicketItem {
  id: string;
  ticket_number: string;
  attendee_name: string;
  attendee_phone?: string | null;
  qr_token: string;
  status: string;
  is_checked_in: boolean;
  checked_in_at?: string | null;
  event_id: string;
  event_title: string;
  venue_name: string;
  venue_address: string;
  city: string;
  start_time: string;
  end_time: string;
  restrictions?: string | null;
  ticket_type_name: string;
  unit_price_paise: number;
  unit_price_inr: number;
  booking_reference: string;
}

export interface VerifyPaymentResponse {
  booking_id: string;
  booking_reference: string;
  status: string;
  total_amount_paise: number;
  quantity: number;
  tickets: TicketItem[];
}

export interface BookingDetail {
  id: string;
  booking_reference: string;
  event_id: string;
  event_title: string;
  event_slug: string;
  poster_url?: string | null;
  venue_name: string;
  venue_address: string;
  start_time: string;
  end_time: string;
  restrictions?: string | null;
  ticket_type_name: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  quantity: number;
  unit_price_paise: number;
  total_amount_paise: number;
  total_amount_inr: number;
  currency: string;
  status: string;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  created_at: string;
  tickets: TicketItem[];
}

export const eventsApi = {
  getEvents: () => api.get<EventDetail[]>('/events'),
  getEventBySlug: (slug: string) => api.get<EventDetail>(`/events/${slug}`),
  createBookingOrder: (payload: CreateBookingPayload) =>
    api.post<CreateBookingOrderResponse>('/events/bookings/create-order', payload),
  verifyPayment: (payload: VerifyPaymentPayload) =>
    api.post<VerifyPaymentResponse>('/events/bookings/verify-payment', payload),
  getBooking: (bookingId: string) => api.get<BookingDetail>(`/events/bookings/${bookingId}`),
  getMyTickets: () => api.get<BookingDetail[]>('/events/user/my-tickets'),
  getTicketPdfUrl: (ticketId: string) => `${getBaseURL()}/events/tickets/${ticketId}/pdf`,
};
