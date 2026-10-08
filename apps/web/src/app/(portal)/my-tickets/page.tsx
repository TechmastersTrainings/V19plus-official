'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Ticket,
  Calendar,
  MapPin,
  Clock,
  QrCode,
  Download,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Search,
} from 'lucide-react';
import { eventsApi, BookingDetail, TicketItem } from '../../../api/events';
import { useAuthStore } from '../../../store/authStore';
import { TicketQRModal } from '../../../components/events/TicketQRModal';

export default function MyTicketsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [activeQRModalTicket, setActiveQRModalTicket] = useState<TicketItem | null>(null);
  const [searchRef, setSearchRef] = useState<string>('');

  const { data: bookings, isLoading, error, refetch } = useQuery({
    queryKey: ['my-tickets'],
    queryFn: async () => {
      const res = await eventsApi.getMyTickets();
      return res.data;
    },
    enabled: isAuthenticated,
  });

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-IN', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const handleLookupBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchRef.trim()) return;
    router.push(`/events/booking/${searchRef.trim()}`);
  };

  return (
    <div className="min-h-screen bg-[#070605] text-white pt-24 pb-28 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-[#FF5C00]/15 via-[#FF8A00]/5 to-transparent blur-[140px] pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#18120C] border border-[#FF5C00]/30 text-[#FF8A00] text-xs font-bold uppercase tracking-wider mb-2">
              <Ticket className="w-3.5 h-3.5 text-[#FF5C00]" />
              Event Entry Passes
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              My Tickets & Passes
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              View active digital passes, display QR codes at event entry gates, or download PDFs.
            </p>
          </div>

          <Link
            href="/events"
            className="self-start sm:self-auto px-5 py-2.5 rounded-xl bg-white/10 hover:bg-[#FF5C00] text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            Explore Events
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Not authenticated banner / Quick Lookup */}
        {!isAuthenticated && (
          <div className="mb-10 p-6 rounded-3xl bg-[#141210] border border-white/10">
            <h3 className="text-base font-bold text-white mb-2">Find Your Passes</h3>
            <p className="text-xs text-gray-400 mb-4">
              Sign in to your V19PLUS account to view your passes automatically, or look up by Booking Reference ID below.
            </p>

            <form onSubmit={handleLookupBooking} className="flex gap-2 max-w-md">
              <input
                type="text"
                value={searchRef}
                onChange={(e) => setSearchRef(e.target.value)}
                placeholder="Enter Booking ID (e.g. UUID or Reference)"
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FF5C00]"
              />
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#FF5C00] text-white font-bold text-xs"
              >
                Find Pass
              </button>
            </form>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-44 rounded-3xl bg-white/5 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {isAuthenticated && !isLoading && (!bookings || bookings.length === 0) && (
          <div className="p-12 text-center bg-[#12100E] rounded-3xl border border-white/10">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 text-gray-400">
              <Ticket className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No Booked Passes Found</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto mb-6">
              You haven't booked any event passes yet. Browse upcoming festivals and grab your tickets!
            </p>
            <Link
              href="/events"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#FF5C00] to-[#E50914] text-white font-bold text-xs uppercase tracking-wider"
            >
              Browse Live Events
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Bookings & Passes List */}
        {bookings && bookings.length > 0 && (
          <div className="space-y-6">
            {bookings.map((b: BookingDetail) => (
              <div
                key={b.id}
                className="bg-[#12100E] border border-white/10 rounded-3xl overflow-hidden shadow-xl"
              >
                {/* Event header row */}
                <div className="p-5 sm:p-6 border-b border-white/10 flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white/[0.02]">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold text-[#FF8A00]">
                        REF: {b.booking_reference}
                      </span>
                      {b.restrictions && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E50914]/20 border border-[#E50914]/40 text-red-300 font-bold uppercase">
                          {b.restrictions}
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg sm:text-xl font-black text-white">{b.event_title}</h2>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#FF5C00]" />
                        {formatDate(b.start_time)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-[#FF5C00]" />
                        {b.venue_name}
                      </span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-xs text-gray-400 block mb-0.5">Paid</span>
                    <span className="text-lg font-black text-white">₹{b.total_amount_inr}</span>
                    <span className="text-[11px] text-emerald-400 font-semibold block mt-0.5">
                      {b.quantity} {b.quantity === 1 ? 'Pass' : 'Passes'}
                    </span>
                  </div>
                </div>

                {/* Individual ticket passes */}
                <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {b.tickets.map((t: TicketItem, idx: number) => (
                    <div
                      key={t.id}
                      className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white">
                          Pass #{idx + 1}: {t.attendee_name}
                        </span>
                        {t.is_checked_in ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold uppercase border border-emerald-500/30">
                            Checked In
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold uppercase border border-amber-500/30">
                            Ready For Entry
                          </span>
                        )}
                      </div>

                      <div className="font-mono text-[11px] text-gray-400 mb-4">
                        {t.ticket_number} • {t.ticket_type_name}
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => setActiveQRModalTicket(t)}
                          className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <QrCode className="w-3.5 h-3.5 text-[#FF5C00]" />
                          Show QR Pass
                        </button>

                        <a
                          href={eventsApi.getTicketPdfUrl(t.id)}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="flex-1 py-2 px-3 rounded-xl bg-[#FF5C00] hover:bg-[#FF8A00] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-[#FF5C00]/20"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download PDF
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
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
