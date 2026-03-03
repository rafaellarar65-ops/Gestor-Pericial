import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { useDomainData } from '@/hooks/use-domain-data';
import { agendaService } from '@/services/agenda-service';

type AgendaStatus = 'todos' | 'agendado' | 'realizado' | 'cancelado';
type PdfMode = 'compacto' | 'detalhado';

type AgendaRow = {
  id: string;
  titulo: string;
  tipo: string;
  inicio: string;
  fim: string;
  local: string;
  status: Exclude<AgendaStatus, 'todos'>;
  syncStatus: 'PENDING' | 'SYNCED' | 'WARNING' | 'CONFLICT' | 'ERROR';
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const inferStatus = (item: AgendaEvent): AgendaStatusFilter => {
  const raw = String((item as AgendaEvent & { status?: string }).status ?? '').toLowerCase();
  if (raw.includes('realiz')) return 'realizado';
  if (raw.includes('cancel')) return 'cancelado';
  return 'agendado';
};


const syncIndicator = (status: AgendaRow['syncStatus']) => {
  if (status === 'SYNCED') return '✅';
  if (status === 'CONFLICT') return '🔀';
  if (status === 'WARNING' || status === 'ERROR') return '⚠️';
  return '⏳';
};

const mapAgendaRow = (item: Record<string, string | number | undefined>, index: number): AgendaRow => ({
  id: getValue(item, ['id']) || `agenda-${index}`,
  titulo: getValue(item, ['title', 'titulo']) || 'Evento sem título',
  tipo: getValue(item, ['type', 'tipo']) || 'Não informado',
  inicio: getValue(item, ['startAt', 'inicio']),
  fim: getValue(item, ['endAt', 'fim']),
  local: getValue(item, ['location', 'local']) || 'Não informado',
  status: inferStatus(item),
  syncStatus: (getValue(item, ['syncStatus', 'sync_status']).toUpperCase() as AgendaRow['syncStatus']) || 'PENDING',
});

const usageTone = (value: number) => (value > 95 ? 'bg-red-500' : value > 85 ? 'bg-amber-500' : 'bg-emerald-500');

const Page = () => {
  const queryClient = useQueryClient();
  const { data = [], isLoading, isError } = useDomainData('agenda', '/agenda/events');
  const [busca, setBusca] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [status, setStatus] = useState<AgendaStatus>('todos');
  const [pdfMode, setPdfMode] = useState<PdfMode>('compacto');
  const [aiOpen, setAiOpen] = useState(false);
  const [aiForm, setAiForm] = useState({ avg: '90', backlog: '6', windows: '09:00,14:00', buffer: '45' });

  const { data: workload } = useQuery({
    queryKey: ['agenda', 'weekly-workload', periodo],
    queryFn: () => agendaService.weeklyWorkload(periodo || undefined),
  });

  const exportMutation = useMutation({
    mutationFn: () => agendaService.exportWeeklyPdf(pdfMode, periodo || undefined),
    onSuccess: (file) => {
      const blob = new Blob([Uint8Array.from(atob(file.contentBase64), (c) => c.charCodeAt(0))], { type: file.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF semanal exportado.');
    },
    onError: () => toast.error('Não foi possível exportar PDF.'),
  });

  const suggestMutation = useMutation({ mutationFn: agendaService.suggestLaudoBlocks });

  const applyMutation = useMutation({
    mutationFn: agendaService.applyLaudoBlocks,
    onSuccess: (result) => {
      toast.success(`${result.created} blocos de laudo criados.`);
      queryClient.invalidateQueries({ queryKey: ['agenda'] });
      queryClient.invalidateQueries({ queryKey: ['agenda', 'weekly-workload'] });
      setAiOpen(false);
    },
    onError: () => toast.error('Falha ao aplicar blocos sugeridos.'),
  });

  const rows = useMemo(() => data.map(mapAgendaRow), [data]);
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const matchesBusca = !busca || [row.titulo, row.tipo, row.local].some((value) => value.toLowerCase().includes(busca.toLowerCase()));
        const matchesStatus = status === 'todos' || row.status === status;
        const matchesPeriodo = !periodo || row.inicio.startsWith(periodo);
        return matchesBusca && matchesStatus && matchesPeriodo;
      }),
    [rows, search, status, dateFilter, locationFilter],
  );

  const overlappingIds = useMemo(() => {
    const ids = new Set<string>();
    filteredRows.forEach((row) => {
      if (isOverlapping(row, filteredRows)) ids.add(row.id);
    });
    return ids;
  }, [filteredRows]);

  const selectedEvent = useMemo(
    () => (selectedEventId ? filteredRows.find((item) => item.id === selectedEventId) ?? null : null),
    [selectedEventId, filteredRows],
  );

  const currentDateLabel = useMemo(() => {
    if (view === 'day') return currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    const end = addDays(currentDate, 6);
    return `${currentDate.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`;
  }, [currentDate, view]);

  const savePatch = (id: string, payload: Partial<AgendaSheetEvent>) => updateEventMutation.mutate({ id, payload });

  const handleCalendarEventChange = (id: string, startAt: string, endAt: string) => {
    const current = filteredRows.find((item) => item.id === id);
    if (!current) return;
    const candidate = { ...current, startAt, endAt };

    if (isOverlapping(candidate, filteredRows)) {
      setPendingUpdate({ id, startAt, endAt });
      return;
    }

    savePatch(id, { startAt, endAt });
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Erro ao carregar agenda." />;

  return (
    <div className="space-y-4">
      <header className="rounded-xl border bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CalendarDays className="text-red-500" size={20} />
            <h1 className="text-2xl font-semibold text-slate-900">Agenda Geral</h1>
          </div>

          <div className="flex items-center gap-2 rounded-lg border px-2 py-1">
            <button className="rounded p-1 hover:bg-slate-100" type="button"><ChevronLeft size={16} /></button>
            <button className="rounded-md bg-slate-100 px-3 py-1 text-sm" type="button">Hoje</button>
            <button className="rounded p-1 hover:bg-slate-100" type="button"><ChevronRight size={16} /></button>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 text-sm">
            <button className="rounded-md px-3 py-1.5 text-slate-600" type="button">Mês</button>
            <button className="rounded-md bg-white px-3 py-1.5 font-semibold text-red-600" type="button">Semana</button>
            <button className="rounded-md px-3 py-1.5 text-slate-600" type="button">Lista</button>
          </div>
        </div>
      </header>

      <Card className="space-y-3 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Input onChange={(event) => setBusca(event.target.value)} placeholder="Buscar por título, tipo ou local" value={busca} />
          <Input onChange={(event) => setPeriodo(event.target.value)} type="date" value={periodo} />
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" onChange={(event) => setStatus(event.target.value as AgendaStatus)} value={status}>
            <option value="todos">Todos os status</option>
            <option value="agendado">Agendado</option>
            <option value="realizado">Realizado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </Card>

      {filteredRows.length === 0 ? (
        <EmptyState title="Nenhum evento encontrado. Criar primeiro registro." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b">
                  <th className="px-3 py-3">Título</th>
                  <th className="px-3 py-3">Tipo</th>
                  <th className="px-3 py-3">Início</th>
                  <th className="px-3 py-3">Fim</th>
                  <th className="px-3 py-3">Local</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr className="border-b" key={row.id}>
                    <td className="px-3 py-3">{row.titulo}</td>
                    <td className="px-3 py-3">{row.tipo}</td>
                    <td className="px-3 py-3">{toDateTime(row.inicio)}</td>
                    <td className="px-3 py-3">{toDateTime(row.fim)}</td>
                    <td className="px-3 py-3">{row.local}</td>
                    <td className="px-3 py-3 capitalize">{row.status}</td>
                    <td className="px-3 py-3 text-right">
                      <Button size="sm" variant="outline">
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <TimeGridCalendar
          currentDate={currentDate}
          events={filteredRows}
          onEventChange={handleCalendarEventChange}
          onSelectEvent={setSelectedEventId}
          overlappingIds={overlappingIds}
          view={view}
        />
      )}

      <Dialog open={aiOpen} onClose={() => setAiOpen(false)} title="IA: Sugerir blocos de laudo">
        <div className="space-y-3">
          <Input value={aiForm.avg} onChange={(e) => setAiForm((p) => ({ ...p, avg: e.target.value }))} placeholder="Média min/laudo" />
          <Input value={aiForm.backlog} onChange={(e) => setAiForm((p) => ({ ...p, backlog: e.target.value }))} placeholder="Backlog" />
          <Input value={aiForm.windows} onChange={(e) => setAiForm((p) => ({ ...p, windows: e.target.value }))} placeholder="Janelas preferidas (09:00,14:00)" />
          <Input value={aiForm.buffer} onChange={(e) => setAiForm((p) => ({ ...p, buffer: e.target.value }))} placeholder="Buffer mínimo (min)" />
          <Button
            variant="outline"
            onClick={() =>
              suggestMutation.mutate({
                startDate: periodo || undefined,
                avg_minutes_per_laudo: Number(aiForm.avg),
                backlog: Number(aiForm.backlog),
                preferred_windows: aiForm.windows.split(',').map((s) => s.trim()).filter(Boolean),
                min_buffer_minutes: Number(aiForm.buffer),
              })
            }
          >
            <WandSparkles className="mr-1 h-4 w-4" /> Gerar preview
          </Button>
          {suggestMutation.data?.suggestions?.length ? (
            <div className="space-y-2">
              {suggestMutation.data.suggestions.map((s, idx) => (
                <div className="rounded border p-2 text-sm" key={`${s.startAt}-${idx}`}>
                  <p className="font-medium">{s.title} {s.conflict && <span className="text-red-600">(conflito)</span>}</p>
                  <p>{toDateTime(s.startAt)} → {toDateTime(s.endAt)}</p>
                </div>
              ))}
              <Button onClick={() => applyMutation.mutate(suggestMutation.data!.suggestions.map((s) => ({ title: s.title, startAt: s.startAt, endAt: s.endAt })))}>
                Aplicar sugestões
              </Button>
            </div>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
};

export default Page;
