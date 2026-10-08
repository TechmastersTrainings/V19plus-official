'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, ShieldCheck, MapPin, Calendar, CheckCircle2, Ticket } from 'lucide-react';
import { TicketItem, eventsApi } from '../../api/events';

interface TicketQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: TicketItem | null;
}

export function TicketQRModal({ isOpen, onClose, ticket }: TicketQRModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (ticket?.qr_token) {
      QRCode.toDataURL(ticket.qr_token, {
        width: 320,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((url: string) => setQrDataUrl(url))
        .catch((err: Error) => console.error('Failed to generate QR code', err));
    }
  }, [ticket]);

  if (!isOpen || !ticket) return null;

  const pdfUrl = eventsApi.getTicketPdfUrl(ticket.id);

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
        hour12: true,
      });
    } catch {
      return iso;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-md bg-[#121212] border border-white/10 rounded-3xl overflow-hidden shadow-2xl text-white"
        >
          {/* Header decorative stripe */}
          <div className="h-2 w-full bg-gradient-to-r from-[#E50914] via-[#FF5C00] to-[#FF8A00]" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6">
            {/* Restrictions badge */}
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E50914]/20 border border-[#E50914]/50 text-[#FF5C00] text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                {ticket.restrictions || 'Only For Ladies'}
              </span>
              <span className="text-xs font-mono text-gray-400">
                REF: {ticket.booking_reference}
              </span>
            </div>

            {/* Event Title */}
            <h2 className="text-xl font-black text-white tracking-tight leading-snug">
              {ticket.event_title}
            </h2>

            {/* Ticket Tier */}
            <p className="text-sm text-[#FF8A00] font-semibold mt-1">
              {ticket.ticket_type_name} • ₹{ticket.unit_price_inr}
            </p>

            {/* QR Card Container */}
            <div className="my-5 p-5 bg-[#1A1A1A] rounded-2xl border border-white/5 flex flex-col items-center justify-center relative">
              {qrDataUrl ? (
                <div className="p-3 bg-white rounded-xl shadow-lg">
                  <img
                    src={qrDataUrl}
                    alt={`QR Code for Ticket ${ticket.ticket_number}`}
                    className="w-48 h-48 object-contain"
                  />
                </div>
              ) : (
                <div className="w-48 h-48 bg-white/5 rounded-xl flex items-center justify-center animate-pulse">
                  <span className="text-xs text-gray-400">Generating QR...</span>
                </div>
              )}

              <div className="mt-3 text-center">
                <div className="font-mono text-xs font-bold text-gray-300 tracking-wider">
                  {ticket.ticket_number}
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5 flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Verified Pass • Scan at Entry Gate
                </div>
              </div>

              {ticket.is_checked_in && (
                <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center p-4">
                  <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-full mb-2 border border-emerald-500/40">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <span className="text-sm font-bold text-emerald-400">CHECKED IN</span>
                  <span className="text-xs text-gray-300 mt-1">
                    Entry completed at {ticket.checked_in_at ? formatDate(ticket.checked_in_at) : 'gate'}
                  </span>
                </div>
              )}
            </div>

            {/* Attendee & Event Details */}
            <div className="space-y-2 text-xs text-gray-300 bg-white/5 p-4 rounded-xl border border-white/5">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Attendee:</span>
                <span className="font-semibold text-white">{ticket.attendee_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Date & Time:</span>
                <span className="font-semibold text-white">{formatDate(ticket.start_time)}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-gray-400">Venue:</span>
                <span className="font-semibold text-white text-right max-w-[200px]">
                  {ticket.venue_name}, {ticket.venue_address}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex gap-3">
              <a
                href={pdfUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#FF5C00] to-[#E50914] text-white font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-[#FF5C00]/20"
              >
                <Download className="w-4 h-4" />
                Download PDF Pass
              </a>
              <button
                onClick={onClose}
                className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
