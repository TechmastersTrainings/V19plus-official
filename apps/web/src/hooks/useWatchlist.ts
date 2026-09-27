import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { watchlistApi } from '../api/watchlist';
import { useAuthStore } from '../store/authStore';

export function useWatchlist() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return useQuery({
    queryKey: ['watchlist'],
    queryFn: async () => (await watchlistApi.getAll()).data,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
}

export function useAddToWatchlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: watchlistApi.add,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });
}

export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: watchlistApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });
}
