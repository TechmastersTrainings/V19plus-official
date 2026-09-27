import { useMutation, useQueryClient } from '@tanstack/react-query';
import { historyApi } from '../api/history';

export function useUpsertHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: historyApi.upsert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['continue'] });
    },
  });
}
