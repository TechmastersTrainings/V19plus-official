import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  withCredentials: true,
});

let accessToken: string | null =
  typeof window !== 'undefined' ? localStorage.getItem('v19_admin_token') : null;

export function setAdminToken(token: string | null) {
  accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('v19_admin_token', token);
    } else {
      localStorage.removeItem('v19_admin_token');
    }
  }
}

api.interceptors.request.use(async (config) => {
  if (!accessToken && typeof window !== 'undefined') {
    accessToken = localStorage.getItem('v19_admin_token');
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
    const isAuthCall =
      original?.url?.includes('/auth/refresh') ||
      original?.url?.includes('/auth/login');
    if (err.response?.status === 401 && !original._retry && !isAuthCall) {
      original._retry = true;
      try {
        const { data } = await api.post('/auth/refresh');
        const token = (data as any).access_token || (data as any).accessToken;
        setAdminToken(token);
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (refreshErr) {
        setAdminToken(null);
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(err);
  }
);

export default api;
