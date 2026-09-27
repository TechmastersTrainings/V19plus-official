'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Play, Sparkles, Tv, Download, Users, Volume2, Film, ShieldCheck } from 'lucide-react';
import { HeroBanner } from '../../components/content/HeroBanner';
import { GenreBar } from '../../components/content/GenreBar';
import { ContentRow } from '../../components/content/ContentRow';
import {
  useFeatured, useTrending, useOriginals,
  useContinueWatching, useRecommended, useBrowse,
} from '../../hooks/useContent';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { Content } from '../../api/content';

// FAQ Data
const FAQS = [
  {
    q: 'What is V19Plus?',
    a: 'V19Plus is an ultra-premium OTT cinematic streaming platform offering thousands of award-winning movies, TV series, live sports, and exclusive original productions in 4K Ultra HD and Dolby Atmos spatial audio.'
  },
  {
    q: 'Can I watch across multiple devices?',
    a: 'Yes! You can stream seamlessly across Smart TVs (Apple TV, Android TV, FireTV), smartphones (iOS & Android), tablets, game consoles, and web browsers.'
  },
  {
    q: 'How does Continue Watching work?',
    a: 'Your playback position is synced instantly across your account. You can pause a movie on your TV and resume exactly where you left off on your phone or laptop.'
  },
  {
    q: 'Can I download content for offline viewing?',
    a: 'Yes! Download unlimited movies and full series episodes directly on mobile and tablet to watch without internet on planes, trains, or during travel.'
  },
  {
    q: 'Is V19Plus ad-free?',
    a: 'All V19Plus streaming tiers provide 100% uninterrupted, commercial-free entertainment with cinematic quality.'
  }
];

export default function HomePage() {
  const router = useRouter();
  const { data: featuredData, isLoading: featuredLoading } = useFeatured();
  const { data: trendingData, isLoading: trendingLoading } = useTrending();
  const { data: originalsData, isLoading: originalsLoading } = useOriginals();
  const { data: continueWatchingData, isLoading: continueLoading } = useContinueWatching();
  const { data: recommendedData, isLoading: recommendedLoading } = useRecommended();
  
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const activeGenre = useUiStore((s) => s.activeGenre);
  const { data: genreContent, isLoading: genreLoading } = useBrowse(undefined, activeGenre || undefined);

  const [emailInput, setEmailInput] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Content layers populated strictly from real backend content
  const featured = (featuredData && featuredData.length > 0) ? featuredData : [];
  const trending = (trendingData && trendingData.length > 0) ? trendingData : [];
  const originals = (originalsData && originalsData.length > 0) ? originalsData : [];
  const recommended = (recommendedData && recommendedData.length > 0) ? recommendedData : [];
  const sports = trending.filter((c: Content) => c.type === 'SPORT');
  const music = [] as Content[];

  const continueItems = (continueWatchingData && continueWatchingData.length > 0)
    ? continueWatchingData.map((h: any) => ({ content: h.content, progress: h.progress }))
    : [];

  // Handle email signup redirect
  const handleGetStarted = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    router.push(`/signup?email=${encodeURIComponent(emailInput)}`);
  };

  // 0. Loading Screen
  if (isLoading) {
    return <div className="min-h-screen bg-[#0A0806]" />;
  }

  // 1. Authenticated Streaming Dashboard
  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A0806] text-white pb-24 md:pb-16 animate-fade-in select-none">
        {/* Cinematic Hero Banner Slider */}
        <HeroBanner contents={featured} isLoading={featuredLoading} />

        {/* Category Pills Nav */}
        <div className="relative -mt-10 sm:-mt-14 z-30 mb-4 sm:mb-6">
          <GenreBar />
        </div>

        {/* Filtered Genre Content */}
        {activeGenre && (
          <ContentRow
            title={`${activeGenre} Picks`}
            items={genreContent?.items || trending.filter((item: any) => item.genre?.includes(activeGenre))}
            isLoading={genreLoading}
            seeAllHref={`/browse?genre=${encodeURIComponent(activeGenre)}`}
          />
        )}

        {/* Continue Watching Row */}
        {continueItems && continueItems.length > 0 && (
          <ContentRow
            title="Continue Watching"
            historyItems={continueItems}
            isLoading={continueLoading}
            size="md"
          />
        )}

        {/* Numbered Top 10 Trending Section */}
        <ContentRow
          title="Top 10 Trending Today"
          items={trending.slice(0, 10)}
          isLoading={trendingLoading}
          showRank={true}
          size="lg"
          seeAllHref="/browse?sort=trending"
        />

        {/* V19Plus Originals */}
        <ContentRow
          title="V19Plus Originals & Premieres"
          items={originals}
          isLoading={originalsLoading}
          size="md"
          seeAllHref="/browse?type=SERIES"
        />

        {/* Top Picks For You */}
        <ContentRow
          title="Top Picks For You"
          items={recommended}
          isLoading={recommendedLoading}
          size="md"
          seeAllHref="/browse?sort=rating"
        />

        {/* Sports Live & Upcoming */}
        <ContentRow
          title="Live Sports & Events"
          items={sports}
          size="md"
          seeAllHref="/sports"
        />

        {/* Music & Soundtracks */}
        <ContentRow
          title="Music, Soundtracks & Concerts"
          items={music}
          size="md"
          seeAllHref="/music"
        />

        {/* Popular Movies */}
        {featured && featured.length > 1 && (
          <ContentRow
            title="Popular Blockbusters"
            items={featured.slice(1)}
            isLoading={featuredLoading}
            size="md"
            seeAllHref="/movies"
          />
        )}
      </div>
    );
  }

  // 2. Unauthenticated Marketing Landing Page
  return (
    <div className="bg-[#0A0806] min-h-screen overflow-x-hidden text-white select-none">
      {/* Dynamic Background Slideshow Hero Banner */}
      <div className="relative min-h-[90vh] md:min-h-screen flex items-center justify-center">
        {featured && featured.length > 0 ? (
          <HeroBanner contents={featured.slice(0, 4)} isLoading={featuredLoading} hideContent={true} />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-b from-[#1F1208]/60 via-[#0A0806] to-[#0A0806]" />
        )}

        {/* Call to Action Overlay card */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 px-5 text-center mt-12 bg-black/50 backdrop-blur-[2px]">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FF5C00]/15 border border-[#FF5C00]/30 text-[#FF5C00] text-xs sm:text-sm font-black uppercase tracking-wider backdrop-blur-md">
              <Sparkles className="w-4 h-4" /> Next-Gen OTT Streaming Experience
            </div>
            
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black text-white leading-[1.08] tracking-tight drop-shadow-2xl">
              Cinematic entertainment,{' '}
              <span className="bg-gradient-to-r from-[#FF5C00] via-[#FF8A00] to-[#FFA726] bg-clip-text text-transparent">
                elevated.
              </span>
            </h1>

            <p className="text-base sm:text-xl md:text-2xl text-[#D4CDC3] max-w-2xl mx-auto font-medium">
              Stream award-winning originals, blockbuster movies, live sports, and concerts in 4K HDR.
            </p>

            {/* Email Form */}
            <form onSubmit={handleGetStarted} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto pt-4">
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Enter your email to get started..."
                className="flex-1 px-6 py-4 bg-[#14110D]/90 border border-white/20 rounded-2xl text-white placeholder:text-[#8C8478] focus:outline-none focus:border-[#FF5C00] transition-colors backdrop-blur-xl font-medium"
              />
              <button
                type="submit"
                className="px-8 py-4 bg-[#FF5C00] hover:bg-[#FF7A00] text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-[0_0_25px_rgba(255,92,0,0.4)]"
              >
                <span>Get Started</span>
                <Play className="w-4 h-4 fill-white" />
              </button>
            </form>
          </motion.div>
        </div>
      </div>

      {/* Feature Showcase Grid */}
      <section className="py-24 px-4 sm:px-8 md:px-16 lg:px-20 bg-gradient-to-b from-[#0A0806] via-[#14110D] to-[#0A0806]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white">Built for True Cinema Lovers</h2>
            <p className="text-[#A49C90] text-base md:text-lg">State of the art technology engineered for seamless streaming.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Tv, title: 'Smart TV & Console', desc: 'Native 4K support for Apple TV, Google TV, Samsung, LG, PlayStation, and Xbox.' },
              { icon: Download, title: 'Offline Downloads', desc: 'Save your favorite movies and binge entire seasons on the go with zero buffer.' },
              { icon: Users, title: 'Watch Party Sync', desc: 'Host real-time synchronized movie nights with friends and family anywhere.' },
              { icon: Volume2, title: 'Dolby Atmos Spatial', desc: 'Immerse yourself in full 3D spatial surround sound tuned for cinema audio.' }
            ].map((feat, idx) => {
              const IconComp = feat.icon;
              return (
                <motion.div
                  key={feat.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1, duration: 0.5 }}
                  className="bg-[#181410]/80 border border-white/5 rounded-3xl p-7 backdrop-blur-xl hover:border-[#FF5C00]/40 transition-colors group shadow-lg"
                >
                  <div className="w-13 h-13 rounded-2xl bg-[#FF5C00]/10 border border-[#FF5C00]/20 flex items-center justify-center text-[#FF5C00] mb-5 group-hover:scale-110 transition-transform">
                    <IconComp className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
                  <p className="text-sm text-[#A49C90] leading-relaxed">{feat.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Rail Preview */}
      <section className="py-16 bg-[#0A0806]">
        <div className="max-w-7xl mx-auto">
          <ContentRow
            title="Trending on V19Plus"
            items={trending.slice(0, 6)}
            showRank={true}
            size="md"
          />
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section className="py-24 px-4 sm:px-8 md:px-16 lg:px-20 bg-gradient-to-b from-[#0A0806] to-[#14110D]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-center text-white mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-4">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="bg-[#181410]/90 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full px-6 py-5 flex items-center justify-between text-left text-white hover:bg-white/5 transition-colors font-bold text-base md:text-lg"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-5 h-5 text-[#A49C90] transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#FF5C00]' : ''}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                      >
                        <div className="px-6 pb-6 text-sm sm:text-base text-[#B8B0A4] leading-relaxed border-t border-white/5 pt-4">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pre-footer Call to Action */}
      <section className="py-20 text-center border-t border-white/10 bg-[#0A0806] px-4">
        <div className="max-w-xl mx-auto space-y-4">
          <p className="text-xs uppercase tracking-widest text-[#FF5C00] font-black">Experience Next-Gen OTT</p>
          <h3 className="text-2xl sm:text-4xl font-black text-white">Ready to start streaming?</h3>
          <p className="text-sm text-[#A49C90]">Enter your email to create your account and watch anywhere.</p>
          <form onSubmit={handleGetStarted} className="flex flex-col sm:flex-row gap-3 pt-4">
            <input
              type="email"
              required
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-5 py-4 bg-[#14110D] border border-white/20 rounded-2xl text-white placeholder:text-[#8C8478] focus:outline-none focus:border-[#FF5C00] transition-colors"
            />
            <button
              type="submit"
              className="px-8 py-4 bg-[#FF5C00] hover:bg-[#FF7A00] text-white font-black rounded-2xl flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,92,0,0.4)]"
            >
              Get Started
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

