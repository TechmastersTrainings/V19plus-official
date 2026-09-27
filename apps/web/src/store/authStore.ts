import { create } from 'zustand';
import { authApi, User as ApiUser, TokenResponse } from '../api/auth';

export interface User {
  id: string;
  uid: string;
  email: string | null;
  name: string;
  displayName: string | null;
  phoneNumber?: string | null;
  role: string;
  avatarUrl?: string;
  photoURL?: string | null;
  isVerified?: boolean;
  subscription?: {
    plan: string;
    status: string;
    currentPeriodEnd: string;
  };
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  _initialized: boolean;
  hydrateFromStorage: () => void;
  checkEmail: (email: string) => Promise<boolean>;
  login: (email: string, password?: string) => Promise<void>;
  signup: (email: string, password?: string, name?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setAccessToken: (token: string) => void;
  setUser: (user: User | null) => void;
  hasActiveSubscription: () => boolean;
  isAdmin: () => boolean;
}

export const getDeviceInfo = () => {
  if (typeof window === 'undefined') {
    return { deviceId: 'server_env', deviceName: 'Server', deviceType: 'WEB' };
  }
  let deviceId = localStorage.getItem('v19_device_id');
  if (!deviceId) {
    deviceId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2, 15);
    localStorage.setItem('v19_device_id', deviceId);
  }
  return {
    deviceId,
    deviceName: typeof navigator !== 'undefined' ? (navigator.userAgent.split(' ')[0] || 'Web Browser') : 'Web Browser',
    deviceType: 'WEB',
  };
};

function normalizeUser(apiUser: any): User {
  const name =
    apiUser.full_name ||
    apiUser.name ||
    apiUser.displayName ||
    (apiUser.email ? apiUser.email.split('@')[0] : 'User');
  const avatar = apiUser.avatar_url || apiUser.avatarUrl || apiUser.photoURL || undefined;
  const role = (apiUser.role || 'USER').toUpperCase();

  const sub = apiUser.active_subscription || apiUser.subscription;
  const subscription = sub
    ? {
        plan: sub.plan_name || sub.plan || 'Free',
        status: sub.status || 'active',
        currentPeriodEnd: sub.current_period_end || sub.currentPeriodEnd || '',
      }
    : undefined;

  return {
    id: String(apiUser.id || apiUser.uid || ''),
    uid: String(apiUser.id || apiUser.uid || ''),
    email: apiUser.email || null,
    name,
    displayName: name,
    phoneNumber: apiUser.phoneNumber || apiUser.phone_number || null,
    role,
    avatarUrl: avatar,
    photoURL: avatar || null,
    isVerified: Boolean(apiUser.is_verified ?? apiUser.isVerified ?? true),
    subscription,
  };
}

function persistTokens(accessToken: string, refreshToken: string, user: User) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('v19_access_token', accessToken);
    localStorage.setItem('v19_refresh_token', refreshToken);
    localStorage.setItem('v19_user', JSON.stringify(user));
    localStorage.setItem('v19_cached_user', JSON.stringify(user));

    const sec = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `accessToken=${accessToken}; path=/; max-age=86400; SameSite=Lax${sec}`;
    document.cookie = `refreshToken=${refreshToken}; path=/; max-age=2592000; SameSite=Lax${sec}`;
  } catch (err) {
    console.warn('[authStore] Failed to persist tokens:', err);
  }
}

function clearPersistedTokens() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('v19_access_token');
    localStorage.removeItem('v19_refresh_token');
    localStorage.removeItem('v19_user');
    localStorage.removeItem('v19_cached_user');
    sessionStorage.removeItem('v19_active_profile');
    localStorage.removeItem('v19_active_profile');

    document.cookie = 'accessToken=; Max-Age=0; path=/';
    document.cookie = 'refreshToken=; Max-Age=0; path=/';
    document.cookie = 'v19_active_profile_id=; Max-Age=0; path=/';
  } catch (err) {
    console.warn('[authStore] Failed to clear tokens:', err);
  }
}

const getInitialState = () => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  _initialized: false,
});

export const useAuthStore = create<AuthState>((set, get) => {
  const initial = getInitialState();

  return {
    user: initial.user,
    accessToken: initial.accessToken,
    refreshToken: initial.refreshToken,
    isAuthenticated: initial.isAuthenticated,
    isLoading: initial.isLoading,
    _initialized: initial._initialized,

    hydrateFromStorage: () => {
      if (typeof window === 'undefined') return;
      try {
        const accessToken = localStorage.getItem('v19_access_token');
        const refreshToken = localStorage.getItem('v19_refresh_token');
        const cachedUser = localStorage.getItem('v19_user') || localStorage.getItem('v19_cached_user');
        const user = cachedUser ? JSON.parse(cachedUser) : null;

        if (accessToken && user) {
          set({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            _initialized: true,
          });
          return;
        }
      } catch (e) {}

      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        _initialized: true,
      });
    },

    setAccessToken: (token) => {
      set({ accessToken: token });
      if (typeof window !== 'undefined') {
        localStorage.setItem('v19_access_token', token);
      }
    },

    setUser: (user) => {
      set({ user });
      if (typeof window !== 'undefined' && user) {
        localStorage.setItem('v19_user', JSON.stringify(user));
      }
    },

    hasActiveSubscription: () => true,

    isAdmin: () => get().user?.role === 'ADMIN',

    checkEmail: async (email: string) => {
      try {
        const { data } = await authApi.checkEmail(email);
        return data.exists;
      } catch (err) {
        console.error('[authStore] checkEmail error:', err);
        return false;
      }
    },

    login: async (email: string, password = '') => {
      set({ isLoading: true });
      try {
        const deviceInfo = getDeviceInfo();
        const { data } = await authApi.login(email.trim(), password, deviceInfo);
        set({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
        });
        if (typeof window !== 'undefined') {
          localStorage.setItem('v19_access_token', data.access_token);
          localStorage.setItem('v19_refresh_token', data.refresh_token);
        }

        let rawUser = (data as any).user;
        if (!rawUser) {
          const meRes = await authApi.me();
          rawUser = meRes.data;
        }
        const normalized = normalizeUser(rawUser);
        persistTokens(data.access_token, data.refresh_token, normalized);

        set({
          user: normalized,
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          isAuthenticated: true,
          isLoading: false,
          _initialized: true,
        });
      } catch (err) {
        set({ isLoading: false });
        throw err;
      }
    },

    signup: async (email: string, password = '', name?: string) => {
      set({ isLoading: true });
      try {
        const deviceInfo = getDeviceInfo();
        await authApi.signup(email.trim(), password, name?.trim(), deviceInfo);
        // Automatically login after signup
        await get().login(email, password);
      } catch (err) {
        set({ isLoading: false });
        throw err;
      }
    },

    loginWithGoogle: async () => {
      throw new Error('Google OAuth is handled via backend OAuth flow.');
    },

    adminLogin: async (email: string, password: string) => {
      await get().login(email, password);
    },

    logout: async () => {
      try {
        await authApi.logout();
      } catch (err) {
        console.warn('[authStore] logout warning:', err);
      } finally {
        clearPersistedTokens();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
          _initialized: true,
        });
      }
    },

    refresh: async () => {
      const state = get();
      const refreshToken = state.refreshToken || (typeof window !== 'undefined' ? localStorage.getItem('v19_refresh_token') : null);
      if (!refreshToken) return;

      try {
        const deviceInfo = getDeviceInfo();
        const { data } = await authApi.refresh(refreshToken, deviceInfo.deviceId);
        set({
          accessToken: data.access_token,
          refreshToken: data.refresh_token || refreshToken,
        });
        if (typeof window !== 'undefined') {
          localStorage.setItem('v19_access_token', data.access_token);
          if (data.refresh_token) {
            localStorage.setItem('v19_refresh_token', data.refresh_token);
          }
        }
      } catch (err) {
        console.warn('[authStore] refresh token failed, logging out:', err);
        await get().logout();
      }
    },

    fetchMe: async () => {
      const state = get();
      if (!state.accessToken && typeof window !== 'undefined') {
        const token = localStorage.getItem('v19_access_token');
        if (token) state.setAccessToken(token);
      }

      try {
        const { data } = await authApi.me();
        const normalized = normalizeUser(data);
        get().setUser(normalized);
      } catch (err) {
        console.warn('[authStore] fetchMe failed:', err);
      }
    },
  };
});

// Auto-validate session on client mount after hydration
if (typeof window !== 'undefined') {
  setTimeout(() => {
    useAuthStore.getState().hydrateFromStorage();
    const token = localStorage.getItem('v19_access_token');
    if (token) {
      useAuthStore.getState().fetchMe().catch(() => {});
    }
  }, 0);
}

export function useAuth() {
  const store = useAuthStore();
  return {
    ...store,
    loading: store.isLoading,
  };
}
