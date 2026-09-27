import api from './axios';

export const historyApi = {
  upsert: (data: {
    contentId: string;
    episodeId?: string;
    progress: number;
    completed?: boolean;
    duration?: number;
  }) =>
    api.post('/streaming/progress', {
      content_id: data.contentId,
      episode_id: data.episodeId || null,
      progress_seconds: Math.floor(data.progress),
      duration_seconds: Math.max(1, Math.floor(data.duration || 100)),
    }),

  getAll: () => api.get('/streaming/continue-watching'),

  getProgress: async (contentId: string, episodeId?: string) => {
    try {
      const res = await api.get<any[]>('/streaming/continue-watching');
      const item = res.data?.find(
        (h) =>
          h.content_id === contentId &&
          (!episodeId || h.episode_id === episodeId)
      );
      if (item) {
        return {
          data: {
            progress: item.completion_percentage,
            progressSeconds: item.progress_seconds,
            durationSeconds: item.duration_seconds,
            completed: item.is_completed,
            episodeId: item.episode_id,
          },
        };
      }
      return { data: null };
    } catch {
      return { data: null };
    }
  },

  remove: (contentId: string) => api.delete(`/streaming/watchlist/${contentId}`),
};
