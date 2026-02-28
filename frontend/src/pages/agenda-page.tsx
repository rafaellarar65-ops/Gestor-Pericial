import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AgendaFilters, type AgendaStatusFilter } from '@/components/agenda/agenda-filters';
import { AgendaHeader, type AgendaView } from '@/components/agenda/agenda-header';
import { EventDetailSheet, type AgendaSheetEvent } from '@/components/agenda/event-detail-sheet';
import { ScheduleItemCard } from '@/components/agenda/schedule-item-card';
import { TimeGridCalendar, type TimeGridEvent } from '@/components/agenda/time-grid-calendar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { agendaService } from '@/services/agenda-service';
import type { AgendaEvent } from '@/types/api';
import { toast } from 'sonner';

type AgendaRow = TimeGridEvent & {
  description?: string;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const toCsvValue = (value: string) => `"${value.replaceAll('"', '""')}"`;

const buildAgendaCsv = (rows: AgendaRow[]) => {
  const header = ['Título', 'Tipo', 'Início', 'Fim', 'Local', 'Status'];
  const csvLines = [
    header,
    ...rows.map((row) => [row.titulo, row.tipo, row.inicio || '—', row.fim || '—', row.local, row.status]),
  ].map((line) => line.map((value) => toCsvValue(value)).join(';'));

  return `\uFEFF${csvLines.join('\n')}`;
};

const inferStatus = (item: Record<string, string | number | undefined>): AgendaRow['status'] => {
  const raw = getValue(item, ['status', 'state']).toLowerCase();
const inferStatus = (item: AgendaEvent): AgendaStatusFilter => {
  const raw = String((item as AgendaEvent & { status?: string }).status ?? '').toLowerCase();
  if (raw.includes('realiz')) return 'realizado';
  if (raw.includes('cancel')) return 'cancelado';
  return 'agendado';
};

const mapAgendaRow = (item: AgendaEvent): AgendaRow => {
  const start = new Date(item.startAt);
  const fallbackEnd = new Date(start.getTime() + 60 * 60000).toISOString();
  return {
    id: item.id,
    title: item.title || 'Evento sem título',
    type: item.type || 'Não informado',
    startAt: item.startAt,
    endAt: item.endAt || fallbackEnd,
    location: item.location || 'Sem recurso',
    status: inferStatus(item),
    description: item.description,
  };
};

const isOverlapping = (candidate: AgendaRow, events: AgendaRow[]) =>
  events.some((other) => {
    if (other.id === candidate.id) return false;
    if ((other.location || 'Sem recurso') !== (candidate.location || 'Sem recurso')) return false;
    const aStart = new Date(candidate.startAt).getTime();
    const aEnd = new Date(candidate.endAt).getTime();
    const bStart = new Date(other.startAt).getTime();
    const bEnd = new Date(other.endAt).getTime();
    return aStart < bEnd && bStart < aEnd;
  });

const Page = () => {
  const queryClient = useQueryClient();
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['agenda-events'],
    queryFn: agendaService.listEvents,
  });

  const [view, setView] = useState<AgendaView>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [status, setStatus] = useState<AgendaStatusFilter>('todos');
  const [locationFilter, setLocationFilter] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<{ id: string; startAt: string; endAt: string } | null>(null);

  const updateEventMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<AgendaSheetEvent> }) => agendaService.updateEvent(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['agenda-events'] });
      toast.success('Evento atualizado com sucesso.');
    },
    onError: () => toast.error('Falha ao atualizar o evento.'),
  });

  const rows = useMemo(() => data.map(mapAgendaRow), [data]);

  const filteredRows = useMemo(() => {
    const searchTerm = busca.toLowerCase();

    return rows.filter((row) => {
      const matchesBusca =
        !busca ||
        [row.titulo, row.tipo, row.local].some((value) => value.toLowerCase().includes(searchTerm));
      const matchesStatus = status === 'todos' || row.status === status;
      const matchesPeriodo = !periodo || row.inicio.startsWith(periodo);

      return matchesBusca && matchesStatus && matchesPeriodo;
    });
  }, [rows, busca, status, periodo]);

  const handleExportAgenda = () => {
    const csvContent = buildAgendaCsv(filteredRows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.setAttribute('download', `agenda-${periodo || new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const matchesSearch =
          !search || [row.title, row.type, row.location].some((value) => value.toLowerCase().includes(search.toLowerCase()));
        const matchesStatus = status === 'todos' || row.status === status;
        const matchesDate = !dateFilter || row.startAt.startsWith(dateFilter);
        const matchesLocation = !locationFilter || row.location.toLowerCase().includes(locationFilter.toLowerCase());
        return matchesSearch && matchesStatus && matchesDate && matchesLocation;
      }),
    [rows, search, status, dateFilter, locationFilter],
  );

  const overlappingIds = useMemo(() => {
    const ids = new Set<string>();
    filteredRows.forEach((row) => {
      if (isOverlapping(row, filteredRows)) ids.add(row.id);
    });
    return ids;
  }, [filteredRows]);

  const selectedEvent = useMemo(
    () => (selectedEventId ? filteredRows.find((item) => item.id === selectedEventId) ?? null : null),
    [selectedEventId, filteredRows],
  );

  const currentDateLabel = useMemo(() => {
    if (view === 'day') return currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    const end = addDays(currentDate, 6);
    return `${currentDate.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`;
  }, [currentDate, view]);

  const savePatch = (id: string, payload: Partial<AgendaSheetEvent>) => updateEventMutation.mutate({ id, payload });

  const handleCalendarEventChange = (id: string, startAt: string, endAt: string) => {
    const current = filteredRows.find((item) => item.id === id);
    if (!current) return;
    const candidate = { ...current, startAt, endAt };

    if (isOverlapping(candidate, filteredRows)) {
      setPendingUpdate({ id, startAt, endAt });
      return;
    }

    savePatch(id, { startAt, endAt });
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Erro ao carregar agenda." />;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Agenda</h1>
          <p className="text-sm text-muted-foreground">Gerencie eventos, horários e compromissos operacionais.</p>
        </div>
        <div className="flex gap-2">
          <Button disabled={filteredRows.length === 0} onClick={handleExportAgenda} variant="outline">
            Exportar agenda
          </Button>
          <Button>Criar evento</Button>
        </div>
      </header>

      <Card className="space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          <Input onChange={(event) => setBusca(event.target.value)} placeholder="Buscar por título, tipo ou local" value={busca} />
          <Input onChange={(event) => setPeriodo(event.target.value)} type="date" value={periodo} />
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            onChange={(event) => setStatus(event.target.value as AgendaStatus)}
            value={status}
          >
            <option value="todos">Todos os status</option>
            <option value="agendado">Agendado</option>
            <option value="realizado">Realizado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
      </Card>
      <AgendaHeader
        currentDateLabel={currentDateLabel}
        onGoToToday={() => setCurrentDate(new Date())}
        onNavigateNext={() => setCurrentDate((prev) => addDays(prev, view === 'day' ? 1 : 7))}
        onNavigatePrevious={() => setCurrentDate((prev) => addDays(prev, view === 'day' ? -1 : -7))}
        onViewChange={setView}
        view={view}
      />

      <AgendaFilters
        dateFilter={dateFilter}
        locationFilter={locationFilter}
        onDateFilterChange={setDateFilter}
        onLocationFilterChange={setLocationFilter}
        onSearchChange={setSearch}
        onStatusChange={setStatus}
        search={search}
        status={status}
      />

      {filteredRows.length === 0 ? (
        <EmptyState title="Nenhum evento encontrado. Criar primeiro registro." />
      ) : view === 'list' || view === 'cityRoute' ? (
        <Card className="space-y-3 p-4">
          {filteredRows
            .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
            .map((row) => (
              <ScheduleItemCard
                compact={false}
                endLabel={new Date(row.endAt).toLocaleString('pt-BR')}
                isOverlapping={overlappingIds.has(row.id)}
                key={row.id}
                location={row.location}
                onClick={() => setSelectedEventId(row.id)}
                startLabel={new Date(row.startAt).toLocaleString('pt-BR')}
                status={row.status}
                title={view === 'cityRoute' ? `${row.location} • ${row.title}` : row.title}
                type={row.type}
              />
            ))}
        </Card>
      ) : (
        <TimeGridCalendar
          currentDate={currentDate}
          events={filteredRows}
          onEventChange={handleCalendarEventChange}
          onSelectEvent={setSelectedEventId}
          overlappingIds={overlappingIds}
          view={view}
        />
      )}

      <EventDetailSheet
        event={selectedEvent}
        onClose={() => setSelectedEventId(null)}
        onSave={(payload) => {
          if (!selectedEventId) return;
          savePatch(selectedEventId, payload);
        }}
        open={Boolean(selectedEventId)}
        saving={updateEventMutation.isPending}
      />

      <Dialog onClose={() => setPendingUpdate(null)} open={Boolean(pendingUpdate)} title="Conflito de agenda detectado">
        <div className="space-y-3 text-sm">
          <p>
            Já existe outro bloco no mesmo recurso/período. Deseja persistir mesmo assim?
          </p>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setPendingUpdate(null)} variant="outline">
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!pendingUpdate) return;
                savePatch(pendingUpdate.id, { startAt: pendingUpdate.startAt, endAt: pendingUpdate.endAt });
                setPendingUpdate(null);
              }}
            >
              Confirmar mesmo assim
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default Page;
