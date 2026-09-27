'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBrowse } from '../../../hooks/useContent';
import { ContentCard } from '../../../components/content/ContentCard';
import { Skeleton } from '../../../components/ui/Skeleton';
import type { Content } from '@v19plus/types';

const TYPES = [
  { value: '', label: 'All' },
  { value: 'MOVIE', label: 'Movies' },
  { value: 'SERIES', label: 'Series' },
  { value: 'LIVE', label: 'Live TV' },
  { value: 'ORIGINALS', label: 'Originals' },
];

function BrowseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Sync state from query parameters
  const [type, setType] = useState(searchParams.get('type') || '');

  useEffect(() => {
    setType(searchParams.get('type') || '');
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
    type === 'ORIGINALS' ? undefined : (type || undefined),
    undefined
  );

  let items: Content[] = (data?.items || []) as Content[];
  if (type === 'ORIGINALS') {
    items = items.filter(item => item.isOriginal);
  }

  return (
    <div className="min-h-screen bg-n-bg pt-20 pb-24 px-4 md:px-12 animate-fade-in relative">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold text-[#FAF6EF]" style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}>Browse</h1>
        <button
          onClick={() => router.push('/search')}
          className="w-10 h-10 rounded-full bg-[#181410] border border-white/5 flex items-center justify-center text-[#8C8478] hover:text-white transition-colors"
          aria-label="Search"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>
      </div>

      {/* Pill Filters */}
      <div className="flex gap-2.5 overflow-x-auto scrollbar-hide mb-8">
        {TYPES.map((t) => (
          <button
            key={t.value}
            onClick={() => handleTypeChange(t.value)}
            className={`flex-shrink-0 px-5 py-2 rounded-full text-sm font-bold transition-all ${
              type === t.value
                ? 'bg-[#FF5C00] text-black shadow-lg shadow-[#FF5C00]/25'
                : 'bg-[#181410] text-[#FAF6EF] border border-white/5 hover:border-white/20'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Grid - using premium ContentCard with metadata overlays */}
      {isLoading ? (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] rounded-2xl" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-8 md:gap-x-6 md:gap-y-10">
          {items.map((item) => (
            <ContentCard
              key={item.id}
              content={item as any}
              size="lg"
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 text-sm text-[#8C8478]">
          No items found.
        </div>
      )}
    </div>
  );
}

export default function BrowsePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-n-bg flex items-center justify-center">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-white/5" />
          <div className="absolute inset-0 rounded-full border-4 border-n-red border-t-transparent animate-spin" />
        </div>
      </div>
    }>
      <BrowseContent />
    </Suspense>
  );
}
