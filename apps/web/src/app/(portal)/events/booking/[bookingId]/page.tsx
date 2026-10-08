'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Download,
  QrCode,
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  Ticket,
  ArrowRight,
  Share2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { eventsApi, BookingDetail, TicketItem } from '../../../../../api/events';
import { TicketQRModal } from '../../../../../components/events/TicketQRModal';

export default function BookingSuccessPage() {
  const params = useParams();
  const bookingId = params?.bookingId as string;
  const router = useRouter();

  const [activeQRModalTicket, setActiveQRModalTicket] = useState<TicketItem | null>(null);

  const { data: booking, isLoading, error } = useQuery({
    queryKey: ['booking-detail', bookingId],
    queryFn: async () => {
      const res = await eventsApi.getBooking(bookingId);
      return res.data;
    },
    enabled: !!bookingId,
    refetchInterval: (query: { state: { data?: BookingDetail } }) => {
      // If still pending, poll every 2 seconds
      return query.state.data?.status === 'PENDING' ? 2000 : false;
    },
  });

  const formatDate = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-IN', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const formatTime = (iso?: string) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('en-IN', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      });
    } catch {
      return iso;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070605] pt-32 pb-16 px-4 flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-[#FF5C00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#070605] pt-32 pb-16 px-4 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Booking Not Found</h1>
        <p className="text-gray-400 text-sm mb-6">Unable to locate this booking reference.</p>
        <button
          onClick={() => router.push('/events')}
          className="px-6 py-2.5 rounded-xl bg-[#FF5C00] text-white font-bold text-sm"
        >
          Return to Events
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070605] text-white pt-24 pb-28 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-emerald-500/10 via-[#FF5C00]/10 to-transparent blur-[140px] pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-10">
          <div className="inline-flex p-3 bg-emerald-500/20 text-emerald-400 rounded-full mb-4 border border-emerald-500/40">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Booking Confirmed!
          </h1>
          <p className="text-sm sm:text-base text-gray-300 mt-2">
            Your official digital entry passes have been generated and issued.
          </p>
          <div className="mt-3 inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 font-mono text-xs text-amber-300 font-bold">
            REFERENCE: {booking.booking_reference}
          </div>
        </div>

        {/* Event Card Summary */}
        <div className="bg-[#12100E] border border-white/10 rounded-3xl p-6 sm:p-7 shadow-xl mb-8">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-white/10 pb-5 mb-5">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF8A00] block mb-1">
                Event
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white">{booking.event_title}</h2>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-300">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#FF5C00]" />
                  {formatDate(booking.start_time)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#FF5C00]" />
                  {formatTime(booking.start_time)} – {formatTime(booking.end_time)}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#FF5C00]" />
                  {booking.venue_name}
                </span>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-gray-400 block mb-0.5">Total Paid</span>
              <div className="text-2xl font-black text-white">
                ₹{booking.total_amount_inr}
              </div>
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center sm:justify-end gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3" />
                Payment Captured
              </span>
            </div>
          </div>

          {booking.restrictions && (
            <div className="p-3 rounded-xl bg-[#E50914]/10 border border-[#E50914]/30 text-xs text-red-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#E50914] shrink-0" />
              <span>
                <strong>Entry Policy:</strong> {booking.restrictions}. Please ensure valid identification is available.
              </span>
            </div>
          )}
        </div>

        {/* Individual Passes Section */}
        <div className="space-y-4 mb-10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Ticket className="w-5 h-5 text-[#FF5C00]" />
              Digital Passes ({booking.tickets.length})
            </h3>
            <span className="text-xs text-gray-400">
              Present digital QR or printed PDF at entrance gate
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {booking.tickets.map((t: TicketItem, idx: number) => (
              <div
                key={t.id}
                className="bg-[#151210] border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:border-[#FF5C00]/40 transition-colors shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-[#FF8A00]">
                      PASS #{idx + 1}
                    </span>
                    <span className="text-[11px] font-mono text-gray-400">
                      {t.ticket_number}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-white">{t.attendee_name}</h4>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t.ticket_type_name} • ₹{t.unit_price_inr}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-white/5 flex gap-2.5">
                  <button
                    onClick={() => setActiveQRModalTicket(t)}
                    className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <QrCode className="w-4 h-4 text-[#FF5C00]" />
                    View QR Pass
                  </button>

                  <a
                    href={eventsApi.getTicketPdfUrl(t.id)}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="flex-1 py-2 px-3 rounded-xl bg-[#FF5C00] hover:bg-[#FF8A00] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-[#FF5C00]/20"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex flex-wrap gap-4 justify-between items-center pt-6 border-t border-white/10">
          <button
            onClick={() => router.push('/my-tickets')}
            className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm transition-colors"
          >
            Go to My Tickets
          </button>

          <button
            onClick={() => router.push('/events')}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF5C00] to-[#E50914] text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-[#FF5C00]/20"
          >
            Explore More Events
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Ticket QR Modal */}
      {activeQRModalTicket && (
        <TicketQRModal
          isOpen={!!activeQRModalTicket}
          onClose={() => setActiveQRModalTicket(null)}
          ticket={activeQRModalTicket}
        />
      )}
    </div>
  );
}
