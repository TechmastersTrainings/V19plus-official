'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Flame,
  Ticket,
  ChevronRight,
} from 'lucide-react';
import { eventsApi, EventDetail } from '../../../api/events';

export default function EventsIndexPage() {
  const { data: events, isLoading, error } = useQuery({
    queryKey: ['public-events'],
    queryFn: async () => {
      const res = await eventsApi.getEvents();
      return res.data;
    },
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

  const formatTime = (iso: string) => {
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

  return (
    <div className="min-h-screen bg-[#070605] text-white pt-24 pb-28 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[500px] bg-gradient-to-b from-[#E50914]/15 via-[#FF5C00]/10 to-transparent blur-[140px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto">
        {/* Header Hero */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#18120C] border border-[#FF5C00]/30 text-[#FF8A00] text-xs font-bold tracking-widest uppercase mb-5 shadow-lg shadow-[#FF5C00]/10">
            <Sparkles className="w-3.5 h-3.5 text-[#FF5C00]" />
            V19PLUS LIVE EXPERIENCES
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-5 leading-[1.1]">
            Festivals & Live Events.
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#FF5C00] via-[#FF8A00] to-[#FFA84A]">
              Book Official Passes.
            </span>
          </h1>
          <p className="text-gray-300 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Experience electrifying music festivals, cultural celebrations, and premium live gatherings with guaranteed instant digital entry passes.
          </p>
        </div>

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-96 rounded-3xl bg-white/5 border border-white/5 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="p-8 text-center bg-white/5 rounded-3xl border border-white/10 max-w-md mx-auto">
            <p className="text-gray-400 text-sm">Unable to load events at this moment.</p>
          </div>
        )}

        {/* Events Grid */}
        {!isLoading && events && events.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((evt: EventDetail) => (
              <motion.div
                key={evt.id}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.2 }}
                className="group relative bg-[#12100E] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between hover:border-[#FF5C00]/50 transition-colors"
              >
                {/* Poster / Image Section */}
                <div className="relative aspect-[16/10] overflow-hidden bg-black/50">
                  <img
                    src={
                      evt.poster_url ||
                      'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1000&auto=format&fit=crop&q=80'
                    }
                    alt={evt.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#12100E] via-transparent to-black/40" />

                  {/* Top Badges */}
                  <div className="absolute top-3.5 left-3.5 flex flex-wrap gap-2">
                    {evt.restrictions && (
                      <span className="px-2.5 py-1 rounded-full bg-[#E50914] text-white text-[11px] font-black tracking-wide uppercase shadow-lg">
                        {evt.restrictions}
                      </span>
                    )}
                    <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-amber-300 text-[11px] font-bold uppercase tracking-wider border border-white/10">
                      {evt.category}
                    </span>
                  </div>

                  {/* Price Tag Badge */}
                  <div className="absolute bottom-3.5 right-3.5 px-3 py-1.5 rounded-2xl bg-black/80 backdrop-blur-md border border-white/15 text-white">
                    <span className="text-[10px] text-gray-400 block -mb-0.5">FROM</span>
                    <span className="text-base font-black text-[#FF8A00]">
                      ₹{evt.starting_price_inr || 299}
                    </span>
                  </div>
                </div>

                {/* Details Section */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-black text-white group-hover:text-[#FF8A00] transition-colors leading-tight">
                      {evt.title}
                    </h3>

                    {/* Venue & Time details */}
                    <div className="mt-4 space-y-2 text-xs text-gray-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-[#FF5C00]" />
                        <span>
                          {formatDate(evt.start_time)} • {formatTime(evt.start_time)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#FF5C00]" />
                        <span className="truncate">
                          {evt.venue_name}, {evt.city}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Link */}
                  <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      Booking Active
                    </span>

                    <Link
                      href={`/events/${evt.slug}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 group-hover:bg-[#FF5C00] text-white font-bold text-xs transition-colors"
                    >
                      View & Book
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
