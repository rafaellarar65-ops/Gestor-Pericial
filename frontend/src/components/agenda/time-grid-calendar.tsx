import { useEffect, useMemo, useState } from 'react';
import { ScheduleItemCard } from '@/components/agenda/schedule-item-card';

export type TimeGridEvent = {
  id: string;
  title: string;
  type: string;
  location: string;
  status: string;
  startAt: string;
  endAt: string;
};

type TimeGridCalendarProps = {
  currentDate: Date;
  view: 'day' | 'week';
  events: TimeGridEvent[];
  overlappingIds: Set<string>;
  onSelectEvent: (eventId: string) => void;
  onEventChange: (eventId: string, nextStart: string, nextEnd: string) => void;
};

const HOUR_START = 7;
const HOUR_END = 20;
const SLOT_HEIGHT = 56;

const startOfDay = (date: Date) => {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
};

const startOfWeek = (date: Date) => {
  const next = startOfDay(date);
  const day = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - day);
  return next;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const snapToQuarter = (minutes: number) => Math.round(minutes / 15) * 15;

export const TimeGridCalendar = ({ currentDate, view, events, overlappingIds, onSelectEvent, onEventChange }: TimeGridCalendarProps) => {
  const [resizeState, setResizeState] = useState<{ id: string; startY: number; duration: number } | null>(null);

  const days = useMemo(() => {
    const firstDay = view === 'day' ? startOfDay(currentDate) : startOfWeek(currentDate);
    const size = view === 'day' ? 1 : 7;
    return Array.from({ length: size }).map((_, index) => addDays(firstDay, index));
  }, [currentDate, view]);

  useEffect(() => {
    if (!resizeState) return;

    const targetEvent = events.find((item) => item.id === resizeState.id);
    if (!targetEvent) return;

    const handleMouseUp = (event: MouseEvent) => {
      const deltaY = event.clientY - resizeState.startY;
      const deltaMinutes = snapToQuarter((deltaY / SLOT_HEIGHT) * 60);
      const durationMinutes = Math.max(15, resizeState.duration + deltaMinutes);
      const nextStart = new Date(targetEvent.startAt);
      const nextEnd = new Date(nextStart.getTime() + durationMinutes * 60000);
      onEventChange(targetEvent.id, nextStart.toISOString(), nextEnd.toISOString());
      setResizeState(null);
    };

    document.addEventListener('mouseup', handleMouseUp, { once: true });
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [resizeState, events, onEventChange]);

  return (
    <div className="overflow-auto rounded-xl border bg-card p-3">
      <div className="grid" style={{ gridTemplateColumns: `72px repeat(${days.length}, minmax(220px, 1fr))` }}>
        <div />
        {days.map((day) => (
          <div className="border-b p-2 text-center text-sm font-medium" key={day.toISOString()}>
            {day.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
          </div>
        ))}

        <div className="relative border-r">
          {Array.from({ length: HOUR_END - HOUR_START + 1 }).map((_, index) => (
            <div className="h-14 border-b pr-2 pt-1 text-right text-xs text-muted-foreground" key={index}>
              {String(HOUR_START + index).padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {days.map((day) => {
          const dayStart = startOfDay(day);
          const dayEnd = addDays(dayStart, 1);

          return (
            <div
              className="relative border-r"
              key={day.toISOString()}
              onDragOver={(dragEvent) => dragEvent.preventDefault()}
              onDrop={(dragEvent) => {
                dragEvent.preventDefault();
                const raw = dragEvent.dataTransfer.getData('text/plain');
                if (!raw) return;
                const payload = JSON.parse(raw) as { id: string; duration: number };
                const rect = dragEvent.currentTarget.getBoundingClientRect();
                const offsetY = dragEvent.clientY - rect.top;
                const totalMinutes = snapToQuarter((offsetY / SLOT_HEIGHT) * 60 + HOUR_START * 60);
                const nextStart = new Date(dayStart);
                nextStart.setMinutes(totalMinutes);
                const nextEnd = new Date(nextStart.getTime() + payload.duration * 60000);
                onEventChange(payload.id, nextStart.toISOString(), nextEnd.toISOString());
              }}
              style={{ height: `${(HOUR_END - HOUR_START + 1) * SLOT_HEIGHT}px` }}
            >
              {Array.from({ length: HOUR_END - HOUR_START + 1 }).map((_, index) => (
                <div className="h-14 border-b" key={index} />
              ))}

              {events
                .filter((item) => {
                  const start = new Date(item.startAt);
                  return start >= dayStart && start < dayEnd;
                })
                .map((item) => {
                  const start = new Date(item.startAt);
                  const end = new Date(item.endAt);
                  const minutesFromTop = (start.getHours() * 60 + start.getMinutes() - HOUR_START * 60) / 60;
                  const durationHours = Math.max(0.5, (end.getTime() - start.getTime()) / 3600000);
                  return (
                    <div
                      className="absolute left-1 right-1"
                      key={item.id}
                      style={{ top: `${minutesFromTop * SLOT_HEIGHT}px`, height: `${durationHours * SLOT_HEIGHT}px` }}
                    >
                      <ScheduleItemCard
                        compact
                        draggable
                        endLabel={end.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        isOverlapping={overlappingIds.has(item.id)}
                        location={item.location}
                        onClick={() => onSelectEvent(item.id)}
                        onDragStart={(dragEvent) => {
                          const duration = Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000));
                          dragEvent.dataTransfer.setData('text/plain', JSON.stringify({ id: item.id, duration }));
                        }}
                        onResizeStart={(mouseEvent) => {
                          mouseEvent.preventDefault();
                          setResizeState({
                            id: item.id,
                            startY: mouseEvent.clientY,
                            duration: Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000)),
                          });
                        }}
                        startLabel={start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        status={item.status}
                        title={item.title}
                        type={item.type}
                      />
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
};
