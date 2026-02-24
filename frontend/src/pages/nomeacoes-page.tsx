import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Scale, ChevronDown, ChevronUp, ExternalLink, MapPin } from 'lucide-react';
import { LoadingState } from '@/components/ui/state';
import { useDomainData } from '@/hooks/use-domain-data';

type PericiaItem = Record<string, string | number | undefined>;

type StatusGroup = {
  label: string;
  color: string;
  textColor: string;
  statuses: string[];
};

const STATUS_GROUPS: StatusGroup[] = [
  {
    label: 'A AVALIAR (NOVAS)',
    color: 'bg-blue-600',
    textColor: 'text-white',
    statuses: ['NOVA_NOMEACAO', 'AVALIAR'],
  },
  {
    label: 'AGUARDANDO ACEITE HONORÁRIOS',
    color: 'bg-yellow-500',
    textColor: 'text-white',
    statuses: ['AGUARDANDO_ACEITE', 'ACEITE_HONORARIOS'],
  },
  {
    label: 'A MAJORAR HONORÁRIOS',
    color: 'bg-orange-500',
    textColor: 'text-white',
    statuses: ['A_MAJORAR', 'MAJORAR_HONORARIOS'],
  },
  {
    label: 'COM OBSERVAÇÃO EXTRA',
    color: 'bg-pink-600',
    textColor: 'text-white',
    statuses: ['OBSERVACAO_EXTRA', 'COM_OBSERVACAO'],
  },
];

function matchGroup(item: PericiaItem, group: StatusGroup): boolean {
  const status = String(item['status'] ?? '').toUpperCase();
  return group.statuses.some((s) => status.includes(s));
}

const NomeacoesPage = () => {
  const { data = [], isLoading } = useDomainData('nomeacoes', '/nomeacoes');
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['A AVALIAR (NOVAS)']));

  const toggle = (label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  // Distribute items into groups; unmatched go to first group
  const groups = STATUS_GROUPS.map((sg) => ({
    ...sg,
    items: data.filter((item) => matchGroup(item, sg)),
  }));
  // Items that didn't match any group go to "A AVALIAR"
  const unmatched = data.filter((item) =>
    !STATUS_GROUPS.some((sg) => matchGroup(item, sg)),
  );
  groups[0].items = [...groups[0].items, ...unmatched];

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      {/* Header Banner */}
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
          </div>
        </div>
      </div>

      {/* Status Groups */}
      <div className="space-y-3">
        {groups.map((group) => {
          const isOpen = openGroups.has(group.label);
          return (
            <div className="overflow-hidden rounded-xl border bg-white shadow-sm" key={group.label}>
              {/* Group header */}
              <button
                className={`flex w-full items-center justify-between px-5 py-4 ${group.color} ${group.textColor}`}
                onClick={() => toggle(group.label)}
              >
                <div className="flex items-center gap-3">
                  <Scale size={18} />
                  <p className="font-bold tracking-wide">{group.label}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
                    {group.items.length}
                  </span>
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              {/* Cards grid */}
              {isOpen && (
                <div className="p-4">
                  {group.items.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-400">Nenhum processo nesta categoria.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {group.items.map((item, i) => (
                        <div
                          className="rounded-lg border border-gray-100 bg-gray-50 p-4 hover:border-blue-200 hover:bg-blue-50 transition-colors"
                          key={i}
                        >
                          <div className="mb-2 flex items-start justify-between">
                            <p className="font-mono text-xs text-gray-400">
                              {String(item['processoCNJ'] ?? item['id'] ?? `#${i + 1}`)}
                            </p>
                            {item['id'] && (
                              <Link
                                className="text-gray-400 hover:text-blue-600"
                                to={`/pericias/${item['id']}`}
                              >
                                <ExternalLink size={14} />
                              </Link>
                            )}
                          </div>
                          <p className="font-semibold text-gray-800">
                            {String(item['autorNome'] ?? item['nome'] ?? '—')}
                          </p>
                          {item['reuNome'] && (
                            <p className="mt-0.5 text-xs text-gray-500">
                              vs {String(item['reuNome'])}
                            </p>
                          )}
                          {item['cidade'] && (
                            <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                              <MapPin size={11} />
                              {String(item['cidade'])}
                            </div>
                          )}
                          <p className="mt-2 text-xs font-medium text-blue-600">
                            Status: {String(item['status'] ?? '—')}
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
    </div>
  );
};

export default NomeacoesPage;
