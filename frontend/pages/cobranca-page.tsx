import { useState } from 'react';
import { ChevronDown, ChevronUp, Wallet, MapPin } from 'lucide-react';
import { LoadingState, EmptyState } from '@/components/ui/state';
import { useDomainData } from '@/hooks/use-domain-data';

type RecebimentoItem = Record<string, string | number | undefined>;

type CidadeGroup = {
  cidade: string;
  items: RecebimentoItem[];
  total: number;
};

function groupByCidade(items: RecebimentoItem[]): CidadeGroup[] {
  const map: Record<string, RecebimentoItem[]> = {};
  for (const item of items) {
    const cidade = String(item['cidade'] ?? item['referencia'] ?? 'Sem cidade');
    if (!map[cidade]) map[cidade] = [];
    map[cidade].push(item);
  }
  return Object.entries(map)
    .map(([cidade, list]) => ({
      cidade,
      items: list,
      total: list.reduce((sum, i) => sum + Number(i['valor'] ?? 0), 0),
    }))
    .sort((a, b) => b.total - a.total);
}

const CobrancaPage = () => {
  const { data = [], isLoading } = useDomainData('cobranca', '/financial/recebimentos');
  const [openCidades, setOpenCidades] = useState<Set<string>>(new Set());

  const groups = groupByCidade(data);
  const totalGeral = groups.reduce((sum, g) => sum + g.total, 0);
  const totalProcessos = data.length;

  const toggle = (cidade: string) => {
    setOpenCidades((prev) => {
      const next = new Set(prev);
      next.has(cidade) ? next.delete(cidade) : next.add(cidade);
      return next;
    });
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex items-center justify-between rounded-xl bg-green-600 px-6 py-5 text-white shadow">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-xl font-bold tracking-wide">CENTRAL DE COBRANÇA</p>
            <p className="text-sm text-white/70">Gestão ativa de recebíveis judiciais.</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">MONTANTE PENDENTE</p>
          <p className="text-3xl font-bold">
            {totalGeral >= 1000
              ? `R$ ${(totalGeral / 1000).toFixed(0)} mil`
              : `R$ ${totalGeral.toFixed(2)}`}
          </p>
          <p className="text-xs text-white/60">{totalProcessos} processos aguardando</p>
        </div>
      </div>

      {/* City list */}
      {groups.length === 0 ? (
        <EmptyState title="Nenhum recebível encontrado" />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          {groups.map((group) => {
            const isOpen = openCidades.has(group.cidade);
            return (
              <div className="border-b last:border-0" key={group.cidade}>
                <button
                  className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-gray-50"
                  onClick={() => toggle(group.cidade)}
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="text-gray-400" size={18} />
                    <div className="text-left">
                      <p className="font-semibold text-gray-800">{group.cidade}</p>
                      <p className="text-xs text-gray-400">
                        {group.items.length} processo{group.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        TOTAL PENDENTE
                      </p>
                      <p className="font-bold text-gray-800">
                        R${' '}
                        {group.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="text-gray-400" size={18} />
                    ) : (
                      <ChevronDown className="text-gray-400" size={18} />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t bg-gray-50 px-5 py-3">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs font-semibold uppercase text-gray-400">
                          <th className="pb-2 text-left">Referência</th>
                          <th className="pb-2 text-left">Status</th>
                          <th className="pb-2 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((item, i) => (
                          <tr className="border-t border-gray-100" key={i}>
                            <td className="py-2 text-gray-700">
                              {String(item['referencia'] ?? item['processoCNJ'] ?? '—')}
                            </td>
                            <td className="py-2">
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                                {String(item['status'] ?? 'A_RECEBER')}
                              </span>
                            </td>
                            <td className="py-2 text-right font-medium text-gray-800">
                              R${' '}
                              {Number(item['valor'] ?? 0).toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CobrancaPage;
