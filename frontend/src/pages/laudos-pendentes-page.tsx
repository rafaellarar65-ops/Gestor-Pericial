import { type ReactNode, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ClipboardList, FileEdit, FileText, MapPin } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { ErrorState, LoadingState } from '@/components/ui/state';
import { useDomainData } from '@/hooks/use-domain-data';
import { configService } from '@/services/config-service';

type LaudoItem = {
  id?: string | number;
  processoCNJ?: string;
  autorNome?: string;
  reuNome?: string;
  cidade?: string | { nome?: string };
  dataRealizacao?: string;
  prazoLimite?: string;
  dataPrazo?: string;
  prazoEntrega?: string;
  dataLimite?: string;
  status?:
  | string
  | {
    nome?: string;
    codigo?: string;
  };
  isUrgent?: boolean | string | number;
  [key: string]: string | number | boolean | undefined | { nome?: string; codigo?: string } | { nome?: string };
};

type SectionKey = 'urgentes' | 'indireta' | 'cidade' | 'espera';

const normalizeStatus = (value?: string): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_')
    .toUpperCase()
    .trim();

const getStatusCandidates = (item: LaudoItem): string[] => {
  const status = item.status;
  if (typeof status === 'string') return [status];
  if (status && typeof status === 'object') return [status.nome ?? '', status.codigo ?? ''];
  return [];
};

const isEnviarLaudoStatus = (item: LaudoItem): boolean => {
  const normalizedCandidates = getStatusCandidates(item).map(normalizeStatus);
  return normalizedCandidates.some((candidate) => candidate === 'ENVIAR_LAUDO' || candidate === 'ENVIARLAUDO');
};

const getStatusLabel = (item: LaudoItem): string | undefined => {
  const status = item.status;
  if (typeof status === 'string') return status;
  return status?.nome ?? status?.codigo;
};

const getDelayDays = (item: LaudoItem): number | null => {
  if (!item.dataRealizacao) return null;
  const realizationDate = new Date(item.dataRealizacao);
  if (Number.isNaN(realizationDate.getTime())) return null;

  const now = new Date();
  const diffMs = now.getTime() - realizationDate.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
};

const getCityName = (item: LaudoItem): string => {
  if (!item.cidade) return 'Sem cidade';
  if (typeof item.cidade === 'string') return item.cidade;
  return item.cidade.nome ?? 'Sem cidade';
};

const getDeadlineDate = (item: LaudoItem): Date | null => {
  const candidate = item.prazoLimite ?? item.dataPrazo ?? item.prazoEntrega ?? item.dataLimite;
  if (!candidate) return null;
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isItemUrgent = (item: LaudoItem, urgentTerms: string[]): boolean => {
  if (item.isUrgent === true || item.isUrgent === 1 || item.isUrgent === 'true') return true;

  const statusCandidates = getStatusCandidates(item).map(normalizeStatus);
  const normalizedUrgentTerms = urgentTerms.map(normalizeStatus);
  if (statusCandidates.some((candidate) => normalizedUrgentTerms.some((term) => candidate.includes(term)))) return true;

  const statusText = getStatusLabel(item);
  if (typeof statusText === 'string' && normalizeStatus(statusText).includes('URGENTE')) return true;

  const deadline = getDeadlineDate(item);
  if (deadline && deadline.getTime() < Date.now()) return true;

  const delayDays = getDelayDays(item);
  return delayDays !== null && delayDays > 60;
};

const getWaitBadgeStyle = (delayDays: number | null): string => {
  if (delayDays === null) return 'bg-gray-100 text-gray-700';
  if (delayDays < 30) return 'bg-green-100 text-green-700';
  if (delayDays <= 60) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
};

const LaudoCard = ({
  item,
  index,
  urgentTerms,
  extraActions,
  showWaitBadge = false,
}: {
  item: LaudoItem;
  index: number;
  urgentTerms: string[];
  extraActions?: ReactNode;
  showWaitBadge?: boolean;
}) => {
  const urgent = isItemUrgent(item, urgentTerms);
  const itemId = item.id ?? index;
  const detailHref = `/pericias/${itemId}`;
  const laudoInteligenteHref = `/laudo-inteligente?periciaId=${itemId}`;
  const delayDays = getDelayDays(item);

  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ${urgent ? 'border-red-300' : 'border-gray-200'}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <Link to={detailHref} className="font-mono text-sm font-semibold text-orange-700 hover:text-orange-800 hover:underline">
          {item.processoCNJ ?? '—'}
        </Link>
        {urgent && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-red-700">
            <AlertTriangle size={11} />
            URGENTE
          </span>
        )}
      </div>

      <div className="mb-3 space-y-1 text-sm text-gray-700">
        <p><span className="font-semibold text-gray-500">Autor:</span> {item.autorNome ?? '—'}</p>
        <p className="inline-flex items-center gap-1"><MapPin size={12} className="text-orange-500" />{getCityName(item)}</p>
        <p><span className="font-semibold text-gray-500">Espera:</span> {delayDays === null ? 'Data não informada' : `${delayDays} dia${delayDays !== 1 ? 's' : ''}`}</p>
      </div>

      {showWaitBadge && (
        <div className="mb-3">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${getWaitBadgeStyle(delayDays)}`}>
            {delayDays === null ? 'Sem data de realização' : `${delayDays} dias`}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Link
          to={laudoInteligenteHref}
          className="rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white hover:bg-orange-700"
        >
          <span className="inline-flex items-center gap-1"><FileEdit size={14} />Abrir Laudo</span>
        </Link>
        <Link
          to={detailHref}
          className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:border-gray-300 hover:text-gray-700"
        >
          Ver Detalhes
        </Link>
        {extraActions}
      </div>
    </div>
  );
};

const LaudosPendentesPage = () => {
  const { data = [], isLoading, isError } = useDomainData('laudos-pendentes', '/laudos-pendentes');
  const [prioritizeUrgent, setPrioritizeUrgent] = useState(false);
  const [expandedSection, setExpandedSection] = useState<SectionKey>('urgentes');
  const [expandedCity, setExpandedCity] = useState<string | null>(null);
  const [selectedIndiretaItem, setSelectedIndiretaItem] = useState<LaudoItem | null>(null);
  const [indiretaReason, setIndiretaReason] = useState('');
  const [indiretaDeadline, setIndiretaDeadline] = useState('');

  const { data: dashboardSettings } = useQuery({
    queryKey: ['system-dashboard-settings'],
    queryFn: () => configService.getDashboardSettings(),
  });
  const urgentTerms = useMemo(
    () => dashboardSettings?.filas.laudosUrgenciaTermosStatus ?? ['URGENTE'],
    [dashboardSettings?.filas.laudosUrgenciaTermosStatus],
  );

  const filteredItems = useMemo(() => (data as LaudoItem[]).filter(isEnviarLaudoStatus), [data]);

  const sorted = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const aDelay = getDelayDays(a) ?? -1;
      const bDelay = getDelayDays(b) ?? -1;
      if (aDelay !== bDelay) return bDelay - aDelay;

      if (prioritizeUrgent) {
        const aUrgent = isItemUrgent(a, urgentTerms) ? 0 : 1;
        const bUrgent = isItemUrgent(b, urgentTerms) ? 0 : 1;
        if (aUrgent !== bUrgent) return aUrgent - bUrgent;
      }

      const cnjCompare = (a.processoCNJ ?? '').localeCompare(b.processoCNJ ?? '');
      if (cnjCompare !== 0) return cnjCompare;

      return String(a.id ?? '').localeCompare(String(b.id ?? ''));
    });
  }, [filteredItems, prioritizeUrgent, urgentTerms]);

  const urgentItems = useMemo(() => sorted.filter((item) => isItemUrgent(item, urgentTerms)), [sorted, urgentTerms]);

  const indiretaItems = useMemo(() => {
    return sorted.filter((item) => getStatusCandidates(item).some((value) => normalizeStatus(value).includes('INDIRETA')));
  }, [sorted]);

  const itemsByCity = useMemo(() => {
    const grouped: Record<string, LaudoItem[]> = {};
    sorted.forEach((item) => {
      const city = getCityName(item);
      if (!grouped[city]) grouped[city] = [];
      grouped[city].push(item);
    });
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [sorted]);

  const itemsByWait = useMemo(() => {
    return [...sorted].sort((a, b) => {
      const aDelay = getDelayDays(a) ?? -1;
      const bDelay = getDelayDays(b) ?? -1;
      return bDelay - aDelay;
    });
  }, [sorted]);

  const total = sorted.length;

  const closeIndiretaDialog = () => {
    setSelectedIndiretaItem(null);
    setIndiretaReason('');
    setIndiretaDeadline('');
  };

  const handleConfirmIndireta = () => {
    // TODO: Integrar API de registro de indireta quando endpoint estiver disponível.
    closeIndiretaDialog();
  };

  const renderSectionHeader = (key: SectionKey, title: string, count: number, danger = false) => (
    <button
      type="button"
      onClick={() => setExpandedSection((prev) => (prev === key ? 'urgentes' : key))}
      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left shadow-sm ${
        danger ? 'border-red-200 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-800'
      }`}
    >
      <span className="text-sm font-bold">{title}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${danger ? 'bg-red-200' : 'bg-gray-100'}`}>{count}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-orange-600 px-6 py-5 shadow-lg">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <FileText size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold uppercase tracking-widest text-white">LAUDOS PENDENTES DE ENVIO</h1>
                <p className="text-xs text-orange-100">Fila de produção — laudos aguardando elaboração e envio</p>
              </div>
            </div>

            {!isLoading && !isError && (
              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPrioritizeUrgent((value) => !value)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    prioritizeUrgent ? 'bg-red-500 text-white' : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  Priorizar urgentes: {prioritizeUrgent ? 'ON' : 'OFF'}
                </button>
                <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-sm font-bold text-white">
                  <ClipboardList size={14} />
                  {total} pendente{total !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        {isLoading && <LoadingState />}
        {isError && <ErrorState message="Não foi possível carregar os laudos pendentes. Tente novamente." />}

        {!isLoading && !isError && sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-green-200 bg-green-50 py-16 text-center shadow-sm">
            <CheckCircle2 size={48} className="mb-3 text-green-500" />
            <h2 className="text-lg font-bold text-green-700">Todos os laudos foram enviados! ✓</h2>
            <p className="mt-1 text-sm text-green-600">Nenhum laudo pendente de envio no momento.</p>
          </div>
        )}

        {!isLoading && !isError && sorted.length > 0 && (
          <>
            <div className="space-y-2">
              {renderSectionHeader('urgentes', '🔥 Urgentes', urgentItems.length, true)}
              {expandedSection === 'urgentes' && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {urgentItems.map((item, index) => (
                    <LaudoCard key={item.id ?? index} item={item} index={index} urgentTerms={urgentTerms} />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              {renderSectionHeader('indireta', '📋 Fazer Indireta', indiretaItems.length)}
              {expandedSection === 'indireta' && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {indiretaItems.map((item, index) => (
                    <LaudoCard
                      key={item.id ?? index}
                      item={item}
                      index={index}
                      urgentTerms={urgentTerms}
                      extraActions={
                        <button
                          type="button"
                          onClick={() => setSelectedIndiretaItem(item)}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                        >
                          Registrar Indireta
                        </button>
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              {renderSectionHeader('cidade', '🏙️ Por Cidade', sorted.length)}
              {expandedSection === 'cidade' && (
                <div className="space-y-3">
                  {itemsByCity.map(([city, cityItems]) => (
                    <div key={city} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setExpandedCity((prev) => (prev === city ? null : city))}
                        className="flex w-full items-center justify-between text-left"
                      >
                        <span className="font-semibold text-gray-800">{city}</span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">{cityItems.length}</span>
                      </button>
                      {expandedCity === city && (
                        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                          {cityItems.map((item, index) => (
                            <LaudoCard key={item.id ?? index} item={item} index={index} urgentTerms={urgentTerms} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              {renderSectionHeader('espera', '⏳ Por Tempo de Espera', itemsByWait.length)}
              {expandedSection === 'espera' && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {itemsByWait.map((item, index) => (
                    <LaudoCard key={item.id ?? index} item={item} index={index} urgentTerms={urgentTerms} showWaitBadge />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <Dialog open={Boolean(selectedIndiretaItem)} onClose={closeIndiretaDialog} title="Registrar Indireta" className="max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Motivo</label>
            <textarea
              value={indiretaReason}
              onChange={(event) => setIndiretaReason(event.target.value)}
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Informe o motivo para registro de indireta"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Data limite</label>
            <input
              type="date"
              value={indiretaDeadline}
              onChange={(event) => setIndiretaDeadline(event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={closeIndiretaDialog}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmIndireta}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Confirmar
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default LaudosPendentesPage;
