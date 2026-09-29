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
  HardDrive,
  Cpu,
  Zap,
  Film,
  Globe,
  Lock,
} from 'lucide-react';
import { Card } from '../ui/Card';

interface FaqItem {
  q: string;
  a: string;
}

const FAQ_LIST: FaqItem[] = [
  {
    q: 'What is V19Plus?',
    a: 'V19Plus is a premier entertainment streaming platform offering extraordinary feature films, world-class masterclasses, and in-depth documentaries—crafted for lovers of great stories.',
  },
  {
    q: 'Where can I watch V19Plus?',
    a: 'Watch anywhere, anytime. Sign in to your V19Plus account to stream instantly on the web from your personal computer or on any smartphone, tablet, or Smart TV connected to the internet.',
  },
  {
    q: 'What kind of content can I watch on V19Plus?',
    a: 'V19Plus features a premier, handpicked selection of original feature films, world-class masterclasses, hard-hitting documentaries, and exclusive entertainment events—crafted for lovers of great stories.',
  },
  {
    q: 'Can I stream on all my screens?',
    a: 'Yes. You can stream seamlessly on smart TVs, phones, tablets, and laptops. Your watchlist and place in each video automatically sync across all your devices.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes, completely. There are no contracts, no hidden commitments, and no cancellation penalties. You can easily manage or pause your account settings at any time with a single click.',
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
    <div className="min-h-screen bg-[#070605] text-white selection:bg-[#FF5C00]/30 selection:text-[#FFA84A] overflow-x-hidden">
      {/* 1. Hero Section */}
      <section className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center justify-center pt-24 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Cinematic ambient background glow and radial spotlights */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] sm:w-[1100px] h-[550px] bg-gradient-to-b from-[#FF5C00]/15 via-[#FF3B00]/5 to-transparent blur-[140px] rounded-full" />
          <div className="absolute top-1/3 left-10 w-[350px] h-[350px] bg-[#E04800]/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-[#FF8A00]/10 blur-[130px] rounded-full" />
          {/* Subtle studio grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
          {/* Studio Badge */}
          <motion.div
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl shadow-lg"
          >
            <span className="w-2 h-2 rounded-full bg-[#FF5C00] animate-pulse" />
            <span className="text-xs sm:text-sm font-bold tracking-wide text-[#E5E0D8]">
              The Official Cinema & Masterclass Streaming Platform
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.08] text-white drop-shadow-2xl"
          >
            Unlimited Movies, TV Shows, and{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5C00] via-[#FF8A00] to-[#FFA726]">
              Masterclasses.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="text-base sm:text-xl md:text-2xl text-[#C8C2B8] max-w-2xl mx-auto font-medium leading-relaxed"
          >
            Stream anytime, anywhere. Acclaimed films, inspiring masterclasses, and powerful documentaries—all in one place.
          </motion.p>

          {/* Call to Action Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="pt-2"
          >
            <p className="text-xs sm:text-sm text-[#A49C90] mb-4 font-medium">
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
                  className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/15 text-white placeholder-[#8C8478] text-sm sm:text-base focus:outline-none focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00]/20 transition-all backdrop-blur-md"
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#FF5C00] via-[#FF6E00] to-[#E04800] hover:from-[#FF7A00] hover:to-[#FF5C00] active:scale-95 text-white font-extrabold text-sm sm:text-base transition-all shadow-[0_0_30px_rgba(255,92,0,0.5)] cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </form>

            {/* Quick Sign In Option */}
            <div className="mt-5 flex items-center justify-center gap-4 text-xs sm:text-sm text-[#A49C90]">
              <span>Already a member?</span>
              <Link
                href="/login"
                className="text-white hover:text-[#FFA84A] font-bold underline underline-offset-4 transition-colors"
              >
                Sign In to Stream
              </Link>
            </div>
          </motion.div>

          {/* Key Specs Pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="pt-6 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-[#B8B0A2]"
          >
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
              <Check className="w-3.5 h-3.5 text-[#FF5C00]" /> Unlimited Ad-Free Streaming
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
              <Check className="w-3.5 h-3.5 text-[#FF5C00]" /> Watch on Smart TV, Phone & Laptop
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
              <Check className="w-3.5 h-3.5 text-[#FF5C00]" /> New Releases Added Regularly
            </span>
          </motion.div>
        </div>
      </section>

      {/* Decorative divider */}
      <div className="h-2 w-full bg-gradient-to-r from-transparent via-[#FF5C00]/40 to-transparent" />

      {/* 2. Feature Section: Enjoy on Your Screen */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-white/5 bg-[#0A0807]/60">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-5">
            <span className="text-xs font-black uppercase tracking-widest text-[#FF5C00]">
              BIG SCREEN IMMERSION
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight">
              Enjoy on your TV.
            </h2>
            <p className="text-base sm:text-lg text-[#C8C2B8] leading-relaxed">
              Watch on Smart TVs, PlayStation, Xbox, Chromecast, Apple TV, PC, and Mac with cinema-grade
              adaptive streaming.
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-xs font-semibold text-[#B8B0A2]">
              <span className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 flex items-center gap-2">
                <Tv className="w-4 h-4 text-[#FF8A00]" /> Smart TVs
              </span>
              <span className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-[#FF8A00]" /> Apple TV & Roku
              </span>
              <span className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 flex items-center gap-2">
                <Laptop className="w-4 h-4 text-[#FF8A00]" /> Web Browsers
              </span>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-[#18130F] to-[#0E0B09] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
              <div className="aspect-video rounded-2xl bg-[#070605] border border-white/10 flex flex-col items-center justify-center p-6 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-[#FF5C00]/10 via-transparent to-transparent opacity-50" />
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF5C00] to-[#E04800] flex items-center justify-center shadow-[0_0_30px_rgba(255,92,0,0.5)] mb-4">
                  <Play className="w-8 h-8 fill-white text-white ml-1" />
                </div>
                <h3 className="text-lg font-bold text-white tracking-wide">
                  Cinema-Quality Playback
                </h3>
                <p className="text-xs text-[#9A9284] mt-1 text-center max-w-xs">
                  Smooth, instant playback on all your favorite screens.
                </p>
                <div className="mt-4 flex items-center gap-2 text-[10px] font-mono font-bold text-[#FFA84A] bg-white/5 px-3 py-1 rounded-full border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  INSTANT STREAMING
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Feature Section: Watch Everywhere */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-white/5 bg-[#070605]">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 order-2 lg:order-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-2xl bg-[#120F0C] border border-white/10 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF5C00]/15 flex items-center justify-center text-[#FF5C00]">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white">Mobile & Tablet</h4>
                <p className="text-xs text-[#9A9284] leading-relaxed">
                  Stream on iOS and Android with responsive player controls and background audio.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#120F0C] border border-white/10 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF5C00]/15 flex items-center justify-center text-[#FF8A00]">
                  <Laptop className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white">Laptop & Desktop</h4>
                <p className="text-xs text-[#9A9284] leading-relaxed">
                  Full browser studio player with keyboard shortcuts, multi-track audio, and subtitles.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#120F0C] border border-white/10 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF5C00]/15 flex items-center justify-center text-amber-400">
                  <Zap className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white">Instant Resumption</h4>
                <p className="text-xs text-[#9A9284] leading-relaxed">
                  Pause in the living room, resume exactly where you left off on your phone.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-[#120F0C] border border-white/10 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-[#FF5C00]/15 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-white">Secure Sessions</h4>
                <p className="text-xs text-[#9A9284] leading-relaxed">
                  Encrypted token-authenticated streaming preventing unauthorized access.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-5 order-1 lg:order-2">
            <span className="text-xs font-black uppercase tracking-widest text-[#FF5C00]">
              CONTINUOUS MULTI-DEVICE
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight">
              Watch everywhere, anytime.
            </h2>
            <p className="text-base sm:text-lg text-[#C8C2B8] leading-relaxed">
              Stream seamlessly on your phone, tablet, laptop, and television. Your watchlist and watch history
              remain instantly synchronized across every device you own.
            </p>
            <div className="pt-2">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#FFA84A] hover:text-[#FF8A00] transition-colors"
              >
                <span>Get started with multi-device streaming</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Feature Section: Cinematic Fidelity & Immersion */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-white/5 bg-[#0A0807]/60">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-5">
            <span className="text-xs font-black uppercase tracking-widest text-[#FF5C00]">
              CURATED ENTERTAINMENT
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight">
              Stories that move you. On every screen.
            </h2>
            <p className="text-base sm:text-lg text-[#C8C2B8] leading-relaxed">
              From breathtaking feature films to masterclasses taught by renowned masters, V19Plus brings together original perspectives and unforgettable storytelling crafted for true entertainment enthusiasts.
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-sm text-[#E5E0D8]">
                <div className="w-5 h-5 rounded-full bg-[#FF5C00]/20 flex items-center justify-center text-[#FF5C00]">
                  <Check className="w-3 h-3" />
                </div>
                <span>Unlimited access to original films and masterclasses</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#E5E0D8]">
                <div className="w-5 h-5 rounded-full bg-[#FF5C00]/20 flex items-center justify-center text-[#FF5C00]">
                  <Check className="w-3 h-3" />
                </div>
                <span>Watch seamlessly across smart TVs, phones, tablets, and computers</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-[#E5E0D8]">
                <div className="w-5 h-5 rounded-full bg-[#FF5C00]/20 flex items-center justify-center text-[#FF5C00]">
                  <Check className="w-3 h-3" />
                </div>
                <span>Zero commercials, zero interruptions, pure viewing pleasure</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 flex justify-center">
            <Card
              title="V19Plus All-Access"
              paragraph="Stream unlimited cinema, series, and masterclasses."
              items={[
                'Full Movie & Series Catalog',
                'All Masterclasses & Workshops',
                'Ad-Free Uninterrupted Viewing',
                'Multi-Device Streaming & Sync',
                'Instant Personal Watchlist',
              ]}
              buttonText="Start Watching Now"
              theme="orange"
              onClick={() => router.push('/signup')}
            />
          </div>
        </div>
      </section>

      {/* 5. Frequently Asked Questions (Accordion) */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-b border-white/5 bg-[#070605]">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <span className="text-xs font-black uppercase tracking-widest text-[#FF5C00]">
              QUESTIONS & ANSWERS
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-[#A49C90]">
              Everything you need to know about streaming on V19Plus.
            </p>
          </div>

          <div className="space-y-3">
            {FAQ_LIST.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={faq.q}
                  className="rounded-2xl bg-[#120F0C] border border-white/10 overflow-hidden transition-all"
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <span className="text-base sm:text-lg font-bold text-white tracking-wide">
                      {faq.q}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-[#FF8A00] transition-transform duration-300 flex-shrink-0 ${
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
                        className="px-6 pb-6 pt-1 text-sm sm:text-base text-[#B8B0A2] leading-relaxed border-t border-white/5"
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
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-[#0A0807] to-[#070605] text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
            Ready to experience masterclass streaming?
          </h2>
          <p className="text-sm sm:text-base text-[#C8C2B8]">
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
                className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/15 text-white placeholder-[#8C8478] text-sm sm:text-base focus:outline-none focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00]/20 transition-all backdrop-blur-md"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#FF5C00] via-[#FF6E00] to-[#E04800] hover:from-[#FF7A00] hover:to-[#FF5C00] active:scale-95 text-white font-extrabold text-sm sm:text-base transition-all shadow-[0_0_30px_rgba(255,92,0,0.5)] cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <div className="pt-4">
            <Link
              href="/login"
              className="text-xs sm:text-sm text-[#A49C90] hover:text-white transition-colors"
            >
              Sign In to Your Existing Account →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
