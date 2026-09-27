import api from './axios';

export interface UserSubscription {
  id?: string;
  plan_id?: string;
  plan_name?: string;
  status: string;
  current_period_end?: string;
  currentPeriodEnd?: string;
  max_resolution?: string;
  max_concurrent_streams?: number;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  full_name?: string;
  displayName?: string;
  role: string;
  avatarUrl?: string;
  avatar_url?: string;
  photoURL?: string;
  phoneNumber?: string;
  isVerified?: boolean;
  is_verified?: boolean;
  isActive?: boolean;
  is_active?: boolean;
  active_subscription?: UserSubscription;
  subscription?: {
    plan: string;
    status: string;
    currentPeriodEnd?: string;
  };
  createdAt?: string;
  created_at?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in_seconds: number;
  user: User;
}

export const authApi = {
  checkEmail: (email: string) =>
    api.post<{ exists: boolean }>('/auth/check-email', { email }),

  login: (email: string, password?: string, deviceInfo?: any) =>
    api.post<TokenResponse>('/auth/login', {
      email,
      password: password || '',
      device_id: deviceInfo?.deviceId || deviceInfo?.device_id || 'web_browser',
      device_name: deviceInfo?.deviceName || 'Web Browser',
      device_type: deviceInfo?.deviceType || 'WEB',
    }),

  signup: (email: string, password?: string, name?: string, deviceInfo?: any) =>
    api.post<User>('/auth/signup', {
      email,
      password: password || '',
      name: name || 'User',
      device_id: deviceInfo?.deviceId || deviceInfo?.device_id || 'web_browser',
      device_name: deviceInfo?.deviceName || 'Web Browser',
      device_type: deviceInfo?.deviceType || 'WEB',
    }),

  logout: () => api.post('/auth/logout'),

  refresh: (refreshToken?: string, deviceId?: string) =>
    api.post<TokenResponse>('/auth/refresh', {
      refresh_token: refreshToken || '',
      device_id: deviceId || 'web_browser',
    }),

  me: () => api.get<User>('/auth/me'),
};
