import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { Capacitor } from '@capacitor/core';
import { useAuthStore, getDeviceInfo } from '../store/authStore';

export const getBaseURL = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (Capacitor.isNativePlatform()) {
    return 'https://v19plus-official.onrender.com/api';
  }
  return '/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  // If sending FormData, delete Content-Type so browser sets multipart/form-data with boundary
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (config.headers) {
      delete config.headers['Content-Type'];
    }
  }

  let token = useAuthStore.getState().accessToken;
  if (!token && typeof window !== 'undefined') {
    token = localStorage.getItem('v19_access_token');
  }

  if (token) {
    config.headers = config.headers || {};
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
    url.includes('/auth/login') ||
    url.includes('/auth/signup') ||
    url.includes('/auth/refresh') ||
    url.includes('/auth/logout') ||
    url.includes('/auth/check-email')
  );

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: any) => {
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

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint(originalRequest?.url)) {
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
        const refreshToken =
          useAuthStore.getState().refreshToken ||
          (typeof window !== 'undefined' ? localStorage.getItem('v19_refresh_token') : null);

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const deviceInfo = getDeviceInfo();
        const response = await axios.post(
          `${getBaseURL()}/auth/refresh`,
          {
            refresh_token: refreshToken,
            device_id: deviceInfo?.deviceId || 'web_browser',
          },
          { withCredentials: true }
        );

        const newAccessToken = response.data.access_token;
        const newRefreshToken = response.data.refresh_token;

        useAuthStore.getState().setAccessToken(newAccessToken);
        if (typeof window !== 'undefined') {
          localStorage.setItem('v19_access_token', newAccessToken);
          if (newRefreshToken) {
            localStorage.setItem('v19_refresh_token', newRefreshToken);
          }
          const sec = window.location.protocol === 'https:' ? '; Secure' : '';
          document.cookie = `accessToken=${newAccessToken}; path=/; max-age=86400; SameSite=Lax${sec}`;
        }

        processQueue(null, newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError: any) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
