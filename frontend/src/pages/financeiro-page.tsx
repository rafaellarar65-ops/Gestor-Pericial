import { type ChangeEvent, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { ErrorState, LoadingState } from '@/components/ui/state';
import { configService } from '@/services/config-service';
import { financialService } from '@/services/financial-service';
import type { AnalyticsGranularity, AnalyticsPeriod, AnalyticsViewMode } from '@/types/api';

const VIEW_MODES: AnalyticsViewMode[] = ['FINANCE', 'PRODUCTION', 'WORKFLOW'];
const PERIODS: AnalyticsPeriod[] = ['YEAR', 'LAST_30', 'LAST_90', 'CUSTOM'];
const GRANULARITIES: AnalyticsGranularity[] = ['DAY', 'WEEK', 'MONTH'];

const parseSelectValues = (event: ChangeEvent<HTMLSelectElement>) =>
  Array.from(event.target.selectedOptions).map((option) => option.value);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function FinanceiroPage() {
  const [viewMode, setViewMode] = useState<AnalyticsViewMode>('FINANCE');
  const [period, setPeriod] = useState<AnalyticsPeriod>('YEAR');
  const [granularity, setGranularity] = useState<AnalyticsGranularity>('MONTH');
  const [cidadeIds, setCidadeIds] = useState<string[]>([]);
  const [statusIds, setStatusIds] = useState<string[]>([]);
  const [includeUnlinked, setIncludeUnlinked] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: cidades = [] } = useQuery({
    queryKey: ['config-cidades'],
    queryFn: () => configService.list('cidades'),
  });

  const { data: status = [] } = useQuery({
    queryKey: ['config-status'],
    queryFn: () => configService.list('status'),
  });

  const timelineQuery = useMemo(
    () => ({
      viewMode,
      period,
      granularity,
      cidadeIds,
      statusIds,
      includeUnlinked,
      ...(period === 'CUSTOM' && startDate && endDate ? { startDate, endDate } : {}),
    }),
    [viewMode, period, granularity, cidadeIds, statusIds, includeUnlinked, startDate, endDate],
  );

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['financial-timeline', timelineQuery],
    queryFn: () => financialService.analyticsTimeline(timelineQuery),
    enabled: period !== 'CUSTOM' || Boolean(startDate && endDate),
  });

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Analytics Financeiro</h1>
        <p className="text-sm text-muted-foreground">Modos: FINANCE, PRODUCTION e WORKFLOW com filtros globais de perícias.</p>
      </div>

      <section className="grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium">Modo</label>
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value as AnalyticsViewMode)} className="w-full rounded border px-2 py-2 text-sm">
            {VIEW_MODES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium">Período</label>
          <select value={period} onChange={(e) => setPeriod(e.target.value as AnalyticsPeriod)} className="w-full rounded border px-2 py-2 text-sm">
            {PERIODS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium">Granularidade</label>
          <select
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as AnalyticsGranularity)}
            className="w-full rounded border px-2 py-2 text-sm"
          >
            {GRANULARITIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium">Cidades (multi-select)</label>
          <select multiple value={cidadeIds} onChange={(e) => setCidadeIds(parseSelectValues(e))} className="h-28 w-full rounded border px-2 py-2 text-sm">
            {cidades.map((cidade) => (
              <option key={cidade.id} value={cidade.id}>
                {cidade.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium">Status (multi-select)</label>
          <select multiple value={statusIds} onChange={(e) => setStatusIds(parseSelectValues(e))} className="h-28 w-full rounded border px-2 py-2 text-sm">
            {status.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={includeUnlinked} onChange={(e) => setIncludeUnlinked(e.target.checked)} />
            Incluir não vinculados
          </label>

          {period === 'CUSTOM' && (
            <div className="grid gap-2">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded border px-2 py-2 text-sm" />
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded border px-2 py-2 text-sm" />
            </div>
          )}

          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? 'Atualizando...' : 'Atualizar análise'}
          </Button>
        </div>
      </section>

      {isLoading && <LoadingState />}
      {isError && <ErrorState message={(error as Error).message} />}

      {data && (
        <>
          <section className="grid gap-3 md:grid-cols-4">
            <div className="rounded border bg-white p-3 text-sm">Receita: <strong>{formatCurrency(data.totals.grossRevenue)}</strong></div>
            <div className="rounded border bg-white p-3 text-sm">Despesas: <strong>{formatCurrency(data.totals.expenses)}</strong></div>
            <div className="rounded border bg-white p-3 text-sm">Previsto por entrada: <strong>{formatCurrency(data.totals.forecastByEntry)}</strong></div>
            <div className="rounded border bg-white p-3 text-sm">Não vinculados: <strong>{formatCurrency(data.totals.unlinkedRevenue)}</strong></div>
          </section>

          <section className="overflow-x-auto rounded-xl border bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-3 py-2">Bucket</th>
                  <th className="px-3 py-2">Receita</th>
                  <th className="px-3 py-2">Despesa</th>
                  <th className="px-3 py-2">Previsto</th>
                  {includeUnlinked && <th className="px-3 py-2">Não vinculados</th>}
                  <th className="px-3 py-2">Entradas</th>
                  <th className="px-3 py-2">Saídas</th>
                  <th className="px-3 py-2">Ped. Esclarecimento</th>
                  <th className="px-3 py-2">Resp. Esclarecimento</th>
                </tr>
              </thead>
              <tbody>
                {data.series.map((row) => (
                  <tr key={row.bucketStart} className="border-t">
                    <td className="px-3 py-2">{row.label}</td>
                    <td className="px-3 py-2">{formatCurrency(row.finance.grossRevenue)}</td>
                    <td className="px-3 py-2">{formatCurrency(row.finance.expenses)}</td>
                    <td className="px-3 py-2">{formatCurrency(row.finance.forecastByEntry)}</td>
                    {includeUnlinked && <td className="px-3 py-2">{formatCurrency(row.finance.unlinkedRevenue)}</td>}
                    <td className="px-3 py-2">{row.production.entries}</td>
                    <td className="px-3 py-2">{row.production.exits}</td>
                    <td className="px-3 py-2">{row.workflow.clarificationRequests}</td>
                    <td className="px-3 py-2">{row.workflow.clarificationResponses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
