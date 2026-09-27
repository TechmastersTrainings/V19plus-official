import api from './axios';
import { Content } from './content';

export const searchApi = {
  search: (q: string) => api.get<{ results: Content[]; query: string; total: number }>('/search', { params: { q } }),
  suggestions: (q: string) =>
    api.get<{ title: string; slug: string; thumbnailUrl: string; type: string }[]>('/search/suggestions', { params: { q } }),
};
