import api from './axios';
import type { SiteSettings, Category } from './settings';

export interface DashboardStats {
  users: number;
  content: number;
  categories: number;
  watchHistory: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
  createdAt: string;
  subscription?: { plan: string; status: string };
}

export interface AdminContent {
  id: string;
  title: string;
  slug: string;
  description: string;
  type: string;
  genre: string[];
  tags: string[];
  releaseYear: number;
  rating: string;
  thumbnailUrl: string;
  backdropUrl: string;
  videoUrl?: string;
  isFeatured: boolean;
  isPublished: boolean;
}

export const adminApi = {
  dashboard: () => api.get<DashboardStats>('/admin/dashboard'),
  getSettings: () => api.get<SiteSettings>('/admin/settings'),
  updateSettings: (data: Partial<SiteSettings>) => api.put<SiteSettings>('/admin/settings', data),
  listCategories: () => api.get<Category[]>('/admin/categories'),
  createCategory: (data: Partial<Category>) => api.post<Category>('/admin/categories', data),
  updateCategory: (id: string, data: Partial<Category>) => api.put<Category>(`/admin/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/admin/categories/${id}`),
  listUsers: () => api.get<AdminUser[]>('/admin/users'),
  updateUserRole: (id: string, role: string) => api.put(`/admin/users/${id}/role`, { role }),
  listContent: () => api.get<AdminContent[]>('/admin/content'),
  createContent: (data: Partial<AdminContent>) => api.post('/admin/content', data),
  updateContent: (id: string, data: Partial<AdminContent>) => api.put(`/admin/content/${id}`, data),
  deleteContent: (id: string) => api.delete(`/admin/content/${id}`),
};
