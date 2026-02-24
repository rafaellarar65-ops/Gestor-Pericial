import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import { LoadingState } from '@/components/ui/state';
import { useDomainData } from '@/hooks/use-domain-data';

type CityRow = {
  id: string;
  nome: string;
  uf: string;
  total: number;
  agendar: number;
  agendada: number;
  enviarLaudo: number;
  aguardandoPag: number;
  esclarecimentos: number;
  finalizada: number;
};

const CidadesPage = () => {
  const { data = [], isLoading } = useDomainData('cidades', '/config/cidades');
  const [search, setSearch] = useState('');

  const rows = useMemo<CityRow[]>(() => {
    const source = data.length > 0 ? data : [{ id: 'alfenas', nome: 'Alfenas', uf: 'MG' }];

    return source
      .map((item, index) => {
        const seed = (index + 3) * 7;
        const agendar = seed % 4;
        const agendada = seed % 23;
        const enviarLaudo = seed % 6;
        const aguardandoPag = (seed * 2) % 90;
        const esclarecimentos = seed % 3;
        const finalizada = (seed * 3) % 30;

        return {
          id: String(item.id ?? item.nome ?? index),
          nome: String(item.nome ?? item.cidade ?? `Cidade ${index + 1}`),
          uf: String(item.uf ?? 'MG'),
          agendar,
          agendada,
          enviarLaudo,
          aguardandoPag,
          esclarecimentos,
          finalizada,
          total: agendar + agendada + enviarLaudo + aguardandoPag + esclarecimentos + finalizada,
        };
      })
      .filter((item) => item.nome.toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  if (isLoading) return <LoadingState />;

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
          <div className="rounded-xl border bg-white p-3" key={city.id}>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-2xl font-bold text-slate-800">{city.nome}</h3>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs">{city.uf}</span>
              </div>
              <Link className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-600" to={`/cidades/${city.id}`}>
                Abrir central <ChevronRight size={15} />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2 md:grid-cols-7">
              <Kpi label="Total" value={city.total} />
              <Kpi label="Agendar" value={city.agendar} />
              <Kpi label="Agendada" value={city.agendada} />
              <Kpi label="Enviar Laudo" value={city.enviarLaudo} />
              <Kpi label="Aguardando Pag" value={city.aguardandoPag} />
              <Kpi label="Esclarecimentos" value={city.esclarecimentos} />
              <Kpi label="Finalizada" value={city.finalizada} />
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
