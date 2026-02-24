import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { FileText, MapPin, FileEdit, AlertTriangle, CheckCircle2, ClipboardList } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { useDomainData } from '@/hooks/use-domain-data';

type LaudoItem = {
  id?: string | number;
  processoCNJ?: string;
  autorNome?: string;
  reuNome?: string;
  cidade?: string;
  status?: string;
  isUrgent?: boolean | string | number;
  [key: string]: string | number | boolean | undefined;
};

const isItemUrgent = (item: LaudoItem): boolean => {
  if (item.isUrgent === true || item.isUrgent === 1 || item.isUrgent === 'true') return true;
  if (typeof item.status === 'string' && item.status.toUpperCase().includes('URGENTE')) return true;
  return false;
};

const getStatusColor = (status?: string): string => {
  if (!status) return 'bg-gray-100 text-gray-600';
  const s = status.toUpperCase();
  if (s.includes('URGENTE')) return 'bg-red-100 text-red-700';
  if (s.includes('PENDENTE')) return 'bg-orange-100 text-orange-700';
  if (s.includes('AGUARDANDO')) return 'bg-yellow-100 text-yellow-700';
  if (s.includes('ELABORA')) return 'bg-blue-100 text-blue-700';
  if (s.includes('PRONTO') || s.includes('CONCLU')) return 'bg-green-100 text-green-700';
  return 'bg-gray-100 text-gray-700';
};

const LaudoCard = ({ item, index }: { item: LaudoItem; index: number }) => {
  const urgent = isItemUrgent(item);
  const itemId = item.id ?? index;
  const detailHref = `/pericias/${itemId}`;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md ${
        urgent ? 'border-red-300' : 'border-gray-200'
      }`}
    >
      {urgent && (
        <div className="absolute left-0 top-0 h-full w-1 bg-red-500" />
      )}

      <div className="p-4 pl-5">
        {/* Top row: urgency badge + process number */}
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {urgent && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-red-700">
              <AlertTriangle size={11} />
              URGENTE
            </span>
          )}
          <span className="font-mono text-sm font-semibold text-gray-800">
            {item.processoCNJ ?? '—'}
          </span>
        </div>

        {/* Author / Réu */}
        <div className="mb-3 grid grid-cols-1 gap-0.5 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Autor</p>
            <p className="truncate text-sm font-medium text-gray-700">{item.autorNome ?? '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Réu</p>
            <p className="truncate text-sm font-medium text-gray-700">{item.reuNome ?? '—'}</p>
          </div>
        </div>

        {/* City + status */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <MapPin size={12} className="text-orange-500" />
            {item.cidade ?? '—'}
          </span>
          {item.status && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${getStatusColor(
                item.status as string,
              )}`}
            >
              {item.status}
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Link
            to={detailHref}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-orange-700"
          >
            <FileEdit size={14} />
            ELABORAR LAUDO
          </Link>
          <Link
            to={detailHref}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:border-gray-300 hover:text-gray-700"
          >
            Ver Processo
          </Link>
        </div>
      </div>
    </div>
  );
};

const LaudosPendentesPage = () => {
  const { data = [], isLoading, isError } = useDomainData('laudos-pendentes', '/laudos-pendentes');

  const sorted = useMemo(() => {
    const items = data as LaudoItem[];
    return [...items].sort((a, b) => {
      const aUrgent = isItemUrgent(a) ? 0 : 1;
      const bUrgent = isItemUrgent(b) ? 0 : 1;
      return aUrgent - bUrgent;
    });
  }, [data]);

  const total = sorted.length;
  const urgentCount = useMemo(() => sorted.filter(isItemUrgent).length, [sorted]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-orange-600 px-6 py-5 shadow-lg">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                <FileText size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold uppercase tracking-widest text-white">
                  LAUDOS PENDENTES DE ENVIO
                </h1>
                <p className="text-xs text-orange-100">Fila de produção — laudos aguardando elaboração e envio</p>
              </div>
            </div>

            {/* Count badge */}
            {!isLoading && !isError && (
              <div className="flex items-center gap-2">
                {urgentCount > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white shadow">
                    <AlertTriangle size={12} />
                    {urgentCount} URGENTE{urgentCount !== 1 ? 'S' : ''}
                  </span>
                )}
                <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-sm font-bold text-white">
                  <ClipboardList size={14} />
                  {total} pendente{total !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Progress bar */}
        {!isLoading && !isError && total > 0 && (
          <div className="mb-6 rounded-xl border border-orange-200 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">
                Progresso da Fila
              </span>
              <span className="text-sm font-bold text-orange-600">
                0 de {total} laudos concluídos
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-orange-100">
              <div
                className="h-full rounded-full bg-orange-500 transition-all"
                style={{ width: '0%' }}
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              {urgentCount > 0
                ? `${urgentCount} laudo${urgentCount !== 1 ? 's' : ''} urgente${urgentCount !== 1 ? 's' : ''} no topo da fila`
                : 'Todos os laudos em processamento normal'}
            </p>
          </div>
        )}

        {/* States */}
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {sorted.map((item, index) => (
              <LaudoCard key={item.id ?? index} item={item} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LaudosPendentesPage;
