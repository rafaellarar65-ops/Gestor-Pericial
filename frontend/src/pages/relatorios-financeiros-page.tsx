import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { useDomainData } from '@/hooks/use-domain-data';
import { financialService } from '@/services/financial-service';

type FinancialStatus = 'todos' | 'pendente' | 'parcial' | 'pago';
type FinancialRow = {
  id: string;
  periciaId: string;
  fontePagamento: string;
  dataRecebimento: string;
  dataVencimento?: string;
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
  dataVencimento: getValue(item, ['dataVencimento', 'vencimento', 'dueDate']) || undefined,
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
const getMonthKey = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Sem data' : date.toISOString().slice(0, 7);
};
const getRecebimentoValor = (row: FinancialRow) => row.valorLiquido || row.valorBruto;

const Page = () => {
  const { data = [], isLoading, isError } = useDomainData('relatorios-financeiros', '/financial/recebimentos');
  const { data: forecast } = useQuery({ queryKey: ['financial', 'revenue-forecast'], queryFn: financialService.revenueForecast });
  const { data: despesas = [], isError: hasDespesasError } = useQuery({ queryKey: ['financial', 'despesas'], queryFn: financialService.listDespesas });
  const [busca, setBusca] = useState('');
  const [periodo, setPeriodo] = useState('');
  const [status, setStatus] = useState<FinancialStatus>('todos');

  const rows = useMemo(() => data.map(mapRow), [data]);
  const filteredRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          (!busca || [row.periciaId, row.fontePagamento].some((value) => value.toLowerCase().includes(busca.toLowerCase()))) &&
          (status === 'todos' || row.status === status) &&
          (!periodo || row.dataRecebimento.startsWith(periodo)),
      ),
    [rows, busca, status, periodo],
  );

  const totalRecebido = useMemo(() => filteredRows.reduce((total, row) => total + getRecebimentoValor(row), 0), [filteredRows]);
  const totalDespesas = useMemo(
    () =>
      despesas
        .filter((despesa) => !periodo || despesa.dataCompetencia.startsWith(periodo))
        .reduce((total, despesa) => total + parseAmount(String(despesa.valor ?? 0)), 0),
    [despesas, periodo],
  );
  const resultadoLiquido = useMemo(() => totalRecebido - totalDespesas, [totalRecebido, totalDespesas]);
  const financialScore = useMemo(() => {
    if (totalRecebido <= 0) return 0;
    const margin = resultadoLiquido / totalRecebido;
    return Math.max(0, Math.min(100, Number((((margin + 1) / 2) * 100).toFixed(1))));
  }, [resultadoLiquido, totalRecebido]);

  const recebimentosPorMes = useMemo(() => {
    const grouped = filteredRows.reduce<Record<string, number>>((acc, row) => {
      const key = getMonthKey(row.dataRecebimento);
      acc[key] = (acc[key] ?? 0) + getRecebimentoValor(row);
      return acc;
    }, {});

    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({ month, total }));
  }, [filteredRows]);
  const maxRecebimentoMes = useMemo(() => Math.max(...recebimentosPorMes.map((item) => item.total), 1), [recebimentosPorMes]);

  const breakdownFonte = useMemo(
    () =>
      Object.values(
        filteredRows.reduce<Record<string, { fonte: string; count: number; total: number }>>((acc, row) => {
          const key = row.fontePagamento || 'Não informado';
          if (!acc[key]) acc[key] = { fonte: key, count: 0, total: 0 };
          acc[key].count += 1;
          acc[key].total += getRecebimentoValor(row);
          return acc;
        }, {}),
      ).sort((a, b) => b.total - a.total),
    [filteredRows],
  );

  const agingAnalysis = useMemo(() => {
    const today = new Date();
    const buckets: Record<'0-30' | '31-60' | '61-90' | '>90', { faixa: '0-30' | '31-60' | '61-90' | '>90'; count: number; total: number }> = {
      '0-30': { faixa: '0-30', count: 0, total: 0 },
      '31-60': { faixa: '31-60', count: 0, total: 0 },
      '61-90': { faixa: '61-90', count: 0, total: 0 },
      '>90': { faixa: '>90', count: 0, total: 0 },
    };

    filteredRows.forEach((row) => {
      const baseDate = row.dataVencimento || row.dataRecebimento;
      const refDate = new Date(baseDate);
      if (Number.isNaN(refDate.getTime())) return;

      const diffDays = Math.max(0, Math.floor((today.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24)));
      const value = getRecebimentoValor(row);

      if (diffDays <= 30) {
        buckets['0-30'].count += 1;
        buckets['0-30'].total += value;
      } else if (diffDays <= 60) {
        buckets['31-60'].count += 1;
        buckets['31-60'].total += value;
      } else if (diffDays <= 90) {
        buckets['61-90'].count += 1;
        buckets['61-90'].total += value;
      } else {
        buckets['>90'].count += 1;
        buckets['>90'].total += value;
      }
    });

    return Object.values(buckets);
  }, [filteredRows]);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Erro ao carregar recebimentos." />;

  const maxAcc = Math.max(...(forecast?.series.map((s) => s.accumulated) ?? [0]), 1);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Relatórios Financeiros</h1>
      <p className="text-sm text-muted-foreground">Painel de análise e relatórios financeiros com visão consolidada dos recebimentos.</p>

      {forecast && (
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">Previsão IA de receita (14 dias)</p>
              <p className="text-xl font-semibold">{toMoney(forecast.forecast_total)}</p>
              <p className="text-xs">Confiança: {forecast.confidence}</p>
            </div>
            <div className="text-xs">
              {forecast.signals.map((s) => (
                <p key={s}>• {s}</p>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            {forecast.series.map((point) => (
              <div className="flex items-center gap-2" key={point.date}>
                <span className="w-20 text-xs">{toDate(point.date)}</span>
                <div className="h-2 flex-1 rounded bg-muted">
                  <div className="h-2 rounded bg-emerald-500" style={{ width: `${(point.accumulated / maxAcc) * 100}%` }} />
                </div>
                <span className="w-24 text-right text-xs">{toMoney(point.accumulated)}</span>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground">Premissas: {forecast.assumptions.join(' • ')}</div>
        </Card>
      )}

      <Card className="grid gap-3 md:grid-cols-3">
        <Input onChange={(event) => setBusca(event.target.value)} placeholder="Buscar por perícia ou fonte" value={busca} />
        <Input onChange={(event) => setPeriodo(event.target.value)} type="date" value={periodo} />
        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" onChange={(event) => setStatus(event.target.value as FinancialStatus)} value={status}>
          <option value="todos">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="parcial">Parcial</option>
          <option value="pago">Pago</option>
        </select>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Card className="space-y-1 border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs text-emerald-700">Total Recebido</p>
          <p className="text-xl font-semibold text-emerald-900">{toMoney(totalRecebido)}</p>
        </Card>
        <Card className="space-y-1 border-red-200 bg-red-50 p-4">
          <p className="text-xs text-red-700">Total Despesas</p>
          <p className="text-xl font-semibold text-red-900">{toMoney(totalDespesas)}</p>
          {hasDespesasError && <p className="text-xs text-red-700">Endpoint de despesas indisponível (usando fallback: R$ 0,00).</p>}
        </Card>
        <Card className="space-y-1 p-4">
          <p className="text-xs text-muted-foreground">Resultado Líquido</p>
          <p className={`text-xl font-semibold ${resultadoLiquido >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{toMoney(resultadoLiquido)}</p>
        </Card>
        <Card className="space-y-1 p-4">
          <p className="text-xs text-muted-foreground">Financial Score</p>
          <p className="text-xl font-semibold">{financialScore.toFixed(1)}</p>
          <div className="h-2 rounded bg-muted">
            <div className="h-2 rounded bg-blue-500" style={{ width: `${financialScore}%` }} />
          </div>
        </Card>
      </div>

      <Card className="space-y-4 p-4">
        <h2 className="text-base font-semibold">Recebimentos por mês</h2>
        <div className="space-y-2">
          {recebimentosPorMes.length === 0 && <p className="text-sm text-muted-foreground">Sem dados no período selecionado.</p>}
          {recebimentosPorMes.map((item) => (
            <div className="space-y-1" key={item.month}>
              <div className="flex items-center justify-between text-xs">
                <span>{item.month}</span>
                <span>{toMoney(item.total)}</span>
              </div>
              <div className="h-3 rounded bg-muted">
                <div className="h-3 rounded bg-indigo-500" style={{ width: `${(item.total / maxRecebimentoMes) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="text-base font-semibold">Breakdown por Fonte</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-2 py-2 text-left">Fonte</th>
                <th className="px-2 py-2 text-right">Count</th>
                <th className="px-2 py-2 text-right">Total</th>
                <th className="px-2 py-2 text-right">%</th>
              </tr>
            </thead>
            <tbody>
              {breakdownFonte.map((item) => (
                <tr className="border-b" key={item.fonte}>
                  <td className="px-2 py-2">{item.fonte}</td>
                  <td className="px-2 py-2 text-right">{item.count}</td>
                  <td className="px-2 py-2 text-right">{toMoney(item.total)}</td>
                  <td className="px-2 py-2 text-right">{totalRecebido > 0 ? `${((item.total / totalRecebido) * 100).toFixed(1)}%` : '0.0%'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="text-base font-semibold">Aging Analysis</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-2 py-2 text-left">Faixa (dias)</th>
                <th className="px-2 py-2 text-right">Quantidade</th>
                <th className="px-2 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {agingAnalysis.map((item) => (
                <tr className="border-b" key={item.faixa}>
                  <td className="px-2 py-2">{item.faixa}</td>
                  <td className="px-2 py-2 text-right">{item.count}</td>
                  <td className="px-2 py-2 text-right">{toMoney(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
    </div>
  );
};

export default Page;
