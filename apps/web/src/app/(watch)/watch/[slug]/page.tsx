'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useContent } from '../../../../hooks/useContent';
import dynamic from 'next/dynamic';

const VideoPlayer = dynamic(() => import('../../../../components/player/VideoPlayer').then(mod => mod.VideoPlayer), {
  loading: () => (
    <div className="w-full h-screen bg-black flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-white/10 border-t-white rounded-full animate-spin" />
    </div>
  ),
  ssr: false,
});
import { historyApi } from '../../../../api/history';
import { useAuthStore } from '../../../../store/authStore';

interface Season {
  id: string;
  number: number;
  title?: string;
  episodes: Episode[];
}

interface Episode {
  id: string;
  number: number;
  title: string;
  duration: number;
  videoUrl: string;
}

export default function WatchPage({ params }: { params: { slug: string } }) {
  const searchParams = useSearchParams();
  const slug = params?.slug || '';
  const episodeId = searchParams.get('episode') || undefined;
  const isAuthenticated = useAuthStore((s: { isAuthenticated: boolean }) => s.isAuthenticated);
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

  const allEpisodes: Episode[] = content.seasons?.flatMap((s: Season) => s.episodes) || [];
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
    const mins = ep?.duration || content.duration || 0;
    return mins * 60;
  })();

  const resumeSeconds =
    savedProgress && !savedProgress.completed && savedProgress.progress > 0
      ? (savedProgress.progress / 100) * totalSeconds
      : 0;

  return (
    <div className="w-full h-screen bg-black overflow-hidden">
      <VideoPlayer
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
