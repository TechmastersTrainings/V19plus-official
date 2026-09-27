import api from './axios';

export interface Content {
  id: string;
  title: string;
  slug: string;
  description: string;
  type: string;
  genre: string[];
  tags: string[];
  releaseYear: number;
  rating: string;
  imdbScore?: number;
  duration?: number;
  thumbnailUrl: string;
  backdropUrl: string;
  videoUrl?: string;
  hlsUrl?: string;
  bunnyVideoGuid?: string;
  status?: string;
  trailerUrl?: string;
  isOriginal: boolean;
  isFeatured: boolean;
  cast?: { id: string; name: string; role: string; photoUrl?: string }[];
  subtitles?: { id: string; language: string; label: string; url: string }[];
  seasons?: {
    id: string;
    number: number;
    title?: string;
    episodes: {
      id: string;
      number: number;
      title: string;
      description?: string;
      duration: number;
      thumbnailUrl?: string;
      videoUrl: string;
      hlsUrl?: string;
      bunnyVideoGuid?: string;
      status?: string;
      subtitles?: { id: string; language: string; label: string; url: string }[];
    }[];
  }[];
  watchProgress?: { progress: number; completed: boolean; episodeId?: string };
}

export interface WatchHistoryItem {
  id: string;
  progress: number;
  completed: boolean;
  content: Content;
  episode?: { id: string; number: number; title: string };
}

export const contentApi = {
  list: (params?: { type?: string; genre?: string; page?: number; limit?: number }) =>
    api.get('/content', { params }),
  featured: () => api.get<Content[]>('/content/featured'),
  trending: () => api.get<Content[]>('/content/trending'),
  originals: () => api.get<Content[]>('/content/originals'),
  continueWatching: () => api.get<WatchHistoryItem[]>('/content/continue-watching'),
  recommended: () => api.get<Content[]>('/content/recommended'),
  getBySlug: (slug: string) => api.get<Content>(`/content/${slug}`),
};
