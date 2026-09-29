'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { HeroBanner } from '../../components/content/HeroBanner';
import { GenreBar } from '../../components/content/GenreBar';
import { ContentRow } from '../../components/content/ContentRow';
import { DedicatedLandingHome } from '../../components/landing/DedicatedLandingHome';
import {
  useFeatured,
  useTrending,
  useOriginals,
  useContinueWatching,
  useBrowse,
} from '../../hooks/useContent';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import type { Content } from '../../api/content';
import {
  ShieldAlert,
  UploadCloud,
  Film,
  Sparkles,
  Layers,
  GraduationCap,
  Play,
  Volume2,
  Tv,
  Compass,
  ArrowRight,
} from 'lucide-react';

export default function HomePage() {
  const { data: featuredData, isLoading: featuredLoading } = useFeatured();
  const { data: trendingData, isLoading: trendingLoading } = useTrending();
  const { data: originalsData, isLoading: originalsLoading } = useOriginals();
  const { data: continueWatchingData, isLoading: continueLoading } = useContinueWatching();

  const { user, isAuthenticated } = useAuthStore();
  const activeGenre = useUiStore((s) => s.activeGenre);
  const { data: genreContent, isLoading: genreLoading } = useBrowse(
    undefined,
    activeGenre || undefined
  );

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAdmin = user?.role === 'ADMIN';

  // Real data arrays strictly from backend database
  const trending: Content[] = useMemo(
    () => (Array.isArray(trendingData) ? (trendingData.filter((item: any) => item && item.id) as Content[]) : []),
    [trendingData]
  );

  const featured: Content[] = useMemo(
    () => (Array.isArray(featuredData) ? (featuredData.filter((item: any) => item && item.id) as Content[]) : []),
    [featuredData]
  );

  const originals: Content[] = useMemo(
    () => (Array.isArray(originalsData) ? (originalsData.filter((item: any) => item && item.id) as Content[]) : []),
    [originalsData]
  );

  // Pool of all uniquely published items in the database
  const allPool: Content[] = useMemo(() => {
    const map = new Map<string, Content>();
    [...featured, ...trending, ...originals].forEach((item) => {
      if (item && item.id) map.set(item.id, item);
    });
    return Array.from(map.values());
  }, [featured, trending, originals]);

  // Masterclasses & Educational
  const masterclasses = useMemo(
    () =>
      allPool.filter((c: any) => {
        const titleMatch = (c.title || '').toLowerCase().includes('masterclass');
        const genreMatch =
          c.genres?.some((g: any) => (g?.slug || g?.name || '').toLowerCase().includes('knowledge')) ||
          (c.genre || []).some((g: any) => (g || '').toLowerCase().includes('knowledge'));
        return titleMatch || genreMatch;
      }),
    [allPool]
  );

  // Documentaries
  const documentaries = useMemo(
    () =>
      allPool.filter((c: any) => {
        const typeMatch = c.content_type === 'DOCUMENTARY' || c.type === 'DOCUMENTARY';
        const genreMatch =
          c.genres?.some((g: any) => (g?.slug || g?.name || '').toLowerCase().includes('documentary')) ||
          (c.genre || []).some((g: any) => (g || '').toLowerCase().includes('documentary'));
        return typeMatch || genreMatch;
      }),
    [allPool]
  );

  // Feature Movies (excluding Masterclasses to prevent duplication)
  const featureMovies = useMemo(
    () =>
      allPool.filter((c: any) => {
        const typeMatch = c.content_type === 'MOVIE' || c.type === 'MOVIE';
        const isNotMasterclass = !(c.title || '').toLowerCase().includes('masterclass');
        return typeMatch && isNotMasterclass;
      }),
    [allPool]
  );

  // Recorded Events
  const events = useMemo(
    () =>
      allPool.filter(
        (c: any) =>
          c.content_type === 'EVENT' ||
          c.content_type === 'RECORDED_LONGFORM' ||
          c.genres?.some((g: any) => (g?.slug || '').toLowerCase().includes('event'))
      ),
    [allPool]
  );

  // Continue watching items for authenticated user (strictly valid published titles)
  const continueItems = useMemo(() => {
    if (!mounted || !isAuthenticated || !Array.isArray(continueWatchingData)) return [];
    return continueWatchingData
      .filter((h: any) => h && h.content && h.content.id && h.content.title)
      .map((h: any) => ({
        content: h.content,
        progress: h.progress || h.progress_seconds || 0,
      }));
  }, [mounted, isAuthenticated, continueWatchingData]);

  // Hero carousel items strictly from real published database records
  const heroItems = useMemo(() => {
    if (featured.length > 0) return featured.slice(0, 5);
    if (trending.length > 0) return trending.slice(0, 5);
    return allPool.slice(0, 5);
  }, [featured, trending, allPool]);

  const isLoading = (featuredLoading || trendingLoading) && allPool.length === 0;

  // Unauthenticated guests see the dedicated public OTT homepage
  if (!mounted || !isAuthenticated) {
    return <DedicatedLandingHome />;
  }

  return (
    <div className="min-h-screen bg-[#070605] text-white pb-24 animate-fade-in overflow-x-hidden">
      {/* Admin Studio Quick Desk Bar (Visible strictly to authenticated admins) */}
      {isAdmin && (
        <div className="relative z-30 bg-gradient-to-r from-[#FF5C00]/15 via-[#1A1410] to-[#070605] border-b border-white/10 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF5C00] animate-pulse" />
            <span className="font-semibold text-[#E5E0D8]">
              V19Plus Studio Partner Portal • Catalog & Media Management
            </span>
          </div>
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FF5C00] hover:bg-[#E04800] text-white font-bold tracking-wide transition-all shadow-[0_0_12px_rgba(255,92,0,0.3)]"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Studio Portal</span>
          </Link>
        </div>
      )}

      {/* 1. Cinematic Full-Bleed Billboard Hero */}
      {heroItems.length > 0 && (
        <HeroBanner
          contents={heroItems}
          isLoading={isLoading}
        />
      )}

      {/* 2. Category Filter Bar */}
      <div className="relative z-20 -mt-6 sm:-mt-8 mb-6">
        <GenreBar />
      </div>

      {/* 3. Filtered Genre Selection (When Active) */}
      {activeGenre && (
        <ContentRow
          title={`${activeGenre} Collection`}
          subtitle="Explore top titles in this category"
          items={
            genreContent?.items ||
            allPool.filter((item: any) =>
              item.genres?.some(
                (g: any) =>
                  (g?.name || g?.slug || '').toLowerCase() === activeGenre.toLowerCase()
              )
            )
          }
          isLoading={genreLoading}
          seeAllHref={`/browse?genre=${encodeURIComponent(activeGenre)}`}
        />
      )}

      {/* 4. Continue Watching (If authenticated and has history) */}
      {continueItems.length > 0 && (
        <ContentRow
          title="Continue Watching"
          subtitle="Pick up where you left off"
          historyItems={continueItems}
          isLoading={continueLoading}
          size="wide"
        />
      )}

      {/* 5. Trending Now (Featured popular content) */}
      {trending.length > 0 && (
        <ContentRow
          title="Trending Now"
          subtitle="Most popular titles streaming on V19Plus this week"
          items={trending}
          isLoading={trendingLoading}
          size="md"
          seeAllHref="/browse"
        />
      )}

      {/* 6. Feature Cinema (If any exist) */}
      {featureMovies.length > 0 && (
        <ContentRow
          title="Feature Films"
          subtitle="Original premiere cinema and feature productions"
          items={featureMovies}
          size="md"
          seeAllHref="/movies"
        />
      )}

      {/* 7. Masterclasses & Workshops (If any exist) */}
      {masterclasses.length > 0 && (
        <ContentRow
          title="Masterclasses & Workshops"
          subtitle="Instructional master sessions led by industry pioneers"
          items={masterclasses}
          size="md"
          seeAllHref="/browse?genre=knowledge"
        />
      )}

      {/* 8. Premieres & Recorded Events (If any exist) */}
      {events.length > 0 && (
        <ContentRow
          title="Premieres & Broadcasts"
          subtitle="Full-length master recordings and exclusive special events"
          items={events}
          size="md"
          seeAllHref="/browse?genre=events"
        />
      )}

      {/* 9. Documentaries (If any exist) */}
      {documentaries.length > 0 && (
        <ContentRow
          title="Documentaries & Real Stories"
          subtitle="Investigative features, real-world journeys, and true accounts"
          items={documentaries}
          size="md"
          seeAllHref="/browse?type=DOCUMENTARY"
        />
      )}

      {/* 10. Curated Catalog (Show when all items exist) */}
      {allPool.length > 0 && (
        <ContentRow
          title="Curated Catalog"
          subtitle="Explore all available films, series, and masterclasses"
          items={allPool}
          isLoading={isLoading}
          size="md"
          seeAllHref="/browse"
        />
      )}

      {/* 11. Empty State (When no titles are published yet) */}
      {!isLoading && allPool.length === 0 && (
        <div className="max-w-xl mx-auto my-16 p-8 rounded-3xl bg-[#120F0C] border border-white/10 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-[#FF5C00]/15 flex items-center justify-center text-[#FF5C00] mx-auto shadow-[0_0_20px_rgba(255,92,0,0.3)]">
            <Film className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Premieres Coming Soon
          </h2>
          <p className="text-sm text-[#A49C90] leading-relaxed">
            Our cinema catalog is being updated with new original masterclasses and feature films. Check back regularly or explore the library.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/10 transition-all"
            >
              <Compass className="w-4 h-4 text-[#FF8A00]" />
              <span>Browse Catalog</span>
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#FF5C00] hover:bg-[#E04800] text-white font-bold text-sm shadow-[0_0_20px_rgba(255,92,0,0.4)] transition-all active:scale-95"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload to Catalog</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* 12. Curated Entertainment Showcase */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 sm:mt-20">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#18130F] via-[#120E0B] to-[#0A0807] border border-white/10 p-6 sm:p-10 shadow-2xl">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#FF5C00]/10 blur-[130px] rounded-full pointer-events-none" />

          <div className="relative z-10 space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#FFA84A] text-xs font-bold tracking-widest uppercase">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF5C00]" />
                  <span>Curated Entertainment</span>
                </div>
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
                  Stories Worth Watching. Crafted for You.
                </h3>
                <p className="text-sm sm:text-base text-[#B8B0A2] max-w-2xl leading-relaxed">
                  Explore an exclusive collection of acclaimed movies, captivating documentaries, and inspiring masterclasses—curated for audiences who cherish unforgettable entertainment.
                </p>
              </div>

              <Link
                href="/browse"
                className="self-start md:self-auto inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs sm:text-sm border border-white/15 transition-all shadow-md group"
              >
                <span>Browse All Stories</span>
                <ArrowRight className="w-4 h-4 text-[#FFA84A] group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* 3 User-Centric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pt-2">
              <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 hover:border-[#FF5C00]/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#FF5C00]/15 flex items-center justify-center text-[#FF5C00]">
                  <Film className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white tracking-wide">
                  Original Stories & Cinema
                </h4>
                <p className="text-xs sm:text-sm text-[#9A9284] leading-relaxed">
                  Handpicked premiere films, extraordinary real-life journeys, and masterclasses from world-renowned creators.
                </p>
              </div>

              <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 hover:border-[#FF5C00]/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#FF5C00]/15 flex items-center justify-center text-[#FF8A00]">
                  <Tv className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white tracking-wide">
                  Watch Everywhere, Anytime
                </h4>
                <p className="text-xs sm:text-sm text-[#9A9284] leading-relaxed">
                  Enjoy uninterrupted viewing on your living room television, smartphone, tablet, or laptop.
                </p>
              </div>

              <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 hover:border-[#FF5C00]/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#FF5C00]/15 flex items-center justify-center text-[#FFA84A]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-white tracking-wide">
                  Ad-Free Pure Viewing
                </h4>
                <p className="text-xs sm:text-sm text-[#9A9284] leading-relaxed">
                  Zero commercials, zero interruptions. Just pure storytelling and personal recommendations tailored to your taste.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
