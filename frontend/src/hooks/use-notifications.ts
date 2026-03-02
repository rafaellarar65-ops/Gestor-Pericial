import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  readAt?: string | null;
  href?: string | null;
  type?: string | null;
};

const POLLING_INTERVAL = 60_000;

const mapNotification = (item: Partial<AppNotification> & Record<string, unknown>): AppNotification => ({
  id: String(item.id ?? ''),
  title: String(item.title ?? item.type ?? 'Notificação'),
  message: String(item.message ?? ''),
  createdAt: String(item.createdAt ?? new Date().toISOString()),
  readAt: (item.readAt as string | null | undefined) ?? null,
  href: (item.href as string | null | undefined) ?? null,
  type: (item.type as string | null | undefined) ?? null,
});

export const useNotifications = () => {
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ items?: Array<Partial<AppNotification> & Record<string, unknown>>; notifications?: Array<Partial<AppNotification> & Record<string, unknown>> }>('/notifications');
      const items = data.items ?? data.notifications ?? [];
      return items.map(mapNotification).filter((item) => item.id);
    },
    refetchInterval: POLLING_INTERVAL,
  });

  const unreadCountQuery = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ unread?: number; count?: number }>('/notifications/unread-count');
      return data.unread ?? data.count ?? 0;
    },
    refetchInterval: POLLING_INTERVAL,
  });

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] }),
    ]);
  };

  const marcarComoLidaMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => void refresh(),
  });

  const marcarTodasLidasMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/notifications/read-all');
    },
    onSuccess: () => void refresh(),
  });

  return {
    notifications: notificationsQuery.data ?? [],
    unreadCount: unreadCountQuery.data ?? 0,
    isLoading: notificationsQuery.isLoading || unreadCountQuery.isLoading,
    isError: notificationsQuery.isError || unreadCountQuery.isError,
    refetch: refresh,
    marcarComoLida: (id: string) => marcarComoLidaMutation.mutateAsync(id),
    marcarTodasLidas: () => marcarTodasLidasMutation.mutateAsync(),
    isMarkingOne: marcarComoLidaMutation.isPending,
    isMarkingAll: marcarTodasLidasMutation.isPending,
  };
};
