import api from './axios';

export const watchlistApi = {
  getAll: () => api.get('/watchlist'),
  add: (contentId: string) => api.post('/watchlist', { contentId }),
  remove: (contentId: string) => api.delete(`/watchlist/${contentId}`),
};
