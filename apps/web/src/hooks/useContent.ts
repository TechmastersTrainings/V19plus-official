import { useQuery } from '@tanstack/react-query';
import { contentApi } from '../api/content';
import { useAuthStore } from '../store/authStore';

export function useFeatured() {
  return useQuery({
    queryKey: ['featured'],
    queryFn: async () => (await contentApi.featured()).data,
    staleTime: 5 * 60 * 1000,
  });
}

export function useTrending() {
  return useQuery({
    queryKey: ['trending'],
    queryFn: async () => (await contentApi.trending()).data,
    staleTime: 10 * 60 * 1000,
  });
}

export function useOriginals() {
  return useQuery({
    queryKey: ['originals'],
    queryFn: async () => (await contentApi.originals()).data,
    staleTime: 10 * 60 * 1000,
  });
}

export function useContent(slug: string) {
  return useQuery({
    queryKey: ['content', slug],
    queryFn: async () => (await contentApi.getBySlug(slug)).data,
    enabled: !!slug,
  });
}

export function useContinueWatching() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['continue'],
    queryFn: async () => (await contentApi.continueWatching()).data,
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
  });
}

export function useRecommended() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['recommended'],
    queryFn: async () => (await contentApi.recommended()).data,
    enabled: isAuthenticated,
    staleTime: 10 * 60 * 1000,
  });
}

export function useBrowse(type?: string, genre?: string) {
  return useQuery({
    queryKey: ['browse', type, genre],
    queryFn: async () => (await contentApi.list({ type, genre, limit: 40 })).data,
  });
}
