import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bot, Filter, Plus, RotateCw, Upload } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { usePericiasQuery } from '@/hooks/use-pericias';

type StatusFilter = 'todos' | 'avaliar' | 'agendada' | 'laudo enviado' | 'finalizada';

const statusFromQuery = (value: string | null): StatusFilter => {
  if (!value) return 'todos';
  const normalized = value.toLowerCase();
  if (normalized.includes('avaliar') || normalized.includes('st_avaliar')) return 'avaliar';
  if (normalized.includes('agendada') || normalized.includes('agendar')) return 'agendada';
  if (normalized.includes('laudo')) return 'laudo enviado';
  if (normalized.includes('finalizada')) return 'finalizada';
  return 'todos';
};

const toMoney = (value?: number | string) =>
  Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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

const authorLabel = (item: Record<string, unknown>) =>
  String(item.autorNome ?? item.periciadoNome ?? 'Sem autor');

export const PericiasPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page] = useState(1);

  const initialSearch = searchParams.get('q') ?? '';
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(statusFromQuery(searchParams.get('status')));
  const [cityFilter, setCityFilter] = useState(searchParams.get('cidade') ?? 'todas');

  const { data, isLoading, isError } = usePericiasQuery(page, {
    limit: 100,
    search: search.trim().length >= 3 ? search : undefined,
  });

  const rows = useMemo(() => {
    const source = (data?.items ?? []) as Array<Record<string, unknown>>;

    return source.filter((item) => {
      const cnj = String(item.processoCNJ ?? '').toLowerCase();
      const autor = authorLabel(item).toLowerCase();
      const cidade = cityLabel(item.cidade).toLowerCase();
      const status = statusLabel(item.status).toLowerCase();

      const textMatch = !search.trim() || `${cnj} ${autor} ${cidade}`.includes(search.toLowerCase());
      const statusMatch = statusFilter === 'todos' || status.includes(statusFilter);
      const cityMatch = cityFilter === 'todas' || cidade === cityFilter.toLowerCase();

      return textMatch && statusMatch && cityMatch;
    });
  }, [data?.items, search, statusFilter, cityFilter]);

  const cities = useMemo(() => {
    const unique = new Set(
      ((data?.items ?? []) as Array<Record<string, unknown>>)
        .map((item) => cityLabel(item.cidade))
        .filter(Boolean),
    );

    return ['todas', ...Array.from(unique)];
  }, [data?.items]);

  const syncQueryString = (next: { q?: string; status?: string; cidade?: string }) => {
    const params = new URLSearchParams(searchParams);

    if (next.q !== undefined) {
      if (next.q) params.set('q', next.q);
      else params.delete('q');
    }

    if (next.status !== undefined) {
      if (next.status !== 'todos') params.set('status', next.status);
      else params.delete('status');
    }

    if (next.cidade !== undefined) {
      if (next.cidade !== 'todas') params.set('cidade', next.cidade);
      else params.delete('cidade');
    }

    setSearchParams(params, { replace: true });
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Erro ao carregar perícias" />;
  if (!data) return <EmptyState title="Sem perícias encontradas" />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold text-slate-800">
          Listagem de Perícias{' '}
          <span className="rounded-full bg-slate-100 px-3 py-1 text-base text-slate-600">{rows.length}</span>
        </h1>

        <div className="flex flex-wrap gap-2">
          <button className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold" type="button">
            <RotateCw size={14} />
          </button>
          <button className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold text-purple-700" type="button">
            <Bot size={14} /> IA
          </button>
          <button className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold" type="button">
            <Upload size={14} /> Importar
          </button>
          <button className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white" type="button">
            <Plus size={14} /> Nova
          </button>
        </div>
      </div>

      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <p className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Filter size={15} /> Filtros e Busca
        </p>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-semibold uppercase text-slate-500">
            Busca (CNJ, autor, réu)
            <input
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              onBlur={() => syncQueryString({ q: search })}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Digite ao menos 3 caracteres..."
              value={search}
            />
          </label>

          <label className="text-xs font-semibold uppercase text-slate-500">
            Status
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              onChange={(event) => {
                const next = event.target.value as StatusFilter;
                setStatusFilter(next);
                syncQueryString({ status: next });
              }}
              value={statusFilter}
            >
              <option value="todos">Todos</option>
              <option value="avaliar">Avaliar</option>
              <option value="agendada">Agendada</option>
              <option value="laudo enviado">Laudo Enviado</option>
              <option value="finalizada">Finalizada</option>
            </select>
          </label>

          <label className="text-xs font-semibold uppercase text-slate-500">
            Cidade
            <select
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              onChange={(event) => {
                const next = event.target.value;
                setCityFilter(next);
                syncQueryString({ cidade: next });
              }}
              value={cityFilter}
            >
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city === 'todas' ? 'Todas' : city}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-end">
            <button
              className="w-full rounded-md border px-3 py-2 text-sm font-semibold"
              onClick={() => {
                setSearch('');
                setStatusFilter('todos');
                setCityFilter('todas');
                setSearchParams(new URLSearchParams(), { replace: true });
              }}
              type="button"
            >
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

        {rows.length === 0 && <EmptyState title="Use os filtros acima para encontrar processos" />}

        {rows.map((row) => {
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
