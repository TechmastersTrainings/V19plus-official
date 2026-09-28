import { create } from 'zustand';
import { authApi, type AuthResponse } from '../api/admin';
import { setAdminToken } from '../api/axios';

interface AdminAuthState {
  user: AuthResponse['user'] | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  adminLogin: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAdminAuthStore = create<AdminAuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  adminLogin: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.adminLogin(email, password);
      const token = (data as any).access_token || (data as any).accessToken;
      setAdminToken(token);
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch {}
    setAdminToken(null);
    set({ user: null, isAuthenticated: false, isLoading: false });
  },

  fetchMe: async () => {
    set({ isLoading: true });
    try {
      const { data } = await authApi.me();
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      setAdminToken(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
