import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { useDomainData } from '@/hooks/use-domain-data';

type FinancialStatus = 'todos' | 'pendente' | 'parcial' | 'pago';

type FinancialRow = {
  id: string;
  periciaId: string;
  fontePagamento: string;
  dataRecebimento: string;
  valorBruto: number;
  valorLiquido: number;
  status: Exclude<FinancialStatus, 'todos'>;
};

const getValue = (item: Record<string, string | number | undefined>, keys: string[]) => {
  for (const key of keys) {
    const value = item[key];
    if (value !== undefined && value !== null && String(value).trim()) return String(value);
  }
  return '';
};

const parseAmount = (value: string): number => {
  const normalized = value.replace('.', '').replace(',', '.').replace(/[^\d.-]/g, '');
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
};

const mapStatus = (item: Record<string, string | number | undefined>): FinancialRow['status'] => {
  const raw = getValue(item, ['status', 'paymentStatus']).toLowerCase();
  if (raw.includes('pag')) return 'pago';
  if (raw.includes('parc')) return 'parcial';
  return 'pendente';
};

const mapRow = (item: Record<string, string | number | undefined>, index: number): FinancialRow => ({
  id: getValue(item, ['id']) || `receb-${index}`,
  periciaId: getValue(item, ['periciaId']) || 'Sem vínculo',
  fontePagamento: getValue(item, ['fontePagamento', 'fonte']) || 'Não informado',
  dataRecebimento: getValue(item, ['dataRecebimento', 'createdAt']),
  valorBruto: parseAmount(getValue(item, ['valorBruto', 'valor'])),
  valorLiquido: parseAmount(getValue(item, ['valorLiquido'])),
  status: mapStatus(item),
});

const toMoney = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const toDate = (value: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('pt-BR');
};

const Page = () => {
  const { data = [], isLoading, isError } = useDomainData('relatorios-financeiros', '/financial/recebimentos');
  const [busca, setBusca] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [status, setStatus] = useState<FinancialStatus>('todos');

  const rows = useMemo(() => data.map(mapRow), [data]);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const matchesBusca =
          !busca || [row.periciaId, row.fontePagamento].some((value) => value.toLowerCase().includes(busca.toLowerCase()));
        const matchesStatus = status === 'todos' || row.status === status;
        const matchesPeriodo = !periodo || row.dataRecebimento.startsWith(periodo);
        return matchesBusca && matchesStatus && matchesPeriodo;
      }),
    [rows, busca, status, periodo],
  );

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Erro ao carregar recebimentos." />;

  return (
    <DomainPageTemplate
      description="Painel de análise e relatórios financeiros com visão consolidada dos recebimentos."
      isError={isError}
      isLoading={isLoading}
      items={data}
      renderItem={(item, index) => (
        <div className="rounded border p-2" key={index}>
          {Object.entries(item).map(([key, value]) => (
            <p className="text-sm" key={key}>
              <strong>{key}:</strong> {String(value ?? '-')}
            </p>
          ))}
        </div>
      </header>

      <Card className="grid gap-3 md:grid-cols-3">
        <Input onChange={(event) => setBusca(event.target.value)} placeholder="Buscar por perícia ou fonte" value={busca} />
        <Input onChange={(event) => setPeriodo(event.target.value)} type="date" value={periodo} />
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          onChange={(event) => setStatus(event.target.value as FinancialStatus)}
          value={status}
        >
          <option value="todos">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="parcial">Parcial</option>
          <option value="pago">Pago</option>
        </select>
      </Card>

      {filteredRows.length === 0 ? (
        <EmptyState title="Nenhum recebimento encontrado. Importar arquivo para iniciar." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-2 py-2 text-left">Perícia</th>
                  <th className="px-2 py-2 text-left">Fonte</th>
                  <th className="px-2 py-2 text-left">Data de recebimento</th>
                  <th className="px-2 py-2 text-left">Valor bruto</th>
                  <th className="px-2 py-2 text-left">Valor líquido</th>
                  <th className="px-2 py-2 text-left">Status</th>
                  <th className="px-2 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr className="border-b" key={row.id}>
                    <td className="px-2 py-2">{row.periciaId}</td>
                    <td className="px-2 py-2">{row.fontePagamento}</td>
                    <td className="px-2 py-2">{toDate(row.dataRecebimento)}</td>
                    <td className="px-2 py-2">{toMoney(row.valorBruto)}</td>
                    <td className="px-2 py-2">{toMoney(row.valorLiquido)}</td>
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
      title="Relatórios Financeiros"
    />
  );
};

export default Page;
