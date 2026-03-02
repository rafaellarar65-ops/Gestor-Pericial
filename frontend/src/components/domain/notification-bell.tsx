import { useEffect, useMemo, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, BellOff, CheckCheck, Circle, CircleCheck, CircleX, Info, TriangleAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { type NotificationItem, useNotifications } from '@/hooks/useNotifications';

const iconByType = (type: NotificationItem['tipo']) => {
  if (type === 'LAUDO_PENDENTE') return <TriangleAlert aria-label="Aviso" className="text-yellow-500" size={14} />;
  if (type === 'PRAZO_ESCLARECIMENTO') return <CircleX aria-label="Erro" className="text-red-500" size={14} />;
  if (type === 'RECEBIMENTO') return <CircleCheck aria-label="Sucesso" className="text-green-500" size={14} />;
  return <Info aria-label="Informação" className="text-blue-500" size={14} />;
};

type NotificationBellProps = { onClick?: () => void };

export const NotificationBell = ({ onClick }: NotificationBellProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { notificacoes, totalNaoLidas, isLoading, marcarComoLida, marcarTodasLidas } = useNotifications();
  const badgeLabel = useMemo(() => (totalNaoLidas > 99 ? '99+' : String(totalNaoLidas)), [totalNaoLidas]);

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutside);
    return () => document.removeEventListener('mousedown', closeOnOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button aria-label="Abrir notificações" className="rounded-full p-1 hover:bg-muted" onClick={() => setOpen((value) => !value)} type="button">
        <div className="relative">
          <Bell className="text-muted-foreground" size={18} />
          {totalNaoLidas > 0 ? <span className="absolute -right-2 -top-2 rounded-full bg-destructive px-1 text-[9px] font-bold text-white">{badgeLabel}</span> : null}
        </div>
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[340px] rounded-lg border bg-background shadow-lg">
          <div className="flex items-center justify-between border-b p-3">
            <p className="text-sm font-semibold">Notificações</p>
            <Button aria-label="Marcar todas como lidas" onClick={() => void marcarTodasLidas()} size="sm" type="button" variant="ghost"><CheckCheck size={14} /></Button>
          </div>
          <div className="max-h-96 overflow-y-auto p-2">
            {isLoading ? <p className="p-3 text-sm text-muted-foreground">Carregando...</p> : null}
            {!isLoading && notificacoes.length === 0 ? <p className="flex items-center gap-2 p-3 text-sm text-muted-foreground"><BellOff size={14} /> Nenhuma notificação</p> : null}
            {notificacoes.map((item) => (
              <button
                aria-label={`Abrir notificação ${item.titulo}`}
                className="mb-1 w-full rounded-md p-2 text-left hover:bg-muted"
                key={item.id}
                onClick={async () => {
                  await marcarComoLida(item.id);
                  setOpen(false);
                  navigate(item.link || '/');
                  onClick?.();
                }}
                type="button"
              >
                <div className="flex items-start gap-2">
                  {iconByType(item.tipo)}
                  <div className="flex-1">
                    <p className={`text-sm ${item.lida ? 'font-medium' : 'font-semibold'}`}>{item.titulo}</p>
                    <p className="text-xs text-muted-foreground">{item.subtexto}</p>
                    <p className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(item.criadaEm), { addSuffix: true, locale: ptBR })}</p>
                  </div>
                  {!item.lida ? <Circle className="fill-blue-500 text-blue-500" size={8} /> : null}
                </div>
              </button>
            ))}
          </div>
          <div className="border-t p-2 text-right">
            <Button aria-label="Ver todas as notificações" onClick={() => navigate('/notificacoes')} size="sm" type="button" variant="ghost">Ver todas as notificações</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
