import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Content } from '../../api/content';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { useWatchlist, useAddToWatchlist, useRemoveFromWatchlist } from '../../hooks/useWatchlist';
import { Play, Plus, Check, Info } from 'lucide-react';
import toast from 'react-hot-toast';

interface ContentCardProps {
  content: Content;
  progress?: number;
  rank?: number;
  size?: 'sm' | 'md' | 'lg' | 'wide';
}

export function ContentCard({ content, progress, rank, size = 'md' }: ContentCardProps) {
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openDetail = useUiStore((s) => s.openDetail);
  const router = useRouter();
  const hoverTimeout = useRef<ReturnType<typeof setTimeout>>();

  const { data: watchlist } = useWatchlist();
  const addToWatchlist = useAddToWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();

  const inList = !!watchlist?.some((item: any) => item.content?.id === content.id || item.id === content.id);

  const widths = {
    sm: 'w-[125px] sm:w-[145px] md:w-[170px]',
    md: 'w-[145px] sm:w-[175px] md:w-[210px]',
    lg: 'w-[180px] sm:w-[220px] md:w-[260px]',
    wide: 'w-[240px] sm:w-[290px] md:w-[340px]',
  };

  const handleMouseEnter = () => {
    hoverTimeout.current = setTimeout(() => setHovered(true), 250);
  };

  const handleMouseLeave = () => {
    clearTimeout(hoverTimeout.current);
    setHovered(false);
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

  const handlePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/watch/${content.slug}`);
  };

  const handleMoreInfo = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openDetail(content.slug);
  };

  const formattedRank = rank ? (rank < 10 ? `0${rank}` : `${rank}`) : null;

  return (
    <div
      className={`relative flex-shrink-0 ${widths[size]} group select-none`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Link href={`/title/${content.slug}`} className="block">
        {/* Main Poster Container */}
        <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-[#181410] border border-white/5 shadow-md transition-all duration-300 group-hover:scale-[1.03] group-hover:border-[#FF5C00]/40 group-hover:shadow-[0_10px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(255,92,0,0.25)]">
          {!imgError ? (
            <img
              src={content.thumbnailUrl || content.backdropUrl}
              alt={content.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[#1E1914] p-4 text-center">
              <span className="text-3xl mb-2">🎬</span>
              <p className="text-xs text-[#A49C90] line-clamp-2">{content.title}</p>
            </div>
          )}

          {/* Dark Bottom Vignette for Title / Badge Legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0806] via-[#0A0806]/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

          {/* Numbered Rank Overlay for Top 10 */}
          {formattedRank && (
            <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none flex items-end justify-start">
              <span
                className="text-5xl sm:text-6xl md:text-7xl font-black italic leading-none tracking-tighter text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.9)]"
                style={{
                  WebkitTextStroke: '2px rgba(255, 92, 0, 0.9)',
                  textShadow: '0 0 20px rgba(255, 92, 0, 0.4)',
                }}
              >
                {formattedRank}
              </span>
            </div>
          )}

          {/* Continue Watching Progress Bar */}
          {progress !== undefined && progress > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60">
              <div
                className="h-full bg-[#FF5C00] shadow-[0_0_8px_#FF5C00]"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
          )}

          {/* Original / Exclusive Badge */}
          {content.isOriginal && !rank && (
            <div className="absolute top-2.5 left-2.5">
              <span className="text-[10px] font-black text-white bg-[#FF5C00] px-2 py-0.5 rounded-md uppercase tracking-wider shadow-md">
                Original
              </span>
            </div>
          )}

          {/* Hover Play Button Trigger */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-12 h-12 rounded-full bg-[#FF5C00] text-white flex items-center justify-center shadow-[0_0_20px_rgba(255,92,0,0.6)] transform scale-75 group-hover:scale-100 transition-transform duration-300">
              <Play className="w-6 h-6 fill-white ml-0.5" />
            </div>
          </div>
        </div>

        {/* Title below card */}
        <div className="mt-2.5 px-1">
          <p className="text-xs sm:text-sm font-bold text-[#E8E2D9] truncate group-hover:text-[#FF5C00] transition-colors">
            {content.title}
          </p>
          <div className="flex items-center gap-2 text-[11px] text-[#9A9286] mt-0.5">
            {content.releaseYear && <span>{content.releaseYear}</span>}
            {content.duration && (
              <span>• {Math.floor(content.duration / 60)}h {content.duration % 60}m</span>
            )}
            {content.imdbScore && (
              <span className="text-[#FFB800] font-bold">★ {content.imdbScore}</span>
            )}
          </div>
        </div>
      </Link>

      {/* Desktop Floating Preview Card on Hover */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="hidden lg:block absolute left-1/2 -translate-x-1/2 -top-6 w-80 bg-[#14110D]/95 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9),0_0_25px_rgba(255,92,0,0.2)] z-40"
            onMouseEnter={() => clearTimeout(hoverTimeout.current)}
            onMouseLeave={() => setHovered(false)}
            onClick={(e) => e.preventDefault()}
          >
            {/* Backdrop Preview */}
            <div className="relative aspect-video overflow-hidden bg-[#1E1914]">
              <img
                src={content.backdropUrl || content.thumbnailUrl}
                alt={content.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#14110D] via-transparent to-transparent" />
              
              {/* Play Overlay */}
              <button
                onClick={handlePlay}
                className="absolute inset-0 flex items-center justify-center group/play"
              >
                <div className="w-12 h-12 rounded-full bg-[#FF5C00] text-white flex items-center justify-center shadow-[0_0_20px_rgba(255,92,0,0.6)] group-hover/play:scale-110 transition-transform">
                  <Play className="w-5 h-5 fill-white ml-0.5" />
                </div>
              </button>
            </div>

            {/* Quick Details */}
            <div className="p-4">
              <h4 className="font-extrabold text-base text-white mb-2 truncate">{content.title}</h4>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={handlePlay}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#FF5C00] hover:bg-[#FF7A00] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-[0_0_12px_rgba(255,92,0,0.4)]"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Play</span>
                </button>
                <button
                  onClick={handleWatchlist}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/10 transition-colors"
                  title={inList ? 'Remove from My List' : 'Add to My List'}
                >
                  {inList ? <Check className="w-4 h-4 text-[#FF5C00]" /> : <Plus className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleMoreInfo}
                  className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/10 transition-colors"
                  title="More Information"
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>

              {/* Meta Tags */}
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#C8C2B8] font-medium">
                {content.imdbScore && (
                  <span className="text-[#FFB800] font-bold">★ {content.imdbScore} IMDb</span>
                )}
                {content.releaseYear && <span>{content.releaseYear}</span>}
                {content.rating && (
                  <span className="border border-white/20 px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-white">
                    {content.rating}
                  </span>
                )}
              </div>

              {/* Genre line */}
              {content.genre && content.genre.length > 0 && (
                <p className="text-xs text-[#9A9286] mt-2 truncate">
                  {content.genre.slice(0, 3).join(' • ')}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

