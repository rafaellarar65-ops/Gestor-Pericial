import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarX, Clock, MapPin } from 'lucide-react';
import { LoadingState } from '@/components/ui/state';
import { useDomainData } from '@/hooks/use-domain-data';

type PericiaItem = Record<string, string | number | undefined>;

function formatDateBR(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const PericiasHojePage = () => {
  const [date, setDate] = useState<Date | null>(null);
  const { data = [], isLoading } = useDomainData('pericias-hoje', '/pericias-hoje');

  const prevDay = () => {
    const d = new Date(date ?? new Date());
    d.setDate(d.getDate() - 1);
    setDate(d);
  };

  const nextDay = () => {
    const d = new Date(date ?? new Date());
    d.setDate(d.getDate() + 1);
    setDate(d);
  };

  const scheduledItems = useMemo(
    () =>
      data
        .filter((item: PericiaItem) => Boolean(item['dataAgendamento']))
        .sort((a: PericiaItem, b: PericiaItem) => {
          const aDate = new Date(String(a['dataAgendamento']));
          const bDate = new Date(String(b['dataAgendamento']));
          return aDate.getTime() - bDate.getTime();
        }),
    [data],
  );

  const dayStr = date?.toISOString().slice(0, 10);
  const items = dayStr
    ? scheduledItems.filter((item: PericiaItem) => String(item['dataAgendamento']).startsWith(dayStr))
    : scheduledItems;

  const subtitleDate = date ? `para ${formatDateBR(date)}` : 'em ordem cronológica';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-xl bg-pink-600 px-6 py-5 text-white shadow">
        <div>
          <p className="text-xl font-bold tracking-wide">PRÓXIMAS PERÍCIAS</p>
          <p className="text-sm text-white/70">Agenda futura de perícias com data e horário de agendamento.</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-2">
          <button className="rounded p-1 hover:bg-white/20" onClick={prevDay}>
            <ChevronLeft size={18} />
          </button>
          <button
            className="min-w-[150px] rounded px-2 py-1 text-center font-semibold hover:bg-white/20"
            onClick={() => setDate((prev) => (prev ? null : new Date()))}
            type="button"
          >
            {date ? formatDateBR(date) : 'Todas as datas'}
          </button>
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
        <span>{subtitleDate}</span>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border bg-white py-20 text-center shadow-sm">
          <CalendarX className="mb-4 text-gray-300" size={64} />
          <p className="text-lg font-semibold text-gray-500">Nenhuma perícia encontrada para este filtro.</p>
          <p className="mt-1 text-sm text-gray-400">Ajuste a data selecionada para consultar outros agendamentos.</p>
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
              {item['id'] && (
                <Link
                  className="rounded-full border border-pink-200 px-3 py-1 text-xs font-semibold text-pink-700 hover:bg-pink-50"
                  to={`/pericias/${item['id']}`}
                >
                  Ajustar data/local
                </Link>
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
