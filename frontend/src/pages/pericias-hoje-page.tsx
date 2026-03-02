import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CalendarX, Clock, MapPin, Pause, Play } from 'lucide-react';
import { LoadingState } from '@/components/ui/state';
import { useDomainData } from '@/hooks/use-domain-data';

type PericiaItem = Record<string, string | number | undefined>;

function formatDateBR(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const PericiasHojePage = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [timers, setTimers] = useState<Record<string, { start: number | null; elapsed: number; running: boolean }>>({});
  const { data = [], isLoading } = useDomainData('pericias-hoje', '/pericias-hoje');

  const getStatusName = (status: unknown) => {
    if (typeof status === 'string') return status;
    if (status && typeof status === 'object') {
      const value = status as { nome?: string; codigo?: string };
      return value.nome ?? value.codigo ?? '';
    }
    return '';
  };

  const isTelepericia = (item: PericiaItem) => getStatusName(item['status']).toLowerCase().includes('tele');

  const getItemTimerId = (item: PericiaItem, index: number) =>
    String(item['id'] ?? item['processoCNJ'] ?? item['autorNome'] ?? index);

  const formatTimer = (elapsedSeconds: number) => {
    const hours = Math.floor(elapsedSeconds / 3600)
      .toString()
      .padStart(2, '0');
    const minutes = Math.floor((elapsedSeconds % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const seconds = Math.floor(elapsedSeconds % 60)
      .toString()
      .padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((id) => {
          if (next[id].running && next[id].start) {
            next[id] = { ...next[id], elapsed: Math.floor((Date.now() - next[id].start) / 1000) };
          }
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const prevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const nextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const scheduledItems = useMemo(
    () =>
      data
        .filter((item: PericiaItem) => Boolean(item['dataAgendamento']))
        .sort((a: PericiaItem, b: PericiaItem) => {
          const aTime = String(a['horaAgendamento'] ?? String(a['dataAgendamento']).slice(11, 16) ?? '00:00');
          const bTime = String(b['horaAgendamento'] ?? String(b['dataAgendamento']).slice(11, 16) ?? '00:00');
          return aTime.localeCompare(bTime);
        }),
    [data],
  );

  const dayStr = selectedDate.toISOString().slice(0, 10);
  const items = scheduledItems.filter((item: PericiaItem) => String(item['dataAgendamento']).startsWith(dayStr));

  const presencialItems = items.filter((item) => !isTelepericia(item));
  const telepericiaItems = items.filter((item) => isTelepericia(item));

  const toggleTimer = (itemId: string) => {
    setTimers((prev) => {
      const current = prev[itemId] ?? { start: null, elapsed: 0, running: false };
      if (current.running) {
        return {
          ...prev,
          [itemId]: {
            ...current,
            elapsed: current.start ? Math.floor((Date.now() - current.start) / 1000) : current.elapsed,
            running: false,
            start: null,
          },
        };
      }

      const now = Date.now();
      return {
        ...prev,
        [itemId]: {
          ...current,
          running: true,
          start: now - current.elapsed * 1000,
        },
      };
    });
  };

  const subtitleDate = `para ${formatDateBR(selectedDate)}`;

  const renderPericiaCard = (item: PericiaItem, i: number, sectionTone: 'blue' | 'purple') => {
    const timerId = getItemTimerId(item, i);
    const timer = timers[timerId] ?? { start: null, elapsed: 0, running: false };
    const borderTone = sectionTone === 'blue' ? 'hover:border-blue-200' : 'hover:border-purple-200';

    return (
      <div className={`rounded-xl border bg-white px-5 py-4 shadow-sm transition-colors ${borderTone}`} key={timerId}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-pink-100 text-sm font-bold text-pink-600">
            {String(i + 1).padStart(2, '0')}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-xs text-gray-400">{String(item['processoCNJ'] ?? '—')}</p>
            <p className="truncate font-semibold text-gray-800">{String(item['autorNome'] ?? item['nome'] ?? '—')}</p>
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
              {String(item['horaAgendamento'] ?? String(item['dataAgendamento']).slice(11, 16))}
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

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <div className="flex items-center gap-3">
            <p className="font-mono text-2xl text-slate-700">{formatTimer(timer.elapsed)}</p>
            <button
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1 text-sm font-medium hover:bg-slate-50"
              onClick={() => toggleTimer(timerId)}
              type="button"
            >
              {timer.running ? <Pause size={14} /> : <Play size={14} />}
              {timer.running ? 'Stop' : 'Play'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className="rounded-md border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700" type="button">
              ✓ Realizada
            </button>
            <button className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700" type="button">
              ✗ Ausência
            </button>
            <button className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700" type="button">
              📝 Iniciar Laudo
            </button>
          </div>
        </div>
      </div>
    );
  };

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
          <span className="min-w-[150px] rounded px-2 py-1 text-center font-semibold">{formatDateBR(selectedDate)}</span>
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
        <div className="space-y-4">
          <section className="space-y-3 rounded-xl border-2 border-blue-200 bg-blue-50/40 p-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-blue-700">Presenciais ({presencialItems.length})</h3>
            {presencialItems.length === 0 ? (
              <p className="rounded-lg border border-dashed border-blue-200 bg-white px-3 py-2 text-sm text-blue-500">
                Nenhuma perícia presencial para esta data.
              </p>
            ) : (
              presencialItems.map((item, i) => renderPericiaCard(item, i, 'blue'))
            )}
          </section>

          <section className="space-y-3 rounded-xl border-2 border-purple-200 bg-purple-50/40 p-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-purple-700">Teleperícias ({telepericiaItems.length})</h3>
            {telepericiaItems.length === 0 ? (
              <p className="rounded-lg border border-dashed border-purple-200 bg-white px-3 py-2 text-sm text-purple-500">
                Nenhuma teleperícia para esta data.
              </p>
            ) : (
              telepericiaItems.map((item, i) => renderPericiaCard(item, i, 'purple'))
            )}
          </section>
        </div>
      )}
    </div>
  );
};

export default PericiasHojePage;
