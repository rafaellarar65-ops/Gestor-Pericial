import { Input } from '@/components/ui/input';

export type AgendaStatusFilter = 'todos' | 'agendado' | 'realizado' | 'cancelado';

type AgendaFiltersProps = {
  search: string;
  status: AgendaStatusFilter;
  dateFilter: string;
  locationFilter: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: AgendaStatusFilter) => void;
  onDateFilterChange: (value: string) => void;
  onLocationFilterChange: (value: string) => void;
};

export const AgendaFilters = ({
  search,
  status,
  dateFilter,
  locationFilter,
  onSearchChange,
  onStatusChange,
  onDateFilterChange,
  onLocationFilterChange,
}: AgendaFiltersProps) => (
  <div className="rounded-xl border bg-card p-4">
    <div className="grid gap-3 md:grid-cols-4">
      <Input onChange={(event) => onSearchChange(event.target.value)} placeholder="Buscar por título, tipo ou local" value={search} />
      <Input onChange={(event) => onLocationFilterChange(event.target.value)} placeholder="Filtrar recurso/local" value={locationFilter} />
      <Input onChange={(event) => onDateFilterChange(event.target.value)} type="date" value={dateFilter} />
      <select
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        onChange={(event) => onStatusChange(event.target.value as AgendaStatusFilter)}
        value={status}
      >
        <option value="todos">Todos os status</option>
        <option value="agendado">Agendado</option>
        <option value="realizado">Realizado</option>
        <option value="cancelado">Cancelado</option>
      </select>
    </div>
  </div>
);
