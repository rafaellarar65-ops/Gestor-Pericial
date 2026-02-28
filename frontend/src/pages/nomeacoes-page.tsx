import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Scale, ChevronDown, ChevronUp, ExternalLink, MapPin } from 'lucide-react';
import { LoadingState } from '@/components/ui/state';
import { apiClient } from '@/lib/api-client';

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
  textColor: string;
  statuses: string[];
};

const PAGE_SIZE = 20;

const STATUS_GROUPS: StatusGroup[] = [
  {
    label: 'A AVALIAR (NOVAS)',
    color: 'bg-blue-600',
    textColor: 'text-white',
    statuses: ['AVALIAR', 'NOVA_NOMEACAO', 'NOMEACAO'],
  },
  {
    label: 'AGUARDANDO ACEITE HONORÁRIOS',
    color: 'bg-yellow-500',
    textColor: 'text-white',
    statuses: ['AGUARDANDO_ACEITE', 'ACEITE_HONORARIOS', 'ACEITE'],
  },
  {
    label: 'A MAJORAR HONORÁRIOS',
    color: 'bg-orange-500',
    textColor: 'text-white',
    statuses: ['A_MAJORAR', 'MAJORAR_HONORARIOS', 'MAJORAR'],
  },
  {
    label: 'COM OBSERVAÇÃO EXTRA',
    color: 'bg-pink-600',
    textColor: 'text-white',
    statuses: ['OBSERVACAO_EXTRA', 'COM_OBSERVACAO', 'OBSERVACAO'],
  },
];

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
  const statusTotals = data?.pages?.[0]?.statusTotals ?? {};

  const groups = useMemo(
    () =>
      STATUS_GROUPS.map((sg) => {
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
    [allItems, statusTotals],
  );

  const loadedCount = allItems.length;

  const toggle = (label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
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
                  <Scale size={18} />
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
                <div className="p-4">
                  {group.items.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-400">
                      Nenhum processo nesta categoria.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {group.items.map((item, i) => (
                        <div
                          className="rounded-lg border border-gray-100 bg-gray-50 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50"
                          key={String(item.id ?? i)}
                        >
                          <div className="mb-2 flex items-start justify-between">
                            <p className="font-mono text-xs text-gray-400">
                              {String(item.processoCNJ ?? item.id ?? `#${i + 1}`)}
                            </p>
                            {item.id && (
                              <Link
                                className="text-gray-400 hover:text-blue-600"
                                to={`/pericias/${String(item.id)}`}
                              >
                                <ExternalLink size={14} />
                              </Link>
                            )}
                          </div>

                          <p className="font-semibold text-gray-800">
                            {String(item.autorNome ?? item.nome ?? '—')}
                          </p>

                          {item.cidade && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                              <MapPin size={11} />
                              {String(item.cidade)}
                            </div>
                          )}

                          <p className="mt-2 text-xs font-medium text-blue-600">
                            Status: {getStatusCode(item) || '—'}
                          </p>
                        </div>
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