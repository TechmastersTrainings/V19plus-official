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
}

export function ContentCard({
  content,
  progress,
  rank,
  size,
  theme = 'orange',
}: ContentCardProps) {
  const [imgError, setImgError] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const router = useRouter();

  const { data: watchlist } = useWatchlist();
  const addToWatchlist = useAddToWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();

  const inList = !!watchlist?.some(
    (item: any) => item?.content?.id === content?.id || item?.id === content?.id
  );

  if (!content || !content.id) return null;

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

  const primaryGenre = genres[0] || 'V19+ Original';
  const isOriginal = content.is_original ?? content.isOriginal ?? true;

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  return (
    <div className="flex-shrink-0 my-1 w-full min-w-0 group/card">
      <div className={`card ${theme === 'cyan' ? 'theme-cyan' : ''} w-full`}>
        <div className="card__border" />

        {/* Top Media / Thumbnail Preview */}
        <div
          className="relative aspect-video w-full rounded-lg overflow-hidden bg-[#120E0A] border border-white/10 shadow-inner group/media cursor-pointer z-10"
          onClick={handlePlay}
        >
          {!imgError ? (
            <img
              src={effectivePoster}
              alt={content.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover/media:scale-105"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1C1610] via-[#120E0A] to-[#070605] relative">
              <div className="w-10 h-10 rounded-xl bg-[#FF8A00]/15 border border-[#FF8A00]/30 flex items-center justify-center text-[#FFA040] shadow-[0_0_15px_rgba(255,160,64,0.25)]">
                <Film className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-white/80 mt-1 line-clamp-1 px-2 text-center">
                {content.title}
              </span>
            </div>
          )}

          {/* Rank Badge or Original Tag in Top-Left */}
          {rank !== undefined ? (
            <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-gradient-to-r from-[#FF5C00] to-[#FF8A00] text-white font-black text-xs shadow-lg border border-white/20">
              #{rank}
            </div>
          ) : isOriginal ? (
            <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[#FFA040] font-bold text-[10px] tracking-wide border border-[#FFA040]/30 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              <span>Original</span>
            </div>
          ) : null}

          {/* 4K UHD Badge Top-Right */}
          <div className="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-md text-[10px] font-bold text-amber-300 border border-amber-300/30">
            4K UHD
          </div>

          {/* Hover Play Glow Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 group-hover/media:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
            <div className="w-11 h-11 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transform scale-90 group-hover/media:scale-100 transition-transform duration-200">
              <Play className="w-5 h-5 fill-black ml-0.5" />
            </div>
          </div>

          {/* Duration Badge Bottom-Left */}
          {durationMins > 0 && (
            <div className="absolute bottom-2 left-2 z-10 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md text-[10px] font-medium text-white/90 border border-white/10 flex items-center gap-1">
              <Clock className="w-2.5 h-2.5 text-[#FF8A00]" />
              <span>{Math.floor(durationMins / 60) > 0 ? `${Math.floor(durationMins / 60)}h ` : ''}{durationMins % 60}m</span>
            </div>
          )}

          {/* Age Rating Badge Bottom-Right */}
          <div className="absolute bottom-2 right-2 z-10 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md text-[10px] font-semibold text-white/80 border border-white/10">
            {rating}
          </div>

          {/* Continue Watching Progress Bar */}
          {progress !== undefined && progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/80 overflow-hidden z-20">
              <div
                className="h-full bg-gradient-to-r from-[#FF8A00] via-[#FFA040] to-[#FFE0B2] shadow-[0_0_8px_rgba(255,160,64,0.8)]"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          )}
        </div>

        {/* Title & Metadata Container */}
        <div className="card_title__container space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="card_title truncate block font-bold text-white text-sm sm:text-base group-hover/card:text-[#FF8A00] transition-colors" title={content.title}>
              {content.title}
            </span>
          </div>

          {/* Subtle Tagline / Metadata */}
          <div className="flex items-center gap-2 text-[11px] text-[#A49C90] font-medium">
            <span className="text-[#FF8A00] font-semibold">{primaryGenre}</span>
            <span>•</span>
            <span>{releaseYear}</span>
            <span>•</span>
            <span className="text-white/60">Stereo 5.1</span>
          </div>

          <p className="card_paragraph line-clamp-2 text-xs text-[#9A9284] leading-relaxed pt-0.5">
            {content.description || `${primaryGenre} premiere production streaming in high-bitrate edge delivery.`}
          </p>
        </div>

        <hr className="line my-1" />

        {/* Action Controls */}
        <div className="flex items-center gap-2 pt-1 z-10 relative">
          <button
            className="button flex-1 flex items-center justify-center gap-2"
            onClick={handlePlay}
          >
            <Play className="w-3.5 h-3.5 fill-white text-white" />
            <span>{progress !== undefined && progress > 0 ? 'Resume' : 'Watch Now'}</span>
          </button>

          <button
            onClick={handleWatchlist}
            className={`p-2 rounded-full border transition-all active:scale-95 ${
              inList
                ? 'bg-[#FF5C00]/20 border-[#FF5C00] text-[#FF8A00] shadow-[0_0_10px_rgba(255,92,0,0.3)]'
                : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/20'
            }`}
            title={inList ? 'In My List' : 'Add to My List'}
            aria-label="Toggle Watchlist"
          >
            {inList ? <Check className="w-4 h-4 text-[#FFA040]" /> : <Bookmark className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ContentCard;

