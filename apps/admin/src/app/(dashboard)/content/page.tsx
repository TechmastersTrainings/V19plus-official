'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type AdminContent as ContentItem, type AdminSeason, type AdminEpisode } from '../../../api/admin';
import toast from 'react-hot-toast';
import { R2DirectVideoUploader } from '../../../components/R2DirectVideoUploader';
import {
  Film,
  Tv,
  Trophy,
  Music,
  Plus,
  Edit2,
  Trash2,
  Upload,
  Check,
  X,
  Search,
  Loader2,
  FileVideo,
  Layers,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

const cleanMediaUrl = (url: string) => {
  if (!url) return '';
  let u = url.trim();

  // 1. Handle gs:// (e.g. gs://v19-plus.firebasestorage.app/uploads/EP-01.mp4)
  if (u.startsWith('gs://')) {
    const withoutPrefix = u.replace('gs://', '');
    const slashIdx = withoutPrefix.indexOf('/');
    if (slashIdx !== -1) {
      const bucket = withoutPrefix.substring(0, slashIdx);
      const filePath = withoutPrefix.substring(slashIdx + 1);
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(filePath)}?alt=media`;
    }
  }

  // 2. Handle storage.googleapis.com
  if (u.includes('storage.googleapis.com/') && !u.includes('firebasestorage.googleapis.com')) {
    const match = u.match(/^https?:\/\/storage\.googleapis\.com\/([^/]+)\/(.+)$/);
    if (match) {
      const bucket = match[1];
      const filePath = match[2];
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(filePath)}?alt=media`;
    }
  }

  // 3. Handle firebasestorage.googleapis.com (ensure alt=media is present)
  if (u.includes('firebasestorage.googleapis.com')) {
    if (!u.includes('alt=media')) {
      u += (u.includes('?') ? '&' : '?') + 'alt=media';
    }
  }

  return u;
};

const toSlug = (str: string) =>
  str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const emptyMovieForm = {
  title: '',
  slug: '',
  description: '',
  type: 'MOVIE',
  genre: 'Action',
  releaseYear: new Date().getFullYear(),
  rating: 'PG-13',
  imdbScore: '',
  duration: '',
  thumbnailUrl: '',
  backdropUrl: '',
  videoUrl: '',
  trailerUrl: '',
  isOriginal: false,
  isFeatured: false,
  isPublished: true,
  tags: '',
};

const emptySeriesForm = {
  title: '',
  slug: '',
  description: '',
  type: 'SERIES',
  genre: 'Drama',
  language: 'English',
  releaseYear: new Date().getFullYear(),
  rating: 'TV-MA',
  imdbScore: '',
  castString: '',
  thumbnailUrl: '',
  backdropUrl: '',
  trailerUrl: '',
  status: 'ONGOING' as 'ONGOING' | 'COMPLETED',
  isOriginal: false,
  isFeatured: false,
  isPublished: true,
  tags: '',
  seasons: [
    {
      id: 'season-1',
      number: 1,
      title: 'Season 1',
      posterUrl: '',
      episodes: [
        {
          id: 'ep-1',
          number: 1,
          title: 'Pilot',
          description: 'Introduction to the series',
          duration: 45,
          thumbnailUrl: '',
          videoUrl: '',
          isPublished: true,
        },
      ],
    },
  ] as AdminSeason[],
};

export default function AdminContent() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ContentItem | null>(null);

  // Forms
  const [movieForm, setMovieForm] = useState(emptyMovieForm);
  const [seriesForm, setSeriesForm] = useState(emptySeriesForm);

  // Visibility states
  const [showMovieForm, setShowMovieForm] = useState(false);
  const [showSeriesForm, setShowSeriesForm] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  // Video Upload States
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [episodeNumber, setEpisodeNumber] = useState<number>(1);
  const [uploadProgressText, setUploadProgressText] = useState<string>('');
  const [isUploadingFile, setIsUploadingFile] = useState<boolean>(false);
  const [transcodingId, setTranscodingId] = useState<string | null>(null);

  const handleTranscode = async (videoUrl: string, contentId: string, episodeId?: string) => {
    if (!videoUrl) {
      toast.error('Please enter a video URL first');
      return;
    }
    const key = episodeId || contentId;
    setTranscodingId(key);
    try {
      await adminApi.transcodeFromUrl({ videoUrl: cleanMediaUrl(videoUrl), contentId, episodeId });
      toast.success('🎬 Multi-bitrate transcoding started (180p, 240p, 360p, 480p, 720p, 1080p). It will update automatically when done!');
      queryClient.invalidateQueries({ queryKey: ['admin-content'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to start transcoding');
    } finally {
      setTranscodingId(null);
    }
  };

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['admin-content'],
    queryFn: async () => (await adminApi.listContent()).data,
  });

  // Movie Save Mutation
  const saveMovieMutation = useMutation({
    mutationFn: () => {
      const payload = {
        ...movieForm,
        genre: movieForm.genre.split(',').map((g) => g.trim()).filter(Boolean),
        tags: movieForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
        slug: toSlug(movieForm.slug || movieForm.title),
        imdbScore: movieForm.imdbScore ? Number(movieForm.imdbScore) : null,
        duration: movieForm.duration ? Number(movieForm.duration) : null,
        thumbnailUrl: cleanMediaUrl(movieForm.thumbnailUrl),
        backdropUrl: cleanMediaUrl(movieForm.backdropUrl),
        trailerUrl: cleanMediaUrl(movieForm.trailerUrl) || null,
        videoUrl: cleanMediaUrl(movieForm.videoUrl) || null,
      };
      return editing
        ? adminApi.updateContent(editing.id, payload as any)
        : adminApi.createContent(payload as any);
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-content'] });

      const savedItem = res.data;
      const targetId = editing ? editing.id : savedItem?.id;

      if (selectedFile && targetId) {
        toast.success(editing ? 'Movie updated. Starting video upload...' : 'Movie created. Starting video upload...');
        uploadMutation.mutate({ contentId: targetId, file: selectedFile });
      } else {
        toast.success(editing ? 'Movie updated successfully' : 'Movie created successfully');
        resetForms();
      }
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || 'Failed to save movie';
      toast.error(msg);
    },
  });

  // Web Series Save Mutation
  const saveSeriesMutation = useMutation({
    mutationFn: () => {
      // Validate Series inputs
      if (!seriesForm.title.trim()) throw new Error('Series title is required');
      if (!seriesForm.description.trim()) throw new Error('Series description is required');

      // Build Cast list if provided
      const cast = seriesForm.castString
        .split(',')
        .map((c, i) => ({ id: `cast-${i + 1}`, name: c.trim(), role: 'Cast' }))
        .filter((c) => c.name);

      const payload = {
        title: seriesForm.title.trim(),
        slug: toSlug(seriesForm.slug || seriesForm.title),
        description: seriesForm.description.trim(),
        type: 'SERIES',
        genre: seriesForm.genre.split(',').map((g) => g.trim()).filter(Boolean),
        language: seriesForm.language,
        releaseYear: Number(seriesForm.releaseYear) || new Date().getFullYear(),
        rating: seriesForm.rating,
        imdbScore: seriesForm.imdbScore ? Number(seriesForm.imdbScore) : null,
        thumbnailUrl: cleanMediaUrl(seriesForm.thumbnailUrl),
        backdropUrl: cleanMediaUrl(seriesForm.backdropUrl),
        trailerUrl: cleanMediaUrl(seriesForm.trailerUrl) || null,
        status: seriesForm.status,
        isOriginal: seriesForm.isOriginal,
        isFeatured: seriesForm.isFeatured,
        isPublished: seriesForm.isPublished,
        tags: seriesForm.tags.split(',').map((t) => t.trim()).filter(Boolean),
        cast: cast.length > 0 ? cast : undefined,
        seasons: seriesForm.seasons.map((s) => ({
          ...s,
          posterUrl: cleanMediaUrl(s.posterUrl || ''),
          episodes: s.episodes.map((ep) => ({
            ...ep,
            videoUrl: cleanMediaUrl(ep.videoUrl || ''),
            thumbnailUrl: cleanMediaUrl(ep.thumbnailUrl || ''),
          })),
        })),
      };

      return editing
        ? adminApi.updateContent(editing.id, payload as any)
        : adminApi.createContent(payload as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-content'] });
      toast.success(editing ? 'Web Series updated successfully' : 'Web Series created successfully');
      resetForms();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save Web Series';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteContent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-content'] });
      toast.success('Content deleted');
    },
    onError: () => toast.error('Failed to delete content'),
  });

  const uploadMutation = useMutation({
    mutationFn: async ({ contentId, file }: { contentId: string; file: File }) => {
      if (file.type !== 'video/mp4' && !file.name.toLowerCase().endsWith('.mp4')) {
        throw new Error('Invalid video format. Only MP4 files are accepted.');
      }
      setIsUploadingFile(true);
      setUploadProgressText(`Uploading Episode ${episodeNumber} [░░░░░░░░░░░░░░░░░░] 0%`);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('contentId', contentId);
      formData.append('episodeNumber', String(episodeNumber));

      return adminApi.uploadVideo(formData, (progressEvent: any) => {
        if (progressEvent.total) {
          const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          const totalBlocks = 18;
          const filled = Math.round((pct / 100) * totalBlocks);
          const empty = totalBlocks - filled;
          const bar = '█'.repeat(filled) + '░'.repeat(empty);
          setUploadProgressText(`Uploading Episode ${episodeNumber} [${bar}] ${pct}%`);
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-content'] });
      setUploadProgressText(`Uploading Episode ${episodeNumber} [██████████████████] 100%`);
      toast.success('Episode uploaded successfully.');
      setTimeout(() => {
        setIsUploadingFile(false);
        resetForms();
      }, 1200);
    },
    onError: (err: any) => {
      setIsUploadingFile(false);
      const msg = err?.response?.data?.message || err?.message || 'The video upload failed. Please try again.';
      toast.error(msg);
    },
  });

  const resetForms = () => {
    setEditing(null);
    setMovieForm(emptyMovieForm);
    setSeriesForm(emptySeriesForm);
    setShowMovieForm(false);
    setShowSeriesForm(false);
    setUploadingId(null);
    setSelectedFile(null);
    setUploadProgressText('');
    setIsUploadingFile(false);
  };

  const startEdit = (item: ContentItem) => {
    setEditing(item);
    if (item.type === 'SERIES') {
      const castStr = (item.cast || []).map((c: any) => c.name).join(', ');
      setSeriesForm({
        title: item.title,
        slug: item.slug,
        description: item.description,
        type: 'SERIES',
        genre: Array.isArray(item.genre) ? item.genre.join(', ') : String(item.genre),
        language: item.language || 'English',
        releaseYear: item.releaseYear,
        rating: item.rating,
        imdbScore: item.imdbScore !== undefined && item.imdbScore !== null ? String(item.imdbScore) : '',
        castString: castStr,
        thumbnailUrl: item.thumbnailUrl,
        backdropUrl: item.backdropUrl,
        trailerUrl: item.trailerUrl || '',
        status: item.status || 'ONGOING',
        isOriginal: item.isOriginal || false,
        isFeatured: item.isFeatured,
        isPublished: item.isPublished,
        tags: Array.isArray(item.tags) ? item.tags.join(', ') : '',
        seasons: item.seasons && item.seasons.length > 0 ? item.seasons : emptySeriesForm.seasons,
      });
      setShowSeriesForm(true);
      setShowMovieForm(false);
    } else {
      setMovieForm({
        title: item.title,
        slug: item.slug,
        description: item.description,
        type: item.type,
        genre: Array.isArray(item.genre) ? item.genre.join(', ') : String(item.genre),
        releaseYear: item.releaseYear,
        rating: item.rating,
        imdbScore: item.imdbScore !== undefined && item.imdbScore !== null ? String(item.imdbScore) : '',
        duration: item.duration !== undefined && item.duration !== null ? String(item.duration) : '',
        thumbnailUrl: item.thumbnailUrl,
        backdropUrl: item.backdropUrl,
        videoUrl: item.videoUrl || '',
        trailerUrl: item.trailerUrl || '',
        isOriginal: item.isOriginal || false,
        isFeatured: item.isFeatured,
        isPublished: item.isPublished,
        tags: Array.isArray(item.tags) ? item.tags.join(', ') : '',
      });
      setShowMovieForm(true);
      setShowSeriesForm(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadSubmit = (contentId: string) => {
    if (!selectedFile) {
      toast.error('Please select a video file first');
      return;
    }
    uploadMutation.mutate({ contentId, file: selectedFile });
  };

  // Helper functions for Web Series Season & Episode management
  const addSeason = () => {
    const nextNum = seriesForm.seasons.length + 1;
    const newSeason: AdminSeason = {
      id: `season-${Date.now()}`,
      number: nextNum,
      title: `Season ${nextNum}`,
      posterUrl: '',
      episodes: [
        {
          id: `ep-${Date.now()}`,
          number: 1,
          title: `Episode 1`,
          description: '',
          duration: 45,
          thumbnailUrl: '',
          videoUrl: '',
          isPublished: true,
        },
      ],
    };
    setSeriesForm({ ...seriesForm, seasons: [...seriesForm.seasons, newSeason] });
    toast.success(`Season ${nextNum} added`);
  };

  const removeSeason = (seasonIdx: number) => {
    if (seriesForm.seasons.length <= 1) {
      toast.error('A series must have at least one season');
      return;
    }
    const updated = seriesForm.seasons
      .filter((_, idx) => idx !== seasonIdx)
      .map((s, idx) => ({ ...s, number: idx + 1 }));
    setSeriesForm({ ...seriesForm, seasons: updated });
    toast.success('Season removed');
  };

  const addEpisode = (seasonIdx: number) => {
    const season = seriesForm.seasons[seasonIdx];
    const nextEpNum = season.episodes.length + 1;
    const newEpisode: AdminEpisode = {
      id: `ep-${Date.now()}`,
      number: nextEpNum,
      title: `Episode ${nextEpNum}`,
      description: '',
      duration: 45,
      thumbnailUrl: '',
      videoUrl: '',
      isPublished: true,
    };
    const updatedSeasons = [...seriesForm.seasons];
    updatedSeasons[seasonIdx] = {
      ...season,
      episodes: [...season.episodes, newEpisode],
    };
    setSeriesForm({ ...seriesForm, seasons: updatedSeasons });
  };

  const removeEpisode = (seasonIdx: number, epIdx: number) => {
    const season = seriesForm.seasons[seasonIdx];
    if (season.episodes.length <= 1) {
      toast.error('Each season must have at least one episode');
      return;
    }
    const updatedEpisodes = season.episodes
      .filter((_, idx) => idx !== epIdx)
      .map((ep, idx) => ({ ...ep, number: idx + 1 }));
    const updatedSeasons = [...seriesForm.seasons];
    updatedSeasons[seasonIdx] = {
      ...season,
      episodes: updatedEpisodes,
    };
    setSeriesForm({ ...seriesForm, seasons: updatedSeasons });
  };

  const reorderEpisode = (seasonIdx: number, epIdx: number, direction: 'up' | 'down') => {
    const season = seriesForm.seasons[seasonIdx];
    const targetIdx = direction === 'up' ? epIdx - 1 : epIdx + 1;
    if (targetIdx < 0 || targetIdx >= season.episodes.length) return;

    const episodes = [...season.episodes];
    const [moved] = episodes.splice(epIdx, 1);
    episodes.splice(targetIdx, 0, moved);

    // Re-index episode numbers
    const reindexed = episodes.map((ep, idx) => ({ ...ep, number: idx + 1 }));
    const updatedSeasons = [...seriesForm.seasons];
    updatedSeasons[seasonIdx] = {
      ...season,
      episodes: reindexed,
    };
    setSeriesForm({ ...seriesForm, seasons: updatedSeasons });
  };

  const updateEpisode = (seasonIdx: number, epIdx: number, field: keyof AdminEpisode, value: any) => {
    const season = seriesForm.seasons[seasonIdx];
    const episodes = [...season.episodes];
    episodes[epIdx] = { ...episodes[epIdx], [field]: value };
    const updatedSeasons = [...seriesForm.seasons];
    updatedSeasons[seasonIdx] = { ...season, episodes };
    setSeriesForm({ ...seriesForm, seasons: updatedSeasons });
  };

  // Filters items based on search and type select
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'ALL' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const migrateMutation = useMutation({
    mutationFn: () => adminApi.migrateVideosToBunny(),
    onSuccess: (res: any) => {
      const { message, queuedCount } = res.data;
      if (queuedCount > 0) {
        toast.success(`🚀 ${message}`);
        queryClient.invalidateQueries({ queryKey: ['admin-content'] });
      } else {
        toast.success('All existing videos are already on Bunny Stream!');
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to trigger video migration');
    },
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header and Add Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Content Manager</h1>
          <p className="text-gray-400">Add, edit, upload, and organize movies, web series, sports, and music.</p>
        </div>
        {!showMovieForm && !showSeriesForm && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                if (confirm('Start server-to-server migration of all existing videos to Bunny Stream? Bunny CDN will automatically download and transcode them.')) {
                  migrateMutation.mutate();
                }
              }}
              disabled={migrateMutation.isPending}
              className="px-4 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-orange-600/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {migrateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Migrating...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Migrate Videos to Bunny</span>
                </>
              )}
            </button>
            <button
              onClick={() => {
                resetForms();
                setMovieForm({ ...emptyMovieForm, type: 'MOVIE', genre: 'Action' });
                setShowMovieForm(true);
              }}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-red-600/10 transition-all active:scale-95"
            >
              <Film className="w-4 h-4" />
              Add Movie
            </button>
            <button
              onClick={() => {
                resetForms();
                setShowSeriesForm(true);
              }}
              className="px-4 py-2.5 bg-[#FF5C00] hover:bg-[#FF7A00] text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-[#FF5C00]/20 transition-all active:scale-95"
            >
              <Tv className="w-4 h-4" />
              Add Web Series
            </button>
            <button
              onClick={() => {
                resetForms();
                setMovieForm({ ...emptyMovieForm, type: 'SPORT', genre: 'Sports' });
                setShowMovieForm(true);
              }}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
            >
              <Trophy className="w-4 h-4" />
              Add Sports
            </button>
            <button
              onClick={() => {
                resetForms();
                setMovieForm({ ...emptyMovieForm, type: 'MUSIC', genre: 'Music' });
                setShowMovieForm(true);
              }}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-purple-600/20 transition-all active:scale-95"
            >
              <Music className="w-4 h-4" />
              Add Music
            </button>
          </div>
        )}
      </div>

      {/* 🎬 1. ADD / EDIT MOVIE / SPORTS / MUSIC FORM */}
      {showMovieForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveMovieMutation.mutate();
          }}
          className="bg-[#141414] rounded-2xl p-6 border border-[#222] space-y-6 animate-slideDown"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#222]">
            <div className="flex items-center gap-2">
              {movieForm.type === 'SPORT' ? (
                <Trophy className="w-5 h-5 text-emerald-500" />
              ) : movieForm.type === 'MUSIC' ? (
                <Music className="w-5 h-5 text-purple-500" />
              ) : (
                <Film className="w-5 h-5 text-red-500" />
              )}
              <h2 className="font-semibold text-white text-lg">
                {editing
                  ? `Edit ${movieForm.type === 'SPORT' ? 'Sports' : movieForm.type === 'MUSIC' ? 'Music' : 'Movie'}: ${editing.title}`
                  : `Add New ${movieForm.type === 'SPORT' ? 'Sports Content' : movieForm.type === 'MUSIC' ? 'Music Content' : 'Movie'}`}
              </h2>
            </div>
            <button
              type="button"
              onClick={resetForms}
              className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input
              label="Title"
              value={movieForm.title}
              onChange={(v) => setMovieForm({ ...movieForm, title: v })}
              required
            />
            <Input
              label="Slug (URL Path)"
              value={movieForm.slug}
              onChange={(v) => setMovieForm({ ...movieForm, slug: v })}
              placeholder="auto-generated-from-title"
            />

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase text-gray-500 mb-1.5">
                Description / Summary
              </label>
              <textarea
                value={movieForm.description}
                onChange={(e) => setMovieForm({ ...movieForm, description: e.target.value })}
                rows={4}
                className="w-full bg-[#0f0f0f] border border-[#222] hover:border-[#333] focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all duration-200 resize-none"
                required
              />
            </div>

            <Input
              label="Genres (comma-separated)"
              value={movieForm.genre}
              onChange={(v) => setMovieForm({ ...movieForm, genre: v })}
              placeholder="Action, Sci-Fi, Adventure"
              required
            />

            <Input
              label="Release Year"
              value={String(movieForm.releaseYear)}
              onChange={(v) => setMovieForm({ ...movieForm, releaseYear: Number(v) || new Date().getFullYear() })}
              required
            />

            <Input
              label="Maturity Rating"
              value={movieForm.rating}
              onChange={(v) => setMovieForm({ ...movieForm, rating: v })}
              placeholder="PG-13, R, TV-MA"
              required
            />

            <Input
              label="IMDb Score (Optional)"
              value={movieForm.imdbScore}
              onChange={(v) => setMovieForm({ ...movieForm, imdbScore: v })}
              placeholder="e.g. 8.2"
            />

            <Input
              label="Duration in Minutes (Optional)"
              value={movieForm.duration}
              onChange={(v) => setMovieForm({ ...movieForm, duration: v })}
              placeholder="e.g. 142"
            />

            <Input
              label="Poster Thumbnail URL (Optional)"
              value={movieForm.thumbnailUrl}
              onChange={(v) => setMovieForm({ ...movieForm, thumbnailUrl: v })}
              placeholder="https://domain.com/poster.jpg"
            />

            <Input
              label="Backdrop Banner URL (Optional)"
              value={movieForm.backdropUrl}
              onChange={(v) => setMovieForm({ ...movieForm, backdropUrl: v })}
              placeholder="https://domain.com/backdrop.jpg"
            />

            <div className="md:col-span-2">
              <R2DirectVideoUploader
                contentId={editing ? editing.id : undefined}
                onUploadComplete={async (jobId, storageKey) => {
                  if (editing) {
                    await adminApi.updateContent(editing.id, {
                      masterStorageKey: storageKey,
                      transcodeStatus: 'processing',
                    } as any);
                    queryClient.invalidateQueries({ queryKey: ['admin-content'] });
                    toast.success('🎉 Master video uploaded to R2! Transcoding active on Render Video Worker.');
                  }
                }}
                label="Direct Cloudflare R2 Master Video Upload (20GB - 100GB+)"
              />
            </div>

            <div className="md:col-span-2">
              <Input
                label="Trailer Video URL (Optional)"
                value={movieForm.trailerUrl}
                onChange={(v) => setMovieForm({ ...movieForm, trailerUrl: v })}
                placeholder="https://domain.com/trailer.mp4"
              />
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-3 items-center md:col-span-2 py-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={movieForm.isOriginal}
                  onChange={(e) => setMovieForm({ ...movieForm, isOriginal: e.target.checked })}
                  className="w-4.5 h-4.5 text-red-600 bg-[#0f0f0f] border-[#222] rounded focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-300 group-hover:text-white">
                  V19Plus Original Title
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={movieForm.isFeatured}
                  onChange={(e) => setMovieForm({ ...movieForm, isFeatured: e.target.checked })}
                  className="w-4.5 h-4.5 text-red-600 bg-[#0f0f0f] border-[#222] rounded focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-300 group-hover:text-white">
                  Featured on Homepage
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={movieForm.isPublished}
                  onChange={(e) => setMovieForm({ ...movieForm, isPublished: e.target.checked })}
                  className="w-4.5 h-4.5 text-red-600 bg-[#0f0f0f] border-[#222] rounded focus:ring-red-500"
                />
                <span className="text-sm font-medium text-gray-300 group-hover:text-white">
                  Publish to Catalog
                </span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-[#222]">
            <button
              type="submit"
              disabled={saveMovieMutation.isPending}
              className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
            >
              {saveMovieMutation.isPending
                ? 'Saving...'
                : editing
                ? `Update ${movieForm.type === 'SPORT' ? 'Sports' : movieForm.type === 'MUSIC' ? 'Music' : 'Movie'}`
                : `Create ${movieForm.type === 'SPORT' ? 'Sports Content' : movieForm.type === 'MUSIC' ? 'Music Content' : 'Movie'}`}
            </button>
            <button
              type="button"
              onClick={resetForms}
              className="px-6 py-3 bg-[#222] hover:bg-[#2a2a2a] text-gray-300 text-sm font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* 📺 2. ADD / EDIT WEB SERIES FLOW */}
      {showSeriesForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveSeriesMutation.mutate();
          }}
          className="bg-[#141414] rounded-2xl p-6 border border-[#FF5C00]/30 space-y-8 animate-slideDown shadow-[0_0_30px_rgba(255,92,0,0.1)]"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#222]">
            <div className="flex items-center gap-2">
              <Tv className="w-5 h-5 text-[#FF5C00]" />
              <h2 className="font-semibold text-white text-lg">
                {editing ? `Edit Web Series: ${editing.title}` : 'Add New Web Series'}
              </h2>
            </div>
            <button
              type="button"
              onClick={resetForms}
              className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Section 1: Series Metadata */}
          <div>
            <h3 className="text-sm font-black uppercase text-[#FF5C00] tracking-wider mb-4">
              1. Series Metadata
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Input
                label="Series Title"
                value={seriesForm.title}
                onChange={(v) => setSeriesForm({ ...seriesForm, title: v })}
                placeholder="e.g. Stranger Tales"
                required
              />
              <Input
                label="Slug (URL Path)"
                value={seriesForm.slug}
                onChange={(v) => setSeriesForm({ ...seriesForm, slug: v })}
                placeholder="auto-generated-from-title"
              />

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1.5">
                  Series Synopsis / Description
                </label>
                <textarea
                  value={seriesForm.description}
                  onChange={(e) => setSeriesForm({ ...seriesForm, description: e.target.value })}
                  rows={4}
                  className="w-full bg-[#0f0f0f] border border-[#222] hover:border-[#333] focus:border-[#FF5C00] rounded-xl px-4 py-3 text-sm text-white outline-none transition-all duration-200 resize-none"
                  required
                />
              </div>

              <Input
                label="Genres (comma-separated)"
                value={seriesForm.genre}
                onChange={(v) => setSeriesForm({ ...seriesForm, genre: v })}
                placeholder="Drama, Thriller, Mystery"
                required
              />

              <Input
                label="Language"
                value={seriesForm.language}
                onChange={(v) => setSeriesForm({ ...seriesForm, language: v })}
                placeholder="English, Hindi, Spanish"
                required
              />

              <Input
                label="Release Year"
                value={String(seriesForm.releaseYear)}
                onChange={(v) => setSeriesForm({ ...seriesForm, releaseYear: Number(v) || new Date().getFullYear() })}
                required
              />

              <Input
                label="Maturity Rating"
                value={seriesForm.rating}
                onChange={(v) => setSeriesForm({ ...seriesForm, rating: v })}
                placeholder="TV-MA, TV-14, PG-13"
                required
              />

              <Input
                label="Cast (comma-separated names)"
                value={seriesForm.castString}
                onChange={(v) => setSeriesForm({ ...seriesForm, castString: v })}
                placeholder="Actor One, Actor Two, Actor Three"
              />

              <div>
                <label className="block text-xs font-semibold uppercase text-gray-500 mb-1.5">
                  Production Status
                </label>
                <select
                  value={seriesForm.status}
                  onChange={(e) => setSeriesForm({ ...seriesForm, status: e.target.value as any })}
                  className="w-full bg-[#0f0f0f] border border-[#222] hover:border-[#333] focus:border-[#FF5C00] rounded-xl px-4 py-3 text-sm text-white outline-none cursor-pointer"
                >
                  <option value="ONGOING">Ongoing</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <Input
                label="Poster Thumbnail URL (Optional)"
                value={seriesForm.thumbnailUrl}
                onChange={(v) => setSeriesForm({ ...seriesForm, thumbnailUrl: v })}
                placeholder="https://domain.com/series-post"
              />

              <Input
                label="Backdrop Banner URL (Optional)"
                value={seriesForm.backdropUrl}
                onChange={(v) => setSeriesForm({ ...seriesForm, backdropUrl: v })}
                placeholder="https://domain.com/series-banner.jpg"
              />

              <div className="md:col-span-2">
                <Input
                  label="Official Trailer URL (Optional)"
                  value={seriesForm.trailerUrl}
                  onChange={(v) => setSeriesForm({ ...seriesForm, trailerUrl: v })}
                  placeholder="https://domain.com/trailer.mp4"
                />
              </div>

              <div className="flex flex-wrap gap-x-8 gap-y-3 items-center md:col-span-2 py-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={seriesForm.isOriginal}
                    onChange={(e) => setSeriesForm({ ...seriesForm, isOriginal: e.target.checked })}
                    className="w-4.5 h-4.5 text-[#FF5C00] bg-[#0f0f0f] border-[#222] rounded focus:ring-[#FF5C00]"
                  />
                  <span className="text-sm font-medium text-gray-300 group-hover:text-white">
                    V19Plus Original Series
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={seriesForm.isFeatured}
                    onChange={(e) => setSeriesForm({ ...seriesForm, isFeatured: e.target.checked })}
                    className="w-4.5 h-4.5 text-[#FF5C00] bg-[#0f0f0f] border-[#222] rounded focus:ring-[#FF5C00]"
                  />
                  <span className="text-sm font-medium text-gray-300 group-hover:text-white">
                    Feature on Homepage
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={seriesForm.isPublished}
                    onChange={(e) => setSeriesForm({ ...seriesForm, isPublished: e.target.checked })}
                    className="w-4.5 h-4.5 text-[#FF5C00] bg-[#0f0f0f] border-[#222] rounded focus:ring-[#FF5C00]"
                  />
                  <span className="text-sm font-medium text-gray-300 group-hover:text-white">
                    Publish (Live on Frontend)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Seasons & Episodes Hierarchy */}
          <div className="pt-6 border-t border-[#222]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black uppercase text-[#FF5C00] tracking-wider">
                  2. Seasons & Episodes Management
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Organize seasons and episodes with video links, thumbnails, and custom ordering.
                </p>
              </div>
              <button
                type="button"
                onClick={addSeason}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold border border-white/10 flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-[#FF5C00]" />
                Add Season
              </button>
            </div>

            <div className="space-y-6">
              {seriesForm.seasons.map((season, sIdx) => (
                <div
                  key={season.id || sIdx}
                  className="bg-[#0f0f0f] border border-[#222] rounded-2xl p-5 space-y-4"
                >
                  {/* Season Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#1c1c1c]">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded bg-[#FF5C00]/15 text-[#FF5C00] font-black text-xs uppercase">
                        Season {season.number}
                      </span>
                      <input
                        type="text"
                        value={season.title || ''}
                        onChange={(e) => {
                          const updated = [...seriesForm.seasons];
                          updated[sIdx].title = e.target.value;
                          setSeriesForm({ ...seriesForm, seasons: updated });
                        }}
                        placeholder={`Season ${season.number} Title (Optional)`}
                        className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-[#FF5C00] text-sm font-bold text-white outline-none px-1 py-0.5"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => addEpisode(sIdx)}
                        className="px-3 py-1.5 bg-[#FF5C00]/10 hover:bg-[#FF5C00]/20 text-[#FF5C00] rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Episode
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSeason(sIdx)}
                        className="p-1.5 text-gray-500 hover:text-red-500 rounded-lg hover:bg-white/5 transition-colors"
                        title="Delete Season"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Episodes List in Season */}
                  <div className="space-y-3">
                    {season.episodes.map((ep, epIdx) => (
                      <div
                        key={ep.id || epIdx}
                        className="bg-[#141414] border border-[#1f1f1f] rounded-xl p-3.5 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-white/5 text-gray-300 font-bold text-xs flex items-center justify-center">
                              {ep.number}
                            </span>
                            <span className="text-xs font-bold text-white">Episode {ep.number}</span>
                          </div>

                          {/* Reordering & Delete Controls */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => reorderEpisode(sIdx, epIdx, 'up')}
                              disabled={epIdx === 0}
                              className="p-1 text-gray-400 hover:text-white disabled:opacity-30 rounded hover:bg-white/5"
                              title="Move Episode Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => reorderEpisode(sIdx, epIdx, 'down')}
                              disabled={epIdx === season.episodes.length - 1}
                              className="p-1 text-gray-400 hover:text-white disabled:opacity-30 rounded hover:bg-white/5"
                              title="Move Episode Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeEpisode(sIdx, epIdx)}
                              className="p-1 text-gray-500 hover:text-red-500 rounded hover:bg-white/5 ml-2"
                              title="Delete Episode"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Episode Fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
                              Title
                            </label>
                            <input
                              type="text"
                              value={ep.title}
                              onChange={(e) => updateEpisode(sIdx, epIdx, 'title', e.target.value)}
                              required
                              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#FF5C00]"
                              placeholder="Episode Title"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
                              Duration (min)
                            </label>
                            <input
                              type="number"
                              value={ep.duration || ''}
                              onChange={(e) => updateEpisode(sIdx, epIdx, 'duration', Number(e.target.value) || 0)}
                              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#FF5C00]"
                              placeholder="45"
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
                              Thumbnail URL
                            </label>
                            <input
                              type="text"
                              value={ep.thumbnailUrl || ''}
                              onChange={(e) => updateEpisode(sIdx, epIdx, 'thumbnailUrl', cleanMediaUrl(e.target.value))}
                              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#FF5C00]"
                              placeholder="https://domain.com/episode-thumb.jpg"
                            />
                          </div>

                          <div className="sm:col-span-4 pt-2">
                            <R2DirectVideoUploader
                              contentId={editing ? editing.id : undefined}
                              episodeId={ep.id}
                              onUploadComplete={async (jobId, storageKey) => {
                                updateEpisode(sIdx, epIdx, 'masterStorageKey', storageKey);
                                updateEpisode(sIdx, epIdx, 'transcodeStatus', 'processing');

                                if (editing) {
                                  const updatedSeasons = seriesForm.seasons.map((s, idx1) => ({
                                    ...s,
                                    episodes: s.episodes.map((e, idx2) =>
                                      idx1 === sIdx && idx2 === epIdx
                                        ? { ...e, masterStorageKey: storageKey, transcodeStatus: 'processing' }
                                        : e
                                    ),
                                  }));
                                  await adminApi.updateContent(editing.id, { seasons: updatedSeasons } as any);
                                  queryClient.invalidateQueries({ queryKey: ['admin-content'] });
                                  toast.success(`🎉 Episode ${ep.number} uploaded to R2! Transcoding enqueued.`);
                                }
                              }}
                              label={`Episode ${ep.number} Master Video Upload (Direct to R2)`}
                            />
                          </div>

                          <div className="sm:col-span-4">
                            <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1">
                              Synopsis (Optional)
                            </label>
                            <input
                              type="text"
                              value={ep.description || ''}
                              onChange={(e) => updateEpisode(sIdx, epIdx, 'description', e.target.value)}
                              className="w-full bg-[#0a0a0a] border border-[#222] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#FF5C00]"
                              placeholder="Brief description of this episode..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Series Submit Controls */}
          <div className="flex gap-3 pt-4 border-t border-[#222]">
            <button
              type="submit"
              disabled={saveSeriesMutation.isPending}
              className="px-6 py-3 bg-[#FF5C00] hover:bg-[#FF7A00] text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-[#FF5C00]/25"
            >
              {saveSeriesMutation.isPending
                ? 'Saving Web Series...'
                : editing
                ? 'Update Web Series'
                : 'Create Web Series'}
            </button>
            <button
              type="button"
              onClick={resetForms}
              className="px-6 py-3 bg-[#222] hover:bg-[#2a2a2a] text-gray-300 text-sm font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-[#141414] border border-[#222] rounded-2xl p-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search catalog titles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0f0f0f] border border-[#222] hover:border-[#333] focus:border-red-500 focus:ring-1 focus:ring-red-500 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white outline-none transition-all duration-200"
          />
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {[
            { id: 'ALL', label: 'All Types' },
            { id: 'MOVIE', label: 'Movies' },
            { id: 'SERIES', label: 'Web Series' },
            { id: 'SPORT', label: 'Sports' },
            { id: 'MUSIC', label: 'Music' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`flex-1 md:flex-none px-3.5 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all border ${
                filterType === tab.id
                  ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/10'
                  : 'bg-[#0f0f0f] text-gray-400 border-[#222] hover:text-white hover:border-[#333]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Library Grid/List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-40 bg-[#141414] border border-[#222] rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-[#141414] border border-[#222] rounded-2xl p-12 text-center text-gray-500">
          <Film className="w-12 h-12 mx-auto text-gray-600 mb-3" />
          <p className="font-semibold text-white">No titles matching query</p>
          <p className="text-xs text-gray-500 mt-1">Try adapting your search keyword or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredItems.map((item) => {
            const isUploading = uploadingId === item.id;
            const seasonCount = item.seasons?.length || 0;
            const totalEpisodes = item.seasons?.reduce((acc, s) => acc + (s.episodes?.length || 0), 0) || 0;

            return (
              <div
                key={item.id}
                className="bg-[#141414] border border-[#222] rounded-2xl overflow-hidden hover:border-[#333] transition-all flex flex-col justify-between"
              >
                <div className="flex p-5 gap-4">
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    className="w-20 h-28 object-cover rounded-xl border border-[#222] shadow-md shrink-0 bg-[#0f0f0f]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/400x600/1a1a1a/ffffff?text=Poster';
                    }}
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-white text-base truncate">{item.title}</h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                          item.type === 'SERIES'
                            ? 'bg-[#FF5C00]/15 text-[#FF5C00] border-[#FF5C00]/30'
                            : item.type === 'SPORT'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : item.type === 'MUSIC'
                            ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                            : 'bg-[#1a1a1a] text-gray-400 border-[#2d2d2d]'
                        }`}
                      >
                        {item.type === 'SERIES' ? 'Series' : item.type === 'SPORT' ? 'Sports' : item.type === 'MUSIC' ? 'Music' : 'Movie'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      {item.releaseYear} &bull; {item.rating} &bull;{' '}
                      {Array.isArray(item.genre) ? item.genre.join(', ') : item.genre}
                      {item.type === 'SERIES'
                        ? ` &bull; ${seasonCount} Seasons (${totalEpisodes} Episodes)`
                        : item.duration
                        ? ` &bull; ${item.duration} min`
                        : ''}
                      {item.imdbScore ? ` &bull; ⭐ ${item.imdbScore}` : ''}
                    </p>
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] bg-white/5 border border-white/10 text-gray-400 px-1.5 py-0.2 rounded font-normal"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 line-clamp-2 pt-1 font-normal leading-relaxed">
                      {item.description}
                    </p>
                    <div className="pt-2 flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase ${
                          item.isPublished ? 'text-emerald-400' : 'text-gray-500'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.isPublished ? 'bg-emerald-400' : 'bg-gray-600'
                          }`}
                        />
                        {item.isPublished ? 'Published' : 'Draft'}
                      </span>
                      {item.status && (
                        <span className="bg-white/5 border border-white/10 text-gray-300 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded">
                          {item.status}
                        </span>
                      )}
                      {item.isFeatured && (
                        <span className="bg-orange-500/10 border border-orange-500/20 text-orange-500 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded">
                          Featured
                        </span>
                      )}
                      {item.isOriginal && (
                        <span className="bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded">
                          Original
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Bar: Action & Upload Form */}
                <div className="bg-[#1a1a1a] px-5 py-3 border-t border-[#222] flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500 truncate max-w-[60%]">
                      {item.type === 'SERIES' ? (
                        <span className="text-[#FF5C00] font-medium flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" />
                          {seasonCount} Seasons Configured
                        </span>
                      ) : item.videoUrl ? (
                        <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                          <Check className="w-4.5 h-4.5" />
                          HLS Stream Linked
                        </span>
                      ) : (
                        <span className="text-yellow-500 font-medium">Video missing</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {item.type !== 'SERIES' && (
                        <button
                          onClick={() => {
                            setUploadingId(isUploading ? null : item.id);
                            setSelectedFile(null);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                            isUploading
                              ? 'bg-[#222] text-white border-[#333] hover:bg-[#2a2a2a]'
                              : 'bg-[#141414] text-gray-300 border-[#2d2d2d] hover:bg-[#222] hover:text-white'
                          }`}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          Upload
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(item)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm text-white ${
                          item.type === 'SERIES'
                            ? 'bg-[#FF5C00] hover:bg-[#FF7A00]'
                            : 'bg-red-600 hover:bg-red-500'
                        }`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${item.title}"?`)) {
                            deleteMutation.mutate(item.id);
                          }
                        }}
                        className="p-1.5 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 rounded-lg text-gray-500 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Video Upload Field for Movies / Items */}
                  {isUploading && (
                    <div className="pt-2 border-t border-[#2d2d2d]">
                      <R2DirectVideoUploader
                        contentId={item.id}
                        onUploadComplete={async (jobId, storageKey) => {
                          await adminApi.updateContent(item.id, {
                            masterStorageKey: storageKey,
                            transcodeStatus: 'processing',
                          } as any);
                          queryClient.invalidateQueries({ queryKey: ['admin-content'] });
                          setUploadingId(null);
                          toast.success('🎉 Direct Upload to Cloudflare R2 complete! Transcoding queued.');
                        }}
                        label={`Cloudflare R2 Master Upload for "${item.title}"`}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase text-gray-500 mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="w-full bg-[#0f0f0f] border border-[#222] hover:border-[#333] focus:border-[#FF5C00] rounded-xl px-4 py-3 text-sm text-white outline-none transition-all duration-200"
      />
    </div>
  );
}
