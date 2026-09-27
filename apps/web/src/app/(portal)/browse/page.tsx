'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBrowse } from '../../../hooks/useContent';
import { ContentCard } from '../../../components/content/ContentCard';
import { Skeleton } from '../../../components/ui/Skeleton';
import type { Content } from '@v19plus/types';
import { Search, Filter, Layers } from 'lucide-react';

const FORMATS = [
  { value: '', label: 'All Catalog' },
  { value: 'MOVIE', label: 'Feature Cinema' },
  { value: 'DOCUMENTARY', label: 'Documentaries' },
  { value: 'EVENT', label: 'Recorded Events' },
  { value: 'SERIES', label: 'Series' },
];

function BrowseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [type, setType] = useState(searchParams.get('type') || '');
  const [genre, setGenre] = useState(searchParams.get('genre') || '');

  useEffect(() => {
    setType(searchParams.get('type') || '');
    setGenre(searchParams.get('genre') || '');
  }, [searchParams]);

  const handleTypeChange = (newType: string) => {
    setType(newType);
    const params = new URLSearchParams(window.location.search);
    if (newType) {
      params.set('type', newType);
    } else {
      params.delete('type');
    }
    router.replace(`/browse?${params.toString()}`);
  };

  const { data, isLoading } = useBrowse(
    type || undefined,
    genre || undefined
  );

  const items: Content[] = (data?.items || []) as Content[];

  return (
    <div className="min-h-screen bg-[#070605] pt-24 pb-20 select-none animate-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-5 rounded-full bg-[#FF5C00]" />
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Studio Catalog
              </h1>
            </div>
            <p className="text-xs text-[#8C8478] mt-1 ml-3.5">
              Explore masterclasses, recorded longform, documentaries, and 4K cinema
            </p>
          </div>

          <button
            onClick={() => router.push('/search')}
            className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#141210] border border-white/10 text-xs font-semibold text-[#A8A096] hover:text-white hover:border-[#FF5C00]/40 transition-colors"
          >
            <Search className="w-4 h-4 text-[#FF8A00]" />
            <span>Search Catalog</span>
          </button>
        </div>

        {/* Format Selector Pills */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-4 mb-6">
          {FORMATS.map((f) => {
            const isActive = type === f.value;
            return (
              <button
                key={f.value}
                onClick={() => handleTypeChange(f.value)}
                className={`flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? 'bg-[#FF5C00] text-white shadow-[0_0_12px_rgba(255,92,0,0.35)] border border-[#FF5C00]'
                    : 'bg-[#121110] text-[#B0A89C] hover:text-white border border-white/5 hover:border-white/15'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Compact Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-xl bg-white/5" />
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {items.map((item) => (
              <ContentCard
                key={item.id}
                content={item as any}
                size="md"
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 px-4 rounded-2xl bg-[#12100E] border border-white/5">
            <Layers className="w-8 h-8 text-[#FF5C00]/60 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-white">No titles found in this category</h3>
            <p className="text-xs text-[#8C8478] mt-1 max-w-sm mx-auto">
              Try switching format filters or explore our full streaming vault.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#070605] pt-24 px-4 max-w-7xl mx-auto">
          <Skeleton className="h-8 w-48 mb-6 rounded-lg bg-white/5" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-xl bg-white/5" />
            ))}
          </div>
        </div>
      }
    >
      <BrowseContent />
    </Suspense>
  );
}
