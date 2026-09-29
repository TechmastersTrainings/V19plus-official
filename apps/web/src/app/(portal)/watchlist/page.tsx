'use client';

import { useWatchlist } from '../../../hooks/useWatchlist';
import { ContentCard } from '../../../components/content/ContentCard';
import { Skeleton } from '../../../components/ui/Skeleton';
import { useAuthStore } from '../../../store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Bookmark, Sparkles, Plus } from 'lucide-react';

export default function WatchlistPage() {
  const { data: watchlist, isLoading } = useWatchlist();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authLoading = useAuthStore((s) => s.isLoading);
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070605] pt-24 sm:pt-28 pb-20 animate-fade-in text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <Skeleton className="h-8 w-48 rounded-xl mb-2" />
          <Skeleton className="h-4 w-64 rounded-lg" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] rounded-xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  const items = (watchlist || []).filter((item: any) => item?.content && item.content.id);

  return (
    <div className="min-h-screen bg-[#070605] pt-24 sm:pt-28 pb-20 animate-fade-in text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-5 rounded-full bg-[#FF5C00]" />
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              My Watchlist
            </h1>
          </div>
          <p className="text-xs text-[#8C8478] mt-1 ml-3.5">
            Your saved masterclasses, documentaries, and cinema titles
          </p>
        </div>

        {/* Content Grid */}
        {items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {items.map((item: any) => (
              <ContentCard key={item.id} content={item.content} size="md" />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-[#12100E] rounded-2xl border border-white/5 max-w-lg mx-auto p-8">
            <div className="w-12 h-12 rounded-xl bg-[#FF5C00]/10 border border-[#FF5C00]/30 flex items-center justify-center text-[#FF8A00] mx-auto mb-3">
              <Bookmark className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">Your vault is currently empty</h3>
            <p className="text-xs text-[#8C8478] mb-4">
              Browse the catalog and tap the plus icon on any title to save it for quick access.
            </p>
            <button
              onClick={() => router.push('/browse')}
              className="px-5 py-2 bg-[#FF5C00] hover:bg-[#FF7A00] text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95"
            >
              Explore Catalog
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

