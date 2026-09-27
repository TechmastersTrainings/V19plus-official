import axios from 'axios';
import { Capacitor } from '@capacitor/core';
import { useAuthStore, getDeviceInfo } from '../store/authStore';
import { auth } from '../utils/firebase';

const getBaseURL = () => {
  if (Capacitor.isNativePlatform()) {
    return 'https://v19plus-api.onrender.com/api';
  }
  return process.env.NEXT_PUBLIC_API_URL || '/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  try {
    if (typeof window !== 'undefined') {
      let fbUser = auth.currentUser;
      if (!fbUser && auth.authStateReady) {
        await auth.authStateReady();
        fbUser = auth.currentUser;
      }
      if (fbUser) {
        const token = await fbUser.getIdToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          return config;
        }
      }
    }
  } catch (e) {}

  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: unknown) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

const isAuthEndpoint = (url?: string) =>
  !!url && (
    url.includes('/auth/refresh') ||
    url.includes('/auth/google') ||
    url.includes('/auth/logout') ||
    url.includes('/admin/auth/login') ||
    url.includes('/auth/admin-login') ||
    url.includes('/auth/google/url') ||
    url.includes('/auth/google/callback') ||
    url.includes('/auth/google/status')
  );

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (originalRequest && error.response?.status === 429) {
      originalRequest._retryCount = originalRequest._retryCount || 0;
      if (originalRequest._retryCount < 3) {
        originalRequest._retryCount += 1;
        const delay = 1000 * Math.pow(2, originalRequest._retryCount) + Math.random() * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return api(originalRequest);
      }
    }

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint(originalRequest.url)) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        if (typeof window !== 'undefined' && auth.currentUser) {
          const freshToken = await auth.currentUser.getIdToken(true);
          useAuthStore.getState().setAccessToken(freshToken);
          processQueue(null, freshToken);
          originalRequest.headers.Authorization = `Bearer ${freshToken}`;
          return api(originalRequest);
        }
      } catch (refreshError: any) {
        processQueue(refreshError, null);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
