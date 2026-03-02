import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/use-notifications';

type NotificationBellProps = {
  onClick?: () => void;
};

const toRelativeTime = (dateIso: string) => {
  const date = new Date(dateIso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));

  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min atrás`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;

  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
};

export const NotificationBell = ({ onClick }: NotificationBellProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    marcarComoLida,
    marcarTodasLidas,
    isMarkingAll,
    isMarkingOne,
  } = useNotifications();

  const recentNotifications = useMemo(
    () => [...notifications].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8),
    [notifications],
  );

  const openNotification = async (id: string, href?: string | null) => {
    await marcarComoLida(id);
    setOpen(false);
    if (href) {
      navigate(href);
      return;
    }
    onClick?.();
  };

  return (
    <div className="relative">
      <button
        className="rounded-full p-1 hover:bg-muted"
        onClick={() => setOpen((prev) => !prev)}
        title="Notificações"
        type="button"
      >
        <div className="relative">
          <Bell size={18} className="text-muted-foreground" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </div>
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-96 max-w-[90vw] rounded-md border bg-popover p-2 shadow-lg">
          <div className="mb-2 flex items-center justify-between px-2">
            <p className="text-sm font-semibold">Notificações</p>
            <button
              className="text-xs font-medium text-primary disabled:opacity-50"
              disabled={unreadCount === 0 || isMarkingAll}
              onClick={() => void marcarTodasLidas()}
              type="button"
            >
              Marcar todas como lidas
            </button>
          </div>

          {recentNotifications.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">Sem notificações recentes.</p>
          ) : (
            <div className="max-h-96 space-y-1 overflow-y-auto">
              {recentNotifications.map((item) => {
                const isRead = Boolean(item.readAt);
                return (
                  <button
                    className="block w-full rounded-md px-2 py-2 text-left hover:bg-muted"
                    key={item.id}
                    onClick={() => void openNotification(item.id, item.href)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{item.title}</p>
                      {!isRead ? <span className="mt-1 h-2 w-2 rounded-full bg-blue-500" /> : null}
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{item.message}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{toRelativeTime(item.createdAt)}</p>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-2 border-t pt-2">
            <button
              className="w-full rounded-md px-2 py-1.5 text-sm font-medium text-primary hover:bg-muted"
              disabled={isMarkingOne}
              onClick={() => {
                setOpen(false);
                navigate('/tarefas');
              }}
              type="button"
            >
              Ver todas
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
