import api from './axios';

export interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  screens: number;
  quality: string;
  features: string[];
}

export const subscriptionApi = {
  getPlans: () => api.get<Plan[]>('/subscription/plans'),
  getCurrent: () => api.get('/subscription/current'),
  checkout: (plan: string) => api.post<{ url: string; demo?: boolean }>('/subscription/checkout', { plan }),
  cancel: () => api.post('/subscription/cancel'),
};
