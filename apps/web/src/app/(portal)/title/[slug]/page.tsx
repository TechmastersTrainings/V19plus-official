'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useContent } from '../../../../hooks/useContent';
import { Skeleton } from '../../../../components/ui/Skeleton';
import { ProgressBar } from '../../../../components/ui/ProgressBar';
import { useAuthStore } from '../../../../store/authStore';
import { useWatchlist, useAddToWatchlist, useRemoveFromWatchlist } from '../../../../hooks/useWatchlist';
import toast from 'react-hot-toast';

export default function TitleDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  const { data: content, isLoading } = useContent(slug || '');
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [activeSeason, setActiveSeason] = useState(0);

  const { data: watchlist } = useWatchlist();
  const addToWatchlist = useAddToWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();

  const inList = !!(content && watchlist?.some((item: any) => item?.content?.id === content.id));

  const handleWatchlist = async () => {
    if (!isAuthenticated) {
      toast.error('Sign in to add to your list');
      return;
    }
    if (!content) return;
    try {
      if (inList) {
        await removeFromWatchlist.mutateAsync(content.id);
        toast.success('Removed from My List');
      } else {
        await addToWatchlist.mutateAsync(content.id);
        toast.success('Added to My List');
      }
    } catch {
      toast.error('Could not update list');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-n-bg animate-pulse">
        <Skeleton className="h-[55vh] w-full rounded-none" />
        <div className="px-4 md:px-12 py-8 space-y-4">
          <Skeleton className="h-10 w-1/2 rounded" />
          <Skeleton className="h-4 w-1/3 rounded" />
          <Skeleton className="h-20 w-2/3 rounded" />
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-n-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🎬</div>
          <h1 className="text-2xl font-bold text-n-white mb-2">Title not found</h1>
          <p className="text-n-muted mb-6">This content may have been removed or is unavailable.</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2.5 bg-n-white text-black font-bold rounded hover:bg-n-white/80 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const currentSeason = content.seasons?.[activeSeason];

  // Helper to get gradients for placeholder cards
  const getGradientClass = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes('glass') || t.includes('city')) return 'bg-gradient-to-b from-[#0f766e] via-[#042f2e] to-[#0A0806]';
    if (t.includes('red') || t.includes('tide')) return 'bg-gradient-to-b from-[#991b1b] via-[#450a0a] to-[#0A0806]';
    if (t.includes('deep') || t.includes('static')) return 'bg-gradient-to-b from-[#3730a3] via-[#1e1b4b] to-[#0A0806]';
    return 'bg-gradient-to-b from-[#b45309] via-[#78350f] to-[#0A0806]'; // default orange-brown
  };

  const getCastGradient = (name: string) => {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'from-[#b45309] to-[#78350f]', // Gold/Brown
      'from-[#0f766e] to-[#042f2e]', // Teal
      'from-[#6b21a8] to-[#4c1d95]', // Purple
      'from-[#991b1b] to-[#450a0a]', // Red
    ];
    return colors[hash % colors.length];
  };

  return (
    <div className="min-h-screen bg-n-bg animate-fade-in relative pb-16">
      {/* Back button */}
      <button 
        onClick={() => router.back()}
        className="absolute top-6 left-6 w-10 h-10 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition-all z-30"
        aria-label="Back"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </button>

      {/* Backdrop hero */}
      <div className="relative h-[60vh] md:h-[70vh] overflow-hidden">
        <img
          src={content.backdropUrl}
          alt=""
          className="w-full h-full object-cover object-top opacity-80"
        />
        {/* Glow overlay representing central spotlight */}
        <div className="absolute inset-0 bg-gradient-to-t from-n-bg via-n-bg/30 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-n-bg/40 to-n-bg" />
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at center, rgba(255,92,0,0.15) 0%, transparent 60%)'
          }}
        />

        {/* Central orange play button */}
        <Link
          href={`/watch/${content.slug}`}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-gradient-to-br from-[#FF5C00] to-[#D44900] text-white flex items-center justify-center shadow-[0_0_30px_rgba(255,92,0,0.4)] hover:scale-105 transition-transform duration-300 z-20 group"
        >
          <svg className="w-8 h-8 fill-current translate-x-0.5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </Link>
      </div>

      {/* Main content */}
      <div className="relative z-10 px-6 md:px-16 max-w-5xl mx-auto -mt-20 md:-mt-32">
        {/* Title */}
        <h1 className="text-4xl md:text-6xl font-black text-n-white leading-tight mb-4 uppercase tracking-normal" style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}>
          {content.title}
        </h1>

        {/* Meta / Badges */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-semibold mb-6">
          <span className="text-[#FF5C00] font-black">98% Match</span>
          <span className="text-n-muted">{content.releaseYear}</span>
          {content.rating && (
            <span className="border border-n-muted/50 px-2 py-0.5 rounded text-xs text-n-muted bg-white/5">{content.rating}</span>
          )}
          <span className="text-n-muted">{content.seasons && content.seasons.length > 0 ? `${content.seasons.length} Seasons` : '4K HDR'}</span>
          <span className="bg-n-surface border border-n-divider text-n-muted px-2 py-0.5 rounded text-xs uppercase">
            {content.type}
          </span>
        </div>

        {/* Action Buttons (Orange Play, Dark Download) */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Link
            href={`/watch/${content.slug}${currentSeason ? `?episode=${currentSeason.episodes[0]?.id}` : ''}`}
            className="flex items-center justify-center gap-2 px-10 py-3.5 bg-[#FF5C00] hover:bg-[#FF5C00]/90 text-[#0A0806] font-extrabold rounded-xl text-base transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-[#FF5C00]/10 flex-1 md:flex-none"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            Play {currentSeason ? `S1:E1` : ''}
          </Link>
          <button
            onClick={() => toast.success('Download started')}
            className="flex items-center justify-center gap-2 px-10 py-3.5 bg-[#181410] hover:bg-[#221c16] text-[#FAF6EF] font-bold rounded-xl border border-white/5 text-base transition-all flex-1 md:flex-none"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
          <button
            onClick={handleWatchlist}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-transparent hover:bg-white/5 text-white border border-white/10 rounded-xl transition-all"
            title="Add to My List"
          >
            {inList ? '✓ in My List' : '+ My List'}
          </button>
        </div>

        {/* Description */}
        <p className="text-[#8C8478] text-base leading-relaxed mb-10 max-w-3xl">
          {content.description}
        </p>

        {/* Cast list */}
        {content.cast && content.cast.length > 0 && (
          <section className="mb-12">
            <h2 className="text-xl font-extrabold text-n-white mb-6 uppercase tracking-wider" style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}>Cast</h2>
            <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-2">
              {content.cast.map((member) => (
                <div
                  key={member.id}
                  className="flex-shrink-0 text-center w-20 block"
                >
                  <div className={`w-16 h-16 rounded-full mx-auto mb-2 overflow-hidden bg-gradient-to-tr ${getCastGradient(member.name)} shadow-lg flex items-center justify-center text-xl font-black text-white`}>
                    {member.photoUrl ? (
                      <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      member.name.charAt(0)
                    )}
                  </div>
                  <p className="text-xs font-semibold text-n-text truncate">{member.name}</p>
                  <p className="text-2xs text-[#8C8478] truncate">{member.role || 'Cast'}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Web Series Season Selector & Episodes List */}
        {content.type === 'SERIES' && content.seasons && content.seasons.length > 0 && (
          <section className="mb-14">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h2
                className="text-2xl font-black text-white uppercase tracking-wider"
                style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}
              >
                Episodes
              </h2>

              {/* Season Selection Pills/Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                {content.seasons.map((season, idx) => (
                  <button
                    key={season.id || idx}
                    onClick={() => setActiveSeason(idx)}
                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                      activeSeason === idx
                        ? 'bg-[#FF5C00] text-black shadow-lg shadow-[#FF5C00]/25'
                        : 'bg-[#181410] text-[#FAF6EF] border border-white/5 hover:border-white/20'
                    }`}
                  >
                    {season.title || `Season ${season.number || idx + 1}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Episode Grid / List */}
            {currentSeason?.episodes && currentSeason.episodes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentSeason.episodes.map((ep, epIdx) => (
                  <Link
                    key={ep.id || epIdx}
                    href={`/watch/${content.slug}?episode=${ep.id}`}
                    className="group bg-[#14110D] border border-white/5 hover:border-[#FF5C00]/40 rounded-2xl p-3 flex gap-4 transition-all hover:bg-white/[0.03]"
                  >
                    <div className="relative w-36 sm:w-44 aspect-video rounded-xl overflow-hidden bg-[#1E1914] flex-shrink-0">
                      <img
                        src={ep.thumbnailUrl || content.backdropUrl || content.thumbnailUrl}
                        alt={ep.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-[#FF5C00] text-white flex items-center justify-center shadow-md scale-90 group-hover:scale-100 transition-transform">
                          <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                      <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white">
                        {ep.duration ? `${ep.duration}m` : '24m'}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <div className="flex items-center gap-2 text-xs text-[#FF5C00] font-black uppercase mb-1">
                        <span>Episode {ep.number || epIdx + 1}</span>
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-[#FF5C00] transition-colors truncate">
                        {ep.title}
                      </h4>
                      <p className="text-xs text-[#8C8478] line-clamp-2 mt-1">
                        {ep.description || 'Watch this exciting episode of ' + content.title}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-[#14110D] border border-white/5 text-center text-xs text-[#8C8478]">
                No episodes uploaded for this season yet.
              </div>
            )}
          </section>
        )}

        {/* More Like This (Vertical / Card grid style matching screenshot) */}
        <section className="mt-12">
          <h2 className="text-xl font-extrabold text-n-white mb-6 uppercase tracking-wider" style={{ fontFamily: "'Big Shoulders Display', sans-serif" }}>More Like This</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="aspect-[2/3] w-full rounded-2xl p-4 flex flex-col justify-end bg-gradient-to-b from-[#0f766e] via-[#042f2e] to-[#0A0806] border border-white/5 hover:border-[#FF5C00]/40 transition-all cursor-pointer">
              <h3 className="font-extrabold text-base text-[#FAF6EF]">Glass City</h3>
            </div>
            <div className="aspect-[2/3] w-full rounded-2xl p-4 flex flex-col justify-end bg-gradient-to-b from-[#991b1b] via-[#450a0a] to-[#0A0806] border border-white/5 hover:border-[#FF5C00]/40 transition-all cursor-pointer">
              <h3 className="font-extrabold text-base text-[#FAF6EF]">Red Tide</h3>
            </div>
            <div className="aspect-[2/3] w-full rounded-2xl p-4 flex flex-col justify-end bg-gradient-to-b from-[#3730a3] via-[#1e1b4b] to-[#0A0806] border border-white/5 hover:border-[#FF5C00]/40 transition-all cursor-pointer">
              <h3 className="font-extrabold text-base text-[#FAF6EF]">Deep Static</h3>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
