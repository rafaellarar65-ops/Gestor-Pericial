import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { AlertCircle, CalendarDays, CheckCircle2, CircleDollarSign, Landmark, MapPin, Pencil, Plus, Save, Send, UserX } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DomainPageTemplate } from '@/components/domain/domain-page-template';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import {
  usePericiaCnjQuery,
  usePericiaDetailQuery,
  usePericiaDocumentsQuery,
  usePericiaRecebimentosQuery,
  usePericiaTimelineQuery,
  useUpdatePericiaDatesMutation,
} from '@/hooks/use-pericias';
import { financialService } from '@/services/financial-service';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { AppShellOutletContext } from '@/layouts/app-shell-context';

const tabs = ['Visão 360°', 'Documentos', 'Timeline', 'Financeiro', 'CNJ'] as const;
type TabType = (typeof tabs)[number];

const toDateInput = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');
const toDateBR = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');
const toMoney = (value?: number | string) => Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const withFallback = (value?: string | number | null) => {
  if (value === null || value === undefined) return '—';
  const stringValue = String(value).trim();
  return stringValue.length > 0 ? stringValue : '—';
};
const formatCNJ = (cnj?: string) => {
  if (!cnj) return '—';
  const digits = cnj.replace(/\D/g, '');
  if (digits.length !== 20) return cnj;
  return digits.replace(/(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})/, '$1-$2.$3.$4.$5.$6');
};

const PericiaDetailPage = () => {
  const { setHeaderConfig, clearHeaderConfig } = useOutletContext<AppShellOutletContext>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id = '' } = useParams();
  const [activeTab, setActiveTab] = useState<TabType>('Visão 360°');
  const [showDatesModal, setShowDatesModal] = useState(false);
  const [showLaudoModal, setShowLaudoModal] = useState(false);
  const [showRecebimentoDialog, setShowRecebimentoDialog] = useState(false);
  const [dataProtocoloLaudo, setDataProtocoloLaudo] = useState(new Date().toISOString().slice(0, 10));
  const [fontePagamento, setFontePagamento] = useState('');
  const [dataRecebimento, setDataRecebimento] = useState(new Date().toISOString().slice(0, 10));
  const [valorBruto, setValorBruto] = useState('');
  const [valorLiquido, setValorLiquido] = useState('');
  const [descricao, setDescricao] = useState('');
  const [isSubmittingRecebimento, setIsSubmittingRecebimento] = useState(false);

  const detailQuery = usePericiaDetailQuery(id);
  const timelineQuery = usePericiaTimelineQuery(id);
  const documentsQuery = usePericiaDocumentsQuery(id);
  const recebimentosQuery = usePericiaRecebimentosQuery(id);
  const cnjQuery = usePericiaCnjQuery(id, detailQuery.data?.processoCNJ, activeTab === 'CNJ' && Boolean(detailQuery.data?.processoCNJ));
  const updateDates = useUpdatePericiaDatesMutation(id);

  const [dates, setDates] = useState({ dataNomeacao: '', dataAgendamento: '', dataRealizacao: '', dataEnvioLaudo: '' });
  const detail = detailQuery.data;

  useEffect(() => {
    setHeaderConfig({
      primaryActions: (
        <Link className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold" to="/pericias">
          Voltar para listagem
        </Link>
      ),
    });
    return clearHeaderConfig;
  }, [setHeaderConfig, clearHeaderConfig]);

  const financial = useMemo(() => {
    const recebimentos = recebimentosQuery.data ?? [];
    const recebido = recebimentos.reduce((acc, item) => acc + Number(item.valorLiquido ?? item.valorBruto ?? 0), 0);
    const previsto = Number(detail?.honorariosPrevistosJG ?? 0);
    return { previsto, recebido, saldo: previsto - recebido, items: recebimentos };
  }, [detail?.honorariosPrevistosJG, recebimentosQuery.data]);

  const esclarecimentosMeta = useMemo(() => {
    const intimacao = detail?.esclarecimentos?.dataIntimacao;
    const prazo = Number(detail?.esclarecimentos?.prazoDias ?? 0);
    if (!intimacao || !prazo) return null;

    const deadlineDate = new Date(intimacao);
    deadlineDate.setDate(deadlineDate.getDate() + prazo);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const levelClass = diffDays < 0
      ? 'text-red-600'
      : diffDays <= 3
        ? 'text-amber-600'
        : 'text-emerald-600';

    return {
      prazo,
      deadline: toDateBR(deadlineDate.toISOString()),
      diasRestantes: `${diffDays} dia${Math.abs(diffDays) === 1 ? '' : 's'}`,
      levelClass,
    };
  }, [detail?.esclarecimentos?.dataIntimacao, detail?.esclarecimentos?.prazoDias]);

  if (detailQuery.isLoading) return <LoadingState />;
  if (detailQuery.isError) return <ErrorState message="Erro ao carregar perícia" />;
  if (!detail) return <EmptyState title="Perícia não encontrada" />;

  const statusNome = (detail.status?.nome ?? '').toLowerCase();

  const openDatesModal = () => {
    setDates({
      dataNomeacao: toDateInput(detail.dataNomeacao),
      dataAgendamento: toDateInput(detail.dataAgendamento),
      dataRealizacao: toDateInput(detail.dataRealizacao),
      dataEnvioLaudo: toDateInput(detail.dataEnvioLaudo),
    });
    setShowDatesModal(true);
  };

  const transitionStatus = async (statusId: string, successMessage: string) => {
    try {
      await apiClient.patch(`/pericias/${id}`, { statusId });
      await queryClient.invalidateQueries({ queryKey: ['pericia-detail', id] });
      toast.success(successMessage);
    } catch {
      toast.error('Falha ao atualizar status da perícia.');
    }
  };

  const resetRecebimentoForm = () => {
    setFontePagamento('');
    setDataRecebimento(new Date().toISOString().slice(0, 10));
    setValorBruto('');
    setValorLiquido('');
    setDescricao('');
  };

  const handleCreateRecebimento = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmittingRecebimento(true);
    try {
      await financialService.createRecebimento({
        periciaId: id,
        fontePagamento,
        dataRecebimento,
        valorBruto: Number(valorBruto),
        valorLiquido: valorLiquido ? Number(valorLiquido) : undefined,
        descricao: descricao || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['pericia-recebimentos', id] });
      toast.success('Recebimento cadastrado com sucesso.');
      setShowRecebimentoDialog(false);
      resetRecebimentoForm();
    } catch {
      toast.error('Falha ao cadastrar recebimento.');
    } finally {
      setIsSubmittingRecebimento(false);
    }
  };

  const actions: Array<{ label: string; className: string; onClick: () => void; icon: ReactNode }> = [];

  if (statusNome.includes('avaliar')) {
    actions.push(
      { label: 'Aceitar Nomeação', className: 'bg-emerald-600 text-white', onClick: () => void transitionStatus('NOMEACAO_ACEITA', 'Nomeação aceita com sucesso.'), icon: <CheckCircle2 size={14} /> },
      { label: 'Recusar', className: 'bg-red-500 text-white', onClick: () => void transitionStatus('NOMEACAO_RECUSADA', 'Nomeação recusada com sucesso.'), icon: <UserX size={14} /> },
      { label: 'Majorar', className: 'bg-amber-500 text-white', onClick: () => void transitionStatus('HONORARIOS_MAJORADOS', 'Solicitação de majoração registrada.'), icon: <CircleDollarSign size={14} /> },
    );
  }

  if (statusNome.includes('agendar')) {
    actions.push({ label: 'Agendar Data', className: 'bg-blue-600 text-white', onClick: openDatesModal, icon: <CalendarDays size={14} /> });
  }

  if (statusNome.includes('agendada')) {
    actions.push(
      { label: 'Realizada', className: 'bg-emerald-600 text-white', onClick: () => void transitionStatus('PERICIA_REALIZADA', 'Perícia marcada como realizada.'), icon: <CheckCircle2 size={14} /> },
      { label: 'Ausência', className: 'bg-red-500 text-white', onClick: () => void transitionStatus('PERICIA_AUSENCIA', 'Ausência registrada com sucesso.'), icon: <UserX size={14} /> },
      { label: 'Cancelar', className: 'bg-slate-600 text-white', onClick: () => void transitionStatus('PERICIA_CANCELADA', 'Perícia cancelada com sucesso.'), icon: <AlertCircle size={14} /> },
    );
  }

  if (statusNome.includes('ausent')) {
    actions.push(
      { label: 'Informar Ausência', className: 'bg-red-500 text-white', onClick: () => void transitionStatus('AUSENCIA_INFORMADA', 'Ausência informada com sucesso.'), icon: <UserX size={14} /> },
      { label: 'Reagendar', className: 'bg-blue-600 text-white', onClick: openDatesModal, icon: <CalendarDays size={14} /> },
    );
  }

  if (statusNome.includes('laudo') && !statusNome.includes('enviado')) {
    actions.push(
      { label: 'Abrir Laudo Inteligente', className: 'bg-indigo-600 text-white', onClick: () => navigate(`/laudo-inteligente/${id}`), icon: <Pencil size={14} /> },
      { label: 'Indireta', className: 'bg-teal-700 text-white', onClick: () => void transitionStatus('LAUDO_INDIRETA', 'Fluxo de laudo indireto iniciado.'), icon: <Send size={14} /> },
    );
  }

  if (statusNome.includes('enviado') || statusNome.includes('aguardando')) {
    actions.push(
      { label: 'Esclarecimentos', className: 'bg-amber-500 text-white', onClick: () => void transitionStatus('AGUARDANDO_ESCLARECIMENTOS', 'Status atualizado para esclarecimentos.'), icon: <AlertCircle size={14} /> },
      { label: 'Registrar Pagamento', className: 'bg-emerald-600 text-white', onClick: () => void transitionStatus('PAGAMENTO_REGISTRADO', 'Pagamento registrado com sucesso.'), icon: <CircleDollarSign size={14} /> },
      { label: 'Finalizar', className: 'bg-slate-700 text-white', onClick: () => void transitionStatus('FINALIZADA', 'Perícia finalizada com sucesso.'), icon: <CheckCircle2 size={14} /> },
    );
  }

  if (statusNome.includes('esclarec')) {
    actions.push(
      { label: 'Responder Esclarecimento', className: 'bg-indigo-600 text-white', onClick: () => navigate(`/laudo-inteligente/${id}`), icon: <Send size={14} /> },
      { label: 'Estender Prazo', className: 'bg-amber-500 text-white', onClick: openDatesModal, icon: <CalendarDays size={14} /> },
    );
  }

  if (statusNome.includes('parcial')) {
    actions.push(
      { label: 'Novo Recebimento', className: 'bg-emerald-600 text-white', onClick: () => setActiveTab('Financeiro'), icon: <CircleDollarSign size={14} /> },
      { label: 'Finalizar', className: 'bg-slate-700 text-white', onClick: () => void transitionStatus('FINALIZADA', 'Perícia finalizada com sucesso.'), icon: <CheckCircle2 size={14} /> },
    );
  }

  return (
    <>
      <DomainPageTemplate
        title={detail.processoCNJ}
        description={`Autor: ${detail.autorNome ?? '—'} • Réu: ${detail.reuNome ?? '—'}`}
        headerActions={
          <>
            <Link
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
              to={`/pericias/${id}/editar`}
            >
              Editar
            </Link>
            <button
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
              onClick={openDatesModal}
              type="button"
            >
              <Pencil size={14} /> Editar Datas
            </button>
            <Link
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
              to={`/pericias/${id}/editar`}
            >
              Editar
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
              to={`/laudo-inteligente/${id}`}
            >
              Laudo Inteligente
            </Link>
            <Link
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
              to="/laudo-v2"
            >
              CNJ
            </Link>
          </>
        }
      >
        <section className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><MapPin size={14} />{detail.cidade?.nome ?? 'Sem cidade'}</span>
            <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-foreground">{detail.status?.nome ?? detail.status?.codigo ?? 'Sem status'}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {actions.length > 0 ? (
              actions.map((action) => (
                <button className={cn('inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold', action.className)} key={action.label} onClick={action.onClick} type="button">
                  {action.icon} {action.label}
                </button>
              ))
            ) : (
              <button className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white" onClick={() => navigate('/assistente')} type="button"><Plus size={14} /> Fluxo Inteligente</button>
            )}
          </div>
        </section>

        <section className="rounded-lg border bg-card shadow-sm">
          <div className="border-b px-4 pt-3">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button className={cn('rounded-t-md border-b-2 px-3 py-2 text-sm font-medium', activeTab === tab ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-muted-foreground')} key={tab} onClick={() => setActiveTab(tab)} type="button">{tab}</button>
              ))}
            </div>
          </div>

          <div className="p-4">
            {activeTab === 'Visão 360°' && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold">Resumo do Caso</h3>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center justify-between gap-2">
                        <span>Status</span>
                        <span
                          className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700"
                          style={detail.status?.cor ? { backgroundColor: `${detail.status.cor}20`, borderColor: detail.status.cor, color: detail.status.cor } : undefined}
                        >
                          {withFallback(detail.status?.nome)}
                        </span>
                      </li>
                      <li className="flex justify-between gap-2"><span>Cidade / Vara</span><span className="text-right">{withFallback(detail.cidade?.nome)} / {withFallback(detail.vara?.nome)}</span></li>
                      <li className="flex justify-between gap-2"><span>Tipo de perícia</span><span className="text-right">{withFallback(detail.tipoPericia?.nome)}</span></li>
                      <li className="flex justify-between gap-2"><span>Modalidade</span><span className="text-right">{withFallback(detail.modalidade?.nome)}</span></li>
                      <li className="flex justify-between gap-2"><span>CNJ</span><span className="font-mono text-right">{formatCNJ(detail.processoCNJ)}</span></li>
                      <li className="flex justify-between gap-2"><span>Juiz(a)</span><span className="text-right">{withFallback(detail.juizNome)}</span></li>
                    </ul>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold">Partes</h3>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <li className="flex justify-between gap-2"><span>Autor</span><span className="text-right">{withFallback(detail.autorNome)}</span></li>
                      <li className="flex justify-between gap-2"><span>Réu</span><span className="text-right">{withFallback(detail.reuNome)}</span></li>
                      <li className="flex justify-between gap-2"><span>Periciado</span><span className="text-right">{withFallback(detail.periciadoNome)}</span></li>
                    </ul>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold">Datas/Prazos</h3>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <li className="flex justify-between gap-2"><span>Nomeação</span><span>{toDateBR(detail.dataNomeacao)}</span></li>
                      <li className="flex justify-between gap-2"><span>Agendamento</span><span>{toDateBR(detail.dataAgendamento)} {detail.horaAgendamento ? `às ${detail.horaAgendamento}` : ''}</span></li>
                      <li className="flex justify-between gap-2"><span>Realização</span><span>{toDateBR(detail.dataRealizacao)}</span></li>
                      <li className="flex justify-between gap-2"><span>Envio de laudo</span><span>{toDateBR(detail.dataEnvioLaudo)}</span></li>
                    </ul>
                  </div>

                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold">Financeiro Resumo</h3>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <li className="flex justify-between gap-2"><span>JG</span><span>{toMoney(detail.honorariosPrevistosJG)}</span></li>
                      <li className="flex justify-between gap-2"><span>Partes</span><span>{toMoney(detail.honorariosPrevistosPartes)}</span></li>
                      <li className="flex justify-between gap-2"><span>Total previsto</span><span className="font-semibold text-foreground">{toMoney(Number(detail.honorariosPrevistosJG ?? 0) + Number(detail.honorariosPrevistosPartes ?? 0))}</span></li>
                      <li className="flex justify-between gap-2">
                        <span>Status pagamento</span>
                        <span
                          className={cn('font-semibold', {
                            'text-emerald-600': (detail.pagamentoStatus ?? '').toUpperCase() === 'SIM',
                            'text-red-600': (detail.pagamentoStatus ?? '').toUpperCase() === 'NÃO' || (detail.pagamentoStatus ?? '').toUpperCase() === 'NAO',
                            'text-amber-600': (detail.pagamentoStatus ?? '').toUpperCase() === 'PARCIAL',
                          })}
                        >
                          {withFallback(detail.pagamentoStatus)}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>

                {(detail.observacoes || detail.observacaoExtra) && (
                  <div className="rounded-lg border p-4">
                    <h3 className="font-semibold">Observações</h3>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {detail.observacoes && <li><span className="font-medium text-foreground">Observação:</span> {detail.observacoes}</li>}
                      {detail.observacaoExtra && <li><span className="font-medium text-foreground">Observação extra:</span> {detail.observacaoExtra}</li>}
                    </ul>
                  </div>
                )}

                {statusNome.includes('esclarec') && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4">
                    <h3 className="font-semibold">Esclarecimentos</h3>
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      <li className="flex justify-between gap-2"><span>Data de intimação</span><span>{toDateBR(detail.esclarecimentos?.dataIntimacao)}</span></li>
                      <li className="flex justify-between gap-2"><span>Prazo (dias)</span><span>{detail.esclarecimentos?.prazoDias ?? '—'}</span></li>
                      <li className="flex justify-between gap-2"><span>Deadline</span><span>{esclarecimentosMeta?.deadline ?? '—'}</span></li>
                      <li className="flex justify-between gap-2"><span>Dias restantes</span><span className={cn('font-semibold', esclarecimentosMeta?.levelClass)}>{esclarecimentosMeta?.diasRestantes ?? '—'}</span></li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Documentos' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border bg-slate-50 p-4">
                  <div>
                    <p className="font-semibold">Central de Documentos</p>
                    <p className="text-sm text-muted-foreground">Documentos reais vinculados ao processo.</p>
                  </div>
                  <button className="inline-flex cursor-not-allowed items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white opacity-70" disabled title="Upload de documento por esta aba será disponibilizado em breve." type="button">
                    <Plus size={14} /> Adicionar Documento (Em breve)
                  </button>
                </div>
                {documentsQuery.isLoading ? <LoadingState /> : (
                  <div className="space-y-2">
                    {(documentsQuery.data ?? []).map((doc) => (
                      <div className="rounded-md border p-3 text-sm" key={doc.id}><p className="font-semibold">{doc.nome}</p><p className="text-slate-500">Categoria: {doc.categoria ?? '—'} • Tipo: {doc.tipo ?? '—'}</p></div>
                    ))}
                    {(documentsQuery.data ?? []).length === 0 && <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Nenhum documento anexado.</div>}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'Timeline' && (
              <div className="space-y-2">
                {timelineQuery.isLoading && <LoadingState />}
                {(timelineQuery.data?.items ?? []).map((item, index) => (
                  <div className="rounded-md border p-3" key={`${item.event}-${index}`}><p className="text-xs text-muted-foreground">{toDateBR(item.date)}</p><p className="font-semibold">{item.event}</p>{item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}</div>
                ))}
                {(timelineQuery.data?.items ?? []).length === 0 && !timelineQuery.isLoading && <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Sem eventos de timeline.</div>}
              </div>
            )}

            {activeTab === 'Financeiro' && (
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-lg border p-3"><p className="text-xs">Honorários previstos</p><p className="text-2xl font-bold">{toMoney(financial.previsto)}</p></div>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3"><p className="text-xs">Recebido</p><p className="text-2xl font-bold text-emerald-700">{toMoney(financial.recebido)}</p></div>
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3"><p className="text-xs">Saldo</p><p className="text-2xl font-bold text-red-700">{toMoney(financial.saldo)}</p></div>
                </div>
                <div className="flex justify-end">
                  <button
                    className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
                    onClick={() => setShowRecebimentoDialog(true)}
                    type="button"
                  >
                    <Plus size={14} /> Novo Recebimento
                  </button>
                </div>
                <div className="space-y-2">
                  {financial.items.map((item) => (
                    <div className="rounded-md border p-3 text-sm" key={item.id}><p className="font-semibold">Recebimento</p><p className="text-muted-foreground">{toMoney(item.valorLiquido ?? item.valorBruto)} • {toDateBR(item.dataRecebimento ?? item.createdAt)}</p></div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'CNJ' && (
              <div className="space-y-4"><div className="inline-flex items-center gap-2 rounded-lg border bg-muted/50 p-4 font-semibold"><Landmark size={16} /> Dados DataJud (CNJ)</div>{cnjQuery.isLoading && <LoadingState />}{!cnjQuery.isLoading && cnjQuery.data && <pre className="overflow-x-auto rounded-md border bg-muted/50 p-3 text-xs">{JSON.stringify(cnjQuery.data, null, 2)}</pre>}</div>
            )}
          </div>
        </section>
      </DomainPageTemplate>

      <Dialog
        onClose={() => {
          setShowRecebimentoDialog(false);
          resetRecebimentoForm();
        }}
        open={showRecebimentoDialog}
        title="Novo Recebimento"
      >
        <form className="space-y-3" onSubmit={(event) => void handleCreateRecebimento(event)}>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Fonte de pagamento</span>
            <input className="w-full rounded-md border px-3 py-2" onChange={(e) => setFontePagamento(e.target.value)} required type="text" value={fontePagamento} />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Data de recebimento</span>
            <input className="w-full rounded-md border px-3 py-2" onChange={(e) => setDataRecebimento(e.target.value)} required type="date" value={dataRecebimento} />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Valor bruto</span>
            <input className="w-full rounded-md border px-3 py-2" min="0" onChange={(e) => setValorBruto(e.target.value)} required step="0.01" type="number" value={valorBruto} />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Valor líquido</span>
            <input className="w-full rounded-md border px-3 py-2" min="0" onChange={(e) => setValorLiquido(e.target.value)} step="0.01" type="number" value={valorLiquido} />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Descrição</span>
            <textarea className="w-full rounded-md border px-3 py-2" onChange={(e) => setDescricao(e.target.value)} rows={3} value={descricao} />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              className="rounded-md px-3 py-2 text-sm"
              onClick={() => {
                setShowRecebimentoDialog(false);
                resetRecebimentoForm();
              }}
              type="button"
            >
              Cancelar
            </button>
            <button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white" disabled={isSubmittingRecebimento} type="submit">
              {isSubmittingRecebimento ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Dialog>

      {showDatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between rounded-t-xl bg-slate-900 px-4 py-3 text-white"><p className="font-semibold">Editar Datas / Marcos</p><button onClick={() => setShowDatesModal(false)} type="button">×</button></div>
            <div className="space-y-3 p-4">
              {[{ key: 'dataNomeacao', label: 'Data Nomeação' }, { key: 'dataAgendamento', label: 'Data Agendamento' }, { key: 'dataRealizacao', label: 'Data Realização' }, { key: 'dataEnvioLaudo', label: 'Data Envio Laudo' }].map((field) => (
                <label className="block text-sm" key={field.key}><span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">{field.label}</span><div className="relative"><input className="w-full rounded-md border px-3 py-2" onChange={(e) => setDates((prev) => ({ ...prev, [field.key]: e.target.value }))} type="date" value={dates[field.key as keyof typeof dates]} /><CalendarDays className="absolute right-3 top-2.5 text-slate-400" size={16} /></div></label>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <button className="rounded-md px-3 py-2 text-sm" onClick={() => setShowDatesModal(false)} type="button">Cancelar</button>
                <button
                  className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
                  disabled={updateDates.isPending}
                  onClick={async () => {
                    try {
                      await updateDates.mutateAsync({ dataNomeacao: dates.dataNomeacao || undefined, dataAgendamento: dates.dataAgendamento || undefined, dataRealizacao: dates.dataRealizacao || undefined, dataEnvioLaudo: dates.dataEnvioLaudo || undefined });
                      toast.success('Datas atualizadas com sucesso.');
                      setShowDatesModal(false);
                    } catch {
                      toast.error('Falha ao atualizar datas da perícia.');
                    }
                  }}
                  type="button"
                >
                  <Save size={14} />{updateDates.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showLaudoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between rounded-t-xl bg-slate-900 px-4 py-3 text-white"><p className="font-semibold">Registrar Envio do Laudo</p><button onClick={() => setShowLaudoModal(false)} type="button">×</button></div>
            <div className="space-y-4 p-4">
              <label className="block text-sm"><span className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Data do Protocolo</span><div className="relative"><input className="w-full rounded-md border px-3 py-2" onChange={(e) => setDataProtocoloLaudo(e.target.value)} type="date" value={dataProtocoloLaudo} /><CalendarDays className="absolute right-3 top-2.5 text-slate-400" size={16} /></div></label>
              <div className="flex justify-end gap-2 pt-2">
                <button className="rounded-md px-3 py-2 text-sm" onClick={() => setShowLaudoModal(false)} type="button">Cancelar</button>
                <button
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                  disabled={updateDates.isPending}
                  onClick={async () => {
                    try {
                      await updateDates.mutateAsync({ dataEnvioLaudo: dataProtocoloLaudo || undefined });
                      toast.success('Envio de laudo registrado com sucesso.');
                      setShowLaudoModal(false);
                    } catch {
                      toast.error('Falha ao registrar envio de laudo.');
                    }
                  }}
                  type="button"
                >
                  {updateDates.isPending ? 'Confirmando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

export default PericiaDetailPage;
