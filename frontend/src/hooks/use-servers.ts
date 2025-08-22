import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchServers, fetchServerStatus, MCPServer, ServerStatus } from '@/lib/api';

export const useServers = () => {
  return useQuery<MCPServer[]>({
    queryKey: ['servers'],
    queryFn: fetchServers,
  });
};

export const useServerStatus = (serverId: string) => {
  return useQuery<ServerStatus>({
    queryKey: ['server-status', serverId],
    queryFn: () => fetchServerStatus(serverId),
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};

export const useServerMetrics = (serverId: string, period: '24h' | '7d' | '30d' = '24h') => {
  return useQuery({
    queryKey: ['server-metrics', serverId, period],
    queryFn: () => fetchServerStatus(serverId), // Using status as a fallback for now
    // In a real app, we would have a separate metrics endpoint
  });
};

export const useAllServerStatuses = () => {
  const { data: servers } = useServers();
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ['all-server-statuses'],
    queryFn: async () => {
      if (!servers) return [];
      
      const statusPromises = servers.map(server => 
        queryClient.fetchQuery({
          queryKey: ['server-status', server.id],
          queryFn: () => fetchServerStatus(server.id),
        })
      );
      
      return Promise.all(statusPromises);
    },
    enabled: !!servers,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};
