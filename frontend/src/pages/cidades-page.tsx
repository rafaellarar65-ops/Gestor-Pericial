import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Plus, Search, X } from 'lucide-react';
import { ErrorState, LoadingState } from '@/components/ui/state';
import { useCityOverviewListQuery } from '@/hooks/use-pericias';
import { configService } from '@/services/config-service';

const CidadesPage = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCity, setNewCity] = useState({ nome: '', codigo: '', uf: 'MG' });

  const { data, isLoading, isError } = useCityOverviewListQuery();

  const createCityMutation = useMutation({
    mutationFn: () =>
      configService.create('cidades', {
        nome: newCity.nome,
        codigo: newCity.codigo,
        uf: newCity.uf,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['city-overview-list'] });
      setShowCreateModal(false);
      setNewCity({ nome: '', codigo: '', uf: 'MG' });
    },
  });

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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              className="w-full rounded-md border py-2 pl-9 pr-3"
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cidade..."
              value={search}
            />
          </div>

          <button
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
            onClick={() => setShowCreateModal(true)}
            type="button"
          >
            <Plus size={15} /> Nova Cidade
          </button>
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

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between rounded-t-xl bg-slate-900 px-4 py-3 text-white">
              <p className="font-semibold">Nova Cidade</p>
              <button onClick={() => setShowCreateModal(false)} type="button">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 p-4">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Nome *</span>
                <input
                  className="w-full rounded-md border px-3 py-2"
                  onChange={(e) => setNewCity((prev) => ({ ...prev, nome: e.target.value }))}
                  placeholder="Ex: Belo Horizonte"
                  value={newCity.nome}
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Código IBGE *</span>
                <input
                  className="w-full rounded-md border px-3 py-2"
                  onChange={(e) => setNewCity((prev) => ({ ...prev, codigo: e.target.value }))}
                  placeholder="Ex: 3106200"
                  value={newCity.codigo}
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">UF</span>
                <input
                  className="w-full rounded-md border px-3 py-2"
                  maxLength={2}
                  onChange={(e) => setNewCity((prev) => ({ ...prev, uf: e.target.value.toUpperCase() }))}
                  placeholder="MG"
                  value={newCity.uf}
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 px-4 pb-4">
              <button className="rounded-md px-3 py-2 text-sm" onClick={() => setShowCreateModal(false)} type="button">Cancelar</button>
              <button
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                disabled={createCityMutation.isPending || !newCity.nome.trim() || !newCity.codigo.trim()}
                onClick={() => createCityMutation.mutate()}
                type="button"
              >
                {createCityMutation.isPending ? 'Salvando...' : 'Criar Cidade'}
              </button>
            </div>
          </div>
        </div>
      )}
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
