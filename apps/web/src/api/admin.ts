import api from './axios';

export interface R2StorageStats {
  bucket_name: string;
  total_objects: number;
  total_size_bytes: number;
  total_size_gb: number;
  total_size_mb: number;
  hls_segments_count: number;
  master_manifests_count: number;
  master_videos_count: number;
  other_files_count?: number;
  recent_uploads: {
    key: string;
    size_mb: number;
    size_bytes: number;
    last_modified: string;
  }[];
  cdn_endpoint: string;
  last_scanned_at: string;
  connected?: boolean;
}

export interface ContentBreakdown {
  movies: number;
  series: number;
  documentaries: number;
  published: number;
  draft: number;
}

export interface DashboardStats {
  total_users: number;
  active_users: number;
  total_content: number;
  active_subscriptions: number;
  total_revenue_inr: number;
  total_revenue_paise: number;
  recent_users: {
    id: string;
    email: string;
    name: string;
    role: string;
    created_at?: string;
  }[];
  recent_payments: {
    id: string;
    amount_inr: number;
    status: string;
    created_at?: string;
    user_id?: string;
  }[];
  r2_storage?: R2StorageStats;
  content_breakdown?: ContentBreakdown;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  plan_name?: string | null;
  subscription_status?: string | null;
}

export interface AdminSubscription {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  plan_name: string;
  plan_slug: string;
  price_inr: number;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  created_at: string;
}

export interface ActiveSession {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  device_id: string;
  created_at: string;
  expires_at: string;
  revoked: boolean;
}

export interface NotificationRecord {
  id: string;
  title: string;
  message: string;
  target_audience: string;
  action_url?: string | null;
  notification_type: string;
  sent_at: string;
  sent_by: string;
  recipients_count: number;
}

export interface BroadcastNotificationRequest {
  title: string;
  message: string;
  target_audience?: 'ALL' | 'SUBSCRIBED' | 'EXPIRED' | 'ADMINS' | string;
  action_url?: string;
  notification_type?: 'PUSH' | 'REMINDER' | 'SYSTEM' | string;
}

export const adminApi = {
  // Live Dashboard Stats
  dashboard: () => api.get<DashboardStats>('/admin/dashboard'),
  getR2Storage: () => api.get<R2StorageStats>('/admin/r2-storage'),

  // Users CRUD
  listUsers: (params?: { query?: string; role?: string; limit?: number; offset?: number }) =>
    api.get<AdminUser[]>('/admin/users', { params }),
  createUser: (data: { email: string; name: string; password: string; role?: string; is_active?: boolean }) =>
    api.post<AdminUser>('/admin/users', data),
  updateUser: (id: string, data: Partial<AdminUser> & { password?: string }) =>
    api.put<AdminUser>(`/admin/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),

  // Subscriptions
  listSubscriptions: (params?: { status_filter?: string }) =>
    api.get<AdminSubscription[]>('/admin/subscriptions', { params }),
  updateSubscription: (
    id: string,
    data: { status?: string; current_period_end?: string; cancel_at_period_end?: boolean }
  ) => api.put(`/admin/subscriptions/${id}`, data),

  // Active Sessions / Devices
  listActiveSessions: () => api.get<ActiveSession[]>('/admin/active-sessions'),
  terminateSession: (id: string) => api.delete(`/admin/active-sessions/${id}`),

  // Push Notifications & Reminders
  getNotifications: () => api.get<NotificationRecord[]>('/admin/notifications'),
  broadcastNotification: (data: BroadcastNotificationRequest) =>
    api.post<NotificationRecord>('/admin/notifications/broadcast', data),
};
