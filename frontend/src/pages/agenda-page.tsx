import { useMemo, useState } from 'react';
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

const toCsvValue = (value: string) => `"${value.replaceAll('"', '""')}"`;

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

  const handleExportAgenda = () => {
    const header = ['Título', 'Tipo', 'Início', 'Fim', 'Local', 'Status'];
    const csvLines = [header, ...filteredRows.map((row) => [row.titulo, row.tipo, row.inicio, row.fim, row.local, row.status])]
      .map((line) => line.map((value) => toCsvValue(value || '—')).join(';'));

    const filtroDescricao = [`busca=${busca || 'todos'}`, `status=${status}`, `periodo=${periodo || 'todos'}`].join(',');
    const csvContent = [`"Filtros";"${filtroDescricao}"`, ...csvLines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.setAttribute('download', `agenda-${periodo || 'completa'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
          <Button onClick={handleExportAgenda} variant="outline">Exportar agenda</Button>
          <Button>Criar evento</Button>
        </div>
      </header>

      <Card className="space-y-3">
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
              <thead>
                <tr className="border-b">
                  <th className="px-2 py-2 text-left">Título</th>
                  <th className="px-2 py-2 text-left">Tipo</th>
                  <th className="px-2 py-2 text-left">Início</th>
                  <th className="px-2 py-2 text-left">Fim</th>
                  <th className="px-2 py-2 text-left">Local</th>
                  <th className="px-2 py-2 text-left">Status</th>
                  <th className="px-2 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr className="border-b" key={row.id}>
                    <td className="px-2 py-2">{row.titulo}</td>
                    <td className="px-2 py-2">{row.tipo}</td>
                    <td className="px-2 py-2">{toDateTime(row.inicio)}</td>
                    <td className="px-2 py-2">{toDateTime(row.fim)}</td>
                    <td className="px-2 py-2">{row.local}</td>
                    <td className="px-2 py-2 capitalize">{row.status}</td>
                    <td className="px-2 py-2 text-right">
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
