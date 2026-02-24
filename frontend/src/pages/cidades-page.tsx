import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import { ErrorState, LoadingState } from '@/components/ui/state';
import { useCityOverviewListQuery } from '@/hooks/use-pericias';

const CidadesPage = () => {
  const [search, setSearch] = useState('');
  const { data, isLoading, isError } = useCityOverviewListQuery();

  const rows = useMemo(
    () =>
      (data?.items ?? []).filter((item) =>
        item.cidade.nome.toLowerCase().includes(search.toLowerCase()),
      ),
    [data?.items, search],
  );

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Erro ao carregar cidades" />;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-white p-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            className="w-full rounded-md border py-2 pl-9 pr-3"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cidade..."
            value={search}
          />
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((city) => (
          <div className="rounded-xl border bg-white p-3" key={city.cidade.id}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-slate-800">{city.cidade.nome}</h3>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{city.cidade.uf ?? '--'}</span>
              </div>
              <Link className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600" to={`/cidades/${city.cidade.id}`}>
                Abrir central <ChevronRight size={15} />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-7">
              <Kpi label="Total" value={city.metrics.totalPericias} />
              <Kpi label="Avaliar" value={city.buckets.avaliar.total} />
              <Kpi label="Agendar" value={city.buckets.agendar.total} />
              <Kpi label="Laudos" value={city.buckets.laudos.total} />
              <Kpi label="Aguardando Pag" value={city.buckets.pagamento.total} />
              <Kpi label="Esclarecimentos" value={city.buckets.esclarecimentos.total} />
              <Kpi label="Finalizada" value={city.buckets.finalizada.total} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const Kpi = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-lg border bg-slate-50 p-2 text-center">
    <p className="text-xl font-bold text-slate-800">{value}</p>
    <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
  </div>
);

export default CidadesPage;
