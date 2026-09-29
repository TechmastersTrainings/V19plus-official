import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Content } from '../../api/content';
import { HeroBannerSkeleton } from '../ui/Skeleton';
import { Play, Plus, Check, Info, Sparkles, Volume2, VolumeX } from 'lucide-react';
import { useWatchlist, useAddToWatchlist, useRemoveFromWatchlist } from '../../hooks/useWatchlist';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import toast from 'react-hot-toast';

interface HeroBannerProps {
  content?: Content;
  contents?: Content[];
  isLoading?: boolean;
  hideContent?: boolean;
}

export function HeroBanner({ content, contents, isLoading, hideContent = false }: HeroBannerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [hasVideoError, setHasVideoError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openDetail = useUiStore((s) => s.openDetail);
  const { data: watchlist } = useWatchlist();
  const addToWatchlist = useAddToWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();

  // Combine contents from backend
  const items: Content[] =
    contents && contents.length > 0 ? contents : content ? [content] : [];

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 8500); // 8.5s cinematic cycle
    return () => clearInterval(interval);
  }, [items.length]);

  const current = items[activeIndex] || items[0];

  const videoSrc =
    current?.trailer_url ||
    current?.trailerUrl ||
    current?.video_url ||
    current?.videoUrl ||
    '';

  useEffect(() => {
    setHasVideoError(false);
  }, [activeIndex, videoSrc]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  if (isLoading && items.length === 0) return <HeroBannerSkeleton />;
  if (!current) return null;

  const inList = !!watchlist?.some(
    (item: any) => item.content?.id === current.id || item.id === current.id
  );

  const handleWatchlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Sign in to add to your list');
      return;
    }
    try {
      if (inList) {
        await removeFromWatchlist.mutateAsync(current.id);
        toast.success('Removed from My List');
      } else {
        await addToWatchlist.mutateAsync(current.id);
        toast.success('Added to My List');
      }
    } catch {
      toast.error('Could not update list');
    }
  };

  const handleMoreInfo = (e: React.MouseEvent) => {
    e.preventDefault();
    if (current?.slug) {
      openDetail(current.slug);
    }
  };

  const backdropSrc =
    current.backdrop_url ||
    current.backdropUrl ||
    current.thumbnail_url ||
    current.thumbnailUrl ||
    '';

  const isOriginal = current.is_original ?? current.isOriginal ?? true;
  const releaseYear = current.release_year ?? current.releaseYear ?? 2026;
  const rating = current.rating || 'U/A 13+';
  const durationMins = current.duration
    ? current.duration
    : current.duration_seconds
    ? Math.floor(current.duration_seconds / 60)
    : 0;

  const genreList =
    current.genres && current.genres.length > 0
      ? current.genres.map((g) => g.name)
      : current.genre || [];

  const effectiveBackdrop =
    backdropSrc ||
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1920&q=80';

  return (
    <section className="relative w-full h-[520px] sm:h-[600px] md:h-[660px] lg:h-[700px] overflow-hidden bg-[#070605]">
      {/* Background Poster / Trailer Video with Balanced Cinematic Framing */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id || activeIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeInOut' }}
            className="w-full h-full relative"
          >
            {videoSrc && !hasVideoError ? (
              <video
                ref={videoRef}
                key={videoSrc}
                src={videoSrc}
                poster={effectiveBackdrop}
                autoPlay
                muted={isMuted}
                loop
                playsInline
                onError={() => setHasVideoError(true)}
                className="w-full h-full object-cover object-center pointer-events-none"
              />
            ) : (
              <img
                src={effectiveBackdrop}
                alt={current.title}
                className="w-full h-full object-cover object-center pointer-events-none"
                loading="eager"
              />
            )}

            {/* Studio Multi-Layered Vignettes - Balanced so the video is clearly visible and centered */}
            <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-[#070605] via-[#070605]/55 to-transparent z-10 w-[52%] lg:w-[46%] pointer-events-none" />
            <div className="md:hidden absolute inset-0 bg-gradient-to-t from-[#070605] via-[#070605]/65 to-transparent z-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#070605] to-transparent z-10 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-[#070605]/75 via-[#070605]/20 to-transparent z-10 pointer-events-none" />
            <div className="absolute top-1/4 left-8 w-[280px] h-[280px] rounded-full bg-[#FF5C00]/10 blur-[100px] pointer-events-none z-10" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Content Overlay - Constrained within max-w-7xl */}
      {!hideContent && (
        <div className="absolute inset-0 flex flex-col justify-end z-20 pointer-events-auto">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-16 sm:pb-20 md:pb-24">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id || activeIndex}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="max-w-2xl"
              >
                {/* Brand Tag / Kicker */}
                <div className="inline-flex items-center gap-2 mb-2 sm:mb-2.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[#FF8A00] text-[11px] font-medium tracking-wide">
                    <Sparkles className="w-3 h-3 text-[#FF5C00]" />
                    {isOriginal ? 'V19Plus Original' : 'Featured Presentation'}
                  </span>
                </div>

                {/* Main Hero Title - Refined, cinematic, not oversized or overly bold */}
                <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-bold font-display tracking-tight text-white mb-3 leading-[1.12] drop-shadow-lg">
                  {current.title}
                </h1>

                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm mb-3.5 text-[#B8B0A2] font-medium">
                  {current.imdbScore && (
                    <span className="flex items-center gap-1 text-[#FFB800] font-semibold bg-[#FFB800]/10 border border-[#FFB800]/25 px-2 py-0.5 rounded text-xs">
                      ★ {current.imdbScore} IMDb
                    </span>
                  )}
                  <span className="text-white/90">{releaseYear}</span>
                  <span className="border border-white/20 px-1.5 py-0.5 text-[10px] rounded bg-white/10 text-white font-medium">
                    {rating}
                  </span>
                  {durationMins > 0 && (
                    <span className="text-[#9A9284]">
                      {Math.floor(durationMins / 60)}h {durationMins % 60}m
                    </span>
                  )}
                  {genreList.length > 0 && (
                    <span className="text-[#FF8A00]/90">
                      • {genreList.slice(0, 2).join(' • ')}
                    </span>
                  )}
                </div>

                {/* Description Synopsis */}
                <p className="text-xs sm:text-sm md:text-base text-[#D4CDC3]/90 font-normal mb-6 line-clamp-3 max-w-xl leading-relaxed drop-shadow-md">
                  {current.description}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Primary Netflix-Style Play Button */}
                  <Link
                    href={`/watch/${current.slug}`}
                    className="flex items-center justify-center gap-2.5 px-6 sm:px-7 py-2.5 sm:py-3 bg-white hover:bg-neutral-200 active:scale-95 text-black font-semibold rounded-xl text-sm sm:text-base transition-all duration-200 shadow-[0_4px_20px_rgba(255,255,255,0.2)]"
                  >
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-black text-black" />
                    <span>Play</span>
                  </Link>

                  {/* Details / Specs Button */}
                  <button
                    onClick={handleMoreInfo}
                    className="flex items-center justify-center gap-2.5 px-5 sm:px-6 py-2.5 sm:py-3 bg-[#181411]/90 hover:bg-[#26201B] active:scale-95 text-white font-medium rounded-xl text-sm sm:text-base border border-white/20 transition-all backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
                  >
                    <Info className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    <span>More Info</span>
                  </button>

                  {/* Add to Watchlist Button */}
                  <button
                    onClick={handleWatchlist}
                    className="p-2.5 sm:p-3 rounded-xl bg-[#181411]/90 hover:bg-[#26201B] border border-white/20 text-white transition-all active:scale-95 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
                    title={inList ? 'Remove from My List' : 'Add to My List'}
                    aria-label="Add to My List"
                  >
                    {inList ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-[#FF8A00]" /> : <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Bottom Right Rating & Audio Control */}
      <div className="absolute bottom-8 sm:bottom-12 right-4 sm:right-8 md:right-12 z-30 flex items-center gap-3">
        {items.length > 1 && (
          <div className="flex items-center gap-1.5 bg-[#181411]/90 backdrop-blur-xl px-3 py-1.5 rounded-full border border-white/15 shadow-xl">
            {items.map((it, i) => (
              <button
                key={it.id || i}
                onClick={() => setActiveIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeIndex
                    ? 'w-6 bg-[#FF5C00]'
                    : 'w-2 bg-white/30 hover:bg-white/60'
                }`}
                aria-label={`Slide ${i + 1}: ${it.title}`}
              />
            ))}
          </div>
        )}

        {videoSrc && (
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-10 h-10 rounded-full border border-white/20 bg-[#181411]/90 hover:bg-[#26201B] text-white flex items-center justify-center backdrop-blur-xl transition-all active:scale-95 shadow-xl"
            aria-label="Toggle Sound"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        )}

        <div className="px-3.5 py-1.5 rounded-lg bg-[#181411]/90 border border-white/20 border-l-4 border-l-[#FF5C00] text-xs font-semibold text-white backdrop-blur-xl shadow-xl">
          {rating}
        </div>
      </div>
    </section>
  );
}
