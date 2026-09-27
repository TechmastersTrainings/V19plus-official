'use client';

import React, { useState, useMemo } from 'react';
import { useBrowse } from '../../../hooks/useContent';
import { ContentCard } from '../../../components/content/ContentCard';
import { Skeleton } from '../../../components/ui/Skeleton';
import type { Content } from '@v19plus/types';
import { Filter, ArrowUpDown } from 'lucide-react';

const CATEGORIES = [
  'All Music',
  'Soundtracks',
  'Concerts & Live',
  'Music Videos',
  'Pop',
  'Hip-Hop',
  'Rock',
  'Classical',
  'Electronic',
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'title', label: 'Title (A-Z)' },
];

export default function MusicPage() {
  const [selectedCategory, setSelectedCategory] = useState('All Music');
  const [sortBy, setSortBy] = useState('newest');

  const { data, isLoading } = useBrowse(
    'MUSIC',
    selectedCategory === 'All Music' ? undefined : selectedCategory
  );

  const rawItems = ((data?.items || []) as Content[]).filter(
    (item: any) =>
      item.type === 'MUSIC' ||
      (Array.isArray(item.genre) && item.genre.some((g: string) => g.toLowerCase().includes('music'))) ||
      (Array.isArray(item.tags) && item.tags.some((t: string) => t.toLowerCase().includes('music')))
  );

  const filteredAndSortedItems = useMemo(() => {
    let items = [...rawItems];

    if (sortBy === 'newest') {
      items.sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0));
    } else if (sortBy === 'rating') {
      items.sort((a, b) => (b.imdbScore || 0) - (a.imdbScore || 0));
    } else if (sortBy === 'title') {
      items.sort((a, b) => a.title.localeCompare(b.title));
    }

    return items;
  }, [rawItems, sortBy]);

  return (
    <div className="min-h-screen bg-[#0A0806] pt-24 pb-28 px-4 sm:px-8 md:px-16 animate-fade-in relative">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase tracking-tight"
            style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}
          >
            Music
          </h1>
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter */}
          <div className="relative">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="appearance-none bg-[#14110D] border border-white/10 text-white text-xs sm:text-sm font-semibold rounded-xl px-4 py-2.5 pr-8 hover:border-[#FF5C00]/40 focus:outline-none focus:border-[#FF5C00] transition-colors cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-[#14110D] text-white">
                  {cat}
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

      {/* Content Grid */}
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
          No music content found.
        </div>
      )}
    </div>
  );
}
