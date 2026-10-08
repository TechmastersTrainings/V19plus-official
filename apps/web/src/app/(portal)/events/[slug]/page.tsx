'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  ShieldCheck,
  Ticket,
  Users,
  Sparkles,
  Music,
  CheckCircle2,
  Award,
  AlertTriangle,
  ArrowRight,
  Share2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { eventsApi, EventDetail, TicketTypeItem } from '../../../../api/events';
import { BookingModal } from '../../../../components/events/BookingModal';

export default function EventDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const router = useRouter();

  const [bookingModalOpen, setBookingModalOpen] = useState<boolean>(false);
  const [selectedTicketType, setSelectedTicketType] = useState<TicketTypeItem | null>(null);

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event-detail', slug],
    queryFn: async () => {
      const res = await eventsApi.getEventBySlug(slug);
      return res.data;
    },
    enabled: !!slug,
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

  const handleBookClick = (tt: TicketTypeItem) => {
    setSelectedTicketType(tt);
    setBookingModalOpen(true);
  };

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: event?.title || 'ZINGAT VOL-7 Dandiya Festival 2K26',
        text: 'Book official passes for ZINGAT VOL-7 Dandiya Festival 2K26 on V19PLUS!',
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Event link copied to clipboard!');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070605] pt-28 pb-16 px-4 flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-[#FF5C00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-[#070605] pt-28 pb-16 px-4 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Event Not Found</h1>
        <p className="text-gray-400 text-sm mb-6">The requested event could not be found or has concluded.</p>
        <button
          onClick={() => router.push('/events')}
          className="px-6 py-2.5 rounded-xl bg-[#FF5C00] text-white font-bold text-sm"
        >
          Explore All Events
        </button>
      </div>
    );
  }

  const primaryTicketType = event.ticket_types?.[0] || null;

  return (
    <div className="min-h-screen bg-[#070605] text-white pt-20 pb-32 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[550px] bg-gradient-to-b from-[#E50914]/20 via-[#FF5C00]/10 to-transparent blur-[150px] pointer-events-none -z-10" />

      {/* Hero Banner Section */}
      <div className="relative w-full h-[380px] sm:h-[480px] lg:h-[520px] bg-black">
        <img
          src={
            event.banner_url ||
            event.poster_url ||
            'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600&auto=format&fit=crop&q=80'
          }
          alt={event.title}
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070605] via-[#070605]/50 to-black/60" />

        <div className="absolute inset-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-10">
          <div className="max-w-3xl">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2.5 mb-4">
              {event.restrictions && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#E50914] text-white text-xs font-black tracking-wider uppercase shadow-xl shadow-[#E50914]/30">
                  <ShieldCheck className="w-4 h-4" />
                  {event.restrictions}
                </span>
              )}
              <span className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-amber-300 text-xs font-bold uppercase tracking-wider border border-white/10">
                {event.category}
              </span>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Booking Open
              </span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
              {event.title}
            </h1>

            {/* Quick meta row */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs sm:text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#FF5C00]" />
                <span className="font-semibold text-white">{formatDate(event.start_time)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#FF5C00]" />
                <span>
                  {formatTime(event.start_time)} – {formatTime(event.end_time)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#FF5C00]" />
                <span>
                  {event.venue_name}, {event.city}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left Column: Details, Highlights, Rules, Schedule */}
          <div className="lg:col-span-2 space-y-10">
            {/* About Event */}
            <section className="bg-[#12100E] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl">
              <h2 className="text-xl sm:text-2xl font-black text-white mb-4 flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-[#FF5C00]" />
                About The Festival
              </h2>
              <p className="text-gray-300 text-sm sm:text-base leading-relaxed whitespace-pre-line">
                {event.description}
              </p>

              {/* Event Feature Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/5">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-[#FF5C00]/20 text-[#FF5C00]">
                    <Music className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Live DJ & Percussion</h3>
                    <p className="text-xs text-gray-400 mt-0.5">High-energy Dandiya beats and Gujarati folk rhythms.</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-[#E50914]/20 text-[#E50914]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Exclusively For Ladies</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Safe, comfortable, and private festival arena.</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Exciting Prizes</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Awards for Best Dressed Traditional and Best Dancer.</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Instant Digital Pass</h3>
                    <p className="text-xs text-gray-400 mt-0.5">QR pass generated instantly with PDF download.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Venue & Location Box */}
            <section className="bg-[#12100E] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl">
              <h2 className="text-xl sm:text-2xl font-black text-white mb-4 flex items-center gap-2.5">
                <MapPin className="w-5 h-5 text-[#FF5C00]" />
                Event Venue & Location
              </h2>

              <div className="p-5 rounded-2xl bg-white/5 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{event.venue_name}</h3>
                  <p className="text-xs sm:text-sm text-gray-300 mt-1 max-w-xl">
                    {event.venue_address}
                  </p>
                  <p className="text-xs text-[#FF8A00] font-semibold mt-1">
                    City: {event.city}, Karnataka
                  </p>
                </div>

                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(
                    `${event.venue_name}, ${event.venue_address}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors whitespace-nowrap self-start sm:self-auto"
                >
                  <MapPin className="w-4 h-4 text-[#FF5C00]" />
                  Open in Google Maps
                </a>
              </div>
            </section>

            {/* Terms and Guidelines */}
            <section className="bg-[#12100E] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl">
              <h2 className="text-xl sm:text-2xl font-black text-white mb-4 flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                Guidelines & Entry Rules
              </h2>
              <div className="space-y-3 text-xs sm:text-sm text-gray-300 leading-relaxed">
                <div className="p-3.5 rounded-xl bg-[#E50914]/10 border border-[#E50914]/20 flex items-start gap-2.5 text-red-200">
                  <ShieldCheck className="w-4 h-4 text-[#E50914] shrink-0 mt-0.5" />
                  <span>
                    <strong>Strict Entry Policy:</strong> As announced, this event is <strong>ONLY FOR LADIES</strong>. Organizers reserve right of entry verification at gates.
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Gates open at <strong>4:30 PM</strong>. Arrive early to complete QR scanning smoothly and avoid queues.
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Each digital ticket pass is valid for <strong>one attendee only</strong>. Do not share your QR code to prevent duplicate entry rejection.
                  </span>
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Ticket Booking Box */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 bg-[#14110E] border-2 border-[#FF5C00]/40 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-[#FF5C00]/10">
              {/* Badge */}
              <div className="flex items-center justify-between mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF5C00]/20 text-[#FF8A00] text-xs font-bold uppercase tracking-wider">
                  <Ticket className="w-3.5 h-3.5" />
                  Official Entry Pass
                </span>
                <button
                  onClick={handleShare}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
                  title="Share Event"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {/* Price Display */}
              <div className="mb-6">
                <span className="text-xs text-gray-400 block mb-0.5">Ticket Price</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white">
                    ₹{primaryTicketType ? primaryTicketType.price_inr : 299}
                  </span>
                  <span className="text-xs text-gray-400">per person</span>
                </div>
              </div>

              {/* Ticket Tier Info */}
              {primaryTicketType && (
                <div className="p-4 rounded-2xl bg-white/5 border border-white/5 mb-6">
                  <h4 className="text-sm font-bold text-white">{primaryTicketType.name}</h4>
                  <p className="text-xs text-gray-400 mt-1">{primaryTicketType.description}</p>

                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                    <span className="text-gray-400">Status</span>
                    <span className="font-semibold text-emerald-400">
                      Available ({primaryTicketType.available_quantity} left)
                    </span>
                  </div>
                </div>
              )}

              {/* Primary Call to Action Button */}
              {primaryTicketType && (
                <button
                  onClick={() => handleBookClick(primaryTicketType)}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#FF5C00] via-[#FF8A00] to-[#E50914] text-white font-black text-sm tracking-wide uppercase flex items-center justify-center gap-2 shadow-xl shadow-[#FF5C00]/30 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Book Official Passes
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {/* Security note */}
              <div className="mt-4 text-center text-[11px] text-gray-400 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Instant QR Delivery • Verified Razorpay Checkout
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Bar for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#0A0908]/95 backdrop-blur-md border-t border-white/10 lg:hidden z-40 flex items-center justify-between">
        <div>
          <span className="text-[10px] text-gray-400 block -mb-0.5">ENTRY PASS</span>
          <span className="text-xl font-black text-white">
            ₹{primaryTicketType ? primaryTicketType.price_inr : 299}
          </span>
        </div>

        {primaryTicketType && (
          <button
            onClick={() => handleBookClick(primaryTicketType)}
            className="py-3 px-6 rounded-xl bg-gradient-to-r from-[#FF5C00] to-[#E50914] text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#FF5C00]/25"
          >
            Book Passes
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Booking Modal */}
      {selectedTicketType && (
        <BookingModal
          isOpen={bookingModalOpen}
          onClose={() => setBookingModalOpen(false)}
          event={event}
          ticketType={selectedTicketType}
        />
      )}
    </div>
  );
}
