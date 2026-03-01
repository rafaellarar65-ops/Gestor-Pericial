import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Check, ChevronDown, ChevronUp, Copy } from 'lucide-react';
import { ErrorState, LoadingState } from '@/components/ui/state';
import { useCityOverviewQuery } from '@/hooks/use-pericias';

const tabs = ['Visão Geral', 'Processos', 'Cadastro', 'Financeiro V2'] as const;
type TabType = (typeof tabs)[number];

const toMoney = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const CidadeDetailPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('Visão Geral');
  const [idCopied, setIdCopied] = useState(false);
  const [collapsedBucket, setCollapsedBucket] = useState<Record<string, boolean>>({});
  const { data, isLoading, isError } = useCityOverviewQuery(id);

  if (isLoading) return <LoadingState />;
  if (isError || !data) return <ErrorState message="Erro ao carregar central da cidade" />;

  const buckets = [
    { key: 'avaliar', label: 'Avaliar', total: data.buckets.avaliar.total, values: data.buckets.avaliar.cnjs },
    { key: 'agendar', label: 'Agendar', total: data.buckets.agendar.total, values: data.buckets.agendar.cnjs },
    { key: 'laudos', label: 'Laudos', total: data.buckets.laudos.total, values: data.buckets.laudos.cnjs },
    { key: 'esclarecimentos', label: 'Esclarecimentos', total: data.buckets.esclarecimentos.total, values: data.buckets.esclarecimentos.cnjs },
    { key: 'pagamento', label: 'Pagamento', total: data.buckets.pagamento.total, values: data.buckets.pagamento.cnjs },
    { key: 'criticos', label: 'Críticos', total: data.buckets.criticos.total, values: data.buckets.criticos.cnjs },
  ] as const;

  const totalStatus = useMemo(
    () =>
      data.buckets.avaliar.total +
      data.buckets.agendar.total +
      data.buckets.laudos.total +
      data.buckets.esclarecimentos.total +
      data.buckets.pagamento.total +
      data.buckets.finalizada.total,
    [data],
  );

  const totalAtivos = useMemo(
    () =>
      data.buckets.avaliar.total +
      data.buckets.agendar.total +
      data.buckets.laudos.total +
      data.buckets.esclarecimentos.total +
      data.buckets.pagamento.total,
    [data],
  );

  const apiDelta = data.metrics.totalPericias - totalStatus;

  const copyCityId = async () => {
    try {
      await navigator.clipboard.writeText(data.cidade.id);
      setIdCopied(true);
      window.setTimeout(() => setIdCopied(false), 1800);
    } catch {
      setIdCopied(false);
    }
  };

  const toggleBucket = (bucketKey: string) => {
    setCollapsedBucket((prev) => ({ ...prev, [bucketKey]: !prev[bucketKey] }));
  };

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
              <h1 className="text-4xl font-bold">{data.cidade.nome.toUpperCase()}</h1>
              <p className="text-white/80">Gerenciamento Integrado</p>
            </div>
          </div>
          <button className="rounded-md bg-white/20 px-4 py-2 text-sm font-semibold" type="button">Sincronizar CNJ</button>
        </div>

        <div className="mt-6 grid gap-4 text-center md:grid-cols-4">
          <CityMetric label="Score Fin." value={`${data.metrics.score}/100`} />
          <CityMetric label="A Receber Total" value={toMoney(data.metrics.aReceberTotal)} />
          <CityMetric label="Atraso Crítico" value={String(data.metrics.atrasoCritico)} />
          <CityMetric label="Total (status)" value={String(totalStatus)} />
        </div>

        {apiDelta !== 0 && (
          <p className="mt-3 text-center text-xs text-amber-100">
            Divergência detectada: total API ({data.metrics.totalPericias}) vs soma por status ({totalStatus}). Diferença: {apiDelta > 0 ? `+${apiDelta}` : apiDelta}.
          </p>
        )}
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
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {buckets.map((bucket) => {
                const isCollapsed = collapsedBucket[bucket.key] === true;

                return (
                  <div className="rounded-lg border bg-slate-50 p-3" key={bucket.key}>
                    <button
                      className="mb-2 flex w-full items-center justify-between border-b pb-2 text-left"
                      onClick={() => toggleBucket(bucket.key)}
                      type="button"
                    >
                      <p className="font-semibold uppercase">{bucket.label}</p>
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">{bucket.total}</span>
                        {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                      </div>
                    </button>

                    {!isCollapsed && (
                      <ul className="space-y-1 text-xs text-slate-700">
                        {bucket.values.length === 0 && <li>Sem processos</li>}
                        {bucket.values.map((cnj) => (
                          <li className="truncate" key={cnj} title={cnj}>{cnj}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'Processos' && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <ProcessMetric title="Processos Ativos" value={String(totalAtivos)} />
                <ProcessMetric title="Finalizadas" value={String(data.buckets.finalizada.total)} />
                <ProcessMetric
                  title="Taxa de Conclusão"
                  value={`${totalStatus ? Math.round((data.buckets.finalizada.total / totalStatus) * 100) : 0}%`}
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {buckets.map((bucket) => {
                  const isCollapsed = collapsedBucket[bucket.key] === true;

                  return (
                    <div className="rounded-lg border bg-slate-50 p-4" key={bucket.key}>
                      <button
                        className="mb-3 flex w-full items-center justify-between"
                        onClick={() => toggleBucket(bucket.key)}
                        type="button"
                      >
                        <p className="font-semibold text-slate-800">{bucket.label}</p>
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-700">
                          {bucket.total}
                          {isCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                        </span>
                      </button>

                      {!isCollapsed && (
                        <ul className="space-y-1 text-xs text-slate-700">
                          {bucket.values.length === 0 && <li>Sem processos neste status.</li>}
                          {bucket.values.map((cnj) => (
                            <li className="truncate font-mono" key={cnj} title={cnj}>
                              {cnj}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'Cadastro' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border p-4 text-sm">
                <h3 className="mb-3 text-base font-semibold text-slate-800">Dados da Cidade</h3>
                <div className="space-y-2 text-slate-700">
                  <p><strong>Cidade:</strong> {data.cidade.nome}</p>
                  <p><strong>UF:</strong> {data.cidade.uf ?? '—'}</p>
                  <p className="flex items-center gap-2">
                    <strong>ID:</strong>
                    <span className="font-mono text-xs">{data.cidade.id}</span>
                    <button
                      className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold text-slate-700"
                      onClick={copyCityId}
                      type="button"
                    >
                      {idCopied ? <Check size={14} /> : <Copy size={14} />}
                      {idCopied ? 'Copiado' : 'Copiar'}
                    </button>
                  </p>
                </div>
              </div>

              <div className="rounded-lg border p-4 text-sm">
                <h3 className="mb-3 text-base font-semibold text-slate-800">Resumo Operacional</h3>
                <ul className="space-y-2 text-slate-700">
                  <li><strong>Total por status:</strong> {totalStatus}</li>
                  <li><strong>A receber:</strong> {toMoney(data.metrics.aReceberTotal)}</li>
                  <li><strong>Atraso crítico:</strong> {data.metrics.atrasoCritico}</li>
                  <li><strong>Score atual:</strong> {data.metrics.score}/100</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'Financeiro V2' && (
            <div className="rounded-lg border p-4 text-sm">
              <p><strong>A Receber:</strong> {toMoney(data.metrics.aReceberTotal)}</p>
              <p><strong>Recebimentos vinculados:</strong> {toMoney(data.buckets.pagamento.recebido)}</p>
              <p><strong>Aguardando pagamento:</strong> {data.buckets.pagamento.total}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

const ProcessMetric = ({ title, value }: { title: string; value: string }) => (
  <div className="rounded-lg border bg-slate-50 p-4">
    <p className="text-xs uppercase tracking-wide text-slate-500">{title}</p>
    <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
  </div>
);

const CityMetric = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs uppercase tracking-wider text-white/70">{label}</p>
    <p className="text-3xl font-bold">{value}</p>
  </div>
);

export default CidadeDetailPage;
