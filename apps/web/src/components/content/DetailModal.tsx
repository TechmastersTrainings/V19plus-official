import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useUiStore } from '../../store/uiStore';
import { useContent } from '../../hooks/useContent';
import { Skeleton } from '../ui/Skeleton';
import { useAuthStore } from '../../store/authStore';
import { useWatchlist, useAddToWatchlist, useRemoveFromWatchlist } from '../../hooks/useWatchlist';
import { Play, Plus, Check, X, Sparkles, Volume2, Info } from 'lucide-react';
import toast from 'react-hot-toast';

export function DetailModal() {
  const { detailModal, closeDetail } = useUiStore();
  const { data: content, isLoading } = useContent(detailModal.slug || '');
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data: watchlist } = useWatchlist();
  const addToWatchlist = useAddToWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();

  const inList = !!(content && watchlist?.some((item: any) => item.content?.id === content.id || item.id === content.id));

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

  const backdropSrc =
    content?.backdrop_url ||
    content?.backdropUrl ||
    content?.thumbnail_url ||
    content?.thumbnailUrl;

  const durationMins = content?.duration
    ? content.duration
    : content?.duration_seconds
    ? Math.floor(content.duration_seconds / 60)
    : 0;

  const releaseYear = content?.release_year ?? content?.releaseYear ?? 2026;
  const rating = content?.rating || 'U/A 13+';
  const genres: string[] =
    content?.genres && content.genres.length > 0
      ? content.genres.map((g: any) => (typeof g === 'string' ? g : g?.name || ''))
      : content?.genre || [];

  return (
    <AnimatePresence>
      {detailModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={closeDetail}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 25 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 25 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#100C09]/95 border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.95),0_0_35px_rgba(255,92,0,0.2)] backdrop-blur-2xl"
          >
            {/* Close Button */}
            <button
              onClick={closeDetail}
              className="absolute top-4 right-4 z-30 w-10 h-10 rounded-full bg-black/70 hover:bg-[#FF5C00] text-white flex items-center justify-center border border-white/15 hover:border-[#FF5C00] transition-all backdrop-blur-md active:scale-95 shadow-lg"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {isLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="aspect-video w-full rounded-2xl" />
                <Skeleton className="h-8 w-2/3 rounded-xl" />
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-4/5 rounded-lg" />
              </div>
            ) : content ? (
              <>
                {/* Backdrop Hero Header */}
                <div className="relative aspect-video overflow-hidden rounded-t-3xl bg-[#181410]">
                  {backdropSrc ? (
                    <img
                      src={backdropSrc}
                      alt={content.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#1C140C] via-[#100C08] to-[#070605] flex items-center justify-center">
                      <span className="text-6xl font-black text-[#FF5C00]/20">V19+</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#100C09] via-[#100C09]/40 to-transparent" />

                  {/* Play Button Overlay */}
                  <div className="absolute bottom-6 left-6 right-6 flex items-center gap-3">
                    <button
                      onClick={() => {
                        closeDetail();
                        router.push(`/watch/${content.slug}`);
                      }}
                      className="flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-[#FF5C00] via-[#FF7A00] to-[#FFA726] hover:from-[#FF7A00] hover:to-[#FFB74D] text-white font-black rounded-xl text-sm transition-all shadow-[0_0_24px_rgba(255,92,0,0.5)] active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-white text-white" />
                      <span>Play Now</span>
                    </button>

                    <button
                      onClick={handleWatchlist}
                      className="w-11 h-11 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center border border-white/15 backdrop-blur-md transition-all active:scale-95"
                      title={inList ? 'Remove from My List' : 'Add to My List'}
                    >
                      {inList ? (
                        <Check className="w-5 h-5 text-[#FF8A00]" />
                      ) : (
                        <Plus className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Content Info Body */}
                <div className="p-6 sm:p-8">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                      {content.title}
                    </h2>
                  </div>

                  {/* Metadata Row */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs sm:text-sm text-[#C8C2B8] font-medium mb-4">
                    {content.imdbScore && (
                      <span className="text-[#FFB800] font-black bg-[#FFB800]/10 border border-[#FFB800]/30 px-2 py-0.5 rounded shadow-sm">
                        ★ {content.imdbScore} IMDb
                      </span>
                    )}
                    <span className="text-white font-semibold">{releaseYear}</span>
                    <span className="border border-white/20 px-2 py-0.5 text-2xs rounded bg-white/5 text-white font-bold">
                      {rating}
                    </span>
                    {durationMins > 0 && (
                      <span className="text-[#A49C90]">
                        {Math.floor(durationMins / 60)}h {durationMins % 60}m
                      </span>
                    )}
                  </div>

                  {/* Synopsis */}
                  <p className="text-sm sm:text-base text-[#D4CDC3] leading-relaxed mb-6 font-normal">
                    {content.description}
                  </p>

                  {/* Genre Pills */}
                  {genres.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {genres.map((g) => (
                        <span
                          key={g}
                          className="text-xs px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#C8C2B8] font-medium"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Footer Actions */}
                  <div className="flex gap-3 pt-2 border-t border-white/10">
                    <button
                      onClick={() => {
                        closeDetail();
                        router.push(`/watch/${content.slug}`);
                      }}
                      className="flex-1 py-3 bg-gradient-to-r from-[#FF5C00] to-[#FF8A00] hover:from-[#FF7A00] hover:to-[#FFA726] text-white font-bold rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(255,92,0,0.4)] flex items-center justify-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-white text-white" />
                      <span>Watch Movie</span>
                    </button>
                    <button
                      onClick={() => {
                        closeDetail();
                        router.push(`/title/${content.slug}`);
                      }}
                      className="py-3 px-6 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-sm border border-white/10 transition-colors flex items-center justify-center gap-2"
                    >
                      <Info className="w-4 h-4" />
                      <span>Full Details</span>
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
