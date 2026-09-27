import axios from 'axios';
import { auth } from '../utils/firebase';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  withCredentials: true,
});

let accessToken: string | null = null;

export function setAdminToken(token: string | null) {
  accessToken = token;
}

api.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined' && auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      }
    } catch (e) {}
  }

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    const isAuthCall = original?.url?.includes('/auth/refresh') || original?.url?.includes('/auth/login') || original?.url?.includes('/auth/firebase');
    if (err.response?.status === 401 && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        if (typeof window !== 'undefined' && auth.currentUser) {
          const freshToken = await auth.currentUser.getIdToken(true);
          accessToken = freshToken;
          original.headers.Authorization = `Bearer ${freshToken}`;
          return api(original);
        }
        const { data } = await api.post('/auth/refresh');
        accessToken = data.accessToken;
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (refreshErr) {
        accessToken = null;
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(err);
  }
);

export default api;
