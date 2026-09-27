import { create } from 'zustand';
import { Content } from '../api/content';
import { historyApi } from '../api/history';
import { getPlaybackPrefs } from '../utils/playbackPrefs';

interface Episode {
  id: string;
  number: number;
  title: string;
  videoUrl: string;
  duration: number;
}

interface PlayerState {
  currentContent: Content | null;
  currentEpisode: Episode | null;
  isPlaying: boolean;
  progress: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  showControls: boolean;
  subtitles: boolean;
  playbackSpeed: number;
  resumeSeconds: number;
  
  // Stream Qualities (HLS & Multi-Bitrate)
  qualities: { height: number; bitrate?: number; index: number; label?: string; url?: string }[];
  currentQuality: number; // -1 means Auto
  setQualities: (qualities: { height: number; bitrate?: number; index: number; label?: string; url?: string }[]) => void;
  setQuality: (index: number) => void;

  play: (content: Content, episode?: Episode, resumeSeconds?: number) => void;
  pause: () => void;
  resume: () => void;
  seek: (seconds: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleFullscreen: () => void;
  setShowControls: (show: boolean) => void;
  toggleSubtitles: () => void;
  setPlaybackSpeed: (speed: number) => void;
  updateProgress: (progress: number) => void;
  saveProgressNow: () => void;
  reset: () => void;
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function getDurationSeconds(content: Content | null, episode: Episode | null): number {
  if (!content) return 1;
  const mins = episode?.duration || content.duration || 1;
  return mins * 60;
}

function calcProgressPercent(seconds: number, content: Content | null, episode: Episode | null): number {
  const total = getDurationSeconds(content, episode);
  return total > 0 ? (seconds / total) * 100 : 0;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentContent: null,
  currentEpisode: null,
  isPlaying: false,
  progress: 0,
  volume: 0.8,
  isMuted: false,
  isFullscreen: false,
  showControls: true,
  subtitles: getPlaybackPrefs().subtitles,
  playbackSpeed: getPlaybackPrefs().defaultSpeed,
  resumeSeconds: 0,
  qualities: [],
  currentQuality: -1,

  setQualities: (qualities) => set({ qualities }),
  
  setQuality: (index) => set({ currentQuality: index }),

  play: (content, episode, resumeSeconds = 0) => {
    const prefs = getPlaybackPrefs();
    set({
      currentContent: content,
      currentEpisode: episode || null,
      isPlaying: true,
      progress: resumeSeconds,
      resumeSeconds,
      playbackSpeed: prefs.defaultSpeed,
      subtitles: prefs.subtitles,
      qualities: [], // Reset qualities on new video
      currentQuality: -1,
    });
  },

  pause: () => {
    set({ isPlaying: false });
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }
    get().saveProgressNow();
  },

  resume: () => set({ isPlaying: true }),

  seek: (seconds) => set({ progress: seconds }),

  setVolume: (volume) => set({ volume, isMuted: volume === 0 }),

  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),

  toggleFullscreen: () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      set({ isFullscreen: true });
    } else {
      document.exitFullscreen();
      set({ isFullscreen: false });
    }
  },

  setShowControls: (show) => set({ showControls: show }),

  toggleSubtitles: () => set((s) => ({ subtitles: !s.subtitles })),

  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  updateProgress: (progress) => {
    set({ progress });
    const { currentContent, currentEpisode } = get();
    if (!currentContent) return;

    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => get().saveProgressNow(), 8000);
  },

  saveProgressNow: () => {
    const { currentContent, currentEpisode, progress } = get();
    if (!currentContent || progress <= 0) return;

    const pct = calcProgressPercent(progress, currentContent, currentEpisode);
    const total = getDurationSeconds(currentContent, currentEpisode);

    historyApi.upsert({
      contentId: currentContent.id,
      episodeId: currentEpisode?.id,
      progress: pct,
      completed: progress >= total * 0.95,
    }).catch(() => {});
  },

  reset: () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }
    get().saveProgressNow();
    set({
      currentContent: null,
      currentEpisode: null,
      isPlaying: false,
      progress: 0,
      resumeSeconds: 0,
    });
  },
}));
