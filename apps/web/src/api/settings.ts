import api from './axios';

export interface SiteSettings {
  id: string;
  siteName: string;
  tagline: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  footerText: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
}

export const settingsApi = {
  get: () => api.get<SiteSettings>('/settings'),
  getCategories: () => api.get<Category[]>('/categories'),
};
