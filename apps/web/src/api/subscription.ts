import api from './axios';

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_inr_paise: number;
  billing_interval: 'monthly' | 'yearly' | string;
  max_resolution: string;
  max_concurrent_streams: number;
  // Fallbacks / optional helpers
  price?: number;
  currency?: string;
  screens?: number;
  quality?: string;
  features?: string[];
}

export interface UserSubscription {
  id: string;
  plan: Plan;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
}

export interface CreateOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  plan_name: string;
}

export const subscriptionApi = {
  getPlans: () => api.get<Plan[]>('/subscription/plans'),
  getCurrent: () => api.get<UserSubscription | null>('/subscription/current'),
  createOrder: (planId: string) =>
    api.post<CreateOrderResponse>('/subscription/razorpay/order', { plan_id: planId }),
  verifyPayment: (data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    plan_id: string;
  }) => api.post('/subscription/razorpay/verify', data),
  checkout: (plan: string) => api.post<{ url: string; demo?: boolean }>('/subscription/checkout', { plan }),
  cancel: () => api.post('/subscription/cancel'),
};

