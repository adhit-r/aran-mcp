import { useMutation, useQueryClient } from '@tanstack/react-query';
import { removeServer as removeServerApi } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

export function useServerActions() {
  const queryClient = useQueryClient();

  const removeServerMutation = useMutation({
    mutationFn: removeServerApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servers'] });
      queryClient.invalidateQueries({ queryKey: ['serverStatuses'] });
    },
    onError: (error) => {
      console.error('Failed to remove server:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove server. Please try again.',
        variant: 'destructive',
      });
    },
  });

  return {
    removeServer: removeServerMutation.mutateAsync,
    isRemoving: removeServerMutation.isPending,
  };
}
