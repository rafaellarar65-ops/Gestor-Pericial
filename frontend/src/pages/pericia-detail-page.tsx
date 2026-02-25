import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, Landmark, MapPin, Pencil, Plus, Save, Send } from 'lucide-react';
import {
  usePericiaCnjQuery,
  usePericiaDetailQuery,
  usePericiaDocumentsQuery,
  usePericiaRecebimentosQuery,
  usePericiaTimelineQuery,
  useUpdatePericiaDatesMutation,
} from '@/hooks/use-pericias';
import { cn } from '@/lib/utils';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';

const tabs = ['Visão 360°', 'Documentos', 'Timeline', 'Financeiro', 'CNJ'] as const;

type TabType = (typeof tabs)[number];

const toDateInput = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');
const toDateBR = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');
const toMoney = (value?: number | string) =>
  Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const PericiaDetailPage = () => {
  const { id = '' } = useParams();
  const [activeTab, setActiveTab] = useState<TabType>('Visão 360°');
  const [showDatesModal, setShowDatesModal] = useState(false);
  const [showLaudoModal, setShowLaudoModal] = useState(false);
  const [dataProtocoloLaudo, setDataProtocoloLaudo] = useState(new Date().toISOString().slice(0, 10));

  const detailQuery = usePericiaDetailQuery(id);
  const timelineQuery = usePericiaTimelineQuery(id);
  const documentsQuery = usePericiaDocumentsQuery(id);
  const recebimentosQuery = usePericiaRecebimentosQuery(id);

  const cnjQuery = usePericiaCnjQuery(
    id,
    detailQuery.data?.processoCNJ,
    activeTab === 'CNJ' && Boolean(detailQuery.data?.processoCNJ),
  );

  const updateDates = useUpdatePericiaDatesMutation(id);

  const [dates, setDates] = useState({
    dataNomeacao: '',
    dataAgendamento: '',
    dataRealizacao: '',
    dataEnvioLaudo: '',
  });

  const detail = detailQuery.data;

  const financial = useMemo(() => {
    const recebimentos = recebimentosQuery.data ?? [];
    const recebido = recebimentos.reduce(
      (acc, item) => acc + Number(item.valorLiquido ?? item.valorBruto ?? 0),
      0,
    );
    const previsto = Number(detail?.honorariosPrevistosJG ?? 0);

    return { previsto, recebido, saldo: previsto - recebido, items: recebimentos };
  }, [detail?.honorariosPrevistosJG, recebimentosQuery.data]);

  if (detailQuery.isLoading) return <LoadingState />;
  if (detailQuery.isError) return <ErrorState message="Erro ao carregar perícia" />;
  if (!detail) return <EmptyState title="Perícia não encontrada" />;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="mt-2 text-3xl font-bold text-slate-800">{detail.processoCNJ}</h1>
            <p className="mt-1 text-sm text-slate-600">
              Autor: <strong>{detail.autorNome ?? '—'}</strong> • Réu: {detail.reuNome ?? '—'}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1">
                <MapPin size={14} />
                {detail.cidade?.nome ?? 'Sem cidade'}
              </span>
              <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                {detail.status?.nome ?? detail.status?.codigo ?? 'Sem status'}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                onClick={() => {
                  setDataProtocoloLaudo(toDateInput(detail.dataEnvioLaudo) || new Date().toISOString().slice(0, 10));
                  setShowLaudoModal(true);
                }}
                type="button"
              >
                <Send size={14} /> Laudo Enviado
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white" type="button">
              <Pencil size={14} /> Editor V2
            </button>
            <button
              className="rounded-md border px-3 py-2 text-sm"
              onClick={() => {
                setDates({
                  dataNomeacao: toDateInput(detail.dataNomeacao),
                  dataAgendamento: toDateInput(detail.dataAgendamento),
                  dataRealizacao: toDateInput(detail.dataRealizacao),
                  dataEnvioLaudo: toDateInput(detail.dataEnvioLaudo),
                });
                setShowDatesModal(true);
              }}
              type="button"
            >
              Editar Datas
            </button>
            <Link className="rounded-md border px-3 py-2 text-sm" to="/laudo-v2">
              CNJ
            </Link>
          </div>
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
                  <li className="flex justify-between"><span>Status Atual</span><strong>{detail.status?.nome ?? '—'}</strong></li>
                  <li className="flex justify-between"><span>Cidade / Vara</span><span>{detail.cidade?.nome ?? '—'} / {detail.vara?.nome ?? '—'}</span></li>
                  <li className="flex justify-between"><span>Data Nomeação</span><span>{toDateBR(detail.dataNomeacao)}</span></li>
                </ul>
              </div>
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold text-slate-800">Prazos</h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  <li className="flex justify-between"><span>Agendamento</span><span>{toDateBR(detail.dataAgendamento)}</span></li>
                  <li className="flex justify-between"><span>Realização</span><span>{toDateBR(detail.dataRealizacao)}</span></li>
                  <li className="flex justify-between"><span>Envio Laudo</span><span>{toDateBR(detail.dataEnvioLaudo)}</span></li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'Documentos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-4">
                <div>
                  <p className="font-semibold">Central de Documentos</p>
                  <p className="text-sm text-muted-foreground">Documentos reais vinculados ao processo.</p>
                </div>
                <button className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white" type="button">
                  <Plus size={14} /> Adicionar Documento
                </button>
              </div>
              {documentsQuery.isLoading ? (
                <LoadingState />
              ) : (
                <div className="space-y-2">
                  {(documentsQuery.data ?? []).map((doc) => (
                    <div className="rounded-md border p-3 text-sm" key={doc.id}>
                      <p className="font-semibold">{doc.nome}</p>
                      <p className="text-slate-500">Categoria: {doc.categoria ?? '—'} • Tipo: {doc.tipo ?? '—'}</p>
                    </div>
                  ))}
                  {(documentsQuery.data ?? []).length === 0 && (
                    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Nenhum documento anexado.</div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'Timeline' && (
            <div className="space-y-3">
              {timelineQuery.isLoading && <LoadingState />}
              {(timelineQuery.data?.items ?? []).map((item, index) => (
                <div className="rounded-md border p-3" key={`${item.event}-${index}`}>
                  <p className="text-xs text-slate-500">{toDateBR(item.date)}</p>
                  <p className="font-semibold">{item.event}</p>
                  {item.description && <p className="text-sm text-slate-600">{item.description}</p>}
                </div>
              ))}
              {(timelineQuery.data?.items ?? []).length === 0 && !timelineQuery.isLoading && (
                <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Sem eventos de timeline.</div>
              )}
            </div>
          )}

          {activeTab === 'Financeiro' && (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border p-3"><p className="text-xs">Honorários previstos</p><p className="text-2xl font-bold">{toMoney(financial.previsto)}</p></div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"><p className="text-xs">Recebido</p><p className="text-2xl font-bold text-emerald-700">{toMoney(financial.recebido)}</p></div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-xs">Saldo</p><p className="text-2xl font-bold text-red-700">{toMoney(financial.saldo)}</p></div>
              </div>
              <div className="space-y-2">
                {financial.items.map((item) => (
                  <div className="rounded-md border p-3 text-sm" key={item.id}>
                    <p className="font-semibold">{item.fontePagamento}</p>
                    <p className="text-slate-500">{toDateBR(item.dataRecebimento)} • {toMoney(item.valorLiquido ?? item.valorBruto)}</p>
                  </div>
                ))}
                {financial.items.length === 0 && (
                  <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Nenhum recebimento registrado.</div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'CNJ' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-4">
                <div className="inline-flex items-center gap-2 font-semibold"><Landmark size={16} /> Dados DataJud (CNJ)</div>
              </div>
              {cnjQuery.isLoading && <LoadingState />}
              {!cnjQuery.isLoading && cnjQuery.data && (
                <pre className="overflow-x-auto rounded-md border bg-slate-50 p-3 text-xs">{JSON.stringify(cnjQuery.data, null, 2)}</pre>
              )}
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
              {[
                { key: 'dataNomeacao', label: 'Data Nomeação' },
                { key: 'dataAgendamento', label: 'Data Agendamento' },
                { key: 'dataRealizacao', label: 'Data Realização' },
                { key: 'dataEnvioLaudo', label: 'Data Envio Laudo' },
              ].map((field) => (
                <label className="block text-sm" key={field.key}>
                  <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">{field.label}</span>
                  <div className="relative">
                    <input
                      className="w-full rounded-md border px-3 py-2"
                      onChange={(e) => setDates((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      type="date"
                      value={dates[field.key as keyof typeof dates]}
                    />
                    <CalendarDays className="absolute right-3 top-2.5 text-slate-400" size={16} />
                  </div>
                </label>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <button className="rounded-md px-3 py-2 text-sm" onClick={() => setShowDatesModal(false)} type="button">Cancelar</button>
                <button
                  className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
                  disabled={updateDates.isPending}
                  onClick={async () => {
                    await updateDates.mutateAsync({
                      dataNomeacao: dates.dataNomeacao || undefined,
                      dataAgendamento: dates.dataAgendamento || undefined,
                      dataRealizacao: dates.dataRealizacao || undefined,
                      dataEnvioLaudo: dates.dataEnvioLaudo || undefined,
                    });
                    setShowDatesModal(false);
                  }}
                  type="button"
                >
                  <Save size={14} />Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLaudoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between rounded-t-xl bg-slate-900 px-4 py-3 text-white">
              <p className="font-semibold">Registrar Envio do Laudo</p>
              <button onClick={() => setShowLaudoModal(false)} type="button">×</button>
            </div>
            <div className="space-y-4 p-4">
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Data do Protocolo</span>
                <div className="relative">
                  <input
                    className="w-full rounded-md border px-3 py-2"
                    onChange={(e) => setDataProtocoloLaudo(e.target.value)}
                    type="date"
                    value={dataProtocoloLaudo}
                  />
                  <CalendarDays className="absolute right-3 top-2.5 text-slate-400" size={16} />
                </div>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button className="rounded-md px-3 py-2 text-sm" onClick={() => setShowLaudoModal(false)} type="button">Cancelar</button>
                <button
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                  disabled={updateDates.isPending}
                  onClick={async () => {
                    await updateDates.mutateAsync({ dataEnvioLaudo: dataProtocoloLaudo || undefined });
                    setShowLaudoModal(false);
                  }}
                  type="button"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PericiaDetailPage;
