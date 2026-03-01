import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Scale, ChevronDown, ChevronUp, ExternalLink, MapPin, Clock3, AlertCircle, MessageSquareMore } from 'lucide-react';
import { LoadingState } from '@/components/ui/state';
import { apiClient } from '@/lib/api-client';
import { configService } from '@/services/config-service';

type PericiaItem = Record<string, unknown>;

type NomeacoesResponse = {
  items: PericiaItem[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
  statusTotals?: Record<string, number>;
};

type StatusGroup = {
  label: string;
  color: string;
  bodyColor: string;
  textColor: string;
  icon: 'scale' | 'clock' | 'alert' | 'message';
  statuses: string[];
};

const PAGE_SIZE = 20;

const DEFAULT_STATUS_GROUPS: StatusGroup[] = [
  {
    label: 'A AVALIAR (NOVAS)',
    color: 'bg-blue-600',
    bodyColor: 'bg-blue-50',
    textColor: 'text-white',
    icon: 'scale',
    statuses: ['AVALIAR', 'NOVA_NOMEACAO', 'NOMEACAO'],
  },
  {
    label: 'AGUARDANDO ACEITE HONORÁRIOS',
    color: 'bg-yellow-500',
    bodyColor: 'bg-yellow-50',
    textColor: 'text-white',
    icon: 'clock',
    statuses: ['AGUARDANDO_ACEITE', 'ACEITE_HONORARIOS', 'ACEITE'],
  },
  {
    label: 'A MAJORAR HONORÁRIOS',
    color: 'bg-orange-500',
    bodyColor: 'bg-orange-50',
    textColor: 'text-white',
    icon: 'alert',
    statuses: ['A_MAJORAR', 'MAJORAR_HONORARIOS', 'MAJORAR'],
  },
  {
    label: 'COM OBSERVAÇÃO EXTRA',
    color: 'bg-pink-600',
    bodyColor: 'bg-pink-50',
    textColor: 'text-white',
    icon: 'message',
    statuses: ['OBSERVACAO_EXTRA', 'COM_OBSERVACAO', 'OBSERVACAO'],
  },
];

function statusDisplayLabel(item: PericiaItem): string {
  const rawStatus = item.status;

  if (typeof rawStatus === 'string' || typeof rawStatus === 'number') {
    return String(rawStatus);
  }

  if (rawStatus && typeof rawStatus === 'object') {
    const statusObject = rawStatus as Record<string, unknown>;
    if (typeof statusObject.nome === 'string' || typeof statusObject.nome === 'number') {
      return String(statusObject.nome);
    }
    if (typeof statusObject.codigo === 'string' || typeof statusObject.codigo === 'number') {
      return String(statusObject.codigo);
    }
  }

  return '—';
}

function getGroupIcon(icon: StatusGroup['icon']) {
  if (icon === 'clock') return <Clock3 size={18} />;
  if (icon === 'alert') return <AlertCircle size={18} />;
  if (icon === 'message') return <MessageSquareMore size={18} />;
  return <Scale size={18} />;
}

function getStatusCode(item: PericiaItem): string {
  const rawStatus = item.status;

  if (typeof rawStatus === 'string' || typeof rawStatus === 'number') {
    return String(rawStatus).toUpperCase();
  }

  if (rawStatus && typeof rawStatus === 'object') {
    const statusObject = rawStatus as Record<string, unknown>;
    const statusCode = statusObject.codigo;
    const statusName = statusObject.nome;

    if (typeof statusCode === 'string' || typeof statusCode === 'number') {
      return String(statusCode).toUpperCase();
    }

    if (typeof statusName === 'string' || typeof statusName === 'number') {
      return String(statusName).toUpperCase();
    }
  }

  return '';
}

function matchGroup(item: PericiaItem, group: StatusGroup): boolean {
  const status = getStatusCode(item);
  return group.statuses.some((s) => status.includes(s));
}

const NomeacoesPage = () => {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['A AVALIAR (NOVAS)']));
  const { data: dashboardSettings } = useQuery({
    queryKey: ['system-dashboard-settings'],
    queryFn: () => configService.getDashboardSettings(),
  });

  const statusGroups = useMemo<StatusGroup[]>(() => {
    if (!dashboardSettings) return DEFAULT_STATUS_GROUPS;
    return [
      { ...DEFAULT_STATUS_GROUPS[0], statuses: dashboardSettings.nomeacoesGroups.avaliar },
      { ...DEFAULT_STATUS_GROUPS[1], statuses: dashboardSettings.nomeacoesGroups.aceiteHonorarios },
      { ...DEFAULT_STATUS_GROUPS[2], statuses: dashboardSettings.nomeacoesGroups.majorarHonorarios },
      { ...DEFAULT_STATUS_GROUPS[3], statuses: dashboardSettings.nomeacoesGroups.observacaoExtra },
    ];
  }, [dashboardSettings]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ['nomeacoes', PAGE_SIZE],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const response = await apiClient.get<NomeacoesResponse>('/nomeacoes', {
        params: { page: pageParam, limit: PAGE_SIZE },
      });
      return response.data;
    },
    getNextPageParam: (lastPage) => {
      const pagination = lastPage.pagination;
      if (!pagination) return undefined;
      const loaded = pagination.page * pagination.limit;
      return loaded < pagination.total ? pagination.page + 1 : undefined;
    },
  });

  const allItems = useMemo(
    () => (data?.pages ?? []).flatMap((page) => page.items ?? []),
    [data?.pages],
  );

  const total = data?.pages?.[0]?.pagination?.total ?? allItems.length;
  const statusTotals = useMemo(() => data?.pages?.[0]?.statusTotals ?? {}, [data?.pages]);

  const groups = useMemo(
    () =>
      statusGroups.map((sg) => {
        const groupItems = allItems.filter((item) => matchGroup(item, sg));
        const groupTotal = Object.entries(statusTotals).reduce((acc, [status, value]) => {
          if (sg.statuses.some((expected) => status.includes(expected))) {
            return acc + value;
          }
          return acc;
        }, 0);

        return {
          ...sg,
          items: groupItems,
          total: groupTotal,
        };
      }),
    [allItems, statusTotals, statusGroups],
  );

  const loadedCount = allItems.length;

  const toggle = (label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl bg-blue-600 px-6 py-5 text-white shadow">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <Scale size={24} />
          </div>
          <div>
            <p className="text-xl font-bold tracking-wide">CENTRAL DE NOMEAÇÕES</p>
            <p className="text-sm text-white/70">
              Triagem inicial, aceites, majorações e pendências com observações.
            </p>
            <p className="text-xs text-white/70">
              Exibindo {loadedCount} de {total} nomeações
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {groups.map((group) => {
          const isOpen = openGroups.has(group.label);

          return (
            <div className="overflow-hidden rounded-xl border bg-white shadow-sm" key={group.label}>
              <button
                className={`flex w-full items-center justify-between px-5 py-4 ${group.color} ${group.textColor}`}
                onClick={() => toggle(group.label)}
                type="button"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                    {getGroupIcon(group.icon)}
                  </span>
                  <p className="font-bold tracking-wide">{group.label}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white/20 px-2 text-sm font-bold">
                    {group.total}
                  </span>
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              {isOpen && (
                <div className={`p-3 sm:p-4 ${group.bodyColor}`}>
                  {group.items.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-400">
                      Nenhum processo nesta categoria.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {group.items.map((item, i) => (
                        <Link
                          className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50/30"
                          key={String(item.id ?? i)}
                          to={`/pericias/${String(item.id ?? item.periciaId ?? '')}`}
                        >
                          <div className="mb-2 flex items-start justify-between">
                            <p className="inline-flex max-w-full rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
                              {String(item.processoCNJ ?? item.id ?? `#${i + 1}`)}
                            </p>
                            <ExternalLink className="text-slate-300" size={14} />
                          </div>

                          <p className="font-semibold uppercase text-slate-900">
                            {String(item.autorNome ?? item.nome ?? '—')}
                          </p>

                          <p className="text-xs text-slate-500">
                            vs {String(item.reuNome ?? item.parteRe ?? item.parteContraria ?? 'Réu não informado')}
                          </p>

                          {item.cidade != null && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                              <MapPin className="text-pink-500" size={11} />
                              {String(item.cidade)}
                              {item.vara != null ? ` · ${String(item.vara)}` : ''}
                            </div>
                          )}

                          <p className="mt-2 text-xs font-medium text-blue-600">
                            Status: {statusDisplayLabel(item)}
                          </p>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hasNextPage && (
        <div className="flex justify-center py-2">
          <button
            className="rounded-md border border-blue-200 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            disabled={isFetchingNextPage}
            onClick={() => fetchNextPage()}
            type="button"
          >
            {isFetchingNextPage ? 'Carregando...' : 'Carregar mais'}
          </button>
        </div>
      )}
    </div>
  );
};

export default NomeacoesPage;
