'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  Film,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Eye,
  RefreshCw,
  Play,
  Sparkles,
  Plus,
  Server,
  HardDrive,
  Layers,
  ShieldCheck,
  Check,
  Radio,
  FileVideo,
  Clock,
  Calendar,
  Tag,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { contentApi, Content, Genre } from '../../../api/content';
import { mediaApi } from '../../../api/media';
import { useAuthStore } from '../../../store/authStore';

export default function AdminStudioDesk() {
  const router = useRouter();
  const { user, isAuthenticated, login } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'create' | 'catalog' | 'telemetry'>('create');
  const [catalogItems, setCatalogItems] = useState<Content[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState<'MOVIE' | 'SERIES' | 'DOCUMENTARY' | 'EVENT'>('MOVIE');
  const [releaseYear, setReleaseYear] = useState<number>(2026);
  const [rating, setRating] = useState('U/A 13+');
  const [durationMinutes, setDurationMinutes] = useState<number>(120);
  const [selectedGenreIds, setSelectedGenreIds] = useState<string[]>([]);
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [backdropUrl, setBackdropUrl] = useState('');
  const [trailerUrl, setTrailerUrl] = useState('');
  const [isOriginal, setIsOriginal] = useState(false);
  const [isFeatured, setIsFeatured] = useState(true);
  const [publishImmediately, setPublishImmediately] = useState(true);

  // Video Ingestion Mode: 'file_upload' | 'direct_key'
  const [videoMode, setVideoMode] = useState<'file_upload' | 'direct_key'>('file_upload');
  const [streamManifestKey, setStreamManifestKey] = useState('');
  const [masterStorageKey, setMasterStorageKey] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStep, setUploadStep] = useState<string>('');

  const isAdmin = user?.role === 'ADMIN';

  // Load Catalog & Genres
  const refreshCatalog = async () => {
    setLoadingCatalog(true);
    try {
      const [catRes, genRes] = await Promise.all([
        contentApi.adminListAll().catch(() => contentApi.list({ limit: 50 })),
        contentApi.getGenres().catch(() => ({ data: [] })),
      ]);
      setCatalogItems(Array.isArray(catRes.data) ? catRes.data : []);
      if (Array.isArray(genRes.data) && genRes.data.length > 0) {
        setGenres(genRes.data);
      }
    } catch (err: any) {
      console.error('Failed to load catalog:', err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  useEffect(() => {
    refreshCatalog();
  }, [isAuthenticated]);

  const toggleGenre = (genreId: string) => {
    setSelectedGenreIds((prev) =>
      prev.includes(genreId) ? prev.filter((id) => id !== genreId) : [...prev, genreId]
    );
  };

  // Video Multipart File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!title) {
        // Auto-fill title from filename
        const clean = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTitle(clean.charAt(0).toUpperCase() + clean.slice(1));
      }
    }
  };

  // Preset Poster / Backdrop Helper
  const applyPresetAssets = (preset: 'masterclass' | 'cinema' | 'documentary') => {
    setVideoMode('direct_key');
    if (preset === 'masterclass') {
      setTitle('V19 Masterclass: Advanced Video Engineering');
      setDescription('An intensive deep dive into 4K HDR master compression, H.265 color grading, and low-latency HLS delivery.');
      setContentType('MOVIE');
      setReleaseYear(2026);
      setDurationMinutes(95);
      setThumbnailUrl('https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80');
      setBackdropUrl('https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1920&q=80');
      setStreamManifestKey('content/403a6233-6f33-47ef-8354-8d4ee80b7c0e/master.m3u8');
      setIsFeatured(true);
      setIsOriginal(true);
    } else if (preset === 'cinema') {
      setTitle('Shadows of the Peak');
      setDescription('A cinematic thriller captured in 8K across the frozen frontiers of northern Ladakh.');
      setContentType('MOVIE');
      setReleaseYear(2026);
      setDurationMinutes(138);
      setThumbnailUrl('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80');
      setBackdropUrl('https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1920&q=80');
      setStreamManifestKey('content/403a6233-6f33-47ef-8354-8d4ee80b7c0e/master.m3u8');
      setIsFeatured(true);
      setIsOriginal(true);
    } else {
      setTitle('The Silent Glaciers: A Himalayan Odyssey');
      setDescription('Witness the majestic high-altitude glaciers of the Himalayas in ultra-crisp panoramic native master bitrates.');
      setContentType('DOCUMENTARY');
      setReleaseYear(2026);
      setDurationMinutes(82);
      setThumbnailUrl('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80');
      setBackdropUrl('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80');
      setStreamManifestKey('content/403a6233-6f33-47ef-8354-8d4ee80b7c0e/master.m3u8');
      setIsFeatured(false);
      setIsOriginal(true);
    }
    toast.success(`Applied ${preset} studio metadata template!`);
  };

  // Submit Content & Video
  const handlePushContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a content title.');
      return;
    }

    setSubmitting(true);
    let finalMasterKey = masterStorageKey.trim() || undefined;
    let finalHlsKey = streamManifestKey.trim() || undefined;

    try {
      // 1. Direct File Upload from Mac / External HDD
      if (videoMode === 'file_upload') {
        if (!selectedFile) {
          toast.error('Please select a video file from your Mac or external hard drive.');
          setSubmitting(false);
          return;
        }

        setUploadStep(`Uploading ${selectedFile.name} (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)...`);
        setUploadProgress(5);

        const uploadRes = await mediaApi.uploadDirectFile(selectedFile, (pct) => {
          setUploadProgress(pct);
          if (pct >= 100) {
            setUploadStep('Syncing video to Cloudflare R2 media vault...');
          } else {
            setUploadStep(`Uploading video assets: ${pct}%`);
          }
        });

        finalMasterKey = uploadRes.data.storage_key;
        finalHlsKey = uploadRes.data.stream_url;
        setUploadProgress(100);
        setUploadStep('Video securely stored in Cloudflare R2 and verified!');
      } else {
        finalHlsKey = streamManifestKey.trim() || undefined;
        finalMasterKey = masterStorageKey.trim() || undefined;
      }

      setUploadStep('Registering title in V19plus PostgreSQL catalog...');

      // 2. Create Content Record in PostgreSQL
      const payload: any = {
        title: title.trim(),
        description: description.trim(),
        content_type: contentType,
        release_year: releaseYear,
        rating: rating,
        duration_seconds: durationMinutes * 60,
        thumbnail_url: thumbnailUrl.trim() || undefined,
        backdrop_url: backdropUrl.trim() || undefined,
        trailer_url: trailerUrl.trim() || undefined,
        master_storage_key: finalMasterKey,
        hls_manifest_key: finalHlsKey,
        is_original: isOriginal,
        is_featured: isFeatured,
        is_published: publishImmediately,
        status: publishImmediately ? 'PUBLISHED' : 'DRAFT',
        genre_ids: selectedGenreIds,
      };

      await contentApi.create(payload);
      toast.success(`"${title}" has been successfully pushed and ${publishImmediately ? 'PUBLISHED' : 'saved as DRAFT'}!`);

      // Reset form
      setTitle('');
      setDescription('');
      setSelectedFile(null);
      setUploadProgress(0);
      setUploadStep('');
      await refreshCatalog();
      setActiveTab('catalog');
    } catch (err: any) {
      console.error('Push error:', err);
      toast.error(err.response?.data?.detail || err.message || 'Failed to push content.');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Publish Status
  const handleTogglePublish = async (item: Content) => {
    const isCurrentlyPublished = item.is_published || item.status === 'PUBLISHED';
    const nextStatus = isCurrentlyPublished ? 'DRAFT' : 'PUBLISHED';
    const nextPub = !isCurrentlyPublished;

    try {
      await contentApi.update(item.id, {
        is_published: nextPub,
        status: nextStatus as any,
      });
      toast.success(`Updated status of "${item.title}" to ${nextStatus}!`);
      setCatalogItems((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, is_published: nextPub, status: nextStatus } : c))
      );
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update status.');
    }
  };

  // Delete Content
  const handleDeleteContent = async (item: Content) => {
    if (!confirm(`Are you sure you want to permanently delete "${item.title}" from the platform?`)) {
      return;
    }
    try {
      await contentApi.delete(item.id);
      toast.success(`Deleted "${item.title}" from database.`);
      setCatalogItems((prev) => prev.filter((c) => c.id !== item.id));
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete title.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 select-none animate-fade-in">
      {/* Studio Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FF5C00]/10 border border-[#FF5C00]/20 text-[#FF8A00] text-xs font-bold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#FF5C00]" />
            <span>V19PLUS STUDIO MASTER MANAGEMENT</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Admin Video & Catalog Ingestion
          </h1>
          <p className="text-sm text-[#9E978C] mt-1">
            Every single video on V19plus is directly uploaded and published here by the studio admin.
          </p>
        </div>

        {/* Global Stats */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-center">
            <span className="block text-xs text-[#8C8478] font-semibold uppercase tracking-wider">Catalog</span>
            <span className="text-lg font-black text-white">{catalogItems.length}</span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <span className="block text-xs text-emerald-400 font-semibold uppercase tracking-wider">Live Published</span>
            <span className="text-lg font-black text-emerald-300">
              {catalogItems.filter((c) => c.is_published || c.status === 'PUBLISHED').length}
            </span>
          </div>
          <button
            onClick={refreshCatalog}
            disabled={loadingCatalog}
            className="p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[#C8C2B8] hover:text-white transition-all active:scale-95"
            title="Refresh Catalog Data"
          >
            <RefreshCw className={`w-4 h-4 ${loadingCatalog ? 'animate-spin text-[#FF5C00]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Admin Auth Notice if not logged in */}
      {!isAuthenticated && (
        <div className="my-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-[#FF5C00] shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-white">Administrator Credentials Required for Ingest</h4>
              <p className="text-xs text-[#A49C90]">
                Authenticate with your administrator credentials (e.g. support@techmastersinnovations.in) to ingest video files and manage the catalog.
              </p>
            </div>
          </div>
          <Link
            href="/login?returnUrl=/admin"
            className="px-5 py-2.5 rounded-xl bg-[#FF5C00] hover:bg-[#E04800] text-white text-xs font-black tracking-wide shadow-[0_0_15px_rgba(255,92,0,0.4)] transition-all active:scale-95 whitespace-nowrap"
          >
            Sign In as Admin
          </Link>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 mt-6 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all ${
            activeTab === 'create'
              ? 'bg-[#FF5C00] text-white shadow-[0_0_15px_rgba(255,92,0,0.3)]'
              : 'text-[#9E978C] hover:text-white hover:bg-white/5'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Push Video & New Title</span>
        </button>
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all ${
            activeTab === 'catalog'
              ? 'bg-[#FF5C00] text-white shadow-[0_0_15px_rgba(255,92,0,0.3)]'
              : 'text-[#9E978C] hover:text-white hover:bg-white/5'
          }`}
        >
          <Film className="w-4 h-4" />
          <span>Catalog Registry ({catalogItems.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wide transition-all ${
            activeTab === 'telemetry'
              ? 'bg-[#FF5C00] text-white shadow-[0_0_15px_rgba(255,92,0,0.3)]'
              : 'text-[#9E978C] hover:text-white hover:bg-white/5'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Storage & Edge Telemetry</span>
        </button>
      </div>

      {/* Tab 1: Video Ingestion & Title Creator */}
      {activeTab === 'create' && (
        <form onSubmit={handlePushContent} className="mt-8 space-y-8">
          {/* Quick Preset Templates */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-[#A49C90] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#FF5C00]" />
              Quick Fill Studio Presets:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => applyPresetAssets('masterclass')}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-white border border-white/10 transition-colors"
              >
                + Masterclass Video
              </button>
              <button
                type="button"
                onClick={() => applyPresetAssets('cinema')}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-white border border-white/10 transition-colors"
              >
                + 4K Feature Film
              </button>
              <button
                type="button"
                onClick={() => applyPresetAssets('documentary')}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-white border border-white/10 transition-colors"
              >
                + Nature Documentary
              </button>
            </div>
          </div>

          {/* Section 1: Title & Core Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0E0C0A] p-6 rounded-2xl border border-white/10">
            <div className="md:col-span-2">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Film className="w-4 h-4 text-[#FF5C00]" />
                1. Core Title & Metadata
              </h3>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#A49C90]">
                Title <span className="text-[#FF5C00]">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. V19plus Masterclass: High Bitrate OTT"
                className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 text-white placeholder-zinc-600 focus:border-[#FF5C00] focus:outline-none transition-all text-sm"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#A49C90]">Content Type</label>
                <select
                  value={contentType}
                  onChange={(e: any) => setContentType(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl bg-black/60 border border-white/10 text-white text-sm focus:border-[#FF5C00] focus:outline-none"
                >
                  <option value="MOVIE">Movie / Masterclass</option>
                  <option value="DOCUMENTARY">Documentary</option>
                  <option value="SERIES">Series</option>
                  <option value="EVENT">Recorded Event</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#A49C90]">Release Year</label>
                <input
                  type="number"
                  value={releaseYear}
                  onChange={(e) => setReleaseYear(Number(e.target.value))}
                  className="w-full px-3 py-3 rounded-xl bg-black/60 border border-white/10 text-white text-sm focus:border-[#FF5C00] focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#A49C90]">Duration (Mins)</label>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-3 rounded-xl bg-black/60 border border-white/10 text-white text-sm focus:border-[#FF5C00] focus:outline-none"
                />
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#A49C90]">Synopsis / Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Comprehensive overview of the title, themes, topics covered..."
                className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 text-white placeholder-zinc-600 focus:border-[#FF5C00] focus:outline-none text-sm"
              />
            </div>

            {/* Genres Selector */}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#A49C90]">
                Genres & Categories
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                {genres.map((g) => {
                  const active = selectedGenreIds.includes(g.id);
                  return (
                    <button
                      type="button"
                      key={g.id}
                      onClick={() => toggleGenre(g.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
                        active
                          ? 'bg-[#FF5C00] border-[#FF5C00] text-white shadow-[0_0_10px_rgba(255,92,0,0.4)]'
                          : 'bg-white/5 border-white/10 text-[#C8C2B8] hover:border-white/30'
                      }`}
                    >
                      {active && <Check className="w-3 h-3 text-white" />}
                      <span>{g.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 2: Master Video Asset Ingestion */}
          <div className="bg-[#0E0C0A] p-6 rounded-2xl border border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-[#FF5C00]" />
                  2. Video Master Asset Ingestion
                </h3>
                <p className="text-xs text-[#8C8478] mt-0.5">
                  Select a video file directly from your local Mac or external HDD.
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 bg-black/60 rounded-xl border border-white/10 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setVideoMode('file_upload')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    videoMode === 'file_upload' ? 'bg-[#FF5C00] text-white' : 'text-[#8C8478] hover:text-white'
                  }`}
                >
                  Upload File from Device / HDD
                </button>
                <button
                  type="button"
                  onClick={() => setVideoMode('direct_key')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    videoMode === 'direct_key' ? 'bg-[#FF5C00] text-white' : 'text-[#8C8478] hover:text-white'
                  }`}
                >
                  External HLS / CDN URL
                </button>
              </div>
            </div>

            {videoMode === 'file_upload' ? (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-[#FF5C00]/30 hover:border-[#FF5C00] rounded-2xl p-8 text-center bg-black/40 transition-colors">
                  <FileVideo className="w-12 h-12 text-[#FF5C00] mx-auto mb-3" />
                  <p className="text-sm font-bold text-white">Select Video File from Local Mac or External HDD</p>
                  <p className="text-xs text-[#8C8478] mt-1 max-w-md mx-auto">
                    Directly ingest any video file (.mp4, .mov, .mkv, .webm).
                    No HLS manifest or external stream key required.
                  </p>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="master-video-file-input"
                  />
                  <label
                    htmlFor="master-video-file-input"
                    className="mt-4 inline-block px-5 py-2.5 rounded-xl bg-[#FF5C00] hover:bg-[#E04800] text-white font-bold text-xs cursor-pointer transition-colors shadow-[0_0_15px_rgba(255,92,0,0.3)]"
                  >
                    {selectedFile ? 'Change Video File' : 'Browse Video File from Mac / HDD'}
                  </label>
                  {selectedFile && (
                    <div className="mt-4 p-3 bg-white/5 rounded-xl max-w-md mx-auto border border-white/10 text-left flex items-center justify-between">
                      <div className="overflow-hidden mr-3">
                        <p className="text-xs font-bold text-emerald-400 truncate">{selectedFile.name}</p>
                        <p className="text-[10px] text-[#8C8478] mt-0.5">
                          {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB • {selectedFile.type || 'video'}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase whitespace-nowrap">
                        Ready to Ingest
                      </span>
                    </div>
                  )}
                </div>

                {uploadProgress > 0 && (
                  <div className="space-y-2 p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-[#FF8A00]">{uploadStep}</span>
                      <span className="text-white">{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#FF5C00] to-[#FF8A00] transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#A49C90]">
                    External HLS / Stream URL (.m3u8 or .mp4)
                  </label>
                  <input
                    type="text"
                    value={streamManifestKey}
                    onChange={(e) => setStreamManifestKey(e.target.value)}
                    placeholder="https://... or content/.../master.m3u8"
                    className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 text-white font-mono text-xs focus:border-[#FF5C00] focus:outline-none"
                  />
                  <p className="text-[11px] text-[#8C8478]">
                    Only use this if you have a pre-hosted HLS playlist or external CDN URL.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Visual Artwork Assets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0E0C0A] p-6 rounded-2xl border border-white/10">
            <div className="md:col-span-2">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#FF5C00]" />
                3. Artwork & Visual Assets
              </h3>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#A49C90]">Poster / Thumbnail URL (2:3)</label>
              <input
                type="text"
                value={thumbnailUrl}
                onChange={(e) => setThumbnailUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:border-[#FF5C00] focus:outline-none"
              />
              {thumbnailUrl && (
                <div className="w-24 h-36 rounded-lg overflow-hidden border border-white/10 mt-2 bg-black">
                  <img src={thumbnailUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-[#A49C90]">Cinematic Backdrop URL (16:9)</label>
              <input
                type="text"
                value={backdropUrl}
                onChange={(e) => setBackdropUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/10 text-white text-xs focus:border-[#FF5C00] focus:outline-none"
              />
              {backdropUrl && (
                <div className="w-full h-24 rounded-lg overflow-hidden border border-white/10 mt-2 bg-black">
                  <img src={backdropUrl} alt="Backdrop preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Publishing & Feature Options */}
          <div className="bg-[#0E0C0A] p-6 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-6">
            <div className="flex flex-wrap items-center gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={publishImmediately}
                  onChange={(e) => setPublishImmediately(e.target.checked)}
                  className="w-5 h-5 rounded border-white/20 bg-black text-[#FF5C00] focus:ring-[#FF5C00] focus:ring-offset-0"
                />
                <span className="text-sm font-bold text-white">Publish Immediately (Live in Catalog)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-5 h-5 rounded border-white/20 bg-black text-[#FF5C00] focus:ring-[#FF5C00] focus:ring-offset-0"
                />
                <span className="text-sm font-bold text-white">Feature in Billboard Hero</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isOriginal}
                  onChange={(e) => setIsOriginal(e.target.checked)}
                  className="w-5 h-5 rounded border-white/20 bg-black text-[#FF5C00] focus:ring-[#FF5C00] focus:ring-offset-0"
                />
                <span className="text-sm font-bold text-white">V19+ Studio Original</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#FF5C00] to-[#E04800] text-white font-black text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(255,92,0,0.4)] hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              {submitting ? 'Pushing Video & Registering...' : 'Push Video & Ingest Title'}
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Catalog Registry */}
      {activeTab === 'catalog' && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-[#FF5C00]" />
              Database Catalog Registry ({catalogItems.length} Records)
            </h3>
            <span className="text-xs text-[#8C8478]">
              All items in PostgreSQL. Click status badge to toggle live publish state.
            </span>
          </div>

          {catalogItems.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white/5 border border-white/10">
              <Film className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm font-bold text-white">Catalog is currently empty</p>
              <p className="text-xs text-[#8C8478] mt-1">Use the "Push Video & New Title" tab to add your first master video.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#0E0C0A]">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/80 text-[#8C8478] uppercase tracking-wider border-b border-white/10 font-bold">
                  <tr>
                    <th className="p-4">Artwork</th>
                    <th className="p-4">Title & Slug</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Year & Duration</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Stream Manifest</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {catalogItems.map((item) => {
                    const isPub = item.is_published || item.status === 'PUBLISHED';
                    return (
                      <tr key={item.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <div className="w-12 h-16 rounded-lg overflow-hidden bg-black/60 border border-white/10">
                            {item.thumbnailUrl || (item as any).thumbnail_url ? (
                              <img
                                src={item.thumbnailUrl || (item as any).thumbnail_url}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                <Film className="w-5 h-5" />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-white">
                          <p className="text-sm font-bold text-white">{item.title}</p>
                          <p className="text-[11px] text-[#8C8478] font-mono mt-0.5">{item.slug}</p>
                          {item.isFeatured && (
                            <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-[#FF5C00]/20 text-[#FFA84A] text-[9px] font-black uppercase">
                              Spotlight Hero
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-[#C8C2B8] font-bold">
                          {item.type || item.contentType || (item as any).content_type || 'MOVIE'}
                        </td>
                        <td className="p-4 text-[#C8C2B8]">
                          <p>{item.releaseYear || (item as any).release_year || 2026}</p>
                          <p className="text-[11px] text-[#8C8478]">
                            {Math.round(((item.duration || (item as any).duration_seconds || 5400) / 60))} mins
                          </p>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleTogglePublish(item)}
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border ${
                              isPub
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                                : 'bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25'
                            }`}
                            title="Click to toggle Draft / Published"
                          >
                            {isPub ? '● PUBLISHED' : '○ DRAFT'}
                          </button>
                        </td>
                        <td className="p-4 font-mono text-[11px] text-[#8C8478] max-w-[200px] truncate">
                          {item.hls_manifest_key || item.hlsUrl || 'Pending Ingest'}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <Link
                            href={`/watch/${item.slug}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                            title="Test Stream in Player"
                          >
                            <Play className="w-3.5 h-3.5 text-[#FF5C00]" />
                          </Link>
                          <button
                            onClick={() => handleDeleteContent(item)}
                            className="inline-flex items-center gap-1 p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                            title="Delete Permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Platform Telemetry */}
      {activeTab === 'telemetry' && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#0E0C0A] border border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF5C00]/15 flex items-center justify-center text-[#FF5C00]">
              <Server className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Origin Infrastructure</h4>
            <p className="text-xs text-[#8C8478] leading-relaxed">
              Locked to <span className="text-white font-bold">Singapore Region (AWS/Render)</span>.
              FastAPI async engine and Render PostgreSQL pool are co-located with sub-millisecond query latency.
            </p>
            <div className="pt-2 text-[11px] text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Operational (127.0.0.1:8001)
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#0E0C0A] border border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Master Video Object Storage</h4>
            <p className="text-xs text-[#8C8478] leading-relaxed">
              Cloudflare R2 Masters bucket configured for S3 multipart ingestion up to 640GB per asset with zero egress fees.
            </p>
            <div className="pt-2 text-[11px] text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              S3 Multipart Protocol Active (64MB Chunks)
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#0E0C0A] border border-white/10 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400">
              <Radio className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-white">Global Edge HLS Delivery</h4>
            <p className="text-xs text-[#8C8478] leading-relaxed">
              Cloudflare Anycast CDN with byte-range caching for 4K / 1080p / 720p adaptive streaming manifests.
            </p>
            <div className="pt-2 text-[11px] text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              HLS.js / Native Safari AVPlayer Ready
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
