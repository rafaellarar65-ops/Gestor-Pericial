import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarX, Clock, MapPin } from 'lucide-react';
import { LoadingState } from '@/components/ui/state';
import { useDomainData } from '@/hooks/use-domain-data';

type PericiaItem = Record<string, string | number | undefined>;

function formatDateBR(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const PericiasHojePage = () => {
  const [date, setDate] = useState(new Date());
  const { data = [], isLoading } = useDomainData('pericias-hoje', '/pericias-hoje');

  const prevDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(d);
  };

  const nextDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    setDate(d);
  };

  // Filter items that match the selected date (by dataAgendamento field)
  const dayStr = date.toISOString().slice(0, 10);
  const filtered = data.filter((item: PericiaItem) => {
    const da = String(item['dataAgendamento'] ?? '');
    return da.startsWith(dayStr);
  });
  // If API doesn't return date-specific data, show all for today's date
  const items = filtered.length > 0 || data.length === 0 ? filtered : data;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-xl bg-pink-600 px-6 py-5 text-white shadow">
        <div>
          <p className="text-xl font-bold tracking-wide">PERÍCIAS DO DIA</p>
          <p className="text-sm text-white/70">Agenda diária de perícias presenciais e teleperícias.</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-2">
          <button className="rounded p-1 hover:bg-white/20" onClick={prevDay}>
            <ChevronLeft size={18} />
          </button>
          <span className="min-w-[110px] text-center font-semibold">{formatDateBR(date)}</span>
          <button className="rounded p-1 hover:bg-white/20" onClick={nextDay}>
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Counter */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span className="rounded-full bg-pink-100 px-3 py-1 font-semibold text-pink-700">
          {items.length} AGENDADAS
        </span>
        <span>para {formatDateBR(date)}</span>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-white py-20 text-center shadow-sm">
          <CalendarX className="mb-4 text-gray-300" size={64} />
          <p className="text-lg font-semibold text-gray-500">Nenhuma perícia agendada para hoje.</p>
          <p className="mt-1 text-sm text-gray-400">Use a navegação acima para ver outros dias.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item: PericiaItem, i: number) => (
            <div
              className="flex items-center gap-4 rounded-xl border bg-white px-5 py-4 shadow-sm hover:border-pink-200 transition-colors"
              key={i}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-pink-100 text-pink-600 font-bold text-sm">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs text-gray-400">
                  {String(item['processoCNJ'] ?? '—')}
                </p>
                <p className="font-semibold text-gray-800 truncate">
                  {String(item['autorNome'] ?? item['nome'] ?? '—')}
                </p>
                {item['cidade'] && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                    <MapPin size={11} />
                    {String(item['cidade'])}
                  </div>
                )}
              </div>
              {item['dataAgendamento'] && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Clock size={14} />
                  {String(item['dataAgendamento']).slice(11, 16)}
                </div>
              )}
              <span className="rounded-full bg-green-100 px-3 py-0.5 text-xs font-medium text-green-700">
                {String(item['status'] ?? 'AGENDADA')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PericiasHojePage;
