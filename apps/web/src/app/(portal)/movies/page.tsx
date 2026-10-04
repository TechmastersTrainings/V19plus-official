'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useBrowse, useTrending, useOriginals, useFeatured } from '../../../hooks/useContent';
import { useWatchlist, useAddToWatchlist, useRemoveFromWatchlist } from '../../../hooks/useWatchlist';
import { useAuthStore } from '../../../store/authStore';
import { ContentCard } from '../../../components/content/ContentCard';
import { ContentRow } from '../../../components/content/ContentRow';
import { Skeleton } from '../../../components/ui/Skeleton';
import type { Content } from '../../../api/content';
import { Film, Filter, ArrowUpDown, Play, Bookmark, Check, Sparkles, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const GENRES = [
  'All Genres',
  'Action',
  'Drama',
  'Comedy',
  'Thriller',
  'Horror',
  'Sci-Fi',
  'Romance',
  'Adventure',
  'Crime',
  'Documentary',
];

const LANGUAGES = [
  'All Languages',
  'English',
  'Hindi',
  'Tamil',
  'Telugu',
  'Malayalam',
  'Kannada',
  'Spanish',
  'Korean',
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'title', label: 'Title (A-Z)' },
];

export default function MoviesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [selectedGenre, setSelectedGenre] = useState('All Genres');
  const [selectedLanguage, setSelectedLanguage] = useState('All Languages');
  const [sortBy, setSortBy] = useState('newest');

  // Query only movies
  const { data, isLoading } = useBrowse(
    'MOVIE',
    selectedGenre === 'All Genres' ? undefined : selectedGenre
  );

  const { data: trendingData } = useTrending();
  const { data: originalsData } = useOriginals();
  const { data: featuredData } = useFeatured();
  const { data: watchlistData } = useWatchlist();
  const addToWatchlist = useAddToWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();

  const trendingItems = useMemo(
    () => (Array.isArray(trendingData) ? (trendingData.filter((i: any) => i && i.id) as Content[]) : []),
    [trendingData]
  );

  const originalsItems = useMemo(
    () => (Array.isArray(originalsData) ? (originalsData.filter((i: any) => i && i.id) as Content[]) : []),
    [originalsData]
  );

  const allVault = useMemo(() => {
    const map = new Map<string, Content>();
    [...(Array.isArray(featuredData) ? featuredData : []), ...trendingItems, ...originalsItems].forEach((item) => {
      if (item && item.id) map.set(item.id, item as Content);
    });
    return Array.from(map.values());
  }, [featuredData, trendingItems, originalsItems]);

  const rawItems = ((data?.items || []) as Content[]).filter(
    (item: any) => item && (item.content_type === 'MOVIE' || item.type === 'MOVIE' || !item.type)
  );

  const filteredAndSortedItems = useMemo(() => {
    let items = [...rawItems];

    if (selectedLanguage !== 'All Languages') {
      items = items.filter((item: any) => {
        const itemLang = item.language || (item.tags && item.tags.join(' '));
        return (
          itemLang &&
          itemLang.toLowerCase().includes(selectedLanguage.toLowerCase())
        );
      });
    }

    if (sortBy === 'newest') {
      items.sort((a, b) => (b.releaseYear || b.release_year || 0) - (a.releaseYear || a.release_year || 0));
    } else if (sortBy === 'rating') {
      items.sort((a, b) => (b.imdbScore || 0) - (a.imdbScore || 0));
    } else if (sortBy === 'title') {
      items.sort((a, b) => a.title.localeCompare(b.title));
    }

    return items;
  }, [rawItems, selectedLanguage, sortBy]);

  // Top spotlight movie for cinema billboard
  const spotlightMovie = filteredAndSortedItems[0] || allVault[0] || null;

  const isSpotlightInList = useMemo(() => {
    if (!spotlightMovie || !Array.isArray(watchlistData)) return false;
    return watchlistData.some((w: any) => w?.content?.id === spotlightMovie.id || w?.id === spotlightMovie.id);
  }, [spotlightMovie, watchlistData]);

  const handleToggleSpotlightWatchlist = async () => {
    if (!spotlightMovie) return;
    if (!isAuthenticated) {
      toast.error('Sign in to add to your list');
      return;
    }
    try {
      if (isSpotlightInList) {
        await removeFromWatchlist.mutateAsync(spotlightMovie.id);
        toast.success('Removed from My List');
      } else {
        await addToWatchlist.mutateAsync(spotlightMovie.id);
        toast.success('Added to My List');
      }
    } catch {
      toast.error('Could not update list');
    }
  };

  const hasSpecificFilter = selectedGenre !== 'All Genres' || selectedLanguage !== 'All Languages';

  return (
    <div className="min-h-screen bg-[#070605] pt-20 sm:pt-24 pb-20 animate-fade-in text-white">
      {/* 1. Cinema Hero Billboard (Netflix / Prime Video style) */}
      {spotlightMovie && (
        <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 sm:mb-12">
          <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-t from-[#070605] via-[#120E0A]/90 to-transparent border border-white/10 shadow-2xl min-h-[340px] sm:min-h-[420px] flex items-end">
            {/* Backdrop Image */}
            <img
              src={
                spotlightMovie.backdrop_url ||
                spotlightMovie.backdropUrl ||
                spotlightMovie.thumbnail_url ||
                spotlightMovie.thumbnailUrl ||
                'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1600&q=80'
              }
              alt={spotlightMovie.title}
              className="absolute inset-0 w-full h-full object-cover object-center filter brightness-[0.7]"
            />

            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#070605] via-[#070605]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#070605] via-[#070605]/70 to-transparent" />

            {/* Billboard Content */}
            <div className="relative z-10 p-6 sm:p-10 max-w-2xl space-y-3 sm:space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-[#FF5C00]/30 text-[#FFA84A] text-xs font-bold tracking-wider uppercase">
                <Sparkles className="w-3.5 h-3.5 text-[#FF5C00]" />
                <span>Featured Movie Premiere</span>
              </div>

              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md">
                {spotlightMovie.title}
              </h1>

              {/* Metadata tags */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-semibold text-[#B8B0A2]">
                <span className="px-2 py-0.5 rounded bg-[#FF5C00] text-white font-bold">
                  4K UHD
                </span>
                <span>{spotlightMovie.release_year ?? 2026}</span>
                <span>•</span>
                <span>{spotlightMovie.rating || 'U/A 18+'}</span>
                {spotlightMovie.duration_seconds ? (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#FF8A00]" />
                      {Math.floor(spotlightMovie.duration_seconds / 60)}m
                    </span>
                  </>
                ) : null}
                <span>•</span>
                <span className="text-white/80">Stereo 5.1</span>
              </div>

              <p className="text-xs sm:text-sm text-[#D4CDC3]/90 line-clamp-3 leading-relaxed max-w-xl">
                {spotlightMovie.description ||
                  'Experience this master feature film in ultra-high bitrate streaming directly from global edge storage with lossless audio.'}
              </p>

              {/* Billboard CTAs */}
              <div className="flex items-center gap-3 pt-2">
                <Link
                  href={`/watch/${spotlightMovie.slug}`}
                  className="inline-flex items-center gap-2 px-6 py-2.5 sm:py-3 rounded-xl bg-white hover:bg-neutral-200 text-black font-bold text-xs sm:text-sm shadow-xl transition-all active:scale-95"
                >
                  <Play className="w-4 h-4 fill-black text-black" />
                  <span>Watch Movie</span>
                </Link>

                <button
                  onClick={handleToggleSpotlightWatchlist}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-semibold border backdrop-blur-md transition-all active:scale-95 ${
                    isSpotlightInList
                      ? 'bg-[#FF5C00]/20 border-[#FF5C00] text-[#FF8A00]'
                      : 'bg-black/60 hover:bg-black/80 border-white/20 text-white'
                  }`}
                >
                  {isSpotlightInList ? (
                    <>
                      <Check className="w-4 h-4 text-[#FFA040]" />
                      <span>In My List</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4" />
                      <span>Add to List</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. Filter & Sort Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6 sm:mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-[#FF5C00]" />
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Movie Catalog
              </h2>
            </div>
            <p className="text-xs text-[#8C8478] mt-0.5 ml-3.5">
              Browse feature films, cinema releases, and acclaimed productions
            </p>
          </div>

          {/* Filter & Sort Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Genre Filter */}
            <div className="relative">
              <select
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
                className="appearance-none bg-[#14110D] border border-white/10 text-white text-xs font-semibold rounded-xl px-3.5 py-2 pr-8 hover:border-[#FF5C00]/40 focus:outline-none focus:border-[#FF5C00] transition-colors cursor-pointer"
              >
                {GENRES.map((genre) => (
                  <option key={genre} value={genre} className="bg-[#14110D] text-white">
                    {genre}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#8C8478]">
                <Filter className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Language Filter */}
            <div className="relative">
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="appearance-none bg-[#14110D] border border-white/10 text-white text-xs font-semibold rounded-xl px-3.5 py-2 pr-8 hover:border-[#FF5C00]/40 focus:outline-none focus:border-[#FF5C00] transition-colors cursor-pointer"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang} className="bg-[#14110D] text-white">
                    {lang}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#8C8478]">
                <Filter className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Sort By */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-[#14110D] border border-white/10 text-white text-xs font-semibold rounded-xl px-3.5 py-2 pr-8 hover:border-[#FF5C00]/40 focus:outline-none focus:border-[#FF5C00] transition-colors cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-[#14110D] text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#8C8478]">
                <ArrowUpDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filtered Grid View (When user actively filters by genre/language) */}
      {hasSpecificFilter ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="aspect-video rounded-xl bg-white/5" />
              ))}
            </div>
          ) : filteredAndSortedItems.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {filteredAndSortedItems.map((item) => (
                <ContentCard key={item.id} content={item as any} size="md" />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-xs text-[#8C8478] bg-[#12100E] rounded-xl border border-white/5 mb-8">
              No feature titles found matching "{selectedGenre}". Browse recommended titles below:
            </div>
          )}

          {/* Fallback shelves so user always has titles side-by-side */}
          <div className="mt-8 space-y-6">
            <ContentRow
              title="Trending on V19Plus"
              subtitle="Popular titles streaming this week"
              items={trendingItems.length > 0 ? trendingItems : allVault}
              size="md"
            />
            <ContentRow
              title="All Catalog Premieres"
              subtitle="Explore the complete streaming library"
              items={allVault}
              size="md"
            />
          </div>
        </div>
      ) : (
        /* 4. Default Netflix / Amazon Prime Horizontal Shelves ("one by one") */
        <div className="space-y-6 sm:space-y-8">
          {filteredAndSortedItems.length > 0 && (
            <ContentRow
              title="Featured Movies"
              subtitle="Curated feature films streaming in direct 4K"
              items={filteredAndSortedItems}
              size="md"
            />
          )}

          <ContentRow
            title="Trending Cinema & Premieres"
            subtitle="Most popular titles streaming on V19Plus"
            items={trendingItems.length > 0 ? trendingItems : allVault}
            showRank={true}
            size="md"
          />

          <ContentRow
            title="V19Plus Originals"
            subtitle="Exclusive productions crafted by premier storytellers"
            items={originalsItems.length > 0 ? originalsItems : allVault}
            size="md"
          />

          <ContentRow
            title="Curated Vault"
            subtitle="Explore all available titles"
            items={allVault}
            size="md"
          />
        </div>
      )}
    </div>
  );
}
