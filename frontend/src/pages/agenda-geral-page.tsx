import { useMemo, useState } from 'react';
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { usePericiasQuery } from '@/hooks/use-pericias';
import type { Pericia } from '@/types/api';

type ViewMode = 'MONTH' | 'WEEK' | 'YEAR' | 'LIST';

type AgendaPericia = {
  id: string;
  processoCNJ: string;
  cidade: string;
  data: Date;
  isTelepericia: boolean;
};

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MODE_LABEL: Record<ViewMode, string> = {
  MONTH: 'Mês',
  WEEK: 'Semana',
  YEAR: 'Ano',
  LIST: 'Lista',
};

const parseAgendamentoDate = (value?: string) => {
  if (!value) return null;
  const parsed = parseISO(value);
  return isValid(parsed) ? parsed : null;
};

const getStatusName = (status: unknown) => {
  if (typeof status === 'string') return status;
  if (status && typeof status === 'object') {
    const value = status as { nome?: string; codigo?: string };
    return value.nome ?? value.codigo ?? '';
  }
  return '';
};

const getCity = (cidade: unknown) => {
  if (typeof cidade === 'string') return cidade;
  if (cidade && typeof cidade === 'object') {
    const value = cidade as { nome?: string };
    return value.nome ?? 'Não informado';
  }
  return 'Não informado';
};

const AgendaGeralPage = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('MONTH');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const periciasQuery = usePericiasQuery(1, { limit: 500 });

  const pericias = useMemo<AgendaPericia[]>(() => {
    const items = (periciasQuery.data?.items ?? []) as Array<Pericia & { status?: unknown; cidade?: unknown }>;

    return items
      .filter((item) => Boolean(item.dataAgendamento))
      .map((item) => {
        const data = parseAgendamentoDate(item.dataAgendamento);
        if (!data) return null;

        const status = getStatusName(item.status);
        const isTelepericia = status.toLowerCase().includes('tele');

        return {
          id: item.id,
          processoCNJ: item.processoCNJ,
          cidade: getCity(item.cidade),
          data,
          isTelepericia,
        };
      })
      .filter((item): item is AgendaPericia => Boolean(item));
  }, [periciasQuery.data?.items]);

  const periciasByDay = useMemo(() => {
    const map = new Map<string, AgendaPericia[]>();

    pericias.forEach((pericia) => {
      const key = format(pericia.data, 'yyyy-MM-dd');
      const list = map.get(key) ?? [];
      list.push(pericia);
      map.set(key, list);
    });

    map.forEach((list) => {
      list.sort((a, b) => a.data.getTime() - b.data.getTime());
    });

    return map;
  }, [pericias]);

  const periodLabel = useMemo(() => {
    if (viewMode === 'MONTH') return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR });
    if (viewMode === 'WEEK') {
      const start = startOfWeek(currentDate, { weekStartsOn: 0 });
      const end = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(start, 'dd MMM', { locale: ptBR })} - ${format(end, 'dd MMM yyyy', { locale: ptBR })}`;
    }
    if (viewMode === 'YEAR') return format(currentDate, 'yyyy', { locale: ptBR });

    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    const end = endOfWeek(currentDate, { weekStartsOn: 0 });
    return `${format(start, 'dd MMM', { locale: ptBR })} - ${format(end, 'dd MMM yyyy', { locale: ptBR })}`;
  }, [currentDate, viewMode]);

  const monthDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const visibleStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const visibleEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: visibleStart, end: visibleEnd });
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate]);

  const listGroups = useMemo(() => {
    const sorted = [...pericias].sort((a, b) => a.data.getTime() - b.data.getTime());
    const map = new Map<string, AgendaPericia[]>();

    sorted.forEach((item) => {
      const key = format(item.data, 'yyyy-MM-dd');
      const group = map.get(key) ?? [];
      group.push(item);
      map.set(key, group);
    });

    return [...map.entries()];
  }, [pericias]);

  const goToToday = () => setCurrentDate(new Date());

  const goToPrevious = () => {
    if (viewMode === 'MONTH') {
      setCurrentDate((prev) => subMonths(prev, 1));
      return;
    }

    if (viewMode === 'YEAR') {
      setCurrentDate((prev) => {
        const next = new Date(prev);
        next.setFullYear(next.getFullYear() - 1);
        return next;
      });
      return;
    }

    setCurrentDate((prev) => subWeeks(prev, 1));
  };

  const goToNext = () => {
    if (viewMode === 'MONTH') {
      setCurrentDate((prev) => addMonths(prev, 1));
      return;
    }

    if (viewMode === 'YEAR') {
      setCurrentDate((prev) => {
        const next = new Date(prev);
        next.setFullYear(next.getFullYear() + 1);
        return next;
      });
      return;
    }

    setCurrentDate((prev) => addWeeks(prev, 1));
  };

  if (periciasQuery.isLoading) return <LoadingState />;
  if (periciasQuery.isError) return <ErrorState message="Erro ao carregar agenda geral." />;
  if (pericias.length === 0) return <EmptyState title="Nenhuma perícia com agendamento encontrada." />;

  return (
    <div className="space-y-4">
      <header className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">Agenda Geral</h1>

          <div className="flex items-center gap-2 rounded-lg border px-2 py-1">
            <button className="rounded p-1 hover:bg-slate-100" onClick={goToPrevious} type="button">
              ◀
            </button>
            <button className="rounded-md bg-slate-100 px-3 py-1 text-sm" onClick={goToToday} type="button">
              Hoje
            </button>
            <button className="rounded p-1 hover:bg-slate-100" onClick={goToNext} type="button">
              ▶
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 text-sm">
            {(Object.keys(MODE_LABEL) as ViewMode[]).map((mode) => (
              <button
                className={`rounded-md px-3 py-1.5 ${mode === viewMode ? 'bg-white font-semibold text-red-600' : 'text-slate-600'}`}
                key={mode}
                onClick={() => setViewMode(mode)}
                type="button"
              >
                {MODE_LABEL[mode]}
              </button>
            ))}
          </div>

          <p className="text-sm font-medium capitalize text-slate-600">{periodLabel}</p>
        </div>
      </header>

      {viewMode === 'MONTH' && (
        <Card className="space-y-3 p-4">
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
            {WEEK_DAYS.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {monthDays.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayPericias = periciasByDay.get(key) ?? [];
              const isCurrentMonth = isSameMonth(day, currentDate);

              return (
                <button
                  className={`min-h-24 rounded-lg border p-2 text-left transition hover:border-slate-400 ${
                    isCurrentMonth ? 'bg-white' : 'bg-slate-50 text-slate-400'
                  }`}
                  key={key}
                  onClick={() => setSelectedDay(day)}
                  type="button"
                >
                  <div className="text-sm font-medium">{format(day, 'd')}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {dayPericias.slice(0, 8).map((pericia) => (
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${pericia.isTelepericia ? 'bg-violet-500' : 'bg-blue-500'}`}
                        key={pericia.id}
                        title={pericia.processoCNJ}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {selectedDay && (
            <Card className="space-y-2 border-dashed p-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700">{format(selectedDay, "EEEE, dd 'de' MMMM", { locale: ptBR })}</h2>
                <button className="text-xs text-slate-500 underline" onClick={() => setSelectedDay(null)} type="button">
                  Fechar
                </button>
              </div>
              {(periciasByDay.get(format(selectedDay, 'yyyy-MM-dd')) ?? []).slice(0, 6).map((item) => (
                <div className="flex items-center justify-between rounded border p-2 text-sm" key={item.id}>
                  <span>{item.processoCNJ}</span>
                  <span className={item.isTelepericia ? 'text-violet-600' : 'text-blue-600'}>
                    {item.isTelepericia ? 'Tele' : 'Presencial'}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </Card>
      )}

      {viewMode === 'WEEK' && (
        <Card className="space-y-3 p-4">
          <div className="grid grid-cols-7 gap-3">
            {weekDays.map((day) => {
              const key = format(day, 'yyyy-MM-dd');
              const dayPericias = periciasByDay.get(key) ?? [];

              return (
                <div className="rounded-lg border p-2" key={key}>
                  <div className="mb-2 text-sm font-semibold text-slate-700">{format(day, "EEE dd/MM", { locale: ptBR })}</div>
                  <div className="space-y-2">
                    {dayPericias.length === 0 && <p className="text-xs text-slate-400">Sem perícias</p>}
                    {dayPericias.map((item) => (
                      <div className="rounded border p-2 text-xs" key={item.id}>
                        <div className="font-semibold text-slate-700">{format(item.data, 'HH:mm')}</div>
                        <div>{item.processoCNJ}</div>
                        <div className={item.isTelepericia ? 'text-violet-600' : 'text-blue-600'}>
                          {item.isTelepericia ? 'Tele' : 'Presencial'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {viewMode === 'LIST' && (
        <Card className="space-y-4 p-4">
          {listGroups.map(([key, items]) => (
            <div className="space-y-2" key={key}>
              <h2 className="text-sm font-semibold text-slate-700">{format(parseISO(key), "EEEE, dd 'de' MMMM", { locale: ptBR })}</h2>
              {items.map((item) => (
                <div className="grid gap-2 rounded border p-2 text-sm md:grid-cols-4" key={item.id}>
                  <span>{format(item.data, 'HH:mm')}</span>
                  <span className={item.isTelepericia ? 'text-violet-600' : 'text-blue-600'}>
                    {item.isTelepericia ? 'Tele' : 'Presencial'}
                  </span>
                  <span>{item.processoCNJ}</span>
                  <span>{item.cidade}</span>
                </div>
              ))}
            </div>
          ))}
        </Card>
      )}

      {viewMode === 'YEAR' && (
        <div className="grid gap-3 md:grid-cols-3">
          {Array.from({ length: 12 }).map((_, monthIndex) => {
            const baseDate = new Date(currentDate.getFullYear(), monthIndex, 1);
            const monthStart = startOfMonth(baseDate);
            const monthEnd = endOfMonth(baseDate);
            const visibleStart = startOfWeek(monthStart, { weekStartsOn: 0 });
            const visibleEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
            const days = eachDayOfInterval({ start: visibleStart, end: visibleEnd });

            return (
              <Card className="space-y-2 p-3" key={monthIndex}>
                <h3 className="text-center text-sm font-semibold capitalize text-slate-700">
                  {format(baseDate, 'MMMM', { locale: ptBR })}
                </h3>
                <div className="grid grid-cols-7 gap-1 text-[10px] text-slate-500">
                  {WEEK_DAYS.map((day) => (
                    <div className="text-center" key={day}>
                      {day[0]}
                    </div>
                  ))}
                  {days.map((day) => {
                    const key = format(day, 'yyyy-MM-dd');
                    const count = (periciasByDay.get(key) ?? []).length;

                    return (
                      <div className={`rounded p-1 text-center ${isSameMonth(day, baseDate) ? '' : 'text-slate-300'}`} key={key}>
                        <div className={isSameDay(day, new Date()) ? 'font-bold text-red-600' : ''}>{format(day, 'd')}</div>
                        {count > 0 && <div className="mx-auto mt-0.5 h-1.5 w-1.5 rounded-full bg-blue-500" />}
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AgendaGeralPage;
