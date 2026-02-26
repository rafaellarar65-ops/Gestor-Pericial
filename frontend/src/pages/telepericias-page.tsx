import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { useDomainData } from '@/hooks/use-domain-data';

type TeleStatus = 'todos' | 'available' | 'booked' | 'blocked';

type TeleRow = {
  id: string;
  inicio: string;
  fim: string;
  status: Exclude<TeleStatus, 'todos'>;
  plataforma: string;
  link: string;
  periciaId: string;
};

const getValue = (item: Record<string, string | number | undefined>, keys: string[]) => {
  for (const key of keys) {
    const value = item[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value);
  }
  return '';
};

const mapStatus = (item: Record<string, string | number | undefined>): TeleRow['status'] => {
  const status = getValue(item, ['status']).toLowerCase();
  if (status === 'booked') return 'booked';
  if (status === 'blocked') return 'blocked';
  return 'available';
};

const mapRow = (item: Record<string, string | number | undefined>, index: number): TeleRow => ({
  id: getValue(item, ['id']) || `slot-${index}`,
  inicio: getValue(item, ['startAt', 'inicio']),
  fim: getValue(item, ['endAt', 'fim']),
  status: mapStatus(item),
  plataforma: getValue(item, ['platform', 'plataforma']) || 'Não informado',
  link: getValue(item, ['meetingUrl', 'link']),
  periciaId: getValue(item, ['periciaId']) || 'Sem vínculo',
});

const toDateTime = (value: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR');
};

const Page = () => {
  const { data = [], isLoading, isError } = useDomainData('telepericias', '/telepericia/slots');
  const [busca, setBusca] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [status, setStatus] = useState<TeleStatus>('todos');

  const rows = useMemo(() => data.map(mapRow), [data]);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const matchesBusca =
          !busca ||
          [row.periciaId, row.plataforma, row.link].some((value) => value.toLowerCase().includes(busca.toLowerCase()));
        const matchesStatus = status === 'todos' || row.status === status;
        const matchesPeriodo = !periodo || row.inicio.startsWith(periodo);
        return matchesBusca && matchesStatus && matchesPeriodo;
      }),
    [rows, busca, status, periodo],
  );

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Erro ao carregar slots de teleperícia." />;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Teleperícias</h1>
          <p className="text-sm text-muted-foreground">Controle de slots e confirmações de atendimento remoto.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Exportar slots</Button>
          <Button>Criar slot</Button>
        </div>
      </header>

      <Card className="grid gap-3 md:grid-cols-3">
        <Input onChange={(event) => setBusca(event.target.value)} placeholder="Buscar por perícia, plataforma ou link" value={busca} />
        <Input onChange={(event) => setPeriodo(event.target.value)} type="date" value={periodo} />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          onChange={(event) => setStatus(event.target.value as TeleStatus)}
          value={status}
        >
          <option value="todos">Todos os status</option>
          <option value="available">Disponível</option>
          <option value="booked">Reservado</option>
          <option value="blocked">Bloqueado</option>
        </select>
      </Card>

      {filteredRows.length === 0 ? (
        <EmptyState title="Sem slots cadastrados. Criar primeiro registro." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filteredRows.map((row) => (
            <Card className="space-y-2" key={row.id}>
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Slot {row.id}</h3>
                <span className="text-xs uppercase text-muted-foreground">{row.status}</span>
              </div>
              <p className="text-sm"><strong>Início:</strong> {toDateTime(row.inicio)}</p>
              <p className="text-sm"><strong>Fim:</strong> {toDateTime(row.fim)}</p>
              <p className="text-sm"><strong>Plataforma:</strong> {row.plataforma}</p>
              <p className="text-sm"><strong>Perícia:</strong> {row.periciaId}</p>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline">Editar</Button>
                <Button size="sm">Reservar</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Page;
