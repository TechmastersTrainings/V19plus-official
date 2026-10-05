'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { HeroBanner } from '../../components/content/HeroBanner';
import { GenreBar } from '../../components/content/GenreBar';
import { ContentRow } from '../../components/content/ContentRow';
import { ContentCard } from '../../components/content/ContentCard';
import { DedicatedLandingHome } from '../../components/landing/DedicatedLandingHome';
import {
  useFeatured,
  useTrending,
  useOriginals,
  useContinueWatching,
  useBrowse,
} from '../../hooks/useContent';
import { useWatchlist } from '../../hooks/useWatchlist';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import type { Content } from '../../api/content';
import {
  UploadCloud,
  Film,
  Compass,
  X,
  ShieldCheck,
} from 'lucide-react';

export default function HomePage() {
  const { data: featuredData, isLoading: featuredLoading } = useFeatured();
  const { data: trendingData, isLoading: trendingLoading } = useTrending();
  const { data: originalsData, isLoading: originalsLoading } = useOriginals();
  const { data: continueWatchingData, isLoading: continueLoading } = useContinueWatching();
  const { data: watchlistData } = useWatchlist();

  const { user, isAuthenticated } = useAuthStore();
  const activeGenre = useUiStore((s) => s.activeGenre);
  const setActiveGenre = useUiStore((s) => s.setActiveGenre);

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

  // User's Watchlist Items
  const watchlistItems: Content[] = useMemo(() => {
    if (!Array.isArray(watchlistData)) return [];
    return watchlistData
      .map((item: any) => (item?.content && item.content.id ? item.content : item && item.id ? item : null))
      .filter(Boolean) as Content[];
  }, [watchlistData]);

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

  // Filtered genre items when user selects a category pill
  const filteredGenreItems: Content[] = useMemo(() => {
    if (!activeGenre) return [];
    if (genreContent?.items && Array.isArray(genreContent.items) && genreContent.items.length > 0) {
      return genreContent.items as Content[];
    }
    const target = activeGenre.toLowerCase();
    return allPool.filter((item: any) => {
      const gMatch =
        item.genres?.some((g: any) => (g?.name || g?.slug || '').toLowerCase() === target) ||
        (item.genre || []).some((g: any) => (g || '').toLowerCase() === target);
      const tMatch = (item.content_type || item.type || '').toLowerCase() === target;
      const titleMatch = (item.title || '').toLowerCase().includes(target);
      return gMatch || tMatch || titleMatch;
    });
  }, [activeGenre, genreContent, allPool]);

  // Smart OTT Showcase Shelves (Netflix / Prime Video Style)
  const dynamicSections = useMemo(() => {
    const sections: {
      id: string;
      title: string;
      subtitle: string;
      items: Content[];
      seeAllHref?: string;
      showRank?: boolean;
    }[] = [];

    // 1. Trending Now (Ranked #1, #2...)
    const primaryTrending = trending.length > 0 ? trending : allPool;
    if (primaryTrending.length > 0) {
      sections.push({
        id: 'trending',
        title: 'Trending Now',
        subtitle: 'Most popular titles streaming on V19Plus this week',
        items: primaryTrending,
        showRank: true,
        seeAllHref: '/browse',
      });
    }

    // 2. V19Plus Originals
    const primaryOriginals = originals.length > 0 ? originals : allPool.filter((c) => c.is_original ?? true);
    if (primaryOriginals.length > 0) {
      sections.push({
        id: 'originals',
        title: 'V19Plus Originals',
        subtitle: 'Exclusive productions crafted by premier storytellers',
        items: primaryOriginals,
        seeAllHref: '/browse?type=ORIGINAL',
      });
    }

    // 3. Series & Episodic Stories
    const primarySeries = allPool.filter((c) => c.content_type === 'SERIES' || (c as any).type === 'SERIES');
    if (primarySeries.length > 0) {
      sections.push({
        id: 'series',
        title: 'Series & Episodic Stories',
        subtitle: 'Binge-worthy drama and multi-part journeys',
        items: primarySeries,
        seeAllHref: '/series',
      });
    }

    // 4. Complete Vault Catalog
    if (allPool.length > 0) {
      sections.push({
        id: 'all-vault',
        title: 'Curated Streaming Vault',
        subtitle: 'Explore the complete streaming library',
        items: allPool,
        seeAllHref: '/browse',
      });
    }

    return sections;
  }, [trending, allPool, originals]);

  const isLoading = (featuredLoading || trendingLoading) && allPool.length === 0;

  // Unauthenticated guests see the dedicated public OTT homepage
  if (!mounted || !isAuthenticated) {
    return <DedicatedLandingHome />;
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white selection:bg-[#FF5C00]/30 selection:text-[#FFFFFF] pb-24 animate-fade-in overflow-x-hidden font-sans">
      {/* Admin Studio Quick Desk Bar (Visible strictly to authenticated admins) */}
      {isAdmin && (
        <div className="relative z-30 bg-gradient-to-r from-[#E50914]/20 via-[#141414] to-[#080808] border-b border-white/10 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF5C00] shadow-[0_0_8px_#FF5C00] animate-pulse" />
            <span className="font-semibold text-white">
              V19Plus Studio Partner Portal • Catalog & Media Management
            </span>
          </div>
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-[#E50914] to-[#B80710] hover:from-[#FF1E27] hover:to-[#E50914] text-white font-bold tracking-wide transition-all shadow-[0_0_12px_rgba(229,9,20,0.4)]"
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

      {/* 2. Interactive Category Filter Bar */}
      <div className="relative z-20 -mt-6 sm:-mt-8 mb-6">
        <GenreBar />
      </div>

      {/* 3. Filtered Category View (Activated When User Selects a Genre Pill) */}
      {activeGenre && (
        <section className="mb-10 animate-fade-in">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-[#E50914] to-[#FF5C00] shadow-[0_0_12px_rgba(229,9,20,0.6)]" />
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <span>{activeGenre}</span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FF5C00]/15 text-[#FF5C00] border border-[#FF5C00]/30">
                      {filteredGenreItems.length} {filteredGenreItems.length === 1 ? 'Title' : 'Titles'}
                    </span>
                  </h2>
                  <p className="text-xs text-[#A0A0A0] mt-0.5">
                    Curated selection in {activeGenre}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveGenre(null)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-[#A0A0A0] hover:text-white border border-white/10 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset Filter</span>
              </button>
            </div>

            {genreLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="aspect-video rounded-xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : filteredGenreItems.length > 0 ? (
              <div className="space-y-8">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {filteredGenreItems.map((item) => (
                    <ContentCard key={item.id} content={item} size="md" />
                  ))}
                </div>

                {filteredGenreItems.length < 4 && (
                  <ContentRow
                    title="Trending Across V19Plus"
                    subtitle="More popular titles streaming this week"
                    items={trending.length > 0 ? trending : allPool}
                    size="md"
                  />
                )}
              </div>
            ) : (
              <div className="py-14 px-4 text-center rounded-2xl bg-[#141414] border border-white/10 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-[#E50914]/15 flex items-center justify-center text-[#E50914] mx-auto shadow-[0_0_15px_rgba(229,9,20,0.25)]">
                  <Film className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">No titles in {activeGenre} yet</h3>
                <p className="text-xs text-[#A0A0A0] max-w-sm mx-auto">
                  New original titles are regularly being published. Explore our complete streaming library or select another category.
                </p>
                <button
                  onClick={() => setActiveGenre(null)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#E50914] to-[#FF5C00] hover:from-[#FF2236] hover:to-[#FF7A00] text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  View All Titles
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Normal Curated Home Experience (Shown when not filtering by a single genre) */}
      {!activeGenre && (
        <>
          {/* Continue Watching (When Authenticated User Has In-Progress History) */}
          {continueItems.length > 0 && (
            <ContentRow
              title="Continue Watching"
              subtitle="Pick up where you left off"
              historyItems={continueItems}
              isLoading={continueLoading}
              size="md"
            />
          )}

          {/* Smart Dynamic Sections (Strictly Non-Duplicating) */}
          {dynamicSections.map((sec) => (
            <ContentRow
              key={sec.id}
              title={sec.title}
              subtitle={sec.subtitle}
              items={sec.items}
              showRank={sec.showRank}
              seeAllHref={sec.seeAllHref}
              size="md"
            />
          ))}

          {/* Personalized Watchlist Section (When User Has Saved Titles) */}
          {watchlistItems.length > 0 && (
            <ContentRow
              title="My Watchlist"
              subtitle="Titles you saved to watch later"
              items={watchlistItems}
              size="md"
              seeAllHref="/watchlist"
            />
          )}

          {/* Modern Direct Edge Experience Strip */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16">
            <div className="rounded-2xl bg-[#141414] border border-white/10 p-6 sm:p-8 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#E50914]/15 via-[#FF5C00]/10 to-transparent blur-[80px] pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[#FF5C00] text-xs font-bold uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-[#FF5C00]" />
                    <span>V19Plus Direct-to-Edge Architecture</span>
                  </div>
                  <h4 className="text-lg sm:text-xl font-black text-white tracking-tight">
                    Pure Cinema Fidelity. Zero Intermediate Server Latency.
                  </h4>
                  <p className="text-xs sm:text-sm text-[#A0A0A0] max-w-2xl leading-relaxed">
                    Stream your favorite masterclasses and feature films delivered directly from Cloudflare global edge storage with multi-bitrate adaptive 4K HLS streaming.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/browse"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-[#FF5C00] hover:text-white text-white font-bold text-xs border border-white/15 transition-all shadow-sm"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Explore Library</span>
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#E50914] to-[#B80710] hover:from-[#FF1E27] hover:to-[#E50914] text-white font-bold text-xs shadow-md transition-all active:scale-95"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Studio Dashboard</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Empty Catalog State */}
      {!isLoading && allPool.length === 0 && (
        <div className="max-w-xl mx-auto my-16 p-8 rounded-3xl bg-[#141414] border border-white/10 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-[#FF5C00]/15 flex items-center justify-center text-[#FF5C00] mx-auto shadow-[0_0_20px_rgba(255,92,0,0.25)]">
            <Film className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Premieres Coming Soon
          </h2>
          <p className="text-sm text-[#A0A0A0] leading-relaxed">
            Our cinema catalog is being updated with new original masterclasses and feature films. Check back regularly or explore the library.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              href="/browse"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-[#FF5C00] hover:text-white text-white font-bold text-sm border border-white/10 transition-all"
            >
              <Compass className="w-4 h-4" />
              <span>Browse Catalog</span>
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#E50914] to-[#B80710] hover:from-[#FF1E27] hover:to-[#E50914] text-white font-bold text-sm shadow-[0_0_20px_rgba(229,9,20,0.4)] transition-all active:scale-95"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload to Catalog</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

