'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Film,
  UploadCloud,
  Users,
  CreditCard,
  Bell,
  Radio,
  Search,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  LogOut,
  RefreshCw,
  Play,
  Eye,
  ShieldCheck,
  Check,
  X,
  Clock,
  Calendar,
  Tag,
  Filter,
  Sparkles,
  Send,
  Layers,
  FileVideo,
  Smartphone,
  Laptop,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { contentApi, Content, Genre } from '../../../api/content';
import { mediaApi } from '../../../api/media';
import {
  adminApi,
  DashboardStats,
  AdminUser,
  AdminSubscription,
  ActiveSession,
  NotificationRecord,
} from '../../../api/admin';
import { useAuthStore } from '../../../store/authStore';

type AdminTab =
  | 'overview'
  | 'catalog'
  | 'upload'
  | 'users'
  | 'subscriptions'
  | 'notifications'
  | 'sessions';

export default function AdminStudioDesk() {
  const router = useRouter();
  const { user, isAuthenticated, login, logout } = useAuthStore();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  // Login Gate State (for unauthenticated or non-admin visitors)
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  // Global Dashboard Analytics State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // 1. Catalog State
  const [catalogItems, setCatalogItems] = useState<Content[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogTypeFilter, setCatalogTypeFilter] = useState('ALL');

  // Edit Content Modal State
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editType, setEditType] = useState('MOVIE');
  const [editYear, setEditYear] = useState(2026);
  const [editRating, setEditRating] = useState('U/A 13+');
  const [editDurationMinutes, setEditDurationMinutes] = useState(120);
  const [editThumbnailUrl, setEditThumbnailUrl] = useState('');
  const [editBackdropUrl, setEditBackdropUrl] = useState('');
  const [editTrailerUrl, setEditTrailerUrl] = useState('');
  const [editIsFeatured, setEditIsFeatured] = useState(false);
  const [editIsOriginal, setEditIsOriginal] = useState(false);
  const [editIsPublished, setEditIsPublished] = useState(true);
  const [editGenreIds, setEditGenreIds] = useState<string[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // 2. Upload Video Form State (WORKING ENGINE)
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

  // Ingestion Mode: 'file_upload' | 'direct_key'
  const [videoMode, setVideoMode] = useState<'file_upload' | 'direct_key'>('file_upload');
  const [streamManifestKey, setStreamManifestKey] = useState('');
  const [masterStorageKey, setMasterStorageKey] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStep, setUploadStep] = useState<string>('');
  const [uploadSubmitting, setUploadSubmitting] = useState(false);

  // 3. Users Management State
  const [usersList, setUsersList] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');

  // User Modals (Create & Edit)
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('USER');
  const [createUserSubmitting, setCreateUserSubmitting] = useState(false);

  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserRole, setEditUserRole] = useState('USER');
  const [editUserIsActive, setEditUserIsActive] = useState(true);
  const [editUserNewPassword, setEditUserNewPassword] = useState('');
  const [updateUserSubmitting, setUpdateUserSubmitting] = useState(false);

  // 4. Subscriptions State
  const [subscriptionsList, setSubscriptionsList] = useState<AdminSubscription[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [subStatusFilter, setSubStatusFilter] = useState('ALL');

  // 5. Active Sessions State
  const [sessionsList, setSessionsList] = useState<ActiveSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  // 6. Push Notifications State
  const [notificationsList, setNotificationsList] = useState<NotificationRecord[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifAudience, setNotifAudience] = useState('ALL');
  const [notifActionUrl, setNotifActionUrl] = useState('');
  const [notifType, setNotifType] = useState('PUSH');
  const [notifSubmitting, setNotifSubmitting] = useState(false);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const res = await adminApi.dashboard();
      setStats(res.data);
    } catch (err) {
      console.warn('Stats fetch notice:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const refreshCatalog = async () => {
    setLoadingCatalog(true);
    try {
      const [catRes, genRes] = await Promise.all([
        contentApi.adminListAll().catch(() => contentApi.list({ limit: 100 })),
        contentApi.getGenres().catch(() => ({ data: [] })),
      ]);
      setCatalogItems(Array.isArray(catRes.data) ? catRes.data : []);
      if (Array.isArray(genRes.data) && genRes.data.length > 0) {
        setGenres(genRes.data);
      }
    } catch (err) {
      console.error('Failed to load catalog:', err);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const params: any = {};
      if (userSearch.trim()) params.query = userSearch.trim();
      if (userRoleFilter !== 'ALL') params.role = userRoleFilter;
      const res = await adminApi.listUsers(params);
      setUsersList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn('Users fetch notice:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchSubscriptions = async () => {
    setLoadingSubscriptions(true);
    try {
      const params: any = {};
      if (subStatusFilter !== 'ALL') params.status_filter = subStatusFilter;
      const res = await adminApi.listSubscriptions(params);
      setSubscriptionsList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn('Subscriptions fetch notice:', err);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const res = await adminApi.listActiveSessions();
      setSessionsList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn('Sessions fetch notice:', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const res = await adminApi.getNotifications();
      setNotificationsList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.warn('Notifications fetch notice:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // Initial & Tab-based Load
  useEffect(() => {
    if (isAuthenticated && isAdmin) {
      if (activeTab === 'overview') {
        fetchStats();
      } else if (activeTab === 'catalog') {
        refreshCatalog();
      } else if (activeTab === 'upload') {
        if (genres.length === 0) refreshCatalog();
      } else if (activeTab === 'users') {
        fetchUsers();
      } else if (activeTab === 'subscriptions') {
        fetchSubscriptions();
      } else if (activeTab === 'sessions') {
        fetchSessions();
      } else if (activeTab === 'notifications') {
        fetchNotifications();
      }
    }
  }, [isAuthenticated, isAdmin, activeTab]);

  // ─── Filtered Views (Hooks must always run unconditionally at top level) ──
  const filteredCatalog = useMemo(() => {
    return catalogItems.filter((item) => {
      const matchType =
        catalogTypeFilter === 'ALL' ||
        (item.content_type || item.type || '').toUpperCase() === catalogTypeFilter;
      const matchSearch =
        !catalogSearch.trim() ||
        item.title.toLowerCase().includes(catalogSearch.toLowerCase().trim());
      return matchType && matchSearch;
    });
  }, [catalogItems, catalogTypeFilter, catalogSearch]);

  // ─── Handlers: Video & Content CRUD ────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!title) {
        const clean = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setTitle(clean.charAt(0).toUpperCase() + clean.slice(1));
      }
    }
  };

  const applyPresetAssets = (preset: 'masterclass' | 'cinema' | 'documentary') => {
    setVideoMode('direct_key');
    if (preset === 'masterclass') {
      setTitle('V19 Original: The Art of Storytelling');
      setDescription('An intensive masterclass exploring pacing, color, visual rhythm, and narrative structure.');
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
      setDescription('A cinematic thriller captured across the frozen frontiers of northern Ladakh.');
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
      setDescription('Witness the majestic high-altitude glaciers of the Himalayas in crystal clear panorama.');
      setContentType('DOCUMENTARY');
      setReleaseYear(2026);
      setDurationMinutes(82);
      setThumbnailUrl('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80');
      setBackdropUrl('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80');
      setStreamManifestKey('content/403a6233-6f33-47ef-8354-8d4ee80b7c0e/master.m3u8');
      setIsFeatured(false);
      setIsOriginal(true);
    }
    toast.success(`Applied ${preset} template!`);
  };

  // 100% PRESERVED WORKING UPLOAD LOGIC
  const handlePushContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a content title.');
      return;
    }

    setUploadSubmitting(true);
    let finalMasterKey = masterStorageKey.trim() || undefined;
    let finalHlsKey = streamManifestKey.trim() || undefined;

    try {
      if (videoMode === 'file_upload') {
        if (!selectedFile) {
          toast.error('Please select a video file from your Mac or external drive.');
          setUploadSubmitting(false);
          return;
        }

        setUploadStep(`Uploading ${selectedFile.name} (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)...`);
        setUploadProgress(5);

        const uploadRes = await mediaApi.uploadChunkedFile(selectedFile, (pct, details) => {
          setUploadProgress(pct);
          if (pct >= 100) {
            setUploadStep('Finalizing and assembling video stream in Cloudflare R2 media vault...');
          } else if (details) {
            const uploadedMB = (details.uploadedBytes / (1024 * 1024)).toFixed(1);
            const totalMB = (details.totalBytes / (1024 * 1024)).toFixed(1);
            setUploadStep(
              `Uploading Part ${details.currentPart} of ${details.totalParts} (${uploadedMB} MB / ${totalMB} MB) • ${pct}%`
            );
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

      setUploadStep('Registering title in V19plus catalog...');

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
      toast.success(`"${title}" has been successfully pushed!`);

      setTitle('');
      setDescription('');
      setSelectedFile(null);
      setUploadProgress(0);
      setUploadStep('');
      await refreshCatalog();
      setActiveTab('catalog');
    } catch (err: any) {
      console.error('Push error:', err);
      const detail = err.response?.data?.detail;
      let errorMsg = 'Failed to push video content.';
      if (typeof detail === 'string') {
        errorMsg = detail;
      } else if (Array.isArray(detail)) {
        errorMsg = detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join(', ');
      } else if (err.message) {
        errorMsg = err.message;
      }
      toast.error(errorMsg);
    } finally {
      setUploadSubmitting(false);
    }
  };

  const handleOpenEditModal = (item: Content) => {
    setEditingContent(item);
    setEditTitle(item.title || '');
    setEditDescription(item.description || '');
    setEditType((item.content_type || item.type || 'MOVIE').toUpperCase());
    setEditYear(item.release_year || item.releaseYear || 2026);
    setEditRating(item.rating || 'U/A 13+');
    setEditDurationMinutes(
      item.duration_seconds ? Math.round(item.duration_seconds / 60) : item.duration || 120
    );
    setEditThumbnailUrl(item.thumbnail_url || item.thumbnailUrl || '');
    setEditBackdropUrl(item.backdrop_url || item.backdropUrl || '');
    setEditTrailerUrl(item.trailer_url || item.trailerUrl || '');
    setEditIsFeatured(!!(item.is_featured || item.isFeatured));
    setEditIsOriginal(!!(item.is_original || item.isOriginal));
    setEditIsPublished(item.status === 'PUBLISHED' || !!item.is_published);
    setEditGenreIds(item.genres ? item.genres.map((g) => g.id) : []);
  };

  const handleSaveEditContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContent) return;

    setEditSubmitting(true);
    try {
      await contentApi.update(editingContent.id, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        content_type: editType,
        release_year: editYear,
        rating: editRating,
        duration_seconds: editDurationMinutes * 60,
        thumbnail_url: editThumbnailUrl.trim() || undefined,
        backdrop_url: editBackdropUrl.trim() || undefined,
        trailer_url: editTrailerUrl.trim() || undefined,
        is_featured: editIsFeatured,
        is_original: editIsOriginal,
        is_published: editIsPublished,
        status: editIsPublished ? 'PUBLISHED' : 'DRAFT',
        genre_ids: editGenreIds,
      });

      toast.success(`Updated "${editTitle}" successfully!`);
      setEditingContent(null);
      await refreshCatalog();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update content.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteContent = async (item: Content) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${item.title}"?`)) {
      return;
    }
    try {
      await contentApi.delete(item.id);
      toast.success(`Deleted "${item.title}" from catalog.`);
      setCatalogItems((prev) => prev.filter((c) => c.id !== item.id));
    } catch (err: any) {
      toast.error('Failed to delete content.');
    }
  };

  const handleTogglePublish = async (item: Content) => {
    const nextStatus = item.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      await contentApi.update(item.id, {
        status: nextStatus,
        is_published: nextStatus === 'PUBLISHED',
      });
      toast.success(`"${item.title}" marked as ${nextStatus}`);
      await refreshCatalog();
    } catch (err) {
      toast.error('Failed to toggle status.');
    }
  };

  // ─── Handlers: Users CRUD ──────────────────────────────────────────────────

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword) {
      toast.error('Please fill in all required user fields.');
      return;
    }

    setCreateUserSubmitting(true);
    try {
      await adminApi.createUser({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword,
        role: newUserRole,
        is_active: true,
      });
      toast.success(`User "${newUserName}" created successfully!`);
      setShowCreateUserModal(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to create user.');
    } finally {
      setCreateUserSubmitting(false);
    }
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setUpdateUserSubmitting(true);
    try {
      await adminApi.updateUser(editingUser.id, {
        name: editUserName.trim(),
        email: editUserEmail.trim(),
        role: editUserRole,
        is_active: editUserIsActive,
        password: editUserNewPassword ? editUserNewPassword : undefined,
      });
      toast.success(`User "${editUserName}" updated!`);
      setEditingUser(null);
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to update user.');
    } finally {
      setUpdateUserSubmitting(false);
    }
  };

  const handleDeleteUser = async (u: AdminUser) => {
    if (!window.confirm(`Delete user "${u.name}" (${u.email})? This action cannot be undone.`)) {
      return;
    }
    try {
      await adminApi.deleteUser(u.id);
      toast.success(`User deleted.`);
      setUsersList((prev) => prev.filter((item) => item.id !== u.id));
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to delete user.');
    }
  };

  // ─── Handlers: Subscriptions & Sessions ───────────────────────────────────

  const handleUpdateSubscriptionStatus = async (
    subId: string,
    newStatus: 'ACTIVE' | 'CANCELLED' | 'EXPIRED'
  ) => {
    try {
      await adminApi.updateSubscription(subId, { status: newStatus });
      toast.success(`Subscription marked as ${newStatus}`);
      await fetchSubscriptions();
    } catch (err) {
      toast.error('Failed to update subscription.');
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    if (!window.confirm('Disconnect this device session?')) return;
    try {
      await adminApi.terminateSession(sessionId);
      toast.success('Device disconnected.');
      setSessionsList((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      toast.error('Failed to terminate session.');
    }
  };

  // ─── Handlers: Push Notifications & Reminders ─────────────────────────────

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      toast.error('Please enter notification title and message.');
      return;
    }

    setNotifSubmitting(true);
    try {
      const res = await adminApi.broadcastNotification({
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        target_audience: notifAudience,
        action_url: notifActionUrl.trim() || undefined,
        notification_type: notifType,
      });

      toast.success(`Dispatched to ${res.data.recipients_count} platform users!`);
      setNotifTitle('');
      setNotifMessage('');
      setNotifActionUrl('');
      await fetchNotifications();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to dispatch notification.');
    } finally {
      setNotifSubmitting(false);
    }
  };

  // ─── Authentication Gateway for Non-Admin ─────────────────────────────────

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginSubmitting(true);
    try {
      await login(adminEmail.trim(), adminPassword);
      toast.success('Admin authentication verified.');
    } catch (err: any) {
      toast.error(err.message || 'Invalid administrator credentials.');
    } finally {
      setLoginSubmitting(false);
    }
  };

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#070605] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-[#FF5C00]/10 blur-[130px] pointer-events-none" />

        <div className="w-full max-w-md bg-[#120F0D]/95 border border-white/15 rounded-3xl p-8 shadow-2xl relative z-10 backdrop-blur-2xl">
          <div className="w-12 h-1 bg-gradient-to-r from-[#FF5C00] to-[#FF8A00] rounded-full mx-auto mb-6" />

          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FF5C00]/15 border border-[#FF5C00]/30 text-[#FF8A00] text-xs font-bold tracking-wider uppercase mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Restricted Access</span>
            </div>
            <h1 className="text-2xl font-black text-white">V19Plus Admin Console</h1>
            <p className="text-xs text-[#9E9689] mt-2">
              Sign in with administrative credentials to access platform controls, user management, and video ingestion.
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                Admin Email
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@v19plus.com"
                className="w-full bg-[#1A1613] border border-white/15 focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00]/25 rounded-xl px-4 py-3.5 text-sm text-white placeholder-[#787065] outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[#1A1613] border border-white/15 focus:border-[#FF5C00] focus:ring-2 focus:ring-[#FF5C00]/25 rounded-xl px-4 py-3.5 text-sm text-white placeholder-[#787065] outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loginSubmitting}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#FF5C00] to-[#E04800] hover:from-[#FF6B1A] hover:to-[#EB5505] shadow-[0_4px_25px_rgba(255,92,0,0.35)] transition-all cursor-pointer disabled:opacity-50 mt-2"
            >
              {loginSubmitting ? 'Authenticating...' : 'Enter Admin Console'}
            </button>
          </form>

          <div className="text-center mt-6">
            <Link
              href="/"
              className="text-xs text-[#8C8478] hover:text-white inline-flex items-center gap-1.5 transition-colors"
            >
              <span>Return to Public Platform</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ─── MAIN ADMIN STUDIO CONSOLE ─────────────────────────────────────────────

  return (
    <div className="flex h-screen w-full bg-[#070605] text-white overflow-hidden">
      {/* ─── DEDICATED ADMIN SIDEBAR (No user navbar!) ─────────────────────── */}
      <aside className="w-64 bg-[#0E0C0A] border-r border-white/10 flex flex-col justify-between shrink-0 select-none">
        <div>
          {/* Admin Console Brand Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF5C00] to-[#D94500] shadow-[0_0_20px_rgba(255,92,0,0.4)] flex items-center justify-center">
                <Play className="w-4 h-4 fill-white text-white ml-0.5" />
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-white">
                  V19<span className="text-[#FF5C00]">Studio</span>
                </span>
                <span className="block text-[10px] font-black uppercase tracking-widest text-[#FF8A00]">
                  Admin Console
                </span>
              </div>
            </div>
            <div className="mt-3.5 flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Connected • Singapore Edge</span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1">
            {[
              { id: 'overview', label: 'Dashboard Overview', icon: BarChart3 },
              { id: 'catalog', label: 'Videos & Catalog', icon: Film },
              {
                id: 'upload',
                label: 'Upload Video',
                icon: UploadCloud,
                badge: uploadSubmitting ? `${uploadProgress}%` : undefined,
              },
              { id: 'users', label: 'User Accounts', icon: Users },
              { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
              { id: 'notifications', label: 'Push & Reminders', icon: Bell },
              { id: 'sessions', label: 'Active Sessions', icon: Radio },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as AdminTab)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#FF5C00] text-white shadow-lg shadow-orange-500/20'
                      : 'text-[#9E9689] hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white animate-pulse">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: User details & Exit */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center font-bold text-xs text-white">
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="truncate max-w-[120px]">
                <div className="text-xs font-bold text-white truncate">{user?.name || 'Admin'}</div>
                <div className="text-[10px] text-[#8C8478] truncate">{user?.email}</div>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="text-[#8C8478] hover:text-red-400 p-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <Link
            href="/"
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-[#C8C2B8] hover:text-white text-xs font-semibold border border-white/10 transition-colors"
          >
            <span>Exit to Consumer App</span>
            <ExternalLink className="w-3 h-3 text-[#FF5C00]" />
          </Link>
        </div>
      </aside>

      {/* ─── DEDICATED ADMIN MAIN CONTENT SHELL ───────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#070605]">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-white/10 px-8 flex items-center justify-between bg-[#0E0C0A]/60 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-black text-white capitalize tracking-tight">
              {activeTab === 'overview' && 'Live Platform Performance'}
              {activeTab === 'catalog' && 'Video Catalog Management'}
              {activeTab === 'upload' && 'Upload Video Master'}
              {activeTab === 'users' && 'User Management & Access Control'}
              {activeTab === 'subscriptions' && 'Subscription Plans & Revenue'}
              {activeTab === 'notifications' && 'Broadcast Push Alerts & Reminders'}
              {activeTab === 'sessions' && 'Real-Time Connected Sessions'}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Action Button */}
            {activeTab !== 'upload' && (
              <button
                onClick={() => setActiveTab('upload')}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#FF5C00] hover:bg-[#FF6B1A] text-white text-xs font-bold transition-all shadow-md shadow-orange-500/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload New Video</span>
              </button>
            )}

            {/* Refresh Button */}
            <button
              onClick={() => {
                if (activeTab === 'overview') fetchStats();
                if (activeTab === 'catalog') refreshCatalog();
                if (activeTab === 'users') fetchUsers();
                if (activeTab === 'subscriptions') fetchSubscriptions();
                if (activeTab === 'sessions') fetchSessions();
                if (activeTab === 'notifications') fetchNotifications();
                toast.success('Data reloaded from database.');
              }}
              title="Refresh Data"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#C8C2B8] hover:text-white border border-white/10 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Scrollable Workspace Area */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-8">
          {/* ═══════════════════════════════════════════════════════════════════
              TAB 1: DASHBOARD OVERVIEW
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <div className="space-y-8 max-w-7xl mx-auto">
              {/* Top Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* Total Users */}
                <div className="bg-[#120F0D] border border-white/10 rounded-2xl p-5 shadow-lg">
                  <div className="flex items-center justify-between text-[#8C8478] mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider">Registered Users</span>
                    <Users className="w-4 h-4 text-[#FF8A00]" />
                  </div>
                  <div className="text-3xl font-black text-white">{stats?.total_users ?? '—'}</div>
                  <p className="text-[11px] text-[#8C8478] mt-1.5">Real users in PostgreSQL database</p>
                </div>

                {/* Active Sessions */}
                <div className="bg-[#120F0D] border border-white/10 rounded-2xl p-5 shadow-lg">
                  <div className="flex items-center justify-between text-[#8C8478] mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider">Active Devices</span>
                    <Radio className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-3xl font-black text-emerald-400">{stats?.active_users ?? '—'}</div>
                  <p className="text-[11px] text-[#8C8478] mt-1.5">Live signed-in active refresh tokens</p>
                </div>

                {/* Catalog Titles */}
                <div className="bg-[#120F0D] border border-white/10 rounded-2xl p-5 shadow-lg">
                  <div className="flex items-center justify-between text-[#8C8478] mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider">Catalog Titles</span>
                    <Film className="w-4 h-4 text-[#FF8A00]" />
                  </div>
                  <div className="text-3xl font-black text-white">{stats?.total_content ?? '—'}</div>
                  <p className="text-[11px] text-[#8C8478] mt-1.5">Movies, series & masterclasses</p>
                </div>

                {/* Total Revenue */}
                <div className="bg-[#120F0D] border border-white/10 rounded-2xl p-5 shadow-lg">
                  <div className="flex items-center justify-between text-[#8C8478] mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider">Platform Revenue</span>
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-3xl font-black text-white">
                    ₹{stats?.total_revenue_inr ? stats.total_revenue_inr.toLocaleString() : '0'}
                  </div>
                  <p className="text-[11px] text-emerald-400/90 mt-1.5 font-semibold">
                    {stats?.active_subscriptions ?? 0} Active Paid Passes
                  </p>
                </div>
              </div>

              {/* Two Column Section: Recent Users & Recent Transactions */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Users */}
                <div className="bg-[#120F0D] border border-white/10 rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#FF5C00]" />
                      <span>Recently Registered Users</span>
                    </h3>
                    <button
                      onClick={() => setActiveTab('users')}
                      className="text-xs font-bold text-[#FF8A00] hover:underline"
                    >
                      View All
                    </button>
                  </div>
                  <div className="divide-y divide-white/5">
                    {stats?.recent_users && stats.recent_users.length > 0 ? (
                      stats.recent_users.map((u) => (
                        <div key={u.id} className="py-3 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-white">{u.name}</div>
                            <div className="text-[11px] text-[#8C8478]">{u.email}</div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.role === 'ADMIN'
                                ? 'bg-orange-500/10 text-[#FF8A00] border border-orange-500/20'
                                : 'bg-white/5 text-[#8C8478]'
                            }`}
                          >
                            {u.role}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#8C8478] py-4">No user records found.</p>
                    )}
                  </div>
                </div>

                {/* Recent Payments */}
                <div className="bg-[#120F0D] border border-white/10 rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-emerald-400" />
                      <span>Recent Payment Transactions</span>
                    </h3>
                    <button
                      onClick={() => setActiveTab('subscriptions')}
                      className="text-xs font-bold text-[#FF8A00] hover:underline"
                    >
                      View Subscriptions
                    </button>
                  </div>
                  <div className="divide-y divide-white/5">
                    {stats?.recent_payments && stats.recent_payments.length > 0 ? (
                      stats.recent_payments.map((p) => (
                        <div key={p.id} className="py-3 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-white">₹{p.amount_inr}</div>
                            <div className="text-[10px] text-[#8C8478]">
                              {p.created_at ? new Date(p.created_at).toLocaleString() : ''}
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {p.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-[#8C8478] py-4">No recent payments recorded.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 2: CATALOG MANAGEMENT (Full CRUD: List, Edit, Delete, Status)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'catalog' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#120F0D] border border-white/10 p-4 rounded-2xl">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C8478]" />
                  <input
                    type="text"
                    value={catalogSearch}
                    onChange={(e) => setCatalogSearch(e.target.value)}
                    placeholder="Search titles in database..."
                    className="w-full bg-[#1A1613] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-[#787065] outline-none focus:border-[#FF5C00]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={catalogTypeFilter}
                    onChange={(e) => setCatalogTypeFilter(e.target.value)}
                    className="bg-[#1A1613] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-semibold outline-none cursor-pointer"
                  >
                    <option value="ALL">All Types</option>
                    <option value="MOVIE">Movies</option>
                    <option value="SERIES">Series</option>
                    <option value="DOCUMENTARY">Documentaries</option>
                  </select>

                  <button
                    onClick={() => setActiveTab('upload')}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF5C00] hover:bg-[#FF6B1A] text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Upload Title</span>
                  </button>
                </div>
              </div>

              {/* Catalog Table */}
              <div className="bg-[#120F0D] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.02] text-[#8C8478] font-bold uppercase tracking-wider">
                        <th className="py-3.5 px-4">Title & Details</th>
                        <th className="py-3.5 px-4">Type</th>
                        <th className="py-3.5 px-4">Year / Rating</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-[#D4CDC5]">
                      {filteredCatalog.length > 0 ? (
                        filteredCatalog.map((item) => {
                          const isPub = item.status === 'PUBLISHED' || item.is_published;
                          return (
                            <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={item.thumbnail_url || item.thumbnailUrl || '/placeholder.png'}
                                    alt={item.title}
                                    className="w-14 h-9 object-cover rounded-lg bg-white/5 border border-white/10 shrink-0"
                                  />
                                  <div>
                                    <div className="font-bold text-white">{item.title}</div>
                                    <div className="text-[11px] text-[#8C8478] line-clamp-1 max-w-sm">
                                      {item.description}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="py-3.5 px-4 font-semibold">
                                <span className="px-2 py-0.5 rounded bg-white/5 text-[#C8C2B8] text-[10px]">
                                  {item.content_type || item.type || 'MOVIE'}
                                </span>
                              </td>

                              <td className="py-3.5 px-4 font-semibold text-[#8C8478]">
                                {item.release_year || item.releaseYear || 2026} • {item.rating || 'U/A'}
                              </td>

                              <td className="py-3.5 px-4">
                                <button
                                  onClick={() => handleTogglePublish(item)}
                                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                                    isPub
                                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
                                  }`}
                                  title="Click to toggle published / draft"
                                >
                                  {isPub ? 'PUBLISHED' : 'DRAFT'}
                                </button>
                              </td>

                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Link
                                    href={`/watch/${item.slug}`}
                                    target="_blank"
                                    title="Watch / Preview"
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#C8C2B8] hover:text-white transition-colors"
                                  >
                                    <Play className="w-3.5 h-3.5" />
                                  </Link>

                                  <button
                                    onClick={() => handleOpenEditModal(item)}
                                    title="Edit Metadata"
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#FF8A00] hover:text-orange-300 transition-colors cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>

                                  <button
                                    onClick={() => handleDeleteContent(item)}
                                    title="Delete from Database"
                                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-[#8C8478]">
                            {loadingCatalog ? 'Loading catalog from database...' : 'No titles found.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 3: UPLOAD VIDEO (Working Cloudflare R2 Chunked Engine)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'upload' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Presets Strip */}
              <div className="bg-[#120F0D] border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-bold text-[#8C8478] uppercase tracking-wider">
                  Studio Quick Templates:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyPresetAssets('cinema')}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors cursor-pointer"
                  >
                    Cinema Feature
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetAssets('masterclass')}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors cursor-pointer"
                  >
                    Original Masterclass
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPresetAssets('documentary')}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors cursor-pointer"
                  >
                    Documentary Feature
                  </button>
                </div>
              </div>

              {/* Upload Form Card */}
              <div className="bg-[#120F0D] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                <form onSubmit={handlePushContent} className="space-y-6">
                  {/* File Selection Area */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                      Master Video File
                    </label>
                    <div className="border-2 border-dashed border-white/15 hover:border-[#FF5C00]/50 rounded-2xl p-6 text-center transition-colors bg-[#1A1613]">
                      <input
                        type="file"
                        accept="video/mp4,video/quicktime,video/x-matroska,video/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="videoFileInput"
                      />
                      <label htmlFor="videoFileInput" className="cursor-pointer block">
                        <UploadCloud className="w-8 h-8 text-[#FF5C00] mx-auto mb-2" />
                        <span className="text-sm font-bold text-white block">
                          {selectedFile ? selectedFile.name : 'Select Video File (.mp4, .mov, .mkv)'}
                        </span>
                        <span className="text-xs text-[#8C8478] mt-1 block">
                          {selectedFile
                            ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB selected for upload`
                            : 'Direct chunked upload directly to Cloudflare R2'}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Progress Bar (if uploading) */}
                  {uploadSubmitting && (
                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-[#FF8A00]">{uploadStep}</span>
                        <span className="text-white">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-[#FF5C00] to-[#E04800] h-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Title & Type */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                        Title *
                      </label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Shadows of the Peak"
                        className="w-full bg-[#1A1613] border border-white/15 focus:border-[#FF5C00] rounded-xl px-4 py-3 text-sm text-white placeholder-[#787065] outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                        Content Type
                      </label>
                      <select
                        value={contentType}
                        onChange={(e: any) => setContentType(e.target.value)}
                        className="w-full bg-[#1A1613] border border-white/15 focus:border-[#FF5C00] rounded-xl px-4 py-3 text-sm text-white outline-none cursor-pointer"
                      >
                        <option value="MOVIE">Movie</option>
                        <option value="SERIES">Series</option>
                        <option value="DOCUMENTARY">Documentary</option>
                        <option value="EVENT">Event</option>
                      </select>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                      Synopsis / Storyline
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Brief overview of the story..."
                      className="w-full bg-[#1A1613] border border-white/15 focus:border-[#FF5C00] rounded-xl px-4 py-3 text-sm text-white placeholder-[#787065] outline-none resize-none"
                    />
                  </div>

                  {/* Release Year, Rating, Duration */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                        Release Year
                      </label>
                      <input
                        type="number"
                        value={releaseYear}
                        onChange={(e) => setReleaseYear(Number(e.target.value))}
                        className="w-full bg-[#1A1613] border border-white/15 rounded-xl px-4 py-3 text-sm text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                        Age Rating
                      </label>
                      <input
                        type="text"
                        value={rating}
                        onChange={(e) => setRating(e.target.value)}
                        placeholder="U/A 13+"
                        className="w-full bg-[#1A1613] border border-white/15 rounded-xl px-4 py-3 text-sm text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                        Runtime (Minutes)
                      </label>
                      <input
                        type="number"
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(Number(e.target.value))}
                        className="w-full bg-[#1A1613] border border-white/15 rounded-xl px-4 py-3 text-sm text-white outline-none"
                      />
                    </div>
                  </div>

                  {/* Artwork URLs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                        Poster Thumbnail URL
                      </label>
                      <input
                        type="url"
                        value={thumbnailUrl}
                        onChange={(e) => setThumbnailUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-[#1A1613] border border-white/15 rounded-xl px-4 py-3 text-sm text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                        Backdrop Landscape URL
                      </label>
                      <input
                        type="url"
                        value={backdropUrl}
                        onChange={(e) => setBackdropUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-[#1A1613] border border-white/15 rounded-xl px-4 py-3 text-sm text-white outline-none"
                      />
                    </div>
                  </div>

                  {/* Direct Stream Manifest Option */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                      External Stream Key (Optional if uploading file)
                    </label>
                    <input
                      type="text"
                      value={streamManifestKey}
                      onChange={(e) => setStreamManifestKey(e.target.value)}
                      placeholder="e.g. content/403a6233-6f33-47ef-8354-8d4ee80b7c0e/master.m3u8"
                      className="w-full bg-[#1A1613] border border-white/15 rounded-xl px-4 py-3 text-sm text-white outline-none"
                    />
                  </div>

                  {/* Checkboxes */}
                  <div className="flex flex-wrap items-center gap-6 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                      <input
                        type="checkbox"
                        checked={isOriginal}
                        onChange={(e) => setIsOriginal(e.target.checked)}
                        className="rounded border-white/20 text-[#FF5C00] focus:ring-0"
                      />
                      <span>V19Plus Original</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                      <input
                        type="checkbox"
                        checked={isFeatured}
                        onChange={(e) => setIsFeatured(e.target.checked)}
                        className="rounded border-white/20 text-[#FF5C00] focus:ring-0"
                      />
                      <span>Featured in Hero Banner</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                      <input
                        type="checkbox"
                        checked={publishImmediately}
                        onChange={(e) => setPublishImmediately(e.target.checked)}
                        className="rounded border-white/20 text-[#FF5C00] focus:ring-0"
                      />
                      <span>Publish Immediately</span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={uploadSubmitting}
                    className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#FF5C00] to-[#E04800] hover:from-[#FF6B1A] hover:to-[#EB5505] shadow-[0_4px_25px_rgba(255,92,0,0.35)] transition-all cursor-pointer disabled:opacity-50"
                  >
                    {uploadSubmitting ? 'Uploading & Registering...' : 'Upload Video & Publish to Catalog'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 4: USERS MANAGEMENT (Full CRUD: List, Create, Edit, Delete)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'users' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Filter & Actions Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#120F0D] border border-white/10 p-4 rounded-2xl">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8C8478]" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                    placeholder="Search users by name or email..."
                    className="w-full bg-[#1A1613] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-[#787065] outline-none focus:border-[#FF5C00]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={userRoleFilter}
                    onChange={(e) => {
                      setUserRoleFilter(e.target.value);
                    }}
                    className="bg-[#1A1613] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-semibold outline-none cursor-pointer"
                  >
                    <option value="ALL">All Roles</option>
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>

                  <button
                    onClick={() => fetchUsers()}
                    className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
                  >
                    Filter
                  </button>

                  <button
                    onClick={() => setShowCreateUserModal(true)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF5C00] hover:bg-[#FF6B1A] text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create User</span>
                  </button>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-[#120F0D] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.02] text-[#8C8478] font-bold uppercase tracking-wider">
                        <th className="py-3.5 px-4">User</th>
                        <th className="py-3.5 px-4">Role</th>
                        <th className="py-3.5 px-4">Subscription</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Joined Date</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-[#D4CDC5]">
                      {usersList.length > 0 ? (
                        usersList.map((u) => (
                          <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-white">{u.name}</div>
                              <div className="text-[11px] text-[#8C8478]">{u.email}</div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  u.role === 'ADMIN'
                                    ? 'bg-orange-500/10 text-[#FF8A00] border border-orange-500/20'
                                    : 'bg-white/5 text-[#8C8478]'
                                }`}
                              >
                                {u.role}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="text-[11px] font-semibold text-white">
                                {u.plan_name || 'Free Tier'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  u.is_active
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-red-500/10 text-red-400'
                                }`}
                              >
                                {u.is_active ? 'Active' : 'Suspended'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-[#8C8478]">
                              {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setEditingUser(u);
                                    setEditUserName(u.name);
                                    setEditUserEmail(u.email);
                                    setEditUserRole(u.role);
                                    setEditUserIsActive(u.is_active);
                                    setEditUserNewPassword('');
                                  }}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#FF8A00] transition-colors cursor-pointer"
                                  title="Edit User"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#8C8478]">
                            {loadingUsers ? 'Loading users from database...' : 'No users found.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 5: SUBSCRIPTIONS MANAGEMENT (Real database subscribers)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              {/* Filter */}
              <div className="flex items-center justify-between gap-4 bg-[#120F0D] border border-white/10 p-4 rounded-2xl">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-[#8C8478] uppercase tracking-wider">
                    Filter by Status:
                  </span>
                  {['ALL', 'ACTIVE', 'CANCELLED', 'EXPIRED'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setSubStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        subStatusFilter === st
                          ? 'bg-[#FF5C00] text-white'
                          : 'bg-white/5 text-[#8C8478] hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
                <div className="text-xs font-semibold text-emerald-400">
                  {subscriptionsList.length} Active Records
                </div>
              </div>

              {/* Subscriptions Table */}
              <div className="bg-[#120F0D] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.02] text-[#8C8478] font-bold uppercase tracking-wider">
                        <th className="py-3.5 px-4">Subscriber</th>
                        <th className="py-3.5 px-4">Plan Name</th>
                        <th className="py-3.5 px-4">Billing Rate</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4">Valid Until</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-[#D4CDC5]">
                      {subscriptionsList.length > 0 ? (
                        subscriptionsList.map((s) => (
                          <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-white">{s.user_name}</div>
                              <div className="text-[11px] text-[#8C8478]">{s.user_email}</div>
                            </td>
                            <td className="py-3.5 px-4 font-bold text-white">{s.plan_name}</td>
                            <td className="py-3.5 px-4 font-semibold text-emerald-400">₹{s.price_inr}</td>
                            <td className="py-3.5 px-4">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                  s.status === 'ACTIVE'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : 'bg-red-500/10 text-red-400 border-red-500/30'
                                }`}
                              >
                                {s.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-[#8C8478]">
                              {s.current_period_end
                                ? new Date(s.current_period_end).toLocaleDateString()
                                : '—'}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              {s.status === 'ACTIVE' ? (
                                <button
                                  onClick={() => handleUpdateSubscriptionStatus(s.id, 'CANCELLED')}
                                  className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold transition-colors cursor-pointer"
                                >
                                  Cancel Pass
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUpdateSubscriptionStatus(s.id, 'ACTIVE')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-bold transition-colors cursor-pointer"
                                >
                                  Activate
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#8C8478]">
                            {loadingSubscriptions
                              ? 'Loading subscriptions from database...'
                              : 'No subscription records found.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 6: PUSH NOTIFICATIONS & REMINDERS
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'notifications' && (
            <div className="space-y-8 max-w-4xl mx-auto">
              {/* Compose Card */}
              <div className="bg-[#120F0D] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#FF5C00]/10 border border-[#FF5C00]/25 flex items-center justify-center text-[#FF5C00]">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Broadcast Push Notification / Reminder</h3>
                    <p className="text-xs text-[#8C8478]">Send real-time alerts or reminders to platform viewers</p>
                  </div>
                </div>

                <form onSubmit={handleSendBroadcast} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                        Notification Type
                      </label>
                      <select
                        value={notifType}
                        onChange={(e) => setNotifType(e.target.value)}
                        className="w-full bg-[#1A1613] border border-white/15 rounded-xl px-4 py-3 text-xs text-white outline-none cursor-pointer"
                      >
                        <option value="PUSH">Direct Push Alert</option>
                        <option value="REMINDER">Watchlist / Premiere Reminder</option>
                        <option value="SYSTEM">System Announcement</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                        Target Audience
                      </label>
                      <select
                        value={notifAudience}
                        onChange={(e) => setNotifAudience(e.target.value)}
                        className="w-full bg-[#1A1613] border border-white/15 rounded-xl px-4 py-3 text-xs text-white outline-none cursor-pointer"
                      >
                        <option value="ALL">All Registered Users</option>
                        <option value="SUBSCRIBED">Active Paid Subscribers Only</option>
                        <option value="EXPIRED">Expired / Inactive Subscribers</option>
                        <option value="ADMINS">Administrators Only</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={notifTitle}
                      onChange={(e) => setNotifTitle(e.target.value)}
                      placeholder="e.g. New Premiere: Shadows of the Peak"
                      className="w-full bg-[#1A1613] border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-[#787065] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                      Message Body *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={notifMessage}
                      onChange={(e) => setNotifMessage(e.target.value)}
                      placeholder="Enter the push notification message..."
                      className="w-full bg-[#1A1613] border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-[#787065] outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                      Deep Link / Action URL (Optional)
                    </label>
                    <input
                      type="text"
                      value={notifActionUrl}
                      onChange={(e) => setNotifActionUrl(e.target.value)}
                      placeholder="/movies or /watch/shadows-of-the-peak"
                      className="w-full bg-[#1A1613] border border-white/15 rounded-xl px-4 py-3 text-sm text-white placeholder-[#787065] outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={notifSubmitting}
                    className="w-full py-3 px-6 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-[#FF5C00] to-[#E04800] hover:from-[#FF6B1A] hover:to-[#EB5505] shadow-[0_4px_25px_rgba(255,92,0,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{notifSubmitting ? 'Dispatching...' : 'Dispatch Push Alert to Users'}</span>
                  </button>
                </form>
              </div>

              {/* History Ledger */}
              <div className="bg-[#120F0D] border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  Notification Dispatch Ledger
                </h4>
                <div className="divide-y divide-white/5">
                  {notificationsList.length > 0 ? (
                    notificationsList.map((item) => (
                      <div key={item.id} className="py-3.5 flex items-start justify-between gap-4">
                        <div>
                          <div className="text-xs font-bold text-white">{item.title}</div>
                          <p className="text-[11px] text-[#8C8478] mt-0.5">{item.message}</p>
                          <div className="text-[10px] text-[#6E675D] mt-1 flex items-center gap-2">
                            <span>Audience: {item.target_audience}</span>
                            <span>•</span>
                            <span>{new Date(item.sent_at).toLocaleString()}</span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold shrink-0">
                          {item.recipients_count} Sent
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[#8C8478] py-4">No notifications dispatched yet.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              TAB 7: ACTIVE SESSIONS (Real-time devices from refresh_tokens)
             ═══════════════════════════════════════════════════════════════════ */}
          {activeTab === 'sessions' && (
            <div className="space-y-6 max-w-7xl mx-auto">
              <div className="bg-[#120F0D] border border-white/10 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Live Connected Client Devices</h3>
                  <p className="text-xs text-[#8C8478] mt-1">
                    Real active sessions with valid, unrevoked access tokens in PostgreSQL
                  </p>
                </div>
                <button
                  onClick={() => fetchSessions()}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold border border-white/10 transition-colors cursor-pointer"
                >
                  Refresh Devices
                </button>
              </div>

              <div className="bg-[#120F0D] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.02] text-[#8C8478] font-bold uppercase tracking-wider">
                        <th className="py-3.5 px-4">User</th>
                        <th className="py-3.5 px-4">Device Signature</th>
                        <th className="py-3.5 px-4">Signed In At</th>
                        <th className="py-3.5 px-4">Expires At</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-[#D4CDC5]">
                      {sessionsList.length > 0 ? (
                        sessionsList.map((s) => (
                          <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-white">{s.user_name}</div>
                              <div className="text-[11px] text-[#8C8478]">{s.user_email}</div>
                            </td>
                            <td className="py-3.5 px-4 font-mono text-[11px] text-[#A8A095]">
                              <span className="flex items-center gap-1.5">
                                {s.device_id.includes('android') || s.device_id.includes('mobile') ? (
                                  <Smartphone className="w-3.5 h-3.5 text-[#FF8A00]" />
                                ) : (
                                  <Laptop className="w-3.5 h-3.5 text-blue-400" />
                                )}
                                <span>{s.device_id}</span>
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-[#8C8478]">
                              {s.created_at ? new Date(s.created_at).toLocaleString() : '—'}
                            </td>
                            <td className="py-3.5 px-4 text-[#8C8478]">
                              {s.expires_at ? new Date(s.expires_at).toLocaleString() : '—'}
                            </td>
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => handleTerminateSession(s.id)}
                                className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold transition-colors cursor-pointer"
                              >
                                Disconnect
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-[#8C8478]">
                            {loadingSessions
                              ? 'Loading active devices from database...'
                              : 'No active device sessions found.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ─── MODALS ─────────────────────────────────────────────────────────── */}

      {/* 1. EDIT CONTENT MODAL */}
      {editingContent && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-[#120F0D] border border-white/15 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Edit Content Metadata</h3>
              <button
                type="button"
                onClick={() => setEditingContent(null)}
                className="text-[#8C8478] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditContent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-[#1A1613] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-[#1A1613] border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                    Type
                  </label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value)}
                    className="w-full bg-[#1A1613] border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="MOVIE">Movie</option>
                    <option value="SERIES">Series</option>
                    <option value="DOCUMENTARY">Documentary</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                    Year
                  </label>
                  <input
                    type="number"
                    value={editYear}
                    onChange={(e) => setEditYear(Number(e.target.value))}
                    className="w-full bg-[#1A1613] border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                    Runtime (Mins)
                  </label>
                  <input
                    type="number"
                    value={editDurationMinutes}
                    onChange={(e) => setEditDurationMinutes(Number(e.target.value))}
                    className="w-full bg-[#1A1613] border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                    Thumbnail URL
                  </label>
                  <input
                    type="url"
                    value={editThumbnailUrl}
                    onChange={(e) => setEditThumbnailUrl(e.target.value)}
                    className="w-full bg-[#1A1613] border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                    Backdrop URL
                  </label>
                  <input
                    type="url"
                    value={editBackdropUrl}
                    onChange={(e) => setEditBackdropUrl(e.target.value)}
                    className="w-full bg-[#1A1613] border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                  <input
                    type="checkbox"
                    checked={editIsPublished}
                    onChange={(e) => setEditIsPublished(e.target.checked)}
                    className="rounded border-white/20 text-[#FF5C00]"
                  />
                  <span>Published</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                  <input
                    type="checkbox"
                    checked={editIsFeatured}
                    onChange={(e) => setEditIsFeatured(e.target.checked)}
                    className="rounded border-white/20 text-[#FF5C00]"
                  />
                  <span>Featured Hero</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white">
                  <input
                    type="checkbox"
                    checked={editIsOriginal}
                    onChange={(e) => setEditIsOriginal(e.target.checked)}
                    className="rounded border-white/20 text-[#FF5C00]"
                  />
                  <span>V19Plus Original</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingContent(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8C8478] hover:text-white bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-[#FF5C00] hover:bg-[#FF6B1A] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. CREATE USER MODAL */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#120F0D] border border-white/15 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Register New User</h3>
              <button
                type="button"
                onClick={() => setShowCreateUserModal(false)}
                className="text-[#8C8478] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-[#1A1613] border border-white/15 rounded-xl px-4 py-3 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="rahul@example.com"
                  className="w-full bg-[#1A1613] border border-white/15 rounded-xl px-4 py-3 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                  Password * (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#1A1613] border border-white/15 rounded-xl px-4 py-3 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                  Role
                </label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full bg-[#1A1613] border border-white/15 rounded-xl px-4 py-3 text-sm text-white outline-none cursor-pointer"
                >
                  <option value="USER">User (Consumer)</option>
                  <option value="ADMIN">Admin (Console Access)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8C8478] hover:text-white bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createUserSubmitting}
                  className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-[#FF5C00] hover:bg-[#FF6B1A] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {createUserSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#120F0D] border border-white/15 rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white">Edit User: {editingUser.name}</h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-[#8C8478] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full bg-[#1A1613] border border-white/15 rounded-xl px-4 py-3 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={editUserEmail}
                  onChange={(e) => setEditUserEmail(e.target.value)}
                  className="w-full bg-[#1A1613] border border-white/15 rounded-xl px-4 py-3 text-sm text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                    Role
                  </label>
                  <select
                    value={editUserRole}
                    onChange={(e) => setEditUserRole(e.target.value)}
                    className="w-full bg-[#1A1613] border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="USER">USER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                    Status
                  </label>
                  <select
                    value={editUserIsActive ? 'active' : 'suspended'}
                    onChange={(e) => setEditUserIsActive(e.target.value === 'active')}
                    className="w-full bg-[#1A1613] border border-white/15 rounded-xl px-3 py-2 text-xs text-white outline-none cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#D4CDC5] mb-2">
                  Reset Password (Leave blank to keep existing)
                </label>
                <input
                  type="password"
                  value={editUserNewPassword}
                  onChange={(e) => setEditUserNewPassword(e.target.value)}
                  placeholder="New password (optional)"
                  className="w-full bg-[#1A1613] border border-white/15 rounded-xl px-4 py-3 text-sm text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#8C8478] hover:text-white bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateUserSubmitting}
                  className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-[#FF5C00] hover:bg-[#FF6B1A] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {updateUserSubmitting ? 'Saving...' : 'Save User Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
