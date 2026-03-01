import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  ANALYTICS_CALENDAR_LAYERS,
  ANALYTICS_EVENT_TYPE_COLORS,
  type AnalyticsCalendarLayer,
  type AnalyticsCalendarOverviewResponse,
} from '@/types/api';

type ViewMode = 'MES' | 'TIMELINE';

const LAYER_LABELS: Record<AnalyticsCalendarLayer, string> = {
  OPERACIONAL: 'Operacional',
  PRODUCAO: 'Produção',
  LAUDOS: 'Laudos',
  ESCLARECIMENTOS: 'Esclarecimentos',
  FINANCEIRO_PRODUCAO_RECEBIMENTO: 'Financeiro Produção/Recebimento',
};

const formatCurrency = (value: number | null) =>
  value === null
    ? '—'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 }).format(value);

const formatDateTime = (value: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR');
};

const monthValueFromDate = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

const AnalyticsCalendarPage = () => {
  const [layer, setLayer] = useState<AnalyticsCalendarLayer>('OPERACIONAL');
  const [mode, setMode] = useState<ViewMode>('MES');
  const [month, setMonth] = useState(monthValueFromDate(new Date()));

  const period = useMemo(() => {
    const [yearStr, monthStr] = month.split('-');
    const year = Number(yearStr);
    const monthIndex = Number(monthStr) - 1;
    const from = new Date(Date.UTC(year, monthIndex, 1));
    const to = new Date(Date.UTC(year, monthIndex + 1, 0));
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
  }, [month]);

  const query = useQuery({
    queryKey: ['analytics-calendar', layer, period.from, period.to],
    queryFn: async () => {
      const { data } = await apiClient.get<AnalyticsCalendarOverviewResponse>('/analytics-calendar/overview', {
        params: { layer, from: period.from, to: period.to },
      });
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-slate-900 p-5 text-white">
        <h1 className="text-xl font-semibold">Analytics Calendar</h1>
        <p className="mt-1 text-sm text-slate-300">Visão temporal por camada com KPIs, heatmap mensal e timeline operacional.</p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="text-slate-300">Camada</span>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2"
              value={layer}
              onChange={(e) => setLayer(e.target.value as AnalyticsCalendarLayer)}
            >
              {ANALYTICS_CALENDAR_LAYERS.map((item) => (
                <option key={item} value={item}>
                  {LAYER_LABELS[item]}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="text-slate-300">Mês de referência</span>
            <input
              type="month"
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </label>

          <div className="space-y-1 text-sm">
            <span className="text-slate-300">Modo</span>
            <div className="flex gap-2">
              <button
                className={`rounded-md px-3 py-2 ${mode === 'MES' ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-200'}`}
                onClick={() => setMode('MES')}
                type="button"
              >
                Mês (heatmap)
              </button>
              <button
                className={`rounded-md px-3 py-2 ${mode === 'TIMELINE' ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-200'}`}
                onClick={() => setMode('TIMELINE')}
                type="button"
              >
                Timeline
              </button>
            </div>
          </div>
        </div>
      </div>

      {query.isLoading && <div className="rounded-md border bg-white p-4 text-sm">Carregando analytics...</div>}
      {query.isError && <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">Falha ao carregar dados.</div>}

      {!query.isLoading && !query.isError && (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            {(query.data?.kpis ?? []).map((kpi) => (
              <div className="rounded-xl border bg-white p-4" key={kpi.key}>
                <p className="text-xs uppercase text-slate-500">{kpi.label}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{kpi.value.toLocaleString('pt-BR')}</p>
                <p className="mt-1 text-xs text-slate-500">Camada: {LAYER_LABELS[layer]}</p>
              </div>
            ))}
          </div>

          {mode === 'MES' ? (
            <div className="rounded-xl border bg-white p-4">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Heatmap financeiro diário</h2>
              <div className="grid grid-cols-7 gap-2">
                {(query.data?.heatmap ?? []).map((day) => {
                  const bg = `rgba(22, 163, 74, ${Math.max(0.08, day.intensity)})`;
                  return (
                    <div key={day.date} className="rounded-md border p-2 text-xs" style={{ backgroundColor: bg }}>
                      <p className="font-medium text-slate-800">{new Date(day.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</p>
                      <p className="text-slate-700">Receb.: {formatCurrency(day.receivedValue)}</p>
                      <p className="text-slate-700">Prod.: {formatCurrency(day.productionValue)}</p>
                      <p className="text-slate-600">Eventos: {day.totalEvents}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border bg-white p-4">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">Timeline de eventos</h2>
              <div className="space-y-2">
                {(query.data?.timeline ?? []).map((event, index) => (
                  <div className="rounded-md border p-3" key={`${event.cnjId}-${event.timestamp}-${index}`}>
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                        style={{ backgroundColor: ANALYTICS_EVENT_TYPE_COLORS[event.type] ?? '#64748b' }}
                      >
                        {event.type}
                      </span>
                      <span className="text-xs text-slate-500">{formatDateTime(event.timestamp)}</span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-800">{event.cnjId}</p>
                    <p className="text-xs text-slate-600">Cidade: {event.city}</p>
                    <p className="text-xs text-slate-600">Valor: {formatCurrency(event.value)}</p>
                    <p className="text-xs text-slate-600">Deadline: {formatDateTime(event.deadline)}</p>
                    <p className="text-xs text-slate-600">Status: {event.status ?? '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AnalyticsCalendarPage;
