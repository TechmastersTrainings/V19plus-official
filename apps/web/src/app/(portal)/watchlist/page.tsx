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
      <div className="min-h-screen bg-[#0A0806] pt-24 sm:pt-28 pb-24 md:pb-16 animate-fade-in text-white select-none">
        <div className="px-4 sm:px-8 md:px-16 lg:px-20 mb-8">
          <Skeleton className="h-10 w-48 rounded-2xl mb-2" />
          <Skeleton className="h-4 w-64 rounded-xl" />
        </div>
        <div className="px-4 sm:px-8 md:px-16 lg:px-20 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[2/3] rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const items = (watchlist || []).filter((item: any) => item?.content && item.content.id);

  return (
    <div className="min-h-screen bg-[#0A0806] pt-24 sm:pt-28 pb-24 md:pb-16 animate-fade-in text-white select-none">
      {/* Header */}
      <div className="px-4 sm:px-8 md:px-16 lg:px-20 mb-8">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white uppercase tracking-tight" style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}>
          My List
        </h1>
      </div>

      {/* Content Grid */}
      <div className="px-4 sm:px-8 md:px-16 lg:px-20">
        {items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8 sm:gap-x-6 sm:gap-y-10">
            {items.map((item: any) => (
              <ContentCard key={item.id} content={item.content} size="lg" />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 text-sm text-[#8C8478]">
            Your list is empty.
          </div>
        )}
      </div>
    </div>
  );
}

