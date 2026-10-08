'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  Download,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ArrowLeft,
  RefreshCw,
  Ban,
  Ticket,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  eventsAdminApi,
  AdminBookingItem,
  AdminTicketItem,
} from '../../../../../api/eventsAdmin';

export default function AdminEventBookingsPage() {
  const params = useParams();
  const eventId = params?.eventId as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [cancelModalBooking, setCancelModalBooking] = useState<AdminBookingItem | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [refundRef, setRefundRef] = useState<string>('');

  const { data: bookings, isLoading, refetch } = useQuery({
    queryKey: ['admin-bookings', eventId, statusFilter],
    queryFn: async () => {
      const res = await eventsAdminApi.getBookings(eventId, {
        status: statusFilter || undefined,
      });
      return res.data;
    },
    enabled: !!eventId,
  });

  const cancelMutation = useMutation({
    mutationFn: async ({
      bookingId,
      reason,
      refundRef,
    }: {
      bookingId: string;
      reason: string;
      refundRef?: string;
    }) => {
      await eventsAdminApi.cancelBooking(bookingId, {
        reason,
        refund_reference: refundRef || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-bookings', eventId] });
      queryClient.invalidateQueries({ queryKey: ['admin-event-stats', eventId] });
      toast.success('Booking cancelled and tickets invalidated.');
      setCancelModalBooking(null);
      setCancelReason('');
      setRefundRef('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to cancel booking');
    },
  });

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelModalBooking) return;
    if (!cancelReason.trim()) {
      toast.error('Please enter a cancellation reason');
      return;
    }
    cancelMutation.mutate({
      bookingId: cancelModalBooking.id,
      reason: cancelReason.trim(),
      refundRef: refundRef.trim() || undefined,
    });
  };

  const filteredBookings = (bookings || []).filter((b) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      b.booking_reference.toLowerCase().includes(q) ||
      b.customer_name.toLowerCase().includes(q) ||
      b.customer_email.toLowerCase().includes(q) ||
      b.customer_phone.toLowerCase().includes(q) ||
      b.tickets?.some(
        (t) =>
          t.ticket_number.toLowerCase().includes(q) ||
          t.attendee_name.toLowerCase().includes(q)
      )
    );
  });

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/events"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Event Bookings & Attendee Roster
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Live registrations, check-in records, and cancellation management.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={eventsAdminApi.getExportCsvUrl(eventId)}
            target="_blank"
            rel="noreferrer"
            download
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-600/20"
          >
            <Download className="w-4 h-4" />
            Download Attendee CSV
          </a>
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer name, email, phone, booking ref, or ticket #..."
            className="w-full bg-[#141414] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FF5C00]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#141414] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
        >
          <option value="">All Statuses</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="REFUNDED">Refunded</option>
          <option value="PENDING">Pending</option>
        </select>
      </div>

      {/* Bookings Table */}
      {isLoading ? (
        <div className="h-64 bg-[#141414] rounded-2xl animate-pulse" />
      ) : filteredBookings.length === 0 ? (
        <div className="p-12 text-center bg-[#141414] rounded-2xl border border-white/5">
          <p className="text-gray-400 text-sm">No bookings found matching your search.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map((b) => (
            <div
              key={b.id}
              className="bg-[#141414] border border-white/10 rounded-2xl p-5 shadow-lg space-y-4"
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-white/5 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-[#FF8A00]">
                      {b.booking_reference}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        b.status === 'CONFIRMED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : b.status === 'CANCELLED' || b.status === 'REFUNDED'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {b.status}
                    </span>
                    <span className="text-[11px] text-gray-500 font-mono">
                      {formatDate(b.created_at)}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">
                    {b.customer_name} •{' '}
                    <span className="text-gray-400 font-normal">{b.customer_email}</span> •{' '}
                    <span className="text-gray-400 font-normal">{b.customer_phone}</span>
                  </h3>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-left sm:text-right">
                    <span className="text-sm font-black text-white">₹{b.total_amount_inr}</span>
                    <span className="text-[10px] text-gray-400 block">
                      {b.quantity} {b.quantity === 1 ? 'ticket' : 'tickets'}
                    </span>
                  </div>

                  {b.status === 'CONFIRMED' && (
                    <button
                      onClick={() => setCancelModalBooking(b)}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-colors"
                    >
                      Cancel / Refund
                    </button>
                  )}
                </div>
              </div>

              {/* Individual Tickets */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {b.tickets.map((t: AdminTicketItem) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white truncate">
                          {t.attendee_name}
                        </span>
                        {t.is_checked_in ? (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold uppercase flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            Checked In
                          </span>
                        ) : (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/10 text-gray-400 font-bold uppercase">
                            Not Scanned
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-gray-400">{t.ticket_number}</div>
                    </div>

                    {t.is_checked_in && t.checked_in_at && (
                      <div className="mt-2 text-[10px] text-emerald-400/90 font-mono">
                        Scanned: {formatDate(t.checked_in_at)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cancel / Refund Modal */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141414] border border-white/10 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl">
            <h3 className="text-lg font-black mb-1">Cancel Booking & Passes</h3>
            <p className="text-xs text-gray-400 mb-4">
              Booking <strong>{cancelModalBooking.booking_reference}</strong> ({cancelModalBooking.customer_name}) will be cancelled. Associated QR tickets will be invalidated immediately.
            </p>

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-300 font-bold mb-1">
                  Cancellation Reason <span className="text-rose-400">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Requested by customer / duplicate transaction"
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-300 font-bold mb-1">
                  Refund Reference / Transaction ID (Optional)
                </label>
                <input
                  type="text"
                  value={refundRef}
                  onChange={(e) => setRefundRef(e.target.value)}
                  placeholder="e.g. rfnd_XXXXXXXX"
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF5C00]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalBooking(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-xs font-bold"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={cancelMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white disabled:opacity-50"
                >
                  {cancelMutation.isPending ? 'Processing...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
