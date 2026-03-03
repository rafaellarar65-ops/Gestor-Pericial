import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type AgendaView = 'day' | 'week' | 'list' | 'cityRoute';

type AgendaHeaderProps = {
  currentDateLabel: string;
  onNavigatePrevious: () => void;
  onNavigateNext: () => void;
  onGoToToday: () => void;
  view: AgendaView;
  onViewChange: (view: AgendaView) => void;
};

const VIEWS: Array<{ key: AgendaView; label: string }> = [
  { key: 'day', label: 'Dia' },
  { key: 'week', label: 'Semana' },
  { key: 'list', label: 'Lista' },
  { key: 'cityRoute', label: 'Rota por cidade' },
];

export const AgendaHeader = ({
  currentDateLabel,
  onNavigatePrevious,
  onNavigateNext,
  onGoToToday,
  view,
  onViewChange,
}: AgendaHeaderProps) => (
  <header className="space-y-3 rounded-xl border bg-card p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">Agenda</h1>
        <p className="text-sm text-muted-foreground">Gerencie eventos, horários e compromissos operacionais.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border bg-background p-1">
          {VIEWS.map((item) => (
            <button
              className={`rounded px-2 py-1 text-xs font-medium transition ${
                view === item.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
              key={item.key}
              onClick={() => onViewChange(item.key)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
        <Button onClick={onGoToToday} size="sm" variant="outline">
          Hoje
        </Button>
        <div className="inline-flex items-center rounded-md border bg-background">
          <Button onClick={onNavigatePrevious} size="sm" type="button" variant="ghost">
            <ChevronLeft className="size-4" />
          </Button>
          <span className="px-2 text-sm font-medium">{currentDateLabel}</span>
          <Button onClick={onNavigateNext} size="sm" type="button" variant="ghost">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  </header>
);
