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
import { useWatchlist, useAddToWatchlist, useRemoveFromWatchlist } from '../../hooks/useWatchlist';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import type { Content } from '../../api/content';
import {
  UploadCloud,
  Film,
  Sparkles,
  Play,
  Tv,
  Compass,
  ArrowRight,
  X,
  Zap,
  ShieldCheck,
  Check,
  Bookmark,
  Info,
  Clock,
  Layers,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function HomePage() {
  const { data: featuredData, isLoading: featuredLoading } = useFeatured();
  const { data: trendingData, isLoading: trendingLoading } = useTrending();
  const { data: originalsData, isLoading: originalsLoading } = useOriginals();
  const { data: continueWatchingData, isLoading: continueLoading } = useContinueWatching();
  const { data: watchlistData } = useWatchlist();
  const addToWatchlist = useAddToWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();

  const { user, isAuthenticated } = useAuthStore();
  const activeGenre = useUiStore((s) => s.activeGenre);
  const setActiveGenre = useUiStore((s) => s.setActiveGenre);
  const openDetail = useUiStore((s) => s.openDetail);

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

  // Spotlight title for the editorial cinema showcase
  const spotlightItem: Content | null = useMemo(() => {
    if (allPool.length === 0) return null;
    return allPool[1] || allPool[0];
  }, [allPool]);

  // In-list check for the spotlight item
  const isSpotlightInList = useMemo(() => {
    if (!spotlightItem) return false;
    return watchlistItems.some((w) => w.id === spotlightItem.id);
  }, [spotlightItem, watchlistItems]);

  const handleToggleSpotlightWatchlist = async () => {
    if (!spotlightItem) return;
    if (!isAuthenticated) {
      toast.error('Sign in to add to your list');
      return;
    }
    try {
      if (isSpotlightInList) {
        await removeFromWatchlist.mutateAsync(spotlightItem.id);
        toast.success('Removed from My List');
      } else {
        await addToWatchlist.mutateAsync(spotlightItem.id);
        toast.success('Added to My List');
      }
    } catch {
      toast.error('Could not update list');
    }
  };

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

    // 3. Feature Cinema & Premieres
    const primaryMovies = featureMovies.length > 0 ? featureMovies : allPool.filter((c) => c.content_type === 'MOVIE');
    if (primaryMovies.length > 0) {
      sections.push({
        id: 'feature-movies',
        title: 'Feature Cinema',
        subtitle: 'Original premiere cinema and feature productions',
        items: primaryMovies,
        seeAllHref: '/movies',
      });
    }

    // 4. Series & Episodic Stories
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

    // 5. Complete Vault Catalog
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
  }, [trending, allPool, originals, featureMovies]);

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
                <span className="w-1.5 h-6 rounded-full bg-[#FF5C00] shadow-[0_0_12px_#FF5C00]" />
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <span>{activeGenre}</span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-[#FF8A00] border border-white/15">
                      {filteredGenreItems.length} {filteredGenreItems.length === 1 ? 'Title' : 'Titles'}
                    </span>
                  </h2>
                  <p className="text-xs text-[#8C8478] mt-0.5">
                    Curated selection in {activeGenre}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setActiveGenre(null)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#A49C90] hover:text-white border border-white/10 transition-colors"
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
              <div className="py-14 px-4 text-center rounded-2xl bg-[#120F0C] border border-white/5 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-[#FF5C00]/15 flex items-center justify-center text-[#FF5C00] mx-auto shadow-[0_0_15px_rgba(255,92,0,0.2)]">
                  <Film className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-white">No titles in {activeGenre} yet</h3>
                <p className="text-xs text-[#8C8478] max-w-sm mx-auto">
                  New original titles are regularly being published. Explore our complete streaming library or select another category.
                </p>
                <button
                  onClick={() => setActiveGenre(null)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#FF5C00] hover:bg-[#E04800] text-white font-bold text-xs shadow-md transition-all active:scale-95"
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
          {/* 4. Continue Watching (When Authenticated User Has In-Progress History) */}
          {continueItems.length > 0 && (
            <ContentRow
              title="Continue Watching"
              subtitle="Pick up where you left off"
              historyItems={continueItems}
              isLoading={continueLoading}
              size="md"
            />
          )}

          {/* 5. Smart Dynamic Sections (Strictly Non-Duplicating) */}
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

          {/* 6. Cinematic Editorial Spotlight Feature Card */}
          {spotlightItem && (
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-10 sm:my-14">
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#1A1410] via-[#120E0B] to-[#080605] border border-white/10 p-6 sm:p-10 shadow-2xl">
                {/* Ambient Warm Backlight */}
                <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#FF5C00]/15 blur-[120px] rounded-full pointer-events-none" />

                <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  {/* Left Column: Editorial Info */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#FFA84A] text-xs font-bold tracking-widest uppercase">
                      <Sparkles className="w-3.5 h-3.5 text-[#FF5C00]" />
                      <span>Featured Premiere Spotlight</span>
                    </div>

                    <h3 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight">
                      {spotlightItem.title}
                    </h3>

                    {/* Metadata Strip */}
                    <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-[#B8B0A2]">
                      <span className="px-2 py-0.5 rounded bg-[#FF5C00]/15 border border-[#FF5C00]/30 text-[#FF8A00]">
                        4K UHD Direct Stream
                      </span>
                      <span>{spotlightItem.release_year ?? 2026}</span>
                      <span>•</span>
                      <span>{spotlightItem.rating || 'U/A 13+'}</span>
                      {spotlightItem.duration ? (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#FF8A00]" />
                            {spotlightItem.duration}m
                          </span>
                        </>
                      ) : null}
                      <span>•</span>
                      <span className="text-white/70">Dolby 5.1 Surround</span>
                    </div>

                    <p className="text-sm sm:text-base text-[#D4CDC3]/90 leading-relaxed max-w-xl">
                      {spotlightItem.description ||
                        'Experience this master release in ultra-high bitrate streaming directly from global edge storage with lossless audio.'}
                    </p>

                    {/* CTA Actions */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      <Link
                        href={`/watch/${spotlightItem.slug}`}
                        className="inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-sm shadow-[0_4px_20px_rgba(255,255,255,0.2)] transition-all active:scale-95"
                      >
                        <Play className="w-4 h-4 fill-black text-black" />
                        <span>Watch Now</span>
                      </Link>

                      <button
                        onClick={() => openDetail(spotlightItem.slug)}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#1A1512] hover:bg-[#251E1A] text-white font-medium text-sm border border-white/15 transition-all shadow-md active:scale-95"
                      >
                        <Info className="w-4 h-4 text-[#FF8A00]" />
                        <span>More Info</span>
                      </button>

                      <button
                        onClick={handleToggleSpotlightWatchlist}
                        className={`p-3 rounded-xl border transition-all active:scale-95 ${
                          isSpotlightInList
                            ? 'bg-[#FF5C00]/20 border-[#FF5C00] text-[#FF8A00]'
                            : 'bg-[#1A1512] hover:bg-[#251E1A] border-white/15 text-white/80 hover:text-white'
                        }`}
                        title={isSpotlightInList ? 'In My List' : 'Add to My List'}
                        aria-label="Toggle Watchlist"
                      >
                        {isSpotlightInList ? (
                          <Check className="w-4 h-4 text-[#FFA040]" />
                        ) : (
                          <Bookmark className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Wide Cinematic Artwork Preview */}
                  <div className="lg:col-span-5">
                    <Link
                      href={`/watch/${spotlightItem.slug}`}
                      className="group relative block aspect-video rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-black"
                    >
                      <img
                        src={
                          spotlightItem.backdrop_url ||
                          spotlightItem.backdropUrl ||
                          spotlightItem.thumbnail_url ||
                          spotlightItem.thumbnailUrl ||
                          'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1200&q=80'
                        }
                        alt={spotlightItem.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[2px]">
                        <div className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform scale-90 group-hover:scale-100 transition-transform">
                          <Play className="w-6 h-6 fill-black ml-1" />
                        </div>
                      </div>
                      <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur-md border border-white/15 text-xs font-bold text-white">
                        Direct Edge Streaming
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* 7. Personalized Watchlist Section (When User Has Saved Titles) */}
          {watchlistItems.length > 0 && (
            <ContentRow
              title="My Watchlist"
              subtitle="Titles you saved to watch later"
              items={watchlistItems}
              size="md"
              seeAllHref="/watchlist"
            />
          )}

          {/* 8. Modern High-Fidelity Studio Experience Strip */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16">
            <div className="rounded-2xl bg-[#120F0C] border border-white/10 p-6 sm:p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[#FF8A00] text-xs font-bold uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-[#FF5C00]" />
                    <span>V19Plus Direct-to-Edge Architecture</span>
                  </div>
                  <h4 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Pure Cinema Fidelity. Zero Intermediate Server Latency.
                  </h4>
                  <p className="text-xs sm:text-sm text-[#8C8478] max-w-2xl leading-relaxed">
                    Stream your favorite masterclasses and feature films delivered directly from Cloudflare global edge storage with multi-bitrate adaptive HLS streaming.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/browse"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/15 transition-all"
                  >
                    <Compass className="w-3.5 h-3.5 text-[#FF8A00]" />
                    <span>Explore Library</span>
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF5C00] hover:bg-[#E04800] text-white font-bold text-xs shadow-md transition-all active:scale-95"
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

      {/* 9. Empty Catalog State (Only if 0 titles exist across the entire platform) */}
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
    </div>
  );
}

