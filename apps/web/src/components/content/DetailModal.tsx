import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useUiStore } from '../../store/uiStore';
import { useContent } from '../../hooks/useContent';
import { Skeleton } from '../ui/Skeleton';
import { useAuthStore } from '../../store/authStore';
import { useWatchlist, useAddToWatchlist, useRemoveFromWatchlist } from '../../hooks/useWatchlist';
import toast from 'react-hot-toast';

export function DetailModal() {
  const { detailModal, closeDetail } = useUiStore();
  const { data: content, isLoading } = useContent(detailModal.slug || '');
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const { data: watchlist } = useWatchlist();
  const addToWatchlist = useAddToWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();

  const inList = !!(content && watchlist?.some((item: any) => item.content.id === content.id));

  const handleWatchlist = async () => {
    if (!isAuthenticated) { toast.error('Sign in to add to your list'); return; }
    if (!content) return;
    try {
      if (inList) {
        await removeFromWatchlist.mutateAsync(content.id);
        toast.success('Removed from My List');
      } else {
        await addToWatchlist.mutateAsync(content.id);
        toast.success('Added to My List');
      }
    } catch { toast.error('Could not update list'); }
  };

  return (
    <AnimatePresence>
      {detailModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={closeDetail}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 30 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative z-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-n-surface shadow-netflix"
          >
            {/* Close */}
            <button
              onClick={closeDetail}
              className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-n-bg/80 backdrop-blur flex items-center justify-center text-n-text hover:text-n-white transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {isLoading ? (
              <div className="space-y-4 p-4">
                <Skeleton className="aspect-video w-full rounded-lg" />
                <Skeleton className="h-8 w-2/3 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-4/5 rounded" />
              </div>
            ) : content ? (
              <>
                {/* Backdrop image */}
                <div className="relative aspect-video overflow-hidden rounded-t-xl bg-n-raised">
                  <img
                    src={content.backdropUrl || content.thumbnailUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-n-surface via-transparent to-transparent" />

                  {/* Play button on image */}
                  <button
                    onClick={() => { closeDetail(); router.push(`/watch/${content.slug}`); }}
                    className="absolute bottom-6 left-6 flex items-center gap-2 px-6 py-2.5 bg-n-white hover:bg-n-white/80 text-black font-bold rounded transition-all"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Play
                  </button>
                </div>

                {/* Content info */}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <h2 className="text-2xl font-bold text-n-white leading-tight">{content.title}</h2>

                    {/* Action buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={handleWatchlist}
                        className="w-9 h-9 rounded-full border-2 border-n-muted flex items-center justify-center hover:border-n-white text-n-muted hover:text-n-white transition-colors"
                        title={inList ? 'Remove from list' : 'Add to My List'}
                      >
                        {inList
                          ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                          : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        }
                      </button>
                    </div>
                  </div>

                  {/* Meta row */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm mb-4">
                    {content.imdbScore && (
                      <span className="text-emerald-400 font-bold">{content.imdbScore} IMDb</span>
                    )}
                    <span className="text-n-muted">{content.releaseYear}</span>
                    {content.rating && (
                      <span className="border border-n-muted/50 px-1.5 rounded text-xs text-n-muted">
                        {content.rating}
                      </span>
                    )}
                    {content.duration && (
                      <span className="text-n-muted">{Math.floor(content.duration / 60)}h {content.duration % 60}m</span>
                    )}
                    <span className="text-n-text font-medium uppercase text-xs">{content.type}</span>
                  </div>

                  <p className="text-n-text/80 text-sm leading-relaxed mb-5">{content.description}</p>

                  {/* Genre tags */}
                  {content.genre?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-5">
                      {content.genre.map((g) => (
                        <span key={g} className="text-xs px-3 py-1 rounded-full bg-n-raised border border-n-divider text-n-muted">
                          {g}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => { closeDetail(); router.push(`/watch/${content.slug}`); }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-n-white hover:bg-n-white/80 text-black font-bold rounded transition-all"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      Play
                    </button>
                    <button
                      onClick={() => { closeDetail(); router.push(`/title/${content.slug}`); }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-n-muted/20 hover:bg-n-muted/30 text-n-white border border-n-divider rounded transition-all text-sm font-semibold"
                    >
                      More Details
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
