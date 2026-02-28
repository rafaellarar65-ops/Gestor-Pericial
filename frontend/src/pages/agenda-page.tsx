import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, Download, WandSparkles } from 'lucide-react';
import { toast } from 'sonner';
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
};

const getValue = (item: Record<string, string | number | undefined>, keys: string[]): string => {
  for (const key of keys) {
    const value = item[key];
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value);
    }
  }
  return '';
};

const toDateTime = (value: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR');
};

const inferStatus = (item: Record<string, string | number | undefined>): AgendaRow['status'] => {
  const raw = getValue(item, ['status', 'state']).toLowerCase();
  if (raw.includes('realiz')) return 'realizado';
  if (raw.includes('cancel')) return 'cancelado';
  return 'agendado';
};

const mapAgendaRow = (item: Record<string, string | number | undefined>, index: number): AgendaRow => ({
  id: getValue(item, ['id']) || `agenda-${index}`,
  titulo: getValue(item, ['title', 'titulo']) || 'Evento sem título',
  tipo: getValue(item, ['type', 'tipo']) || 'Não informado',
  inicio: getValue(item, ['startAt', 'inicio']),
  fim: getValue(item, ['endAt', 'fim']),
  local: getValue(item, ['location', 'local']) || 'Não informado',
  status: inferStatus(item),
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
    [rows, busca, status, periodo],
  );

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Erro ao carregar agenda." />;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Agenda</h1>
          <p className="text-sm text-muted-foreground">Gerencie eventos, horários e compromissos operacionais.</p>
        </div>
        <div className="flex gap-2">
          <select className="h-10 rounded-md border px-3 text-sm" value={pdfMode} onChange={(e) => setPdfMode(e.target.value as PdfMode)}>
            <option value="compacto">PDF compacto</option>
            <option value="detalhado">PDF detalhado</option>
          </select>
          <Button variant="outline" onClick={() => exportMutation.mutate()}>
            <Download className="mr-1 h-4 w-4" /> Exportar PDF
          </Button>
          <Button variant="outline" onClick={() => setAiOpen(true)}>
            <Bot className="mr-1 h-4 w-4" /> IA: Sugerir blocos de laudo
          </Button>
          <Button>Criar evento</Button>
        </div>
      </header>

      {workload && (
        <Card className="space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Alocado semana</p><p className="text-lg font-semibold">{workload.allocated_minutes} min</p></div>
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Janela semana</p><p className="text-lg font-semibold">{workload.work_window_minutes} min</p></div>
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Utilização</p><p className="text-lg font-semibold">{workload.utilization}%</p></div>
            <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Conflitos</p><p className="text-lg font-semibold">{workload.conflicts}</p></div>
          </div>
          <div className="grid gap-2 md:grid-cols-7">
            {workload.days.map((d) => (
              <div className="rounded-md border p-2" key={d.date}>
                <p className="text-xs font-medium">{new Date(`${d.date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short' })}</p>
                <p className="text-xs text-muted-foreground">{d.allocated_minutes}/{d.work_window_minutes} min</p>
                <div className="mt-1 h-2 rounded bg-muted"><div className={`h-2 rounded ${usageTone(d.utilization)}`} style={{ width: `${Math.min(d.utilization, 100)}%` }} /></div>
                <p className="mt-1 text-xs">{d.utilization}% {d.conflicts > 0 && `• ${d.conflicts} conflito(s)`}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="space-y-3">
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
        <Card><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b"><th className="px-2 py-2 text-left">Título</th><th className="px-2 py-2 text-left">Tipo</th><th className="px-2 py-2 text-left">Início</th><th className="px-2 py-2 text-left">Fim</th><th className="px-2 py-2 text-left">Local</th><th className="px-2 py-2 text-left">Status</th><th className="px-2 py-2 text-right">Ações</th></tr></thead><tbody>{filteredRows.map((row) => (<tr className="border-b" key={row.id}><td className="px-2 py-2">{row.titulo}</td><td className="px-2 py-2">{row.tipo}</td><td className="px-2 py-2">{toDateTime(row.inicio)}</td><td className="px-2 py-2">{toDateTime(row.fim)}</td><td className="px-2 py-2">{row.local}</td><td className="px-2 py-2 capitalize">{row.status}</td><td className="px-2 py-2 text-right"><Button size="sm" variant="outline">Editar</Button></td></tr>))}</tbody></table></div></Card>
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
