'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Tv,
  Smartphone,
  Laptop,
  Monitor,
  ChevronDown,
  Check,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Zap,
  Film,
  Globe,
  Radio,
  Volume2,
} from 'lucide-react';
import { Card } from '../ui/Card';

interface FaqItem {
  q: string;
  a: string;
}

const FAQ_LIST: FaqItem[] = [
  {
    q: 'What is V19Plus?',
    a: 'V19Plus is an ultra-premium entertainment streaming platform delivering cinematic feature films, high-impact original series, and masterclasses—streamed in direct 4K UHD from global edge storage with zero buffering.',
  },
  {
    q: 'Where can I watch V19Plus?',
    a: 'Watch anywhere, anytime. Sign in to your V19Plus account to stream instantly on your Smart TV, iPhone, Android device, iPad, laptop, or desktop browser with instant state synchronization across all screens.',
  },
  {
    q: 'What makes V19Plus streaming quality superior?',
    a: 'Unlike traditional platforms that route video through overloaded backend proxies, V19Plus delivers adaptive multi-bitrate HLS directly from Cloudflare global edge storage (R2). You experience instant sub-second playback, crisp 4K fidelity, and Dolby 5.1 surround sound.',
  },
  {
    q: 'Can I stream on multiple screens simultaneously?',
    a: 'Yes. You can stream seamlessly across smart TVs, phones, tablets, and computers. Your watchlist and exact resume timestamp are synchronized in real-time across every device.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, absolutely. There are zero contracts, no hidden commitments, and no cancellation fees. You can manage or pause your account settings anytime with a single click.',
  },
];

export function DedicatedLandingHome() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const handleGetStarted = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      router.push(`/signup?email=${encodeURIComponent(email.trim())}`);
    } else {
      router.push('/signup');
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-[#080808] text-white selection:bg-[#FF5C00]/30 selection:text-[#FFFFFF] overflow-x-hidden font-sans">
      {/* 1. Hero Section */}
      <section className="relative min-h-[85vh] sm:min-h-[92vh] flex items-center justify-center pt-24 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Dynamic Multi-Color Ambient Glows (Cinematic Red & Vibrant Orange on Pitch Black) */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top Center: Sunset Orange Glow */}
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] sm:w-[1050px] h-[500px] bg-gradient-to-b from-[#FF5C00]/18 via-[#E50914]/10 to-transparent blur-[140px] rounded-full" />
          {/* Left Wing: Cinematic Red Glow */}
          <div className="absolute top-1/4 -left-20 w-[420px] h-[420px] bg-[#E50914]/15 blur-[130px] rounded-full" />
          {/* Right Wing: Electric Orange Glow */}
          <div className="absolute top-1/3 -right-20 w-[450px] h-[450px] bg-[#FF5C00]/15 blur-[140px] rounded-full" />
          {/* Subtle Grid Pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.3) 1px, transparent 1px)',
              backgroundSize: '36px 36px',
            }}
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
          {/* Studio Brand Pill with Orange Accent */}
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#141414]/90 border border-white/15 backdrop-blur-xl shadow-[0_0_20px_rgba(255,92,0,0.15)]"
          >
            <span className="w-2 h-2 rounded-full bg-[#FF5C00] shadow-[0_0_10px_#FF5C00] animate-pulse" />
            <span className="text-xs sm:text-sm font-bold tracking-wide text-white uppercase">
              V19Plus Premiere Cinema • 4K Direct Edge Streaming
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-3xl sm:text-5xl md:text-6xl lg:text-[4rem] font-black font-display tracking-tight leading-[1.1] text-white drop-shadow-2xl"
          >
            Unlimited Cinema, Series, and{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFFFFF] via-[#FF5C00] to-[#E50914]">
              Masterclasses.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-base sm:text-xl md:text-2xl text-[#D0D0D0] max-w-2xl mx-auto font-normal leading-relaxed"
          >
            Watch anywhere, anytime. Acclaimed original films, inspiring masterclasses, and powerful documentaries—delivered with zero buffering.
          </motion.p>

          {/* Call to Action Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="pt-2"
          >
            <p className="text-xs sm:text-sm text-[#A0A0A0] mb-4 font-medium">
              Ready to watch? Enter your email to create or restart your membership.
            </p>
            <form
              onSubmit={handleGetStarted}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xl mx-auto"
            >
              <div className="relative w-full">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full px-5 py-4 rounded-xl bg-[#141414] border border-white/15 text-white placeholder-[#888888] text-sm sm:text-base focus:outline-none focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00]/25 transition-all backdrop-blur-md shadow-inner"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#E50914] via-[#FF5C00] to-[#E50914] hover:from-[#FF2236] hover:to-[#FF7A00] active:scale-95 text-white font-extrabold text-sm sm:text-base transition-all shadow-[0_0_25px_rgba(229,9,20,0.5)] cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-5 h-5 text-white" />
              </button>
            </form>

            {/* Quick Sign In Option */}
            <div className="mt-5 flex items-center justify-center gap-2 text-xs sm:text-sm text-[#A0A0A0]">
              <span>Already a member?</span>
              <Link
                href="/login"
                className="text-[#FF5C00] hover:text-white font-bold underline underline-offset-4 transition-colors"
              >
                Sign In to Stream
              </Link>
            </div>
          </motion.div>

          {/* Key Specs Pills with Red, White, & Orange Highlights */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="pt-6 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-[#D0D0D0]"
          >
            <span className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#141414] border border-white/10 shadow-sm">
              <Check className="w-3.5 h-3.5 text-[#FF5C00]" /> Direct 4K UHD Edge Delivery
            </span>
            <span className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#141414] border border-white/10 shadow-sm">
              <Check className="w-3.5 h-3.5 text-[#E50914]" /> Zero-Buffer Adaptive HLS
            </span>
            <span className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#141414] border border-white/10 shadow-sm">
              <Check className="w-3.5 h-3.5 text-white" /> Dolby 5.1 Lossless Audio
            </span>
            <span className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#141414] border border-white/10 shadow-sm">
              <Check className="w-3.5 h-3.5 text-[#FF7A00]" /> Cancel Online Anytime
            </span>
          </motion.div>
        </div>
      </section>

      {/* Radiant Horizontal Border Divider */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#FF5C00]/40 to-transparent" />

      {/* 2. Feature Section: Enjoy on Your TV */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-white/10 bg-[#0C0C0C]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-5">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#FF5C00]">
              <Radio className="w-3.5 h-3.5 text-[#FF5C00]" />
              BIG SCREEN IMMERSION
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display text-white leading-tight">
              Enjoy on your TV.
            </h2>
            <p className="text-base sm:text-lg text-[#C0C0C0] leading-relaxed">
              Watch on Smart TVs, PlayStation, Xbox, Chromecast, Apple TV, PC, and Mac with cinema-grade
              adaptive multi-rendition streaming.
            </p>
            <div className="pt-2 flex flex-wrap gap-2.5 text-xs font-semibold text-[#D0D0D0]">
              <span className="px-3.5 py-1.5 rounded-lg bg-[#141414] border border-white/10 flex items-center gap-2">
                <Tv className="w-4 h-4 text-[#FF5C00]" /> Smart TVs
              </span>
              <span className="px-3.5 py-1.5 rounded-lg bg-[#141414] border border-white/10 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#E50914]" /> Apple TV & Roku
              </span>
              <span className="px-3.5 py-1.5 rounded-lg bg-[#141414] border border-white/10 flex items-center gap-2">
                <Laptop className="w-4 h-4 text-white" /> Web Browsers
              </span>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#181818] to-[#101010] border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden">
              <div className="aspect-video rounded-2xl bg-[#080808] border border-white/10 flex flex-col items-center justify-center p-6 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-[#FF5C00]/10 via-transparent to-[#E50914]/10 opacity-70" />
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E50914] to-[#B80710] flex items-center justify-center shadow-[0_0_30px_rgba(229,9,20,0.5)] mb-4">
                  <Play className="w-8 h-8 fill-white text-white ml-1" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-wide">
                  Cinema-Quality Playback
                </h3>
                <p className="text-xs text-[#A0A0A0] mt-1 text-center max-w-xs">
                  Smooth, instant playback on all your favorite screens.
                </p>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-mono font-bold text-[#FF5C00] bg-[#141414] px-3 py-1 rounded-full border border-[#FF5C00]/30 shadow-[0_0_12px_rgba(255,92,0,0.2)]">
                  <span className="w-2 h-2 rounded-full bg-[#FF5C00] animate-pulse" />
                  DIRECT EDGE HLS 4K
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Feature Section: Watch Everywhere */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-white/10 bg-[#080808]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 order-2 lg:order-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl bg-[#141414] border border-white/10 hover:border-[#FF5C00]/40 transition-colors space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF5C00]/15 flex items-center justify-center text-[#FF5C00]">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white">Mobile & Tablet</h4>
                <p className="text-xs text-[#9E9E9E] leading-relaxed">
                  Stream on iOS and Android with responsive player controls and background audio.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#141414] border border-white/10 hover:border-[#E50914]/40 transition-colors space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#E50914]/15 flex items-center justify-center text-[#E50914]">
                  <Laptop className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white">Laptop & Desktop</h4>
                <p className="text-xs text-[#9E9E9E] leading-relaxed">
                  Full browser studio player with keyboard shortcuts, multi-track audio, and subtitles.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#141414] border border-white/10 hover:border-[#FF7A00]/40 transition-colors space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF7A00]/15 flex items-center justify-center text-[#FF7A00]">
                  <Zap className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white">Instant Resumption</h4>
                <p className="text-xs text-[#9E9E9E] leading-relaxed">
                  Pause in the living room, resume exactly where you left off on your phone.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#141414] border border-white/10 hover:border-white/30 transition-colors space-y-3">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white">Secure Sessions</h4>
                <p className="text-xs text-[#9E9E9E] leading-relaxed">
                  Encrypted token-authenticated streaming preventing unauthorized access.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-5 order-1 lg:order-2">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#FF5C00]">
              <Globe className="w-3.5 h-3.5 text-[#FF5C00]" />
              CONTINUOUS MULTI-DEVICE
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display text-white leading-tight">
              Watch everywhere, anytime.
            </h2>
            <p className="text-base sm:text-lg text-[#C0C0C0] leading-relaxed">
              Stream seamlessly on your phone, tablet, laptop, and television. Your watchlist and watch history
              remain instantly synchronized across every device you own.
            </p>
            <div className="pt-2">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#FF5C00] hover:text-[#FFA000] transition-colors"
              >
                <span>Get started with multi-device streaming</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Feature Section: Curated Entertainment Pass */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-white/10 bg-[#0C0C0C]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-5">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#E50914]">
              <Film className="w-3.5 h-3.5 text-[#E50914]" />
              CURATED ENTERTAINMENT
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display text-white leading-tight">
              Stories that move you. On every screen.
            </h2>
            <p className="text-base sm:text-lg text-[#C0C0C0] leading-relaxed">
              From breathtaking feature films to masterclasses taught by renowned creators, V19Plus brings together original perspectives and unforgettable storytelling crafted for true entertainment enthusiasts.
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-sm text-[#E0E0E0]">
                <div className="w-5 h-5 rounded-full bg-[#FF5C00]/20 flex items-center justify-center text-[#FF5C00]">
                  <Check className="w-3 h-3" />
                </div>
                <span>Unlimited access to original films and masterclasses</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#E0E0E0]">
                <div className="w-5 h-5 rounded-full bg-[#FF5C00]/20 flex items-center justify-center text-[#FF5C00]">
                  <Check className="w-3 h-3" />
                </div>
                <span>Watch seamlessly across smart TVs, phones, tablets, and computers</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#E0E0E0]">
                <div className="w-5 h-5 rounded-full bg-[#FF5C00]/20 flex items-center justify-center text-[#FF5C00]">
                  <Check className="w-3 h-3" />
                </div>
                <span>Zero commercials, zero interruptions, pure viewing pleasure</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 flex justify-center">
            <div className="w-full max-w-sm rounded-2xl bg-[#141414] border border-white/15 p-6 shadow-2xl space-y-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF5C00]/10 blur-[80px] pointer-events-none" />
              <div className="space-y-1">
                <span className="text-xs font-bold text-[#FF5C00] uppercase tracking-wider">ALL-ACCESS PASS</span>
                <h3 className="text-2xl font-black text-white">V19Plus All-Access</h3>
                <p className="text-xs text-[#A0A0A0]">Stream unlimited cinema, series, and masterclasses.</p>
              </div>
              <hr className="border-white/10" />
              <ul className="space-y-2.5 text-xs text-[#E0E0E0]">
                {[
                  'Full Movie & Series Catalog',
                  'All Masterclasses & Workshops',
                  'Ad-Free Uninterrupted Viewing',
                  'Direct Edge 4K UHD Multi-Rendition',
                  'Instant Personal Watchlist & Sync',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-[#FF5C00]/20 text-[#FF5C00] flex items-center justify-center flex-shrink-0">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => router.push('/signup')}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#E50914] via-[#FF5C00] to-[#E50914] hover:from-[#FF2236] hover:to-[#FF7A00] text-white font-black text-sm transition-all shadow-[0_0_20px_rgba(255,92,0,0.35)] active:scale-95 cursor-pointer"
              >
                Start Watching Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Frequently Asked Questions (Accordion) */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-white/10 bg-[#080808]">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#FF5C00]">
              QUESTIONS & ANSWERS
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-[#A0A0A0]">
              Everything you need to know about streaming on V19Plus.
            </p>
          </div>

          <div className="space-y-3">
            {FAQ_LIST.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={faq.q}
                  className="rounded-2xl bg-[#141414] border border-white/10 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <span className="text-base sm:text-lg font-bold text-white tracking-wide">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-[#FF5C00] transition-transform duration-300 flex-shrink-0 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="px-6 pb-6 pt-1 text-sm sm:text-base text-[#C0C0C0] leading-relaxed border-t border-white/5"
                      >
                        {faq.a}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6. Ready to Watch CTA Bottom Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0C0C0C] to-[#080808] text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-t from-[#E50914]/15 via-[#FF5C00]/10 to-transparent blur-[140px] rounded-full" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold font-display text-white leading-tight">
            Ready to experience masterclass streaming?
          </h2>
          <p className="text-sm sm:text-base text-[#C0C0C0]">
            Enter your email to create your account or resume your streaming pass.
          </p>

          <form
            onSubmit={handleGetStarted}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-xl mx-auto pt-2"
          >
            <div className="relative w-full">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full px-5 py-4 rounded-xl bg-[#141414] border border-white/15 text-white placeholder-[#888888] text-sm sm:text-base focus:outline-none focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00]/25 transition-all backdrop-blur-md"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#E50914] via-[#FF5C00] to-[#E50914] hover:from-[#FF2236] hover:to-[#FF7A00] active:scale-95 text-white font-extrabold text-sm sm:text-base transition-all shadow-[0_0_25px_rgba(229,9,20,0.5)] cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-5 h-5 text-white" />
            </button>
          </form>

          <div className="pt-4">
            <Link
              href="/login"
              className="text-xs sm:text-sm text-[#A0A0A0] hover:text-[#FF5C00] transition-colors font-medium"
            >
              Sign In to Your Existing Account &rarr;
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DedicatedLandingHome;
