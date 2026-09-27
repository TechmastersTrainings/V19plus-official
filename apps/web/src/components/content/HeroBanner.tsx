import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Content } from '../../api/content';
import { HeroBannerSkeleton } from '../ui/Skeleton';
import { Play, Plus, Check, Info, Volume2, VolumeX, Sparkles } from 'lucide-react';
import { useWatchlist, useAddToWatchlist, useRemoveFromWatchlist } from '../../hooks/useWatchlist';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface HeroBannerProps {
  content?: Content;
  contents?: Content[];
  isLoading?: boolean;
  hideContent?: boolean;
}

export function HeroBanner({ content, contents, isLoading, hideContent = false }: HeroBannerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: watchlist } = useWatchlist();
  const addToWatchlist = useAddToWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();

  // Combine contents from backend
  const items: Content[] = contents && contents.length > 0
    ? contents
    : (content ? [content] : []);

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % items.length);
    }, 7500); // cycle every 7.5s
    return () => clearInterval(interval);
  }, [items.length]);

  if (isLoading && items.length === 0) return <HeroBannerSkeleton />;

  const current = items[activeIndex] || items[0];
  if (!current) return null;

  const inList = !!watchlist?.some((item: any) => item.content?.id === current.id || item.id === current.id);

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

  return (
    <section className="relative w-full h-[85vh] sm:h-[90vh] md:h-screen min-h-[580px] max-h-[1050px] overflow-hidden bg-[#0A0806] select-none">
      {/* Background Poster / Backdrop Slider */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id || activeIndex}
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-full h-full relative"
          >
            <img
              src={current.backdropUrl || current.thumbnailUrl}
              alt={current.title}
              className="w-full h-full object-cover object-top sm:object-center"
              loading="eager"
            />
            {/* Cinematic Vignette Overlays */}
            {/* Desktop Left-to-Right Dark Gradient */}
            <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-[#0A0806] via-[#0A0806]/75 to-transparent z-10 w-[70%]" />
            {/* Mobile Bottom-to-Top High Contrast Vignette */}
            <div className="md:hidden absolute inset-0 bg-gradient-to-t from-[#0A0806] via-[#0A0806]/85 to-transparent z-10" />
            {/* All Viewports Bottom Gradient to Seamless Page Blend */}
            <div className="absolute bottom-0 left-0 right-0 h-72 sm:h-80 bg-gradient-to-t from-[#0A0806] via-[#0A0806]/80 to-transparent z-10" />
            {/* Top Bar Dark Shadow for Navigation Legibility */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-[#0A0806]/90 to-transparent z-10" />
            {/* Subtle Brand Orange Radial Glow */}
            <div className="absolute top-1/3 left-10 sm:left-24 w-[350px] h-[350px] rounded-full bg-[#FF5C00]/10 blur-[130px] pointer-events-none z-10" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Content Overlay */}
      {!hideContent && (
        <div className="absolute inset-0 flex flex-col justify-end z-20 pointer-events-auto">
          <div className="px-5 sm:px-8 md:px-16 lg:px-20 pb-20 sm:pb-24 md:pb-32 max-w-4xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={current.id || activeIndex}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Badges / Category Tag */}
                <div className="flex items-center gap-2.5 mb-3.5 sm:mb-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF5C00]/15 border border-[#FF5C00]/30 text-[#FF5C00] text-xs font-black tracking-wider uppercase backdrop-blur-md">
                    <Sparkles className="w-3.5 h-3.5" />
                    {current.isOriginal ? 'V19Plus Original' : 'Featured Premiere'}
                  </div>
                  <span className="hidden sm:inline-block px-2.5 py-0.5 rounded text-[11px] font-bold bg-white/10 text-white/90 border border-white/10 backdrop-blur-md">
                    4K ULTRA HD
                  </span>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-white/10 text-white/90 border border-white/10 backdrop-blur-md">
                    DOLBY ATMOS
                  </span>
                </div>

                {/* Main Hero Title */}
                <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.08] text-white mb-3 sm:mb-4 tracking-tight drop-shadow-2xl">
                  {current.title}
                </h1>

                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs sm:text-sm md:text-base mb-4 text-[#C8C2B8] font-medium">
                  {current.imdbScore && (
                    <span className="flex items-center gap-1 text-[#FFB800] font-black bg-[#FFB800]/10 border border-[#FFB800]/20 px-2 py-0.5 rounded">
                      ★ {current.imdbScore} IMDb
                    </span>
                  )}
                  {current.releaseYear && <span className="font-semibold text-white/90">{current.releaseYear}</span>}
                  {current.rating && (
                    <span className="border border-white/20 px-2 py-0.5 text-2xs rounded bg-white/5 backdrop-blur-sm text-white font-bold">
                      {current.rating}
                    </span>
                  )}
                  {current.duration && (
                    <span className="text-[#A49C90]">
                      {Math.floor(current.duration / 60)}h {current.duration % 60}m
                    </span>
                  )}
                  {current.genre && current.genre.length > 0 && (
                    <span className="text-[#FF5C00]/90 font-semibold">
                      · {current.genre.slice(0, 3).join(' · ')}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs sm:text-sm md:text-base text-[#D4CDC3] mb-6 sm:mb-8 line-clamp-2 sm:line-clamp-3 max-w-2xl leading-relaxed font-normal">
                  {current.description}
                </p>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  {/* Watch Now Button (Brand Orange) */}
                  <Link
                    href={`/watch/${current.slug}`}
                    className="flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 bg-[#FF5C00] hover:bg-[#FF7A00] active:scale-95 text-white font-black rounded-2xl text-sm sm:text-base transition-all duration-300 shadow-[0_0_24px_rgba(255,92,0,0.4)] hover:shadow-[0_0_32px_rgba(255,92,0,0.6)]"
                  >
                    <Play className="w-5 h-5 fill-white text-white" />
                    <span>Watch Now</span>
                  </Link>

                  {/* Add to My List Toggle */}
                  <button
                    onClick={handleWatchlist}
                    className="flex items-center justify-center gap-2 px-5 sm:px-6 py-3.5 bg-white/10 hover:bg-white/20 active:scale-95 text-white font-bold rounded-2xl text-sm sm:text-base backdrop-blur-xl border border-white/15 hover:border-white/30 transition-all duration-300"
                  >
                    {inList ? (
                      <>
                        <Check className="w-5 h-5 text-[#FF5C00]" />
                        <span>In My List</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        <span>My List</span>
                      </>
                    )}
                  </button>

                  {/* Details / More Info */}
                  <Link
                    href={`/title/${current.slug}`}
                    className="hidden sm:flex items-center justify-center gap-2 px-5 py-3.5 bg-[#1C1814]/80 hover:bg-[#28221C] active:scale-95 text-[#E0D8CE] hover:text-white font-bold rounded-2xl text-sm sm:text-base backdrop-blur-xl border border-white/10 hover:border-[#FF5C00]/30 transition-all duration-300"
                  >
                    <Info className="w-5 h-5" />
                    <span>More Info</span>
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Carousel Indicator Dots / Pills */}
      {items.length > 1 && (
        <div className="absolute bottom-10 sm:bottom-12 right-6 sm:right-12 md:right-20 z-30 flex items-center gap-2 bg-[#0A0806]/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-400 ${
                i === activeIndex
                  ? 'w-6 bg-[#FF5C00] shadow-[0_0_10px_#FF5C00]'
                  : 'w-2 bg-white/30 hover:bg-white/60'
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

