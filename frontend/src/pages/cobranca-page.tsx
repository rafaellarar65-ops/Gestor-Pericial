import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Wallet, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LoadingState, EmptyState } from '@/components/ui/state';
import { useDomainData } from '@/hooks/use-domain-data';

type RecebimentoItem = Record<string, string | number | undefined>;

type VaraGroup = {
  varaId: string;
  varaNome: string;
  items: RecebimentoItem[];
  total: number;
};

type AgingMetric = {
  label: string;
  count: number;
  value: number;
  className: string;
};

const FALLBACK_VARA_ID = 'sem-vara';
const FALLBACK_VARA_NOME = 'Sem Vara';

const formatCurrency = (value: number) =>
  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const toNumber = (value: string | number | undefined): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const toDelayDays = (item: RecebimentoItem): number | null => {
  const delayFields = ['diasAtraso', 'daysOverdue', 'daysPending', 'atrasoDias', 'agingDays', 'aging'];
  for (const field of delayFields) {
    const value = item[field];
    if (value !== undefined && value !== null) {
      const parsed = toNumber(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  const dueDateFields = ['dataVencimento', 'vencimento', 'dueDate'];
  for (const field of dueDateFields) {
    const rawDate = item[field];
    if (typeof rawDate === 'string') {
      const dueDate = new Date(rawDate);
      if (!Number.isNaN(dueDate.getTime())) {
        const now = new Date();
        const diffMs = now.getTime() - dueDate.getTime();
        return Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }
    }
  }

  return null;
};

const getUrgencyBadge = (delayDays: number | null) => {
  if (delayDays === null || delayDays <= 0) {
    return { label: 'No prazo', className: 'bg-emerald-100 text-emerald-700' };
  }
  if (delayDays > 90) {
    return { label: '>90d', className: 'bg-red-200 text-red-800' };
  }
  if (delayDays > 60) {
    return { label: '>60d', className: 'bg-orange-200 text-orange-800' };
  }
  if (delayDays > 30) {
    return { label: '>30d', className: 'bg-amber-200 text-amber-800' };
  }
  return { label: 'Até 30d', className: 'bg-blue-100 text-blue-700' };
};

function groupByVara(items: RecebimentoItem[]): VaraGroup[] {
  const map: Record<string, VaraGroup> = {};
  for (const item of items) {
    const rawVaraId = item['varaId'];
    const varaId = rawVaraId ? String(rawVaraId) : FALLBACK_VARA_ID;
    const varaNome = String(item['varaNome'] ?? FALLBACK_VARA_NOME);

    if (!map[varaId]) {
      map[varaId] = { varaId, varaNome, items: [], total: 0 };
    }

    map[varaId].items.push(item);
    map[varaId].total += toNumber(item['valor']);
  }

  return Object.values(map).sort((a, b) => b.total - a.total);
}

const CobrancaPage = () => {
  const navigate = useNavigate();
  const { data = [], isLoading } = useDomainData('cobranca', '/financial/recebimentos');
  const [openVaras, setOpenVaras] = useState<Set<string>>(new Set());

  const groups = useMemo(() => groupByVara(data), [data]);

  const kpis = useMemo(() => {
    const totalReceber = data.reduce((sum, item) => sum + toNumber(item['valor']), 0);

    const buildAgingMetric = (
      threshold: number,
      label: string,
      className: string,
    ): AgingMetric => {
      const filtered = data.filter((item) => {
        const delayDays = toDelayDays(item);
        return delayDays !== null && delayDays > threshold;
      });

      return {
        label,
        count: filtered.length,
        value: filtered.reduce((sum, item) => sum + toNumber(item['valor']), 0),
        className,
      };
    };

    return {
      totalReceber,
      aging: [
        buildAgingMetric(30, 'Vencidos >30d', 'bg-amber-100 text-amber-800'),
        buildAgingMetric(60, 'Vencidos >60d', 'bg-orange-100 text-orange-800'),
        buildAgingMetric(90, 'Vencidos >90d', 'bg-red-100 text-red-800'),
      ],
    };
  }, [data]);

  const totalProcessos = data.length;

  const toggle = (varaId: string) => {
    setOpenVaras((prev) => {
      const next = new Set(prev);
      if (next.has(varaId)) next.delete(varaId);
      else next.add(varaId);
      return next;
    });
  };

  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-xl bg-green-600 px-6 py-5 text-white shadow">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-xl font-bold tracking-wide">CENTRAL DE COBRANÇA</p>
            <p className="text-sm text-white/70">Gestão ativa de recebíveis judiciais por vara.</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">TOTAL A RECEBER</p>
          <p className="text-3xl font-bold">
            {kpis.totalReceber >= 1000
              ? `R$ ${(kpis.totalReceber / 1000).toFixed(0)} mil`
              : formatCurrency(kpis.totalReceber)}
          </p>
          <p className="text-xs text-white/60">{totalProcessos} processos aguardando</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {kpis.aging.map((metric) => (
          <div className={`rounded-xl border px-4 py-3 ${metric.className}`} key={metric.label}>
            <p className="text-xs font-semibold uppercase tracking-wide">{metric.label}</p>
            <p className="mt-1 text-lg font-bold">{metric.count} casos</p>
            <p className="text-sm font-medium">{formatCurrency(metric.value)}</p>
          </div>
        ))}
      </div>

      {groups.length === 0 ? (
        <EmptyState title="Nenhum recebível encontrado" />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          {groups.map((group) => {
            const isOpen = openVaras.has(group.varaId);
            return (
              <div className="border-b last:border-0" key={group.varaId}>
                <button
                  className="flex w-full items-center justify-between px-5 py-4 transition-colors hover:bg-gray-50"
                  onClick={() => toggle(group.varaId)}
                >
                  <div className="flex items-center gap-3">
                    <Scale className="text-gray-400" size={18} />
                    <div className="text-left">
                      <p className="font-semibold text-gray-800">{group.varaNome || FALLBACK_VARA_NOME}</p>
                      <p className="text-xs text-gray-400">
                        {group.items.length} processo{group.items.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        SUBTOTAL
                      </p>
                      <p className="font-bold text-gray-800">{formatCurrency(group.total)}</p>
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
                    <div className="mb-3 flex justify-end">
                      <button
                        className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-green-700"
                        onClick={() => navigate(`/comunicacao?mode=BILLING&varaId=${group.varaId}`)}
                        type="button"
                      >
                        Gerar Cobrança
                      </button>
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs font-semibold uppercase text-gray-400">
                          <th className="pb-2 text-left">Referência</th>
                          <th className="pb-2 text-left">Status</th>
                          <th className="pb-2 text-left">Urgência</th>
                          <th className="pb-2 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((item, i) => {
                          const urgency = getUrgencyBadge(toDelayDays(item));
                          return (
                            <tr className="border-t border-gray-100" key={i}>
                              <td className="py-2 text-gray-700">
                                {String(item['referencia'] ?? item['processoCNJ'] ?? '—')}
                              </td>
                              <td className="py-2">
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                                  {String(item['status'] ?? 'A_RECEBER')}
                                </span>
                              </td>
                              <td className="py-2">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${urgency.className}`}>
                                  {urgency.label}
                                </span>
                              </td>
                              <td className="py-2 text-right font-medium text-gray-800">
                                {formatCurrency(toNumber(item['valor']))}
                              </td>
                            </tr>
                          );
                        })}
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
