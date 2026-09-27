import api from './axios';

export interface PlaybackAuthResponse {
  content_id: string;
  episode_id?: string | null;
  stream_url: string;
  token: string;
  expires_in_seconds: number;
  title: string;
  sprite_vtt_url?: string | null;
}

export interface UpsertProgressRequest {
  content_id: string;
  episode_id?: string | null;
  progress_seconds: number;
  duration_seconds: number;
}

export interface WatchHistoryItem {
  id: string;
  content_id: string;
  episode_id?: string | null;
  progress_seconds: number;
  duration_seconds: number;
  completion_percentage: number;
  is_completed: boolean;
  last_watched_at: string;
}

export const streamingApi = {
  getPlaybackAuth: (contentId: string, episodeId?: string) =>
    api.get<PlaybackAuthResponse>(`/streaming/playback/${contentId}`, {
      params: episodeId ? { episode_id: episodeId } : {},
    }),

  updateProgress: (payload: UpsertProgressRequest) =>
    api.post('/streaming/progress', payload),

  getContinueWatching: () =>
    api.get<WatchHistoryItem[]>('/streaming/continue-watching'),

  toggleWatchlist: (contentId: string) =>
    api.post<{ content_id: string; in_watchlist: boolean }>(`/streaming/watchlist/${contentId}`),
};
