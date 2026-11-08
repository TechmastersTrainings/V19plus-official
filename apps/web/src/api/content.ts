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
  master_storage_key?: string;
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

// Resilient Curated Fallback Catalog (100% live on Cloudflare R2 CDN)
// Guarantees zero downtime: displays videos even if backend container is hibernating on Render
export const FALLBACK_CATALOG: Content[] = [
  {
    id: 'tenth-task-id',
    title: 'TENTH TASK - GRAND FINALE | CHAMPIONSHIP ARENA',
    slug: 'tenth-task',
    description:
      'The decisive tenth task and championship finale of the ultimate survival tournament, featuring complete 4-tier adaptive bitrate streaming.',
    contentType: 'MOVIE',
    content_type: 'MOVIE',
    type: 'MOVIE',
    releaseYear: 2026,
    release_year: 2026,
    rating: 'U/A 13+',
    duration: 2197,
    duration_seconds: 2197,
    thumbnailUrl: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/ep10_thumbnail.jpg',
    thumbnail_url: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/ep10_thumbnail.jpg',
    backdropUrl: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/ep10_backdrop.jpg',
    backdrop_url: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/ep10_backdrop.jpg',
    master_storage_key: 'e95c66ef_EP-10.mp4',
    videoUrl: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/e95c66ef_EP-10.mp4',
    hlsUrl: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/hls/e95c66ef_EP-10/master.m3u8',
    hls_manifest_key: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/hls/e95c66ef_EP-10/master.m3u8',
    isOriginal: true,
    is_original: true,
    isFeatured: true,
    is_featured: true,
    is_published: true,
    status: 'PUBLISHED',
  },
  {
    id: 'ninth-task-id',
    title: 'NINTH TASK - MONKEY WALK',
    slug: 'ninth-task',
    description:
      'Ninth task episode featuring the ultimate survival challenge with full 4-tier adaptive bitrate streaming and cinematic action.',
    contentType: 'MOVIE',
    content_type: 'MOVIE',
    type: 'MOVIE',
    releaseYear: 2026,
    release_year: 2026,
    rating: 'U/A 13+',
    duration: 4425,
    duration_seconds: 4425,
    thumbnailUrl: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/ep09_thumbnail.jpg',
    thumbnail_url: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/ep09_thumbnail.jpg',
    backdropUrl: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/ep09_backdrop.jpg',
    backdrop_url: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/ep09_backdrop.jpg',
    master_storage_key: '56752ae5_EP-09.mp4',
    videoUrl: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/56752ae5_EP-09.mp4',
    hlsUrl: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/hls/56752ae5_EP-09/master.m3u8',
    hls_manifest_key: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/hls/56752ae5_EP-09/master.m3u8',
    isOriginal: true,
    is_original: true,
    isFeatured: true,
    is_featured: true,
    is_published: true,
    status: 'PUBLISHED',
  },
  {
    id: 'eighth-task-id',
    title: 'EIGHTH TASK',
    slug: 'eighth-task',
    description:
      'Eighth task episode with full multi-tier adaptive bitrate streaming and high intensity survival challenges.',
    contentType: 'MOVIE',
    content_type: 'MOVIE',
    type: 'MOVIE',
    releaseYear: 2026,
    release_year: 2026,
    rating: 'U/A 13+',
    duration: 3567,
    duration_seconds: 3567,
    thumbnailUrl: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/ep08_thumbnail.jpg',
    thumbnail_url: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/ep08_thumbnail.jpg',
    backdropUrl: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/ep08_backdrop.jpg',
    backdrop_url: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/ep08_backdrop.jpg',
    master_storage_key: 'a2c1fe48_EP-08.mp4',
    videoUrl: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/a2c1fe48_EP-08.mp4',
    hlsUrl: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/hls/a2c1fe48_EP-08/master.m3u8',
    hls_manifest_key: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/hls/a2c1fe48_EP-08/master.m3u8',
    isOriginal: true,
    is_original: true,
    isFeatured: true,
    is_featured: true,
    is_published: true,
    status: 'PUBLISHED',
  },
  {
    id: 'seventh-task-id',
    title: 'SEVENTH TASK - MATKA PHOD |CHALLENGE',
    slug: 'seventh-task',
    description:
      'Seventh task challenge featuring traditional Matka Phod test of agility and power.',
    contentType: 'MOVIE',
    content_type: 'MOVIE',
    type: 'MOVIE',
    releaseYear: 2026,
    release_year: 2026,
    rating: 'U/A 13+',
    duration: 1800,
    duration_seconds: 1800,
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    thumbnail_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    backdrop_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    master_storage_key: 'c4a112df_EP-07.mp4',
    videoUrl: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/c4a112df_EP-07.mp4',
    hlsUrl: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/hls/c4a112df_EP-07/master.m3u8',
    hls_manifest_key: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/hls/c4a112df_EP-07/master.m3u8',
    isOriginal: true,
    is_original: true,
    isFeatured: true,
    is_featured: true,
    is_published: true,
    status: 'PUBLISHED',
  },
  {
    id: 'sixth-task-id',
    title: 'SIXTH TASK - ELIMINATION CHALLENGE',
    slug: 'sixth-task',
    description:
      'Episode 6 doom session elimination challenge with high-intensity survival arena.',
    contentType: 'MOVIE',
    content_type: 'MOVIE',
    type: 'MOVIE',
    releaseYear: 2026,
    release_year: 2026,
    rating: 'U/A 13+',
    duration: 480,
    duration_seconds: 480,
    thumbnailUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80',
    thumbnail_url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1600&q=80',
    backdrop_url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1600&q=80',
    master_storage_key: 'efd56f97_EP-06.mp4',
    videoUrl: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/efd56f97_EP-06.mp4',
    hlsUrl: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/hls/efd56f97_EP-06/master.m3u8',
    hls_manifest_key: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/hls/efd56f97_EP-06/master.m3u8',
    isOriginal: true,
    is_original: true,
    isFeatured: true,
    is_featured: true,
    is_published: true,
    status: 'PUBLISHED',
  },
  {
    id: 'fifth-task-id',
    title: 'FIFTH TASK - Endurance Arena',
    slug: 'ep-05',
    description:
      'Episode 5 endurance arena battle with high bitrate master transcoding.',
    contentType: 'MOVIE',
    content_type: 'MOVIE',
    type: 'MOVIE',
    releaseYear: 2026,
    release_year: 2026,
    rating: 'U/A 13+',
    duration: 420,
    duration_seconds: 420,
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    thumbnail_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    backdrop_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    master_storage_key: 'f0480269_EP-05.mp4',
    videoUrl: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/f0480269_EP-05.mp4',
    hlsUrl: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/hls/f0480269_EP-05/master.m3u8',
    hls_manifest_key: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/hls/f0480269_EP-05/master.m3u8',
    isOriginal: true,
    is_original: true,
    isFeatured: false,
    is_featured: false,
    is_published: true,
    status: 'PUBLISHED',
  },
  {
    id: 'fourth-task-id',
    title: 'FOURTH TASK - The Breakthrough Stage',
    slug: 'ep-04',
    description:
      'Episode 4 breakthrough performance session with adaptive streaming.',
    contentType: 'MOVIE',
    content_type: 'MOVIE',
    type: 'MOVIE',
    releaseYear: 2026,
    release_year: 2026,
    rating: 'U/A 13+',
    duration: 360,
    duration_seconds: 360,
    thumbnailUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
    thumbnail_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1600&q=80',
    backdrop_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1600&q=80',
    master_storage_key: '3a2e0bf5_EP-04.mp4',
    videoUrl: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/3a2e0bf5_EP-04.mp4',
    hlsUrl: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/hls/3a2e0bf5_EP-04/master.m3u8',
    hls_manifest_key: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/hls/3a2e0bf5_EP-04/master.m3u8',
    isOriginal: true,
    is_original: true,
    isFeatured: false,
    is_featured: false,
    is_published: true,
    status: 'PUBLISHED',
  },
  {
    id: 'third-task-id',
    title: 'THIRD TASK - High Stakes Elimination Challenge',
    slug: 'third-task',
    description:
      'Episode 3 intensive elimination session with 4-tier adaptive bitrate.',
    contentType: 'MOVIE',
    content_type: 'MOVIE',
    type: 'MOVIE',
    releaseYear: 2026,
    release_year: 2026,
    rating: 'U/A 13+',
    duration: 300,
    duration_seconds: 300,
    thumbnailUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
    thumbnail_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80',
    backdrop_url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1600&q=80',
    master_storage_key: '93e8250a_EP-03.mp4',
    videoUrl: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/93e8250a_EP-03.mp4',
    hlsUrl: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/hls/93e8250a_EP-03/master.m3u8',
    hls_manifest_key: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/hls/93e8250a_EP-03/master.m3u8',
    isOriginal: true,
    is_original: true,
    isFeatured: false,
    is_featured: false,
    is_published: true,
    status: 'PUBLISHED',
  },
  {
    id: 'second-task-id',
    title: 'SECOND TASK - Race to the Finish Challenge',
    slug: 'second-task-race-to-the-finish',
    description:
      'Episode 2 high-octane racing challenge with multi-tier ABR streaming.',
    contentType: 'MOVIE',
    content_type: 'MOVIE',
    type: 'MOVIE',
    releaseYear: 2026,
    release_year: 2026,
    rating: 'U/A 13+',
    duration: 240,
    duration_seconds: 240,
    thumbnailUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    thumbnail_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    backdrop_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1600&q=80',
    master_storage_key: '1bb2905d_EP-03.mp4',
    videoUrl: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/1bb2905d_EP-03.mp4',
    hlsUrl: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/hls/second-task-race-to-the-finish/master.m3u8',
    hls_manifest_key: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/hls/second-task-race-to-the-finish/master.m3u8',
    isOriginal: true,
    is_original: true,
    isFeatured: true,
    is_featured: true,
    is_published: true,
    status: 'PUBLISHED',
  },
  {
    id: 'first-task-id',
    title: 'FIRST TASK',
    slug: 'ep-01',
    description:
      'Episode 1 introduction to V19PLUS platform and content pipeline.',
    contentType: 'MOVIE',
    content_type: 'MOVIE',
    type: 'MOVIE',
    releaseYear: 2026,
    release_year: 2026,
    rating: 'U/A 13+',
    duration: 180,
    duration_seconds: 180,
    thumbnailUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80',
    thumbnail_url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80',
    backdropUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1600&q=80',
    backdrop_url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1600&q=80',
    master_storage_key: 'b39e340c_EP-01.mp4',
    videoUrl: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/b39e340c_EP-01.mp4',
    hlsUrl: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/hls/video-1-test-streaming/master.m3u8',
    hls_manifest_key: 'https://pub-2b3faff7804a4ba8b00830cca1749352.r2.dev/hls/video-1-test-streaming/master.m3u8',
    isOriginal: true,
    is_original: true,
    isFeatured: true,
    is_featured: true,
    is_published: true,
    status: 'PUBLISHED',
  },
];

const getFallbackList = (filterFn?: (c: Content) => boolean): { data: Content[] } => {
  const items = filterFn ? FALLBACK_CATALOG.filter(filterFn) : FALLBACK_CATALOG;
  return { data: items };
};

const getFallbackItem = (slug: string): { data: Content } => {
  const cleanSlug = (slug || '').toLowerCase().trim();
  const found =
    FALLBACK_CATALOG.find((c) => c.slug.toLowerCase() === cleanSlug) ||
    FALLBACK_CATALOG.find(
      (c) =>
        c.slug.toLowerCase().includes(cleanSlug) ||
        cleanSlug.includes(c.slug.toLowerCase()) ||
        (c.master_storage_key || '').toLowerCase().includes(cleanSlug)
    ) ||
    FALLBACK_CATALOG[0];
  return { data: found };
};

export const contentApi = {
  list: async (params?: { type?: string; genre?: string; page?: number; limit?: number }) => {
    try {
      const res = await api.get<any>('/content', { params });
      const items = Array.isArray(res.data) ? res.data : res.data?.items;
      if (Array.isArray(items) && items.length > 0) {
        return { ...res, data: items };
      }
      return getFallbackList();
    } catch {
      return getFallbackList();
    }
  },
  getGenres: async () => {
    try {
      return await api.get<Genre[]>('/content/genres');
    } catch {
      return { data: [] };
    }
  },
  adminListAll: (params?: { type?: string; genre?: string; page?: number; limit?: number }) =>
    api.get<Content[]>('/content/admin/all', { params }),
  create: (data: Partial<Content> & { genre_ids?: string[] }) =>
    api.post<Content>('/content', data),
  update: (id: string, data: Partial<Content> & { genre_ids?: string[] }) =>
    api.put<Content>(`/content/${id}`, data),
  delete: (id: string) => api.delete(`/content/${id}`),
  featured: async () => {
    try {
      const res = await api.get<any>('/content/featured');
      const items = Array.isArray(res.data) ? res.data : res.data?.items;
      if (Array.isArray(items) && items.length > 0) {
        return { ...res, data: items };
      }
      return getFallbackList((c) => !!c.is_featured);
    } catch {
      return getFallbackList((c) => !!c.is_featured);
    }
  },
  trending: async () => {
    try {
      const res = await api.get<any>('/content/trending');
      const items = Array.isArray(res.data) ? res.data : res.data?.items;
      if (Array.isArray(items) && items.length > 0) {
        return { ...res, data: items };
      }
      return getFallbackList();
    } catch {
      return getFallbackList();
    }
  },
  originals: async () => {
    try {
      const res = await api.get<any>('/content/originals');
      const items = Array.isArray(res.data) ? res.data : res.data?.items;
      if (Array.isArray(items) && items.length > 0) {
        return { ...res, data: items };
      }
      return getFallbackList((c) => !!c.is_original);
    } catch {
      return getFallbackList((c) => !!c.is_original);
    }
  },
  continueWatching: async () => {
    try {
      return await api.get<WatchHistoryItem[]>('/streaming/continue-watching');
    } catch {
      return { data: [] };
    }
  },
  recommended: async () => {
    try {
      const res = await api.get<any>('/content/trending');
      const items = Array.isArray(res.data) ? res.data : res.data?.items;
      if (Array.isArray(items) && items.length > 0) {
        return { ...res, data: items };
      }
      return getFallbackList();
    } catch {
      return getFallbackList();
    }
  },
  getBySlug: async (slug: string) => {
    try {
      const res = await api.get<Content>(`/content/${slug}`);
      if (res.data?.id && (res.data?.hlsUrl || res.data?.hls_manifest_key || res.data?.videoUrl || res.data?.master_storage_key)) {
        return res;
      }
      return getFallbackItem(slug);
    } catch {
      return getFallbackItem(slug);
    }
  },
};
