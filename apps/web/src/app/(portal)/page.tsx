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
    <div className="min-h-screen bg-[#070605] text-white pb-24 select-none animate-fade-in overflow-x-hidden">
      {/* Admin Studio Quick Desk Bar (Visible to admins or for quick upload access) */}
      {isAdmin && (
        <div className="relative z-30 bg-gradient-to-r from-[#FF5C00]/20 via-[#1A1410] to-[#070605] border-b border-[#FF5C00]/30 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#FF5C00]" />
            <span className="font-bold text-white">
              Studio Admin Mode Active — All videos are pushed and uploaded by the studio.
            </span>
          </div>
          <Link
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#FF5C00] hover:bg-[#E04800] text-white font-bold tracking-wide transition-all shadow-[0_0_10px_rgba(255,92,0,0.4)]"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Admin Studio Desk</span>
          </Link>
        </div>
      )}

      {/* 1. Cinematic Full-Bleed Billboard Hero (Strictly Real Data) */}
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
          subtitle="Curated real titles in this category"
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

      {/* 5. Masterclasses & Knowledge (If any exist) */}
      {masterclasses.length > 0 && (
        <ContentRow
          title="Masterclasses & Knowledge"
          subtitle="High-bitrate studio masterclasses and cinematography"
          items={masterclasses}
          size="md"
          seeAllHref="/browse?genre=knowledge"
        />
      )}

      {/* 6. Feature Cinema (If any exist) */}
      {featureMovies.length > 0 && (
        <ContentRow
          title="Feature Films"
          subtitle="Original feature films and cinema productions"
          items={featureMovies}
          size="md"
          seeAllHref="/movies"
        />
      )}

      {/* 7. Documentaries (If any exist) */}
      {documentaries.length > 0 && (
        <ContentRow
          title="Documentaries"
          subtitle="Expeditions and documentary features"
          items={documentaries}
          size="md"
          seeAllHref="/browse?type=DOCUMENTARY"
        />
      )}

      {/* 8. Long-Form Events (If any exist) */}
      {events.length > 0 && (
        <ContentRow
          title="Recorded Events"
          subtitle="Full recordings and multi-hour live events"
          items={events}
          size="md"
          seeAllHref="/browse?genre=events"
        />
      )}

      {/* 9. All Studio Releases (Show when additional titles exist) */}
      {(allPool.length > masterclasses.length || (masterclasses.length === 0 && allPool.length > 0)) && (
        <ContentRow
          title="All Studio Releases"
          subtitle="All officially published master titles in the catalog"
          items={allPool}
          isLoading={isLoading}
          size="md"
          seeAllHref="/browse"
        />
      )}

      {/* 10. Studio Empty State (When no titles are published yet) */}
      {!isLoading && allPool.length === 0 && (
        <div className="max-w-2xl mx-auto my-16 p-8 rounded-3xl bg-[#120F0C] border border-white/10 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-[#FF5C00]/15 flex items-center justify-center text-[#FF5C00] mx-auto shadow-[0_0_20px_rgba(255,92,0,0.3)]">
            <Film className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            V19Plus Studio Master Archive
          </h2>
          <p className="text-sm text-[#A49C90] leading-relaxed">
            Every single video on V19Plus is directly uploaded and published by the platform admin.
            No mock or synthetic content is displayed.
          </p>
          <div className="pt-2">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#FF5C00] hover:bg-[#E04800] text-white font-bold text-sm shadow-[0_0_20px_rgba(255,92,0,0.4)] transition-all active:scale-95"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Go to Admin Studio Desk to Upload</span>
            </Link>
          </div>
        </div>
      )}

      {/* 11. Studio Master Architecture Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-[#120F0C] via-[#1A1410] to-[#0A0908] border border-white/10 p-6 sm:p-10">
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2 space-y-2">
              <span className="text-xs font-black tracking-widest text-[#FF5C00] uppercase">
                ENGINEERED FOR MASTER RECORDINGS
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white">
                Singapore Origin • Cloudflare Anycast CDN • Adaptive 4K HLS
              </h3>
              <p className="text-xs sm:text-sm text-[#9A9284] max-w-xl leading-relaxed">
                V19plus ingests high-bitrate 20GB–100GB+ master video recordings directly to Cloudflare R2
                object storage and streams low-latency multi-rendition HLS globally.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-[#E5E0D8]">
                ✓ Direct Multipart Ingest (64MB)
              </div>
              <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-[#E5E0D8]">
                ✓ Zero Subscription Gate
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
