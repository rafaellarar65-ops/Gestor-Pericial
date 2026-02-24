import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2 } from 'lucide-react';

const tabs = ['Visão Geral', 'Processos', 'Cadastro', 'Financeiro V2'];

const CidadeDetailPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(tabs[0]);

  const cityName = useMemo(() => id.replaceAll('-', ' ').toUpperCase() || 'CIDADE', [id]);

  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-indigo-600 px-5 py-5 text-white shadow">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <button className="rounded-full bg-white/20 p-2" onClick={() => navigate('/cidades')} type="button">
              <ArrowLeft size={18} />
            </button>
            <div className="rounded-lg bg-white/15 p-2">
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="text-4xl font-bold">{cityName}</h1>
              <p className="text-white/80">Gerenciamento Integrado</p>
            </div>
          </div>
          <button className="rounded-md bg-white/20 px-4 py-2 text-sm font-semibold">Sincronizar CNJ</button>
        </div>

        <div className="mt-6 grid gap-4 text-center md:grid-cols-4">
          <CityMetric label="Score Fin." value="79/100" />
          <CityMetric label="A Receber Total" value="R$ 19 MIL" />
          <CityMetric label="Atraso Crítico" value="R$ 1,1 MIL" />
          <CityMetric label="Prazo Médio" value="6 DIAS" />
        </div>
      </section>

      <section className="rounded-xl border bg-white">
        <div className="flex flex-wrap gap-1 border-b p-2">
          {tabs.map((tab) => (
            <button
              className={`rounded-md px-4 py-2 text-sm font-semibold ${activeTab === tab ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600'}`}
              key={tab}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-4">
          {activeTab === 'Visão Geral' && (
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
              {['Avaliar', 'Agendar', 'Laudos', 'Esclarecimentos', 'Pagamento', 'Críticos'].map((bucket, i) => (
                <div className="min-h-40 rounded-lg border bg-slate-50 p-3" key={bucket}>
                  <p className="mb-2 border-b pb-2 text-center font-semibold uppercase">{bucket}</p>
                  <ul className="space-y-1 text-xs text-slate-700">
                    <li>500{i}8601420238130016</li>
                    <li>500{i}34561120258130016</li>
                    <li>500{i}26797020188130016</li>
                  </ul>
                </div>
              ))}
            </div>
          )}

          {activeTab !== 'Visão Geral' && (
            <div className="flex h-72 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Conteúdo da aba "{activeTab}" será integrado na próxima etapa.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const CityMetric = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs uppercase tracking-wider text-white/70">{label}</p>
    <p className="text-4xl font-bold">{value}</p>
  </div>
);

export default CidadeDetailPage;
