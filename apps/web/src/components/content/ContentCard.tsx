'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Content } from '../../api/content';
import { useAuthStore } from '../../store/authStore';
import { useWatchlist, useAddToWatchlist, useRemoveFromWatchlist } from '../../hooks/useWatchlist';
import { Film, Bookmark, Check, Play, Sparkles, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export interface ContentCardProps {
  content: Content;
  progress?: number;
  rank?: number;
  size?: 'sm' | 'md' | 'lg' | 'wide';
  theme?: 'cyan' | 'orange';
  className?: string;
}

export function ContentCard({
  content,
  progress,
  rank,
  size = 'md',
  theme = 'orange',
  className = '',
}: ContentCardProps) {
  const [imgError, setImgError] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();

  const { data: watchlist } = useWatchlist();
  const addToWatchlist = useAddToWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();

  if (!content || !content.id) return null;

  const inList = !!watchlist?.some(
    (item: any) => item?.content?.id === content?.id || item?.id === content?.id
  );

  const posterSrc =
    content.thumbnail_url ||
    content.thumbnailUrl ||
    content.backdrop_url ||
    content.backdropUrl ||
    '';

  const releaseYear = content.release_year ?? content.releaseYear ?? 2026;
  const rating = content.rating || 'U/A 13+';
  const durationMins = content.duration
    ? content.duration
    : content.duration_seconds
    ? Math.floor(content.duration_seconds / 60)
    : 0;

  const genres =
    content.genres && content.genres.length > 0
      ? content.genres.map((g: any) => (typeof g === 'string' ? g : g.name))
      : content.genre || [];

  const primaryGenre = genres[0] || (content.content_type === 'SERIES' ? 'Series' : 'Feature Film');
  const isOriginal = content.is_original ?? content.isOriginal ?? true;

  const handleCardClick = () => {
    router.push(`/watch/${content.slug}`);
  };

  const handleWatchlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.error('Sign in to add to your list');
      return;
    }
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

  const effectivePoster =
    posterSrc ||
    'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80';

  // Responsive Netflix/Prime shelf sizing for horizontal rows
  const widthClasses = {
    sm: 'w-[180px] sm:w-[210px]',
    md: 'w-[230px] sm:w-[260px] md:w-[280px]',
    lg: 'w-[270px] sm:w-[310px] md:w-[340px]',
    wide: 'w-[250px] sm:w-[285px] md:w-[310px]',
  }[size];

  return (
    <div
      onClick={handleCardClick}
      className={`v19-card flex-shrink-0 group/card cursor-pointer select-none transition-all duration-300 hover:-translate-y-1.5 ${widthClasses} ${className}`}
    >
      {/* 16:9 Landscape Thumbnail Container */}
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-[#181818] border border-white/10 group-hover/card:border-[#3EFFC0]/70 group-hover/card:shadow-[0_0_20px_rgba(62,255,192,0.25)] transition-all duration-300 shadow-xl">
        {!imgError ? (
          <img
            src={effectivePoster}
            alt={content.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1E1E1E] to-[#121212] relative">
            <div className="w-10 h-10 rounded-xl bg-[#3EFFC0]/15 border border-[#3EFFC0]/30 flex items-center justify-center text-[#3EFFC0] shadow-[0_0_15px_rgba(62,255,192,0.25)]">
              <Film className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-white/90 mt-1 line-clamp-1 px-2 text-center">
              {content.title}
            </span>
          </div>
        )}

        {/* Hover Ambient Overlay with Center Play Circle */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <div className="w-11 h-11 rounded-full bg-white group-hover/card:bg-[#3EFFC0] text-[#121212] flex items-center justify-center shadow-[0_4px_24px_rgba(0,0,0,0.9)] transform scale-75 group-hover/card:scale-100 transition-all duration-200">
            <Play className="w-4 h-4 fill-[#121212] text-[#121212] ml-0.5" />
          </div>
        </div>

        {/* Top-Left Badge: Rank or Original Tag */}
        {rank !== undefined ? (
          <div className="absolute top-2 left-2 z-10 px-2.5 py-0.5 rounded-md bg-gradient-to-r from-[#E50914] to-[#FF2236] text-white font-black text-xs shadow-[0_0_12px_rgba(229,9,20,0.6)] border border-white/20">
            #{rank}
          </div>
        ) : isOriginal ? (
          <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-[#121212]/85 backdrop-blur-md text-[#3EFFC0] font-bold text-[10px] tracking-wide border border-[#3EFFC0]/35 flex items-center gap-1 shadow-sm">
            <Sparkles className="w-2.5 h-2.5 text-[#3EFFC0]" />
            <span>Original</span>
          </div>
        ) : null}

        {/* Top-Right: Quick Add/Remove Watchlist Button */}
        <button
          onClick={handleWatchlist}
          className={`absolute top-2 right-2 z-10 w-7 h-7 rounded-full backdrop-blur-md border flex items-center justify-center transition-all duration-200 shadow-md ${
            inList
              ? 'bg-[#3EFFC0] border-[#3EFFC0] text-[#121212] shadow-[0_0_10px_rgba(62,255,192,0.5)]'
              : 'bg-black/60 border-white/20 text-white/80 hover:text-white hover:bg-black/90 hover:border-[#3EFFC0]/60 opacity-0 group-hover/card:opacity-100'
          }`}
          title={inList ? 'In My List' : 'Add to My List'}
          aria-label="Toggle Watchlist"
        >
          {inList ? <Check className="w-3.5 h-3.5 text-[#121212] stroke-[3]" /> : <Bookmark className="w-3.5 h-3.5" />}
        </button>

        {/* Bottom Badges */}
        <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-between pointer-events-none">
          {/* Duration Badge */}
          {durationMins > 0 ? (
            <span className="px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-[10px] font-medium text-white/90 border border-white/10 flex items-center gap-1 shadow-sm">
              <Clock className="w-2.5 h-2.5 text-[#3EFFC0]" />
              <span>{Math.floor(durationMins / 60) > 0 ? `${Math.floor(durationMins / 60)}h ` : ''}{durationMins % 60}m</span>
            </span>
          ) : <span />}

          {/* Quality & Rating */}
          <div className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded bg-[#121212]/90 backdrop-blur-md text-[9px] font-bold text-[#3EFFC0] border border-[#3EFFC0]/40 shadow-sm">
              4K UHD
            </span>
            <span className="px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-md text-[9px] font-semibold text-white/90 border border-white/10">
              {rating}
            </span>
          </div>
        </div>

        {/* Continue Watching Sleek Progress Bar */}
        {progress !== undefined && progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/80 z-20 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#E50914] via-[#00E5FF] to-[#3EFFC0] shadow-[0_0_8px_rgba(62,255,192,0.8)]"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
      </div>

      {/* Metadata Below Card */}
      <div className="pt-2 px-0.5 space-y-0.5">
        <h3
          className="font-bold text-white text-xs sm:text-sm tracking-tight truncate group-hover/card:text-[#3EFFC0] transition-colors"
          title={content.title}
        >
          {content.title}
        </h3>

        <div className="flex items-center gap-1.5 text-[11px] text-[#A0A0A0] font-medium">
          <span className="text-[#3EFFC0] font-semibold">{primaryGenre}</span>
          <span>•</span>
          <span className="text-white/80">{releaseYear}</span>
          <span>•</span>
          <span className="text-[#00E5FF]/90">Direct Edge</span>
        </div>
      </div>
    </div>
  );
}

export default ContentCard;
