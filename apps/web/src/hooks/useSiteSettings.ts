import { useQuery } from '@tanstack/react-query';
import { settingsApi } from '../api/settings';

export function useSiteSettings() {
  return useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => (await settingsApi.get()).data,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await settingsApi.getCategories()).data,
    staleTime: 5 * 60 * 1000,
  });
}
