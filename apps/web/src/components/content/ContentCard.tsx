'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Content } from '../../api/content';
import { useAuthStore } from '../../store/authStore';
import { useWatchlist, useAddToWatchlist, useRemoveFromWatchlist } from '../../hooks/useWatchlist';
import { Film, Bookmark, Check } from 'lucide-react';
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

  // 4 authentic specs matching the card list
  const cardListItems = [
    '4K Ultra HD Master',
    'Dolby Atmos Spatial Audio',
    'Ad-Free Cinema Experience',
    durationMins > 0 ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m Runtime` : `${primaryGenre} Feature`,
  ];

  const effectivePoster =
    posterSrc ||
    'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80';

  return (
    <div className="flex-shrink-0 my-1">
      <div className={`card ${theme === 'cyan' ? 'theme-cyan' : ''}`}>
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
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
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

          {/* Top 4K Badge */}
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
            <span className="text-[9px] font-black text-white/95 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10 tracking-widest shadow">
              4K
            </span>
          </div>

          {/* Watchlist toggle icon */}
          <button
            onClick={handleWatchlist}
            className="absolute top-2 left-2 z-10 w-7 h-7 rounded-md bg-black/60 hover:bg-black/90 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-white border border-white/10 transition-colors"
            title={inList ? 'In My List' : 'Add to My List'}
          >
            {inList ? <Check className="w-3.5 h-3.5 text-[#FFA040]" /> : <Bookmark className="w-3.5 h-3.5" />}
          </button>

          {/* Continue Watching Progress Bar */}
          {progress !== undefined && progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/80 overflow-hidden z-10">
              <div
                className="h-full bg-gradient-to-r from-[#FF8A00] via-[#FFA040] to-[#FFE0B2] shadow-[0_0_8px_rgba(255,160,64,0.8)]"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          )}
        </div>

        {/* Title & Description Container */}
        <div className="card_title__container">
          <span className="card_title truncate block" title={content.title}>
            {content.title}
          </span>
          <p className="card_paragraph line-clamp-2">
            {content.description || `${releaseYear} • ${durationMins ? `${Math.floor(durationMins / 60)}h ${durationMins % 60}m` : 'Feature'} • ${primaryGenre}`}
          </p>
        </div>

        <hr className="line" />

        {/* Feature Check List */}
        <ul className="card__list">
          {cardListItems.map((text, idx) => (
            <li key={idx} className="card__list_item">
              <span className="check">
                <svg
                  className="check_svg"
                  fill="currentColor"
                  viewBox="0 0 16 16"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    clipRule="evenodd"
                    d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                    fillRule="evenodd"
                  />
                </svg>
              </span>
              <span className="list_text">{text}</span>
            </li>
          ))}
        </ul>

        {/* Action Button */}
        <button className="button" onClick={handlePlay}>
          {progress !== undefined && progress > 0 ? 'Resume Playing' : 'Watch Now'}
        </button>
      </div>
    </div>
  );
}

export default ContentCard;
