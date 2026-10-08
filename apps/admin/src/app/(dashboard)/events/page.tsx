'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Ticket,
  Calendar,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Download,
  QrCode,
  Sliders,
  DollarSign,
  ShieldCheck,
  RefreshCw,
  Edit2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { eventsAdminApi, AdminEventItem, AdminEventStats } from '../../../api/eventsAdmin';

export default function AdminEventsPage() {
  const queryClient = useQueryClient();

  const [capacityModalEvent, setCapacityModalEvent] = useState<AdminEventItem | null>(null);
  const [newCapacity, setNewCapacity] = useState<number>(500);

  // 1. Fetch Events
  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['admin-events'],
    queryFn: async () => {
      const res = await eventsAdminApi.getEvents();
      return res.data;
    },
  });

  const selectedEvent = events?.[0] || null;

  // 2. Fetch Stats for Primary Event (e.g. ZINGAT VOL-7)
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['admin-event-stats', selectedEvent?.id],
    queryFn: async () => {
      if (!selectedEvent?.id) return null;
      const res = await eventsAdminApi.getEventStats(selectedEvent.id);
      return res.data;
    },
    enabled: !!selectedEvent?.id,
    refetchInterval: 10000, // Live poll every 10s
  });

  // Capacity update mutation
  const updateCapacityMutation = useMutation({
    mutationFn: async ({ eventId, cap }: { eventId: string; cap: number }) => {
      await eventsAdminApi.updateEventCapacity(eventId, cap);
      // Also update first ticket type if exists
      if (stats?.ticket_types?.[0]?.ticket_type_id) {
        await eventsAdminApi.updateTicketTypeCapacity(stats.ticket_types[0].ticket_type_id, {
          total_capacity: cap,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
      queryClient.invalidateQueries({ queryKey: ['admin-event-stats'] });
      toast.success('Event capacity updated successfully!');
      setCapacityModalEvent(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Failed to update capacity');
    },
  });

  const handleOpenCapacityModal = (evt: AdminEventItem) => {
    setCapacityModalEvent(evt);
    setNewCapacity(evt.total_capacity || 500);
  };

  const handleSaveCapacity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!capacityModalEvent) return;
    if (newCapacity < 1) {
      toast.error('Capacity must be at least 1');
      return;
    }
    updateCapacityMutation.mutate({ eventId: capacityModalEvent.id, cap: newCapacity });
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-IN', {
        weekday: 'short',
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
    <div className="space-y-8 p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5C00]/15 text-[#FF8A00] text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            V19PLUS Live Events
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Events & Ticketing Management
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time ticketing capacity, booking orders, and live entry gate operations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/events/scanner"
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF5C00] to-[#E50914] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-[#FF5C00]/25 hover:brightness-110 transition-all"
          >
            <QrCode className="w-4 h-4" />
            Launch Gate Scanner
          </Link>
          <button
            onClick={() => {
              refetchEvents();
              refetchStats();
              toast.success('Stats refreshed');
            }}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary Event Live Statistics Banner */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-5 rounded-2xl bg-[#141414] border border-white/5">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
              <span>Total Venue Capacity</span>
              <Users className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">{stats.total_capacity}</div>
            <span className="text-[11px] text-gray-400 mt-1 block">Configurable from admin</span>
          </div>

          <div className="p-5 rounded-2xl bg-[#141414] border border-white/5">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
              <span>Passes Sold</span>
              <Ticket className="w-4 h-4 text-[#FF5C00]" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#FF8A00]">{stats.total_sold}</div>
            <span className="text-[11px] text-emerald-400 mt-1 block">
              {stats.sold_percentage}% of capacity
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-[#141414] border border-white/5">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
              <span>Remaining Quota</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              {stats.remaining_capacity}
            </div>
            <span className="text-[11px] text-gray-400 mt-1 block">Available for booking</span>
          </div>

          <div className="p-5 rounded-2xl bg-[#141414] border border-white/5">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
              <span>Checked In at Gate</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400">
              {stats.total_checked_in}
            </div>
            <span className="text-[11px] text-emerald-300/80 mt-1 block">
              {stats.check_in_percentage}% of sold passes
            </span>
          </div>

          <div className="p-5 rounded-2xl bg-[#141414] border border-white/5 col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between text-gray-400 text-xs mb-2">
              <span>Total Revenue</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white">
              ₹{stats.total_revenue_inr.toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-gray-400 mt-1 block">Razorpay settlements</span>
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-white">Active Events</h2>

        {eventsLoading && (
          <div className="h-44 bg-[#141414] rounded-2xl animate-pulse" />
        )}

        {events && events.map((evt: AdminEventItem) => (
          <div
            key={evt.id}
            className="bg-[#141414] border border-white/10 rounded-2xl p-6 flex flex-col lg:flex-row justify-between lg:items-center gap-6 shadow-xl"
          >
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-[#E50914] text-white text-[10px] font-black uppercase">
                  {evt.restrictions || 'Only For Ladies'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white/5 text-amber-300 text-[10px] font-bold uppercase border border-white/10">
                  {evt.category}
                </span>
                <span className="text-xs text-gray-400 font-mono">SLUG: {evt.slug}</span>
              </div>

              <h3 className="text-xl font-black text-white">{evt.title}</h3>

              <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#FF5C00]" />
                  {formatDate(evt.start_time)}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#FF5C00]" />
                  {evt.venue_name}, {evt.city}
                </span>
                <span className="flex items-center gap-1.5">
                  <Ticket className="w-3.5 h-3.5 text-emerald-400" />
                  Entry: ₹{evt.starting_price_inr || 299}
                </span>
                <span className="flex items-center gap-1.5 font-bold text-white">
                  Capacity: {evt.total_capacity}
                </span>
              </div>
            </div>

            {/* Actions for this event */}
            <div className="flex flex-wrap items-center gap-3 self-start lg:self-auto">
              <button
                onClick={() => handleOpenCapacityModal(evt)}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center gap-1.5 border border-white/10 transition-colors"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                Set Capacity ({evt.total_capacity})
              </button>

              <Link
                href={`/events/${evt.id}/bookings`}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center gap-1.5 border border-white/10 transition-colors"
              >
                <Users className="w-3.5 h-3.5 text-sky-400" />
                Bookings & Attendees
              </Link>

              <a
                href={eventsAdminApi.getExportCsvUrl(evt.id)}
                target="_blank"
                rel="noreferrer"
                download
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center gap-1.5 border border-white/10 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                Export CSV
              </a>

              <Link
                href="/events/scanner"
                className="px-4 py-2 rounded-xl bg-[#FF5C00] hover:bg-[#FF8A00] text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-[#FF5C00]/20"
              >
                <QrCode className="w-3.5 h-3.5" />
                Scan Passes
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Capacity Modal */}
      {capacityModalEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#141414] border border-white/10 rounded-2xl max-w-md w-full p-6 text-white shadow-2xl">
            <h3 className="text-lg font-black mb-1">Adjust Event Capacity</h3>
            <p className="text-xs text-gray-400 mb-4">
              Configure the total capacity limit for <strong>{capacityModalEvent.title}</strong>. Concurrency protection prevents bookings past this limit.
            </p>

            <form onSubmit={handleSaveCapacity} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-300 font-bold mb-1">
                  Total Venue Capacity
                </label>
                <input
                  type="number"
                  min="1"
                  max="100000"
                  required
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(parseInt(e.target.value) || 0)}
                  className="w-full bg-[#1e1e1e] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#FF5C00]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCapacityModalEvent(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateCapacityMutation.isPending}
                  className="px-5 py-2 rounded-xl bg-[#FF5C00] hover:bg-[#FF8A00] text-xs font-bold text-white disabled:opacity-50"
                >
                  {updateCapacityMutation.isPending ? 'Updating...' : 'Save Capacity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
