import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

type NotificationBellProps = {
  onClick?: () => void;
};

export const NotificationBell = ({ onClick }: NotificationBellProps) => {
  const unreadQuery = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const { data } = await apiClient.get<{ unread?: number; count?: number }>('/notifications/unread-count');
      return data.unread ?? data.count ?? 0;
    },
    refetchInterval: 60_000,
  });

  const unreadCount = unreadQuery.data ?? 0;

  return (
    <button className="rounded-full p-1 hover:bg-muted" onClick={onClick} title="Notificações">
      <div className="relative">
        <Bell size={18} className="text-muted-foreground" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </div>
    </button>
  );
};
