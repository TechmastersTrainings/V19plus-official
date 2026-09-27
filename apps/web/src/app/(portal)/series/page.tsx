'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useBrowse } from '../../../hooks/useContent';
import { ContentCard } from '../../../components/content/ContentCard';
import { Skeleton } from '../../../components/ui/Skeleton';
import type { Content } from '@v19plus/types';
import { Tv, Filter, ArrowUpDown } from 'lucide-react';

const GENRES = [
  'All Genres',
  'Drama',
  'Thriller',
  'Crime',
  'Comedy',
  'Action',
  'Sci-Fi',
  'Mystery',
  'Romance',
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

export default function WebSeriesPage() {
  const router = useRouter();
  const [selectedGenre, setSelectedGenre] = useState('All Genres');
  const [selectedLanguage, setSelectedLanguage] = useState('All Languages');
  const [sortBy, setSortBy] = useState('newest');

  // Query only web series
  const { data, isLoading } = useBrowse(
    'SERIES',
    selectedGenre === 'All Genres' ? undefined : selectedGenre
  );

  const rawItems = ((data?.items || []) as Content[]).filter(
    (item) => item.type === 'SERIES'
  );

  const filteredAndSortedItems = useMemo(() => {
    let items = [...rawItems];

    // Language filter
    if (selectedLanguage !== 'All Languages') {
      items = items.filter((item: any) => {
        const itemLang = item.language || (item.tags && item.tags.join(' '));
        return (
          itemLang &&
          itemLang.toLowerCase().includes(selectedLanguage.toLowerCase())
        );
      });
    }

    // Sorting
    if (sortBy === 'newest') {
      items.sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0));
    } else if (sortBy === 'rating') {
      items.sort((a, b) => (b.imdbScore || 0) - (a.imdbScore || 0));
    } else if (sortBy === 'title') {
      items.sort((a, b) => a.title.localeCompare(b.title));
    }

    return items;
  }, [rawItems, selectedLanguage, sortBy]);

  return (
    <div className="min-h-screen bg-[#0A0806] pt-24 pb-28 px-4 sm:px-8 md:px-16 animate-fade-in relative">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase tracking-tight"
            style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}
          >
            Web Series
          </h1>
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Genre Filter */}
          <div className="relative">
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="appearance-none bg-[#14110D] border border-white/10 text-white text-xs sm:text-sm font-semibold rounded-xl px-4 py-2.5 pr-8 hover:border-[#FF5C00]/40 focus:outline-none focus:border-[#FF5C00] transition-colors cursor-pointer"
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
              className="appearance-none bg-[#14110D] border border-white/10 text-white text-xs sm:text-sm font-semibold rounded-xl px-4 py-2.5 pr-8 hover:border-[#FF5C00]/40 focus:outline-none focus:border-[#FF5C00] transition-colors cursor-pointer"
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
              className="appearance-none bg-[#14110D] border border-white/10 text-white text-xs sm:text-sm font-semibold rounded-xl px-4 py-2.5 pr-8 hover:border-[#FF5C00]/40 focus:outline-none focus:border-[#FF5C00] transition-colors cursor-pointer"
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

      {/* Series Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : filteredAndSortedItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10">
          {filteredAndSortedItems.map((item) => (
            <ContentCard key={item.id} content={item as any} size="lg" />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 text-sm text-[#8C8478]">
          No web series found.
        </div>
      )}
    </div>
  );
}
