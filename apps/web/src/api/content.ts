import api from './axios';

export interface Genre {
  id: string;
  name: string;
  slug: string;
}

export interface Episode {
  id: string;
  season_id?: string;
  episode_number?: number;
  number?: number;
  title: string;
  description?: string;
  duration?: number;
  duration_seconds?: number;
  thumbnailUrl?: string;
  thumbnail_url?: string;
  videoUrl?: string;
  hlsUrl?: string;
  hls_manifest_key?: string;
  status?: string;
  subtitles?: { id: string; language: string; label: string; url: string }[];
}

export interface Season {
  id: string;
  content_id?: string;
  season_number?: number;
  number?: number;
  title?: string;
  episodes: Episode[];
}

export interface Content {
  id: string;
  title: string;
  slug: string;
  description: string;
  type?: string;
  contentType?: string;
  content_type?: string;
  genre?: string[];
  genres?: Genre[];
  tags?: string[];
  releaseYear?: number;
  release_year?: number;
  rating: string;
  imdbScore?: number;
  duration?: number;
  duration_seconds?: number;
  thumbnailUrl?: string;
  thumbnail_url?: string;
  backdropUrl?: string;
  backdrop_url?: string;
  videoUrl?: string;
  hlsUrl?: string;
  hls_manifest_key?: string;
  status?: string;
  trailerUrl?: string;
  trailer_url?: string;
  isOriginal?: boolean;
  is_original?: boolean;
  isFeatured?: boolean;
  is_featured?: boolean;
  is_published?: boolean;
  cast?: { id: string; name: string; role: string; photoUrl?: string }[];
  subtitles?: { id: string; language: string; label: string; url: string }[];
  seasons?: Season[];
  watchProgress?: { progress: number; completed: boolean; episodeId?: string };
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
  content?: Content;
  episode?: { id: string; number: number; title: string };
}

export const contentApi = {
  list: (params?: { type?: string; genre?: string; page?: number; limit?: number }) =>
    api.get<Content[]>('/content', { params }),
  getGenres: () => api.get<Genre[]>('/content/genres'),
  adminListAll: (params?: { type?: string; genre?: string; page?: number; limit?: number }) =>
    api.get<Content[]>('/content/admin/all', { params }),
  create: (data: Partial<Content> & { genre_ids?: string[] }) =>
    api.post<Content>('/content', data),
  update: (id: string, data: Partial<Content> & { genre_ids?: string[] }) =>
    api.put<Content>(`/content/${id}`, data),
  delete: (id: string) => api.delete(`/content/${id}`),
  featured: () => api.get<Content[]>('/content/featured'),
  trending: () => api.get<Content[]>('/content/trending'),
  originals: () => api.get<Content[]>('/content/originals'),
  continueWatching: () => api.get<WatchHistoryItem[]>('/streaming/continue-watching'),
  recommended: () => api.get<Content[]>('/content/trending'),
  getBySlug: (slug: string) => api.get<Content>(`/content/${slug}`),
};
