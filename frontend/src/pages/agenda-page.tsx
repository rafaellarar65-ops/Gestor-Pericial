import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { useDomainData } from '@/hooks/use-domain-data';

type AgendaStatus = 'todos' | 'agendado' | 'realizado' | 'cancelado';

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

const Page = () => {
  const { data = [], isLoading, isError } = useDomainData('agenda', '/agenda/events');
  const [busca, setBusca] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [status, setStatus] = useState<AgendaStatus>('todos');

  const rows = useMemo(() => data.map(mapAgendaRow), [data]);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const matchesBusca =
          !busca ||
          [row.titulo, row.tipo, row.local].some((value) => value.toLowerCase().includes(busca.toLowerCase()));

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
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            onChange={(event) => setStatus(event.target.value as AgendaStatus)}
            value={status}
          >
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
      )}
    </div>
  );
};

export default Page;
