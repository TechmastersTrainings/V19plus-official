'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, useRouter } from 'next/navigation';
import { subscriptionApi, Plan, UserSubscription } from '../../../api/subscription';
import { useAuthStore } from '../../../store/authStore';
import toast from 'react-hot-toast';
import {
  Check,
  Sparkles,
  ShieldCheck,
  Tv,
  Smartphone,
  Laptop,
  Flame,
  Zap,
  ChevronDown,
  ArrowRight,
  Lock,
} from 'lucide-react';

const PLAN_META: Record<
  string,
  {
    badge?: string;
    isPopular?: boolean;
    isBestValue?: boolean;
    resolutionLabel: string;
    soundLabel: string;
    deviceLabel: string;
    perks: string[];
    gradient: string;
    borderGlow: string;
  }
> = {
  mobile: {
    resolutionLabel: '480p SD',
    soundLabel: 'Stereo 2.0',
    deviceLabel: 'Phone & Tablet',
    perks: [
      'Stream on 1 mobile or tablet',
      'Standard definition (480p)',
      'Unlimited movies & V19+ originals',
      'Download on 1 phone or tablet',
      'Cancel anytime in 1 click',
    ],
    gradient: 'from-[#14100D] via-[#0E0C0A] to-[#070605]',
    borderGlow: 'border-white/10 hover:border-amber-500/40',
  },
  'standard-hd': {
    resolutionLabel: '1080p Full HD',
    soundLabel: '5.1 Surround',
    deviceLabel: 'All Devices (Phone, Tablet, Laptop, TV)',
    perks: [
      'Full HD (1080p) cinema clarity',
      'Stream on 2 screens simultaneously',
      'Watch on TV, Laptop, Tablet & Mobile',
      'Downloads on 2 registered devices',
      'Completely ad-free experience',
    ],
    gradient: 'from-[#16120D] via-[#0E0C0A] to-[#070605]',
    borderGlow: 'border-white/10 hover:border-[#FF5C00]/50',
  },
  'premium-4k': {
    badge: 'MOST POPULAR',
    isPopular: true,
    resolutionLabel: '4K Ultra HD + HDR10+',
    soundLabel: 'Dolby Atmos® & Spatial Audio',
    deviceLabel: 'All Devices + Smart TVs & Consoles',
    perks: [
      'Full 4K Ultra HD with HDR10+ color depth',
      'Dolby Atmos® 3D spatial surround sound',
      'Stream on 4 screens at the same time',
      'Offline downloads on 4 devices',
      'Early VIP access to V19+ Masterclasses',
      'Zero ads, 60fps high bitrate streaming',
    ],
    gradient: 'from-[#2A1608] via-[#140D07] to-[#070605]',
    borderGlow: 'border-[#FF5C00]/80 shadow-[0_0_35px_rgba(255,92,0,0.28)]',
  },
  'annual-vip': {
    badge: 'BEST VALUE • SAVE 20%',
    isBestValue: true,
    resolutionLabel: '4K Ultra HD + HDR10+',
    soundLabel: 'Dolby Atmos® & Spatial Audio',
    deviceLabel: 'All Devices + VIP Dedicated Concierge',
    perks: [
      '12 full months of uninterrupted 4K Ultra HD',
      'Equivalent to just ₹249/month (Save ₹6,589)',
      'Stream on 4 screens simultaneously',
      'Dolby Atmos® & IMAX enhanced masters',
      'Priority festival premier screenings',
      '24/7 dedicated VIP customer concierge',
    ],
    gradient: 'from-[#20180B] via-[#120F08] to-[#070605]',
    borderGlow: 'border-amber-400/60 shadow-[0_0_30px_rgba(245,158,11,0.22)]',
  },
};

function SubscriptionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, fetchMe } = useAuthStore();
  const queryClient = useQueryClient();

  const [billingFilter, setBillingFilter] = useState<'all' | 'monthly' | 'yearly'>('all');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    if (searchParams.get('success')) {
      toast.success('🎉 Subscription successfully activated! Welcome to V19+ VIP.');
      fetchMe();
    }
  }, [searchParams, fetchMe]);

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const res = await subscriptionApi.getPlans();
      return res.data;
    },
  });

  const { data: currentSub } = useQuery({
    queryKey: ['subscription-current'],
    queryFn: async () => {
      try {
        const res = await subscriptionApi.getCurrent();
        return res.data;
      } catch {
        return null;
      }
    },
    enabled: isAuthenticated,
  });

  const orderMutation = useMutation({
    mutationFn: async (plan: Plan) => {
      if (!isAuthenticated) {
        toast.error('Please sign in to choose a subscription plan.');
        router.push(`/login?returnUrl=/subscription`);
        return;
      }

      // Check if native Capacitor
      const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.();
      if (isNative) {
        toast('Google Play Billing will open in the native app. Continuing on web...', { icon: '📱' });
      }

      const res = await subscriptionApi.createOrder(plan.id);
      return { order: res.data, plan };
    },
    onSuccess: (data: any) => {
      if (!data) return;
      const { order, plan } = data;

      // Check if Razorpay script is present or mock order
      if (order.key_id && !order.key_id.includes('placeholder') && typeof (window as any).Razorpay !== 'undefined') {
        const rzp = new (window as any).Razorpay({
          key: order.key_id,
          amount: order.amount,
          currency: order.currency,
          name: 'V19plus Premium',
          description: `Subscription: ${plan.name}`,
          order_id: order.order_id,
          prefill: {
            name: user?.name || '',
            email: user?.email || '',
          },
          theme: { color: '#FF5C00' },
          handler: async (paymentRes: any) => {
            try {
              await subscriptionApi.verifyPayment({
                razorpay_order_id: paymentRes.razorpay_order_id,
                razorpay_payment_id: paymentRes.razorpay_payment_id,
                razorpay_signature: paymentRes.razorpay_signature,
                plan_id: plan.id,
              });
              toast.success(`🎉 Welcome to V19+ ${plan.name}!`);
              queryClient.invalidateQueries({ queryKey: ['subscription-current'] });
              fetchMe();
            } catch (err: any) {
              toast.error('Payment verification failed. Please contact support.');
            }
          },
        });
        rzp.open();
      } else {
        // Test / mock sandbox mode
        toast.success(`Order initiated for ${plan.name}! In sandbox mode, your plan is activated.`);
        queryClient.invalidateQueries({ queryKey: ['subscription-current'] });
        fetchMe();
      }
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Unable to initiate checkout. Please try again.';
      toast.error(typeof msg === 'string' ? msg : 'Checkout failed.');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => subscriptionApi.cancel(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-current'] });
      fetchMe();
      toast.success('Your subscription will not renew after the current period.');
    },
    onError: () => {
      toast.error('Failed to cancel subscription.');
    },
  });

  const filteredPlans = (plans || []).filter((p: Plan) => {
    if (billingFilter === 'monthly') return p.billing_interval === 'monthly';
    if (billingFilter === 'yearly') return p.billing_interval === 'yearly';
    return true;
  });

  const faqs = [
    {
      q: 'How does the V19plus free trial or instant activation work?',
      a: 'Once you choose any V19+ pass, your account receives instant access across all your devices. You can stream our 4K Ultra HD catalog and original masterclasses immediately.',
    },
    {
      q: 'Can I switch or cancel my plan at any time?',
      a: 'Yes, absolutely. There are zero long-term lock-in contracts. You can upgrade, downgrade, or cancel anytime in 1 click from your account dashboard. You will continue to have access until your billing cycle ends.',
    },
    {
      q: 'Which devices are supported on V19plus?',
      a: 'V19plus runs on modern web browsers (Chrome, Safari, Firefox, Edge), iOS & iPadOS, Android mobile & tablets, Apple TV, Android TV, Amazon Fire TV, and Chromecast.',
    },
    {
      q: 'What is the video & audio streaming quality?',
      a: 'Our Standard tier delivers pristine 1080p Full HD at high bitrates. Premium 4K and Annual VIP passes deliver full 4K Ultra HD, HDR10+, and Dolby Atmos® 3D spatial audio mastered for theater-quality sound.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#070605] text-white pt-24 pb-28 px-4 sm:px-6 lg:px-8 relative overflow-hidden select-none">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-[#FF5C00]/15 via-[#FF8A00]/5 to-transparent blur-[140px] pointer-events-none -z-10" />
      <div className="absolute top-1/3 -right-48 w-96 h-96 bg-[#FF5C00]/10 blur-[160px] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto">
        {/* Header Hero */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#18120C] border border-[#FF5C00]/30 text-[#FF8A00] text-xs font-bold tracking-widest uppercase mb-5 shadow-lg shadow-[#FF5C00]/10">
            <Sparkles className="w-3.5 h-3.5 text-[#FF5C00]" />
            V19+ All-Access Pass
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-5 leading-[1.1]">
            Cinematic Brilliance.
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#FF5C00] via-[#FF8A00] to-[#FFA84A]">
              Uncompromised Fidelity.
            </span>
          </h1>
          <p className="text-gray-300 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
            Experience ground-breaking originals, 4K HDR10+ cinema, and Dolby Atmos® surround sound on all your screens.
            Cancel anytime in one tap.
          </p>

          {/* Billing Switcher Filter */}
          <div className="mt-8 inline-flex p-1.5 rounded-2xl bg-[#120F0C] border border-white/10 shadow-2xl">
            <button
              onClick={() => setBillingFilter('all')}
              className={`px-5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                billingFilter === 'all'
                  ? 'bg-gradient-to-r from-[#FF5C00] to-[#E04800] text-white shadow-lg shadow-[#FF5C00]/25'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              All Passes
            </button>
            <button
              onClick={() => setBillingFilter('monthly')}
              className={`px-5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                billingFilter === 'monthly'
                  ? 'bg-gradient-to-r from-[#FF5C00] to-[#E04800] text-white shadow-lg shadow-[#FF5C00]/25'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly Passes
            </button>
            <button
              onClick={() => setBillingFilter('yearly')}
              className={`flex items-center gap-1.5 px-5 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all ${
                billingFilter === 'yearly'
                  ? 'bg-gradient-to-r from-[#FF5C00] to-[#E04800] text-white shadow-lg shadow-[#FF5C00]/25'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Annual VIP
              <span className="px-1.5 py-0.5 text-[10px] uppercase font-black bg-amber-400/20 text-amber-300 rounded border border-amber-400/30">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Active Subscription Banner */}
        {currentSub && (
          <div className="mb-12 rounded-2xl p-6 sm:p-7 bg-[#120F0C]/90 border border-emerald-500/30 backdrop-blur-xl shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-extrabold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Active Plan
                  </span>
                  <span className="text-lg font-black text-white">{currentSub.plan?.name || 'V19+ Subscriber'}</span>
                </div>
                <p className="text-xs sm:text-sm text-gray-400 mt-1">
                  Active until{' '}
                  <span className="text-gray-200 font-semibold">
                    {new Date(currentSub.current_period_end).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                  {currentSub.cancel_at_period_end && ' (Will not renew)'}
                </p>
              </div>
            </div>

            {!currentSub.cancel_at_period_end && (
              <button
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
                className="px-5 py-2.5 text-xs font-bold text-gray-400 hover:text-red-400 border border-white/10 hover:border-red-500/40 rounded-xl transition-all disabled:opacity-50 self-start sm:self-auto"
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Auto-Renewal'}
              </button>
            )}
          </div>
        )}

        {/* Pricing Cards Grid */}
        {plansLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-[520px] rounded-3xl bg-[#110D0A] border border-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {filteredPlans.map((plan: Plan) => {
              const meta = PLAN_META[plan.slug] || {
                resolutionLabel: plan.max_resolution || 'HD',
                soundLabel: 'Standard Audio',
                deviceLabel: 'Supported Devices',
                perks: [plan.description || 'Unlimited V19+ streaming'],
                gradient: 'from-[#14100D] to-[#070605]',
                borderGlow: 'border-white/10',
              };

              const isCurrent = currentSub?.plan?.id === plan.id;
              const isPopular = meta.isPopular;
              const isBestValue = meta.isBestValue;
              const priceInRupees = plan.price_inr_paise ? Math.floor(plan.price_inr_paise / 100) : (plan.price || 0);

              return (
                <div
                  key={plan.id}
                  className={`card ${isPopular ? 'theme-orange' : ''} transition-all duration-300`}
                >
                  <div className="card__border" />

                  {/* Highlight pill */}
                  {(meta.badge || isPopular || isBestValue) && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full shadow-lg ${
                          isPopular
                            ? 'bg-gradient-to-r from-[#FF5C00] to-[#E04800] text-white shadow-[#FF5C00]/30'
                            : 'bg-gradient-to-r from-amber-400 to-amber-600 text-black shadow-amber-500/20'
                        }`}
                      >
                        {isPopular ? <Flame className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                        {meta.badge}
                      </span>
                    </div>
                  )}

                  <div className="card_title__container">
                    <span className="card_title">{plan.name}</span>
                    <div className="flex items-baseline gap-1.5 mt-2">
                      <span className="text-3xl font-black text-white tracking-tight">
                        ₹{priceInRupees.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-gray-400 font-semibold">
                        /{plan.billing_interval === 'yearly' ? 'year' : 'month'}
                      </span>
                    </div>
                    <p className="card_paragraph">{plan.description}</p>
                  </div>

                  <hr className="line" />

                  {/* Tech specs quick-strip */}
                  <div className="space-y-1.5 my-1 text-xs text-gray-300 relative z-10">
                    <div className="flex items-center justify-between py-1 border-b border-white/5">
                      <span className="text-gray-400 text-[11px]">Resolution</span>
                      <span className="font-bold text-white text-[11px]">{meta.resolutionLabel}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-white/5">
                      <span className="text-gray-400 text-[11px]">Audio Masters</span>
                      <span className="font-bold text-white text-[11px]">{meta.soundLabel}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 border-b border-white/5">
                      <span className="text-gray-400 text-[11px]">Concurrent Screens</span>
                      <span className="font-bold text-white text-[11px]">{plan.max_concurrent_streams} Screens</span>
                    </div>
                  </div>

                  {/* Feature perks list */}
                  <ul className="card__list">
                    {meta.perks.map((perk, idx) => (
                      <li key={idx} className="card__list_item">
                        <span className="check">
                          <svg
                            className="check_svg"
                            fill="currentColor"
                            viewBox="0 0 16 16"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              clipRule="evenodd"
                              d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                              fillRule="evenodd"
                            />
                          </svg>
                        </span>
                        <span className="list_text">{perk}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Action button */}
                  <button
                    onClick={() => orderMutation.mutate(plan)}
                    disabled={orderMutation.isPending || isCurrent}
                    className="button"
                  >
                    {isCurrent ? 'Current Pass' : orderMutation.isPending ? 'Initiating...' : `Get ${plan.name}`}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Feature Comparison Matrix */}
        <div className="mt-20 rounded-3xl bg-[#0F0C09]/90 border border-white/10 p-6 sm:p-10 backdrop-blur-2xl">
          <h2 className="text-2xl sm:text-3xl font-black text-white text-center mb-3">
            Compare Pass Features
          </h2>
          <p className="text-gray-400 text-sm text-center max-w-xl mx-auto mb-10">
            Every pass gives you full access to V19plus original content with ultra low-latency playback.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-gray-400">
                  <th className="py-4 pr-4 font-bold">Feature</th>
                  <th className="py-4 px-3 font-bold text-center">Mobile</th>
                  <th className="py-4 px-3 font-bold text-center">Standard HD</th>
                  <th className="py-4 px-3 font-bold text-center text-[#FF8A00]">Premium 4K</th>
                  <th className="py-4 pl-3 font-bold text-center text-amber-300">Annual VIP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-gray-300">
                <tr>
                  <td className="py-4 pr-4 font-semibold text-white">Monthly Price</td>
                  <td className="py-4 px-3 text-center">₹149</td>
                  <td className="py-4 px-3 text-center">₹399</td>
                  <td className="py-4 px-3 text-center font-bold text-[#FF8A00]">₹799</td>
                  <td className="py-4 pl-3 text-center font-bold text-amber-300">₹249/mo eq.</td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 font-semibold text-white">Maximum Resolution</td>
                  <td className="py-4 px-3 text-center">480p</td>
                  <td className="py-4 px-3 text-center">1080p FHD</td>
                  <td className="py-4 px-3 text-center font-bold text-white">4K + HDR10+</td>
                  <td className="py-4 pl-3 text-center font-bold text-white">4K + HDR10+</td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 font-semibold text-white">Dolby Atmos® 3D Sound</td>
                  <td className="py-4 px-3 text-center text-gray-500">—</td>
                  <td className="py-4 px-3 text-center text-gray-500">—</td>
                  <td className="py-4 px-3 text-center text-emerald-400 font-bold">✓ Included</td>
                  <td className="py-4 pl-3 text-center text-emerald-400 font-bold">✓ Included</td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 font-semibold text-white">Simultaneous Screens</td>
                  <td className="py-4 px-3 text-center">1</td>
                  <td className="py-4 px-3 text-center">2</td>
                  <td className="py-4 px-3 text-center font-bold text-white">4 Screens</td>
                  <td className="py-4 pl-3 text-center font-bold text-white">4 Screens</td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 font-semibold text-white">Supported Devices</td>
                  <td className="py-4 px-3 text-center text-xs text-gray-400">Mobile & Tablet</td>
                  <td className="py-4 px-3 text-center text-xs text-gray-400">All Devices</td>
                  <td className="py-4 px-3 text-center text-xs text-gray-400 font-semibold text-white">
                    All Devices + TV
                  </td>
                  <td className="py-4 pl-3 text-center text-xs text-gray-400 font-semibold text-white">
                    All Devices + TV
                  </td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 font-semibold text-white">Offline Downloads</td>
                  <td className="py-4 px-3 text-center">1 Device</td>
                  <td className="py-4 px-3 text-center">2 Devices</td>
                  <td className="py-4 px-3 text-center font-bold text-white">4 Devices</td>
                  <td className="py-4 pl-3 text-center font-bold text-white">4 Devices</td>
                </tr>
                <tr>
                  <td className="py-4 pr-4 font-semibold text-white">V19+ Original Premieres</td>
                  <td className="py-4 px-3 text-center text-emerald-400">✓</td>
                  <td className="py-4 px-3 text-center text-emerald-400">✓</td>
                  <td className="py-4 px-3 text-center text-emerald-400">✓ Early Access</td>
                  <td className="py-4 pl-3 text-center text-emerald-400 font-bold">✓ VIP Premieres</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Guarantees Strip */}
        <div className="mt-14 grid sm:grid-cols-3 gap-6 text-center">
          <div className="p-6 rounded-2xl bg-[#100D09]/60 border border-white/5 flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-[#FF5C00]/10 border border-[#FF5C00]/20 flex items-center justify-center text-[#FF8A00] mb-3">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white mb-1">100% Encrypted & Secure</h4>
            <p className="text-xs text-gray-400">Bank-grade 256-bit SSL encrypted transactions.</p>
          </div>

          <div className="p-6 rounded-2xl bg-[#100D09]/60 border border-white/5 flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-[#FF5C00]/10 border border-[#FF5C00]/20 flex items-center justify-center text-[#FF8A00] mb-3">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white mb-1">Instant Screen Activation</h4>
            <p className="text-xs text-gray-400">Start streaming in 4K immediately upon checkout.</p>
          </div>

          <div className="p-6 rounded-2xl bg-[#100D09]/60 border border-white/5 flex flex-col items-center">
            <div className="w-12 h-12 rounded-xl bg-[#FF5C00]/10 border border-[#FF5C00]/20 flex items-center justify-center text-[#FF8A00] mb-3">
              <Check className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-white mb-1">Cancel Anytime in 1 Tap</h4>
            <p className="text-xs text-gray-400">No penalties, no hidden lock-in contracts.</p>
          </div>
        </div>

        {/* FAQs */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/10 bg-[#0F0C09]/90 overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left text-sm sm:text-base font-bold text-white hover:text-[#FF8A00] transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                      openFaq === i ? 'rotate-180 text-[#FF5C00]' : ''
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-gray-300 leading-relaxed border-t border-white/5 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#070605] pt-24 pb-16" />}>
      <SubscriptionContent />
    </Suspense>
  );
}
