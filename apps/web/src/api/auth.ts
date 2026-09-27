import api from './axios';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
  isVerified?: boolean;
  subscription?: {
    plan: string;
    status: string;
    currentPeriodEnd: string;
  };
}

export interface GoogleConfigStatus {
  configured: boolean;
  clientIdPreview: string | null;
  hasClientSecret: boolean;
  redirectUri: string;
  formatValid: boolean;
}

export const authApi = {
  checkEmail: (email: string) =>
    api.post<{ exists: boolean }>('/auth/check-email', { email }),
  login: (email: string, password?: string, passwordHash?: string, deviceInfo?: any) =>
    api.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', { email, password, passwordHash, ...deviceInfo }),
  signup: (email: string, password?: string, passwordHash?: string, name?: string, deviceInfo?: any) =>
    api.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/signup', { email, password, passwordHash, name, ...deviceInfo }),
  supabaseLogin: (accessToken: string) =>
    api.post<{ user: User; accessToken: string }>('/auth/supabase', { accessToken }),
  adminLogin: (email: string, password: string, deviceInfo?: any) =>
    api.post<{ user: User; accessToken: string; refreshToken: string }>('/auth/login', { email, password, ...deviceInfo }),
  logout: () => api.post('/auth/logout'),
  refresh: (deviceInfo?: any) => api.post<{ accessToken: string }>('/auth/refresh', deviceInfo || {}),
  me: () => api.get<User>('/auth/me'),
};
