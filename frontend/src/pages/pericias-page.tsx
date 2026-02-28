import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bot, Filter, Plus, RotateCw, Upload } from 'lucide-react';
import { ErrorState, LoadingState } from '@/components/ui/state';
import { usePericiasQuery } from '@/hooks/use-pericias';
import { configService } from '@/services/config-service';
import type { ConfigItem } from '@/types/api';

const toMoney = (value?: number | string) => Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const statusLabel = (status: unknown) => {
  if (typeof status === 'string') return status;
  if (status && typeof status === 'object') {
    const value = status as { nome?: string; codigo?: string };
    return value.nome ?? value.codigo ?? 'Sem status';
  }
  return 'Sem status';
};

const cityLabel = (cidade: unknown) => {
  if (typeof cidade === 'string') return cidade;
  if (cidade && typeof cidade === 'object') {
    const value = cidade as { nome?: string };
    return value.nome ?? '—';
  }
  return '—';
};

const authorLabel = (item: Record<string, unknown>) => String(item.autorNome ?? item.periciadoNome ?? 'Sem autor');

const parseCurrency = (value: string): number | undefined => {
  if (!value.trim()) return undefined;
  const normalized = Number(value.replace(',', '.'));
  return Number.isFinite(normalized) ? normalized : undefined;
};

export const PericiasPage = () => {
  const navigate = useNavigate();
  const [page] = useState(1);

  const [search, setSearch] = useState('');
  const [statusId, setStatusId] = useState('all');
  const [cidadeId, setCidadeId] = useState('all');
  const [varaId, setVaraId] = useState('all');
  const [valorMin, setValorMin] = useState('');
  const [valorMax, setValorMax] = useState('');
  const [dataNomeacaoInicio, setDataNomeacaoInicio] = useState('');
  const [dataNomeacaoFim, setDataNomeacaoFim] = useState('');

  const parsedMin = parseCurrency(valorMin);
  const parsedMax = parseCurrency(valorMax);

  const hasActiveSearch =
    search.trim().length >= 3 ||
    statusId !== 'all' ||
    cidadeId !== 'all' ||
    varaId !== 'all' ||
    Boolean(parsedMin) ||
    Boolean(parsedMax) ||
    Boolean(dataNomeacaoInicio) ||
    Boolean(dataNomeacaoFim);

  const { data, isLoading, isError, isFetching, refetch } = usePericiasQuery(
    page,
    {
      limit: 100,
      search: search.trim().length >= 3 ? search.trim() : undefined,
      statusId: statusId !== 'all' ? statusId : undefined,
      cidadeId: cidadeId !== 'all' ? cidadeId : undefined,
      varaId: varaId !== 'all' ? varaId : undefined,
      valorMin: parsedMin,
      valorMax: parsedMax,
      dateFrom: dataNomeacaoInicio || undefined,
      dateTo: dataNomeacaoFim || undefined,
    },
    hasActiveSearch,
  );

  const cidadesQuery = useQuery({ queryKey: ['config', 'cidades'], queryFn: () => configService.list('cidades') });
  const varasQuery = useQuery({ queryKey: ['config', 'varas'], queryFn: () => configService.list('varas') });
  const statusQuery = useQuery({ queryKey: ['config', 'status'], queryFn: () => configService.list('status') });

  const cidades = useMemo(
    () => [...(cidadesQuery.data ?? [])].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })),
    [cidadesQuery.data],
  );

  const varas = useMemo(
    () => [...(varasQuery.data ?? [])].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })),
    [varasQuery.data],
  );

  const statuses = useMemo(
    () => [...(statusQuery.data ?? [])].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' })),
    [statusQuery.data],
  );

  const rows = useMemo(() => (hasActiveSearch ? ((data?.items ?? []) as Array<Record<string, unknown>>) : []), [data?.items, hasActiveSearch]);

  const clearFilters = () => {
    setSearch('');
    setStatusId('all');
    setCidadeId('all');
    setVaraId('all');
    setValorMin('');
    setValorMax('');
    setDataNomeacaoInicio('');
    setDataNomeacaoFim('');
  };

  const handleRefresh = () => {
    if (hasActiveSearch) {
      clearFilters();
      return;
    }
    void refetch();
  };

  if (cidadesQuery.isError || varasQuery.isError || statusQuery.isError) return <ErrorState message="Erro ao carregar filtros" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold text-slate-800">
          Listagem de Perícias <span className="rounded-full bg-slate-100 px-3 py-1 text-base text-slate-600">{rows.length}</span>
        </h1>

        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isFetching}
            onClick={handleRefresh}
            type="button"
          >
            <RotateCw className={isFetching ? 'animate-spin' : ''} size={14} />
          </button>
          <button className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold text-purple-700" type="button">
            <Bot size={14} /> IA
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold"
            onClick={() => navigate('/importacoes')}
            type="button"
          >
            <Upload size={14} /> Importar
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
            onClick={() => navigate('/pericias/nova')}
            type="button"
          >
            <Plus size={14} /> Nova
          </button>
        </div>
      </div>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <p className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Filter size={15} /> Filtros e Busca
        </p>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="text-xs font-semibold uppercase text-slate-500 xl:col-span-2">
            Busca (CNJ, autor, réu)
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Digite ao menos 3 caracteres..."
              value={search}
            />
          </label>

          <label className="text-xs font-semibold uppercase text-slate-500">
            Status
            <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" onChange={(event) => setStatusId(event.target.value)} value={statusId}>
              <option value="all">Todos</option>
              {statuses.map((status: ConfigItem) => (
                <option key={status.id} value={status.id}>
                  {status.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase text-slate-500">
            Cidade
            <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" onChange={(event) => setCidadeId(event.target.value)} value={cidadeId}>
              <option value="all">Todas</option>
              {cidades.map((city: ConfigItem) => (
                <option key={city.id} value={city.id}>
                  {city.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase text-slate-500">
            Vara
            <select className="mt-1 w-full rounded-md border px-3 py-2 text-sm" onChange={(event) => setVaraId(event.target.value)} value={varaId}>
              <option value="all">Todas</option>
              {varas.map((vara: ConfigItem) => (
                <option key={vara.id} value={vara.id}>
                  {vara.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-semibold uppercase text-slate-500">
            Valor mín
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              inputMode="decimal"
              onChange={(event) => setValorMin(event.target.value)}
              placeholder="R$"
              value={valorMin}
            />
          </label>

          <label className="text-xs font-semibold uppercase text-slate-500">
            Valor máx
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              inputMode="decimal"
              onChange={(event) => setValorMax(event.target.value)}
              placeholder="R$"
              value={valorMax}
            />
          </label>

          <label className="text-xs font-semibold uppercase text-slate-500">
            Nomeação de
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              onChange={(event) => setDataNomeacaoInicio(event.target.value)}
              placeholder="dd/mm/aaaa"
              type="date"
              value={dataNomeacaoInicio}
            />
          </label>

          <label className="text-xs font-semibold uppercase text-slate-500">
            Até
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              onChange={(event) => setDataNomeacaoFim(event.target.value)}
              placeholder="dd/mm/aaaa"
              type="date"
              value={dataNomeacaoFim}
            />
          </label>

          <div className="flex items-end">
            <button className="w-full rounded-md border px-3 py-2 text-sm font-semibold" onClick={clearFilters} type="button">
              Limpar Filtros
            </button>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-2 border-b bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500">
          <span>CNJ / Data</span>
          <span>Partes</span>
          <span>Local</span>
          <span>Status</span>
          <span className="text-right">Valor</span>
        </div>

        {!hasActiveSearch && (
          <div className="flex min-h-[280px] items-center justify-center px-4 py-10 text-center text-slate-500">
            Use os filtros acima ou a busca para encontrar processos.
          </div>
        )}

        {hasActiveSearch && isLoading && <LoadingState />}
        {hasActiveSearch && isError && <ErrorState message="Erro ao carregar perícias" />}

        {hasActiveSearch && !isLoading && !isError && rows.length === 0 && (
          <div className="flex min-h-[280px] items-center justify-center px-4 py-10 text-center text-slate-500">
            Use os filtros acima ou a busca para encontrar processos.
          </div>
        )}

        {hasActiveSearch &&
          !isLoading &&
          !isError &&
          rows.map((row) => {
            const rowData = row as Record<string, unknown>;
            const status = statusLabel(rowData.status);

            return (
              <div className="grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-2 border-b px-4 py-3 text-sm" key={String(rowData.id)}>
                <div>
                  <Link className="font-semibold text-slate-800 underline" to={`/pericias/${rowData.id}`}>
                    {String(rowData.processoCNJ ?? '—')}
                  </Link>
                  <p className="text-xs text-slate-500">{rowData.dataNomeacao ? new Date(String(rowData.dataNomeacao)).toLocaleDateString('pt-BR') : '—'}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{authorLabel(rowData)}</p>
                  <p className="truncate text-xs text-slate-500">{String(rowData.reuNome ?? '—')}</p>
                </div>
                <div className="text-slate-700">{cityLabel(rowData.cidade)}</div>
                <div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{status}</span>
                </div>
                <div className="text-right font-semibold text-slate-700">{toMoney(rowData.honorariosPrevistosJG as number | string)}</div>
              </div>
            );
          })}
      </section>
    </div>
  );
};

export default PericiasPage;
