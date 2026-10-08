'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShieldCheck,
  Ticket,
  Minus,
  Plus,
  Lock,
  ArrowRight,
  User,
  Mail,
  Phone,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { EventDetail, TicketTypeItem, eventsApi, AttendeeInput } from '../../api/events';
import { useAuthStore } from '../../store/authStore';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: EventDetail;
  ticketType: TicketTypeItem;
}

export function BookingModal({ isOpen, onClose, event, ticketType }: BookingModalProps) {
  const router = useRouter();
  const { user } = useAuthStore();

  const maxAllowed = Math.min(ticketType.max_per_booking, ticketType.available_quantity || 10);
  const [quantity, setQuantity] = useState<number>(1);
  const [customerName, setCustomerName] = useState<string>(user?.name || '');
  const [customerEmail, setCustomerEmail] = useState<string>(user?.email || '');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [ladiesAcknowledged, setLadiesAcknowledged] = useState<boolean>(false);
  const [attendeeNames, setAttendeeNames] = useState<string[]>(['']);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if ((window as any).Razorpay) return resolve(true);

      const existingScript = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      );
      if (existingScript) {
        if ((window as any).Razorpay) return resolve(true);
        existingScript.addEventListener('load', () => resolve(true));
        existingScript.addEventListener('error', () => resolve(false));
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  useEffect(() => {
    if (isOpen) {
      loadRazorpayScript();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleQuantityChange = (newQty: number) => {
    if (newQty < 1 || newQty > maxAllowed) return;
    setQuantity(newQty);

    // Resize attendee list
    const updated = [...attendeeNames];
    while (updated.length < newQty) {
      updated.push('');
    }
    setAttendeeNames(updated.slice(0, newQty));
  };

  const handleAttendeeNameChange = (index: number, val: string) => {
    const updated = [...attendeeNames];
    updated[index] = val;
    setAttendeeNames(updated);
  };

  const totalPaise = ticketType.price_paise * quantity;
  const totalInr = totalPaise / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    if (!customerEmail.trim() || !customerEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!customerPhone.trim() || customerPhone.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }
    if (event.restrictions?.toLowerCase().includes('ladies') && !ladiesAcknowledged) {
      toast.error('Please confirm the "Only For Ladies" entry rule.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Build attendee payload
      const attendeesPayload: AttendeeInput[] = attendeeNames.map((name, idx) => ({
        name: (name.trim() || (idx === 0 ? customerName.trim() : `Attendee ${idx + 1}`)),
        phone: idx === 0 ? customerPhone.trim() : undefined,
      }));

      // 2. Reserve tickets and create order
      const orderRes = await eventsApi.createBookingOrder({
        event_id: event.id,
        ticket_type_id: ticketType.id,
        quantity,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim().toLowerCase(),
        customer_phone: customerPhone.trim(),
        attendees: attendeesPayload,
      });

      const orderData = orderRes.data;

      // 3. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || typeof (window as any).Razorpay === 'undefined') {
        setIsSubmitting(false);
        toast.error('Unable to load Razorpay payment gateway. Please check your internet connection and try again.');
        return;
      }

      // 4. Launch official Razorpay Checkout modal
      const razorpayKey =
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
        orderData.key_id ||
        'rzp_live_Tbb4iLspKtfxWT';

      const options = {
        key: razorpayKey,
        amount: orderData.amount_paise,
        currency: orderData.currency,
        name: 'V19PLUS LIVE EVENTS',
        description: `${event.title} (${quantity} Tickets)`,
        image: '/logo.png',
        order_id: orderData.order_id,
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: customerPhone,
        },
        notes: {
          booking_reference: orderData.booking_reference,
          event_title: event.title,
        },
        theme: {
          color: '#FF5C00',
        },
        handler: async (response: any) => {
          try {
            toast.loading('Verifying payment and issuing tickets...');
            const verifyRes = await eventsApi.verifyPayment({
              booking_id: orderData.booking_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              attendees: attendeesPayload,
            });

            toast.dismiss();
            toast.success('🎉 Tickets confirmed and issued!');
            onClose();
            router.push(`/events/booking/${verifyRes.data.booking_id}`);
          } catch (err: any) {
            toast.dismiss();
            toast.error(err.response?.data?.detail || 'Payment verification failed.');
          }
        },
        modal: {
          ondismiss: () => {
            setIsSubmitting(false);
            toast('Payment window closed. Your 15-minute reservation remains active.', { icon: '⏳' });
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (failRes: any) => {
        setIsSubmitting(false);
        toast.error(`Payment failed: ${failRes.error?.description || 'Transaction declined'}`);
      });
      rzp.open();
    } catch (err: any) {
      setIsSubmitting(false);
      const msg = err.response?.data?.detail || err.message || 'Failed to initiate booking.';
      toast.error(msg);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-[#111111] border border-white/10 rounded-3xl overflow-hidden shadow-2xl text-white my-8"
        >
          {/* Header Bar */}
          <div className="h-2 w-full bg-gradient-to-r from-[#E50914] via-[#FF5C00] to-[#FFA84A]" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <form onSubmit={handleSubmit} className="p-6 sm:p-7">
            {/* Tag & Event Title */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF5C00]/20 border border-[#FF5C00]/40 text-[#FF8A00] text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              Ticket Booking
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
              {event.title}
            </h2>

            <p className="text-xs text-gray-400 mt-1">
              {event.venue_name}, {event.city} • 17 October 2026, 5:00 PM
            </p>

            {/* Ticket Tier & Quantity Selector */}
            <div className="mt-5 p-4 rounded-2xl bg-white/5 border border-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">{ticketType.name}</h3>
                  <div className="text-xs text-[#FF8A00] font-semibold mt-0.5">
                    ₹{ticketType.price_inr} per ticket
                  </div>
                </div>

                {/* Counter */}
                <div className="flex items-center gap-3 bg-black/40 border border-white/10 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center text-white transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <span className="w-6 text-center font-bold text-sm text-white">
                    {quantity}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={quantity >= maxAllowed}
                    className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent flex items-center justify-center text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-2 text-[11px] text-gray-400">
                Max {ticketType.max_per_booking} passes per booking • {ticketType.available_quantity} passes remaining
              </div>
            </div>

            {/* Customer Details */}
            <div className="mt-5 space-y-3.5">
              <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Primary Contact Information
              </h4>

              <div>
                <label className="block text-xs text-gray-300 font-medium mb-1">
                  Full Name <span className="text-[#FF5C00]">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full bg-[#181818] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FF5C00] transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-300 font-medium mb-1">
                    Email Address <span className="text-[#FF5C00]">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="priya@example.com"
                      className="w-full bg-[#181818] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FF5C00] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-300 font-medium mb-1">
                    Mobile Number <span className="text-[#FF5C00]">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full bg-[#181818] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FF5C00] transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Attendees if quantity > 1 */}
              {quantity > 1 && (
                <div className="mt-4 pt-3 border-t border-white/5 space-y-2.5">
                  <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Attendee Names on Passes
                  </h4>
                  {Array.from({ length: quantity }).map((_, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-400 w-16">
                        Pass #{idx + 1}:
                      </span>
                      <input
                        type="text"
                        value={idx === 0 ? (attendeeNames[0] || customerName) : (attendeeNames[idx] || '')}
                        onChange={(e) => handleAttendeeNameChange(idx, e.target.value)}
                        placeholder={`Attendee ${idx + 1} Name`}
                        className="flex-1 bg-[#181818] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#FF5C00] transition-colors"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Restrictions Acknowledgment */}
            {event.restrictions && (
              <div className="mt-5 p-3.5 rounded-xl bg-[#E50914]/10 border border-[#E50914]/30 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="ladies-ack"
                  checked={ladiesAcknowledged}
                  onChange={(e) => setLadiesAcknowledged(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-[#E50914] bg-black/40 border-white/20 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="ladies-ack" className="text-xs text-gray-300 leading-snug cursor-pointer select-none">
                  <span className="font-bold text-white block mb-0.5">
                    IMPORTANT: {event.restrictions}
                  </span>
                  I confirm that all {quantity} attendee(s) fulfill this requirement. Entry at the gate is strictly monitored.
                </label>
              </div>
            )}

            {/* Price Summary */}
            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400">Total Payable Amount</span>
                <div className="text-2xl font-black text-white">
                  ₹{totalInr}{' '}
                  <span className="text-xs text-gray-400 font-normal">
                    ({quantity} × ₹{ticketType.price_inr})
                  </span>
                </div>
              </div>

              <div className="text-right text-[11px] text-gray-400 flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-400" />
                100% Secure via Razorpay
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-5 w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#FF5C00] via-[#FF8A00] to-[#E50914] text-white font-black text-sm tracking-wide uppercase flex items-center justify-center gap-2 shadow-xl shadow-[#FF5C00]/25 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Initiating Payment...
                </div>
              ) : (
                <>
                  Pay ₹{totalInr} & Confirm Passes
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
