'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, ArrowLeft, Play } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useContent } from '../../../../hooks/useContent';
import dynamic from 'next/dynamic';

const VideoPlayer = dynamic(
  () => import('../../../../components/player/VideoPlayer').then((mod) => mod.VideoPlayer),
  {
    loading: () => (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin" />
      </div>
    ),
    ssr: false,
  }
);

import { historyApi } from '../../../../api/history';
import { useAuthStore } from '../../../../store/authStore';

interface Episode {
  id: string;
  number: number;
  title: string;
  duration: number;
  duration_seconds?: number;
  videoUrl?: string;
}

export default function WatchPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params?.slug || '';
  const episodeId = searchParams.get('episode') || undefined;
  const { isAuthenticated, isLoading: authLoading, _initialized } = useAuthStore();
  const { data: content, isLoading: contentLoading } = useContent(slug || '');

  // Strictly enforce authentication before permitting video streaming
  useEffect(() => {
    if (_initialized && !authLoading && !isAuthenticated) {
      const returnUrl = `/watch/${slug}${episodeId ? `?episode=${episodeId}` : ''}`;
      router.replace(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
    }
  }, [_initialized, authLoading, isAuthenticated, router, slug, episodeId]);

  const { data: savedProgress } = useQuery({
    queryKey: ['watch-progress', content?.id, episodeId],
    queryFn: async () => {
      if (!content?.id) return null;
      const { data } = await historyApi.getProgress(content.id, episodeId);
      return data;
    },
    enabled: !!content?.id && isAuthenticated,
  });

  if (!_initialized || authLoading || contentLoading) {
    return (
      <div className="w-full h-screen bg-[#080808] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white/10 border-t-[#FF5C00] rounded-full animate-spin" />
          <span className="text-white/60 text-sm font-medium tracking-wide">
            {!_initialized || authLoading ? 'Verifying authentication…' : 'Preparing high-definition stream…'}
          </span>
        </div>
      </div>
    );
  }

  // Security gate: Never render or initialize player for unauthenticated users
  if (!isAuthenticated) {
    const returnTarget = `/watch/${slug}${episodeId ? `?episode=${episodeId}` : ''}`;
    return (
      <div className="w-full h-screen h-[100dvh] bg-[#080808] flex flex-col items-center justify-center text-center px-4 relative overflow-hidden select-none">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#FF5C00]/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative z-10 max-w-md w-full bg-[#141414]/90 border border-white/10 rounded-2xl p-8 backdrop-blur-2xl shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF5C00]/20 to-[#E50914]/10 border border-[#FF5C00]/30 flex items-center justify-center mb-5 text-[#FF5C00] shadow-[0_0_30px_rgba(255,92,0,0.2)]">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="text-white font-black text-2xl mb-2 tracking-tight">
            Sign In to Watch
          </h2>
          <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
            Streaming on V19Plus is protected. Please sign in or create an account to start watching {content?.title ? <span className="text-white font-semibold">{content.title}</span> : 'this title'}.
          </p>

          <div className="w-full flex flex-col gap-3">
            <Link
              href={`/login?returnUrl=${encodeURIComponent(returnTarget)}`}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-[#FF5C00] via-[#FF7A00] to-[#E50914] hover:opacity-95 text-white font-bold rounded-xl text-sm transition-all shadow-[0_0_24px_rgba(255,92,0,0.35)] flex items-center justify-center gap-2 active:scale-98"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Sign In to Stream</span>
            </Link>

            <Link
              href="/"
              className="w-full py-3 px-6 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white font-semibold rounded-xl text-sm border border-white/10 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="w-full h-screen bg-black flex flex-col items-center justify-center text-center px-4">
        <h2 className="text-white font-bold text-lg mb-2">Content Not Found</h2>
        <p className="text-gray-400 text-sm max-w-sm mb-6">
          Could not find the content you are looking for. Please check the URL or return to home.
        </p>
        <button
          onClick={() => window.history.back()}
          className="px-6 py-2.5 bg-[#FF5C00] hover:bg-[#FF7A00] text-white font-bold rounded-lg text-sm transition-all"
        >
          Go Back
        </button>
      </div>
    );
  }

  const allEpisodes: Episode[] =
    content.seasons?.flatMap((s: any) =>
      (s.episodes || []).map((ep: any) => ({
        ...ep,
        number: ep.episode_number ?? ep.number ?? 1,
        duration: ep.duration ?? (ep.duration_seconds ? ep.duration_seconds / 60 : 0),
        duration_seconds: ep.duration_seconds,
      }))
    ) || [];

  const activeEpisodeId = episodeId || allEpisodes[0]?.id;
  const currentIndex = allEpisodes.findIndex((e: Episode) => e.id === activeEpisodeId);

  const handleNextEpisode = () => {
    if (currentIndex >= 0 && currentIndex < allEpisodes.length - 1) {
      const next = allEpisodes[currentIndex + 1];
      window.history.replaceState(null, '', `/watch/${slug}?episode=${next.id}`);
      window.location.reload();
    }
  };

  const totalSeconds = (() => {
    const ep = allEpisodes.find((e: Episode) => e.id === activeEpisodeId);
    if (ep?.duration_seconds) return ep.duration_seconds;
    if (ep?.duration) return ep.duration * 60;
    if ((content as any)?.duration_seconds) return (content as any).duration_seconds;
    if (content.duration) return content.duration * 60;
    return 0;
  })();

  const resumeSeconds =
    savedProgress && !savedProgress.completed && savedProgress.progress > 0
      ? (savedProgress as any).progressSeconds ?? (savedProgress.progress / 100) * totalSeconds
      : 0;

  const activeEpisode = allEpisodes.find((e: Episode) => e.id === activeEpisodeId);
  const videoSrc = (() => {
    if (activeEpisode) {
      const epHls = (activeEpisode as any).hls_manifest_key;
      if (epHls && (epHls.includes('.m3u8') || epHls.includes('/hls/'))) return epHls;
      if (activeEpisode.videoUrl) return activeEpisode.videoUrl;
      if ((activeEpisode as any).master_storage_key) {
        return `https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/${(activeEpisode as any).master_storage_key.replace(/^\/+/, '')}`;
      }
      return '';
    }
    const contentHls = (content as any)?.hls_manifest_key;
    if (contentHls && (contentHls.includes('.m3u8') || contentHls.includes('/hls/'))) return contentHls;
    if (content.videoUrl) return content.videoUrl;
    if ((content as any)?.video_url) return (content as any).video_url;
    if ((content as any)?.master_storage_key) {
      return `https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/${(content as any).master_storage_key.replace(/^\/+/, '')}`;
    }
    return '';
  })();

  return (
    <div className="w-full h-screen h-[100dvh] bg-black overflow-hidden flex items-center justify-center">
      <VideoPlayer
        src={videoSrc}
        poster={content.thumbnailUrl || (content as any)?.bannerUrl}
        title={content.title}
        content={content}
        episodeId={activeEpisodeId}
        initialResumeSeconds={resumeSeconds}
        onNextEpisode={
          currentIndex >= 0 && currentIndex < allEpisodes.length - 1
            ? handleNextEpisode
            : undefined
        }
      />
    </div>
  );
}
