import api from './axios';

export const historyApi = {
  upsert: (data: { contentId: string; episodeId?: string; progress: number; completed?: boolean }) =>
    api.post('/history', data),
  getAll: () => api.get('/history'),
  getProgress: (contentId: string, episodeId?: string) =>
    api.get<{ progress: number; completed: boolean; episodeId?: string } | null>(
      `/history/${contentId}`,
      { params: episodeId ? { episodeId } : {} }
    ),
  remove: (contentId: string) => api.delete(`/history/${contentId}`),
};
