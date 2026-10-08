import api from './axios';

export interface AdminEventStats {
  event_id: string;
  event_title: string;
  total_capacity: number;
  total_sold: number;
  total_checked_in: number;
  remaining_capacity: number;
  total_revenue_paise: number;
  total_revenue_inr: number;
  sold_percentage: number;
  check_in_percentage: number;
  ticket_types: {
    ticket_type_id: string;
    name: string;
    price_paise: number;
    price_inr: number;
    total_capacity: number;
    sold_count: number;
    checked_in_count: number;
    remaining_count: number;
  }[];
}

export interface AdminEventItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  poster_url?: string | null;
  venue_name: string;
  venue_address: string;
  city: string;
  start_time: string;
  end_time: string;
  restrictions?: string | null;
  status: string;
  total_capacity: number;
  starting_price_inr?: number;
}

export interface AdminTicketItem {
  id: string;
  ticket_number: string;
  attendee_name: string;
  attendee_phone?: string | null;
  qr_token: string;
  status: string;
  is_checked_in: boolean;
  checked_in_at?: string | null;
  ticket_type_name: string;
  unit_price_inr: number;
  booking_reference: string;
}

export interface AdminBookingItem {
  id: string;
  booking_reference: string;
  event_id: string;
  event_title: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  quantity: number;
  total_amount_inr: number;
  status: string;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  created_at: string;
  tickets: AdminTicketItem[];
}

export interface CheckInResponse {
  success: boolean;
  result_code: string;
  message: string;
  ticket_id?: string | null;
  ticket_number?: string | null;
  attendee_name?: string | null;
  attendee_phone?: string | null;
  ticket_type_name?: string | null;
  event_title?: string | null;
  checked_in_at?: string | null;
  already_checked_in_at?: string | null;
}

export const eventsAdminApi = {
  getEvents: () => api.get<AdminEventItem[]>('/events'),
  getEventStats: (eventId: string) => api.get<AdminEventStats>(`/admin/events/${eventId}/stats`),
  updateEventCapacity: (eventId: string, totalCapacity: number) =>
    api.patch(`/admin/events/${eventId}/capacity`, { total_capacity: totalCapacity }),
  updateTicketTypeCapacity: (
    ticketTypeId: string,
    payload: { total_capacity: number; max_per_booking?: number; price_paise?: number }
  ) => api.patch(`/admin/events/ticket-types/${ticketTypeId}/capacity`, payload),
  getBookings: (eventId: string, params?: { search?: string; status?: string }) =>
    api.get<AdminBookingItem[]>(`/admin/events/${eventId}/bookings`, { params }),
  cancelBooking: (bookingId: string, payload: { reason: string; refund_reference?: string }) =>
    api.post(`/admin/events/bookings/${bookingId}/cancel`, payload),
  checkIn: (payload: { qr_token: string; device_info?: string }) =>
    api.post<CheckInResponse>('/admin/events/check-in', payload),
  getExportCsvUrl: (eventId: string) => {
    const base = process.env.NEXT_PUBLIC_API_URL || '/api';
    return `${base}/admin/events/${eventId}/export-attendees.csv`;
  },
};
