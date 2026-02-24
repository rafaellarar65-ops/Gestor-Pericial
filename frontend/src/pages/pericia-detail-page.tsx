import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CalendarDays,
  Clock3,
  Landmark,
  MapPin,
  Mic,
  Pencil,
  Plus,
  Save,
} from 'lucide-react';
import { StatusBadge } from '@/components/domain/status-badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { usePericiaDetailQuery } from '@/hooks/use-pericias';
import { cn } from '@/lib/utils';

const tabs = ['Visão 360°', 'Documentos', 'Pré-Laudo (IA)', 'Timeline', 'Financeiro', 'CNJ'];

const PericiaDetailPage = () => {
  const { id = '' } = useParams();
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [showDatesModal, setShowDatesModal] = useState(false);
  const { data, isLoading, isError } = usePericiaDetailQuery(id);

  const timelineItems = useMemo(
    () => [
      { date: '28/01/2026', title: 'Processo cadastrado', description: 'Importação ou cadastro manual.' },
      { date: '26/01/2021', title: 'Data de nomeação', description: 'Referência inicial do processo.' },
    ],
    [],
  );

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Erro ao carregar perícia" />;
  if (!data) return <EmptyState title="Perícia não encontrada" />;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Erro médico | Presencial</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-800">{data.processoCNJ}</h1>
            <p className="mt-1 text-sm text-slate-600">
              Autor: <strong>{data.autorNome}</strong> • Réu: {data.reuNome ?? 'Não informado'}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1"><MapPin size={14} />{data.cidade}</span>
              <StatusBadge status={data.status} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
              <Pencil size={14} /> Editor V2
            </button>
            <button
              className="rounded-md border px-3 py-2 text-sm"
              onClick={() => setShowDatesModal(true)}
              type="button"
            >
              Editar Datas
            </button>
            <Link className="rounded-md border px-3 py-2 text-sm" to="/laudo-v2">
              CNJ
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
          <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white">Agendar</button>
          <button className="rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-white">Majorar</button>
          <Link className="rounded-md border px-4 py-2 text-sm" to="/cidades">Ver Cidade</Link>
        </div>
      </section>

      <section className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-4 pt-3">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                className={cn(
                  'rounded-t-md border-b-2 px-3 py-2 text-sm font-medium',
                  activeTab === tab ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500',
                )}
                key={tab}
                onClick={() => setActiveTab(tab)}
                type="button"
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          {activeTab === 'Visão 360°' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold text-slate-800">Resumo do Caso</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  <li className="flex justify-between"><span>Status Atual</span><strong>{data.status}</strong></li>
                  <li className="flex justify-between"><span>Cidade / Vara</span><span>{data.cidade}</span></li>
                  <li className="flex justify-between"><span>Data Nomeação</span><span>26/01/2021</span></li>
                </ul>
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold text-slate-800">Prazos e KPIs</h3>
                <p className="mt-3 text-sm text-slate-600">Laudo → Pagamento</p>
                <p className="mt-1 text-sm font-semibold text-emerald-600">Pendente</p>
              </div>
            </div>
          )}

          {activeTab === 'Documentos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-4">
                <div>
                  <p className="font-semibold">Central de Documentos</p>
                  <p className="text-sm text-muted-foreground">Envie o processo completo para análise da IA.</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white">
                  <Plus size={14} /> Adicionar Documento
                </button>
              </div>
              <div className="flex h-52 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                Nenhum documento anexado ainda.
              </div>
            </div>
          )}

          {activeTab === 'Pré-Laudo (IA)' && (
            <div className="grid gap-4 lg:grid-cols-[2fr,1fr]">
              <div className="space-y-3 rounded-lg border p-4">
                <h3 className="font-semibold">Importar Pré-Laudo Externo</h3>
                <textarea className="h-28 w-full rounded-md border p-3 text-sm" placeholder="Cole aqui o texto gerado por outra IA..." />
                <div className="flex justify-end gap-2">
                  <button className="rounded-md bg-violet-200 px-3 py-2 text-sm font-medium text-violet-700">Organizar com IA</button>
                  <button className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white"><Save size={14} />Salvar</button>
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold">Ditado</h3>
                <button className="mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <Mic size={20} />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'Timeline' && (
            <div className="space-y-4">
              {timelineItems.map((item) => (
                <div className="flex gap-3" key={item.title}>
                  <Clock3 className="mt-1 text-slate-400" size={16} />
                  <div>
                    <p className="text-xs text-slate-500">{item.date}</p>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-sm text-slate-600">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'Financeiro' && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border p-3"><p className="text-xs">Honorários previstos</p><p className="text-2xl font-bold">R$ 0,00</p></div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"><p className="text-xs">Recebido (bruto)</p><p className="text-2xl font-bold text-emerald-700">R$ 0,00</p></div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-xs">Saldo a receber</p><p className="text-2xl font-bold text-red-700">R$ 0,00</p></div>
              </div>
              <p className="rounded-md border p-3 text-center text-sm font-semibold">STATUS FINANCEIRO: AGUARDANDO PAGAMENTO</p>
            </div>
          )}

          {activeTab === 'CNJ' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-4">
                <div className="inline-flex items-center gap-2 font-semibold"><Landmark size={16} /> Dados DataJud (CNJ)</div>
                <button className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white">Atualizar Agora</button>
              </div>
              <div className="rounded-lg border p-4 text-sm">
                <p><strong>Classe:</strong> Procedimento Comum Cível</p>
                <p><strong>Assunto:</strong> Erro Médico</p>
                <p><strong>Tribunal:</strong> TJMG</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {showDatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between rounded-t-xl bg-slate-900 px-4 py-3 text-white">
              <p className="font-semibold">Editar Datas / Marcos</p>
              <button onClick={() => setShowDatesModal(false)} type="button">×</button>
            </div>
            <div className="space-y-3 p-4">
              {['Data Nomeação', 'Data Agendamento', 'Data Realização', 'Data Envio Laudo'].map((label) => (
                <label className="block text-sm" key={label}>
                  <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">{label}</span>
                  <div className="relative">
                    <input className="w-full rounded-md border px-3 py-2" placeholder="dd/mm/aaaa" />
                    <CalendarDays className="absolute right-3 top-2.5 text-slate-400" size={16} />
                  </div>
                </label>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <button className="rounded-md px-3 py-2 text-sm" onClick={() => setShowDatesModal(false)} type="button">Cancelar</button>
                <button className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white" type="button"><Save size={14} />Salvar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PericiaDetailPage;
