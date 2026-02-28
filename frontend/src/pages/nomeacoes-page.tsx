import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Scale, ChevronDown, ChevronUp, ExternalLink, MapPin } from 'lucide-react';
import { LoadingState } from '@/components/ui/state';
import { periciaService } from '@/services/pericia-service';

const GROUP_COLORS: Record<string, string> = {
  avaliar: 'bg-blue-600',
  aguardando_aceite: 'bg-yellow-500',
  majorar: 'bg-orange-500',
  observacao_extra: 'bg-pink-600',
};

const NomeacoesPage = () => {
  const { data, isLoading } = useQuery({ queryKey: ['nomeacoes'], queryFn: () => periciaService.nomeacoes() });
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(['A AVALIAR (NOVAS)']));

  const toggle = (label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  if (isLoading) return <LoadingState />;

  const groups = data?.groups ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl bg-blue-600 px-6 py-5 text-white shadow">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <Scale size={24} />
          </div>
          <div>
            <p className="text-xl font-bold tracking-wide">CENTRAL DE NOMEAÇÕES</p>
            <p className="text-sm text-white/70">Triagem inicial, aceites, majorações e pendências com observações.</p>
          </div>
        </div>
        <span className="rounded-full bg-white/20 px-3 py-1 text-sm font-semibold">{data?.total ?? 0} itens</span>
      </div>

      <div className="space-y-3">
        {groups.map((group) => {
          const isOpen = openGroups.has(group.label);
          return (
            <div className="overflow-hidden rounded-xl border bg-white shadow-sm" key={group.key}>
              <button
                className={`flex w-full items-center justify-between px-5 py-4 text-white ${GROUP_COLORS[group.key] ?? 'bg-slate-600'}`}
                onClick={() => toggle(group.label)}
              >
                <div className="flex items-center gap-3">
                  <Scale size={18} />
                  <p className="font-bold tracking-wide">{group.label}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-sm font-bold">{group.total}</span>
                  {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
              </button>

              {isOpen && (
                <div className="p-4">
                  {group.items.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-400">Nenhum processo nesta categoria.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {group.items.map((item) => (
                        <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50" key={item.id}>
                          <div className="mb-2 flex items-start justify-between">
                            <p className="font-mono text-xs text-gray-400">{item.processoCNJ}</p>
                            <Link className="text-gray-400 hover:text-blue-600" to={`/pericias/${item.id}`}>
                              <ExternalLink size={14} />
                            </Link>
                          </div>
                          <p className="font-semibold text-gray-800">{item.autorNome || '—'}</p>
                          <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                            <MapPin size={11} />
                            {item.cidade || 'Sem cidade'}
                          </div>
                          <p className="mt-2 text-xs font-medium text-blue-600">Status: {item.status || '—'}</p>
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
