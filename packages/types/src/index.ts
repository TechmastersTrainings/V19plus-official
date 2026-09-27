export interface Role {
  id: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  googleId?: string | null;
  supabaseId?: string | null;
  name: string;
  avatarUrl?: string | null;
  isVerified: boolean;
  role: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  subscription?: Subscription | null;
  profiles?: Profile[];
  devices?: Device[];
  notifications?: Notification[];
}

export interface Profile {
  id: string;
  userId: string;
  name: string;
  avatarColor: string;
  isKids: boolean;
  pin?: string | null;
  createdAt: Date | string;
}

export interface RefreshToken {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date | string;
  createdAt: Date | string;
}

export type ContentType = 'MOVIE' | 'SERIES' | 'DOCUMENTARY';

export interface Content {
  id: string;
  title: string;
  slug: string;
  description: string;
  type: ContentType;
  releaseYear: number;
  rating: string;
  imdbScore?: number | null;
  duration?: number | null;
  thumbnailUrl: string;
  backdropUrl: string;
  videoUrl?: string | null;
  rawVideoUrl?: string | null;
  hlsUrl?: string | null;
  bunnyVideoGuid?: string | null;
  status?: 'processing' | 'ready' | 'failed' | string;
  trailerUrl?: string | null;
  isOriginal: boolean;
  isFeatured: boolean;
  isPublished: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  genres: string[];
  tags: string[];
  seasons?: Season[];
  cast?: CastMember[];
  reviews?: Review[];
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
}

export interface Season {
  id: string;
  contentId: string;
  number: number;
  title?: string | null;
  episodes?: Episode[];
}

export interface Episode {
  id: string;
  seasonId: string;
  number: number;
  title: string;
  description?: string | null;
  duration: number;
  thumbnailUrl?: string | null;
  videoUrl: string;
  rawVideoUrl?: string | null;
  hlsUrl?: string | null;
  bunnyVideoGuid?: string | null;
  status?: 'processing' | 'ready' | 'failed' | string;
  createdAt: Date | string;
}

export interface CastMember {
  id: string;
  contentId: string;
  name: string;
  role: string;
  photoUrl?: string | null;
}

export interface WatchHistory {
  id: string;
  userId: string;
  contentId: string;
  content?: Content;
  episodeId?: string | null;
  episode?: Episode | null;
  entryKey: string;
  progress: number;
  completed: boolean;
  watchedAt: Date | string;
  updatedAt: Date | string;
}

export interface Watchlist {
  id: string;
  userId: string;
  contentId: string;
  content?: Content;
  addedAt: Date | string;
}

export interface SiteSettings {
  id: string;
  siteName: string;
  tagline: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor: string;
  footerText: string;
  updatedAt: Date | string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date | string;
}

export type SubscriptionPlan = 'BASIC' | 'STANDARD' | 'PREMIUM';

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan | string;
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  currentPeriodStart: Date | string;
  currentPeriodEnd: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Payment {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | string;
  provider: 'STRIPE' | 'RAZORPAY' | string;
  transactionId: string;
  createdAt: Date | string;
}

export interface Review {
  id: string;
  userId: string;
  user?: User;
  contentId: string;
  rating: number;
  comment: string;
  createdAt: Date | string;
}

export interface Device {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: 'MOBILE' | 'WEB' | 'SMART_TV' | string;
  ipAddress: string;
  lastUsedAt: Date | string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date | string;
}
