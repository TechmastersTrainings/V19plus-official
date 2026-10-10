'use client';

import { useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const slug = params?.slug || '';
  const episodeId = searchParams.get('episode') || undefined;
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: content, isLoading } = useContent(slug || '');

  const { data: savedProgress } = useQuery({
    queryKey: ['watch-progress', content?.id, episodeId],
    queryFn: async () => {
      if (!content?.id) return null;
      const { data } = await historyApi.getProgress(content.id, episodeId);
      return data;
    },
    enabled: !!content?.id && isAuthenticated,
  });

  if (isLoading) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white/10 border-t-[#FF5C00] rounded-full animate-spin" />
          <span className="text-white/50 text-sm">Loading…</span>
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
      if (activeEpisode.videoUrl && (activeEpisode.videoUrl.includes('.m3u8') || activeEpisode.videoUrl.includes('/hls/'))) return activeEpisode.videoUrl;
      return (activeEpisode as any).hls_manifest_key || activeEpisode.videoUrl || '';
    }
    const contentHls = (content as any)?.hls_manifest_key;
    if (contentHls && (contentHls.includes('.m3u8') || contentHls.includes('/hls/'))) return contentHls;
    if (content.videoUrl && (content.videoUrl.includes('.m3u8') || content.videoUrl.includes('/hls/'))) return content.videoUrl;
    const masterFallback = (content as any)?.master_storage_key
      ? `https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/${(content as any).master_storage_key}`
      : '';
    return (content as any)?.hls_manifest_key || content.videoUrl || masterFallback || '';
  })();

  return (
    <div className="w-full h-screen bg-black overflow-hidden">
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
