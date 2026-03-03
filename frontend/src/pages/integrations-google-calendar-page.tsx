import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/state';
import { googleCalendarService } from '@/services/google-calendar-service';

const Page = () => {
  const queryClient = useQueryClient();

  const { data: status, isLoading } = useQuery({
    queryKey: ['google-calendar-status'],
    queryFn: googleCalendarService.getStatus,
  });

  const { data: calendars = [] } = useQuery({
    queryKey: ['google-calendars'],
    queryFn: googleCalendarService.listCalendars,
  });

  const { data: audit = [] } = useQuery({
    queryKey: ['google-sync-audit'],
    queryFn: () => googleCalendarService.listSyncAudit(),
  });

  const connectMutation = useMutation({
    mutationFn: googleCalendarService.connectOAuth,
    onSuccess: (data) => {
      window.open(data.authUrl, '_blank', 'noopener,noreferrer');
      toast.success('Fluxo OAuth iniciado.');
    },
    onError: () => toast.error('Não foi possível iniciar OAuth Google.'),
  });

  const settingsMutation = useMutation({
    mutationFn: googleCalendarService.updateSyncSettings,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] });
      toast.success('Configurações atualizadas.');
    },
  });

  const selectCalendarMutation = useMutation({
    mutationFn: ({ calendarId, calendarName }: { calendarId: string; calendarName?: string }) =>
      googleCalendarService.selectCalendar(calendarId, calendarName),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] });
      toast.success('Calendário de destino atualizado.');
    },
  });

  const syncMutation = useMutation({
    mutationFn: (direction: 'push' | 'pull') => googleCalendarService.sync(direction),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ['google-sync-audit'] });
      void queryClient.invalidateQueries({ queryKey: ['google-calendar-status'] });
      toast.success(`Sync ${data.direction.toUpperCase()} executado: ${data.synced} itens e ${data.conflicts} conflitos.`);
    },
    onError: () => toast.error('Falha ao executar sincronização.'),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ logId, resolution }: { logId: string; resolution: 'LOCAL' | 'EXTERNAL' }) =>
      googleCalendarService.resolveConflict(logId, resolution),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['google-sync-audit'] });
      toast.success('Conflito resolvido.');
    },
  });

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Google Calendar</h1>
        <p className="text-sm text-muted-foreground">Gerencie OAuth, calendário destino, modo de sync e conflitos.</p>
      </header>

      <Card className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => connectMutation.mutate()} variant="outline">
            Conectar OAuth Google
          </Button>
          <Button onClick={() => syncMutation.mutate('push')}>Sync Push</Button>
          <Button onClick={() => syncMutation.mutate('pull')} variant="outline">
            Sync Pull
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center justify-between rounded border p-3 text-sm">
            <span>Sync de eventos</span>
            <input
              checked={status?.syncEvents ?? true}
              onChange={(event) => settingsMutation.mutate({ syncEvents: event.target.checked })}
              type="checkbox"
            />
          </label>
          <label className="flex items-center justify-between rounded border p-3 text-sm">
            <span>Sync de tarefas</span>
            <input
              checked={status?.syncTasks ?? false}
              onChange={(event) => settingsMutation.mutate({ syncTasks: event.target.checked })}
              type="checkbox"
            />
          </label>
          <label className="flex items-center justify-between rounded border p-3 text-sm">
            <span>Integração ativa</span>
            <input
              checked={status?.active ?? false}
              onChange={(event) => settingsMutation.mutate({ active: event.target.checked })}
              type="checkbox"
            />
          </label>
          <label className="rounded border p-3 text-sm">
            <span className="mb-1 block">Modo de sincronização</span>
            <select
              className="h-9 w-full rounded border px-2"
              onChange={(event) => settingsMutation.mutate({ mode: event.target.value as 'MIRROR' | 'TWO_WAY' })}
              value={status?.mode ?? 'MIRROR'}
            >
              <option value="MIRROR">Espelho</option>
              <option value="TWO_WAY">2-way</option>
            </select>
          </label>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block">Calendário destino</span>
          <select
            className="h-10 w-full rounded border px-2"
            onChange={(event) => {
              const selected = calendars.find((item) => item.id === event.target.value);
              if (selected) selectCalendarMutation.mutate({ calendarId: selected.id, calendarName: selected.summary });
            }}
            value={status?.selectedCalendarId ?? ''}
          >
            <option value="">Selecione...</option>
            {calendars.map((calendar) => (
              <option key={calendar.id} value={calendar.id}>
                {calendar.summary}
              </option>
            ))}
          </select>
        </label>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Erros e Conflitos</h2>
        <div className="space-y-2">
          {audit.filter((item) => item.status === 'ERROR' || item.status === 'CONFLICT').map((item) => (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded border p-2 text-sm" key={item.id}>
              <div>
                <p className="font-medium">{item.localEntity} #{item.localEntityId.slice(0, 8)}</p>
                <p className="text-muted-foreground">{item.message ?? item.status}</p>
              </div>
              {item.status === 'CONFLICT' && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => resolveMutation.mutate({ logId: item.id, resolution: 'LOCAL' })}>
                    Resolver (Local)
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => resolveMutation.mutate({ logId: item.id, resolution: 'EXTERNAL' })}>
                    Resolver (Externo)
                  </Button>
                </div>
              )}
            </div>
          ))}
          {audit.filter((item) => item.status === 'ERROR' || item.status === 'CONFLICT').length === 0 && (
            <p className="text-sm text-muted-foreground">Sem erros ou conflitos no momento.</p>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Page;
