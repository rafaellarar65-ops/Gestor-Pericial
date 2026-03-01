import type { DragEvent, MouseEvent } from 'react';
import { Clock3, MapPin } from 'lucide-react';

type ScheduleItemCardProps = {
  title: string;
  type: string;
  location: string;
  startLabel: string;
  endLabel: string;
  status: string;
  isOverlapping?: boolean;
  draggable?: boolean;
  onClick?: () => void;
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void;
  onResizeStart?: (event: MouseEvent<HTMLButtonElement>) => void;
  compact?: boolean;
};

export const ScheduleItemCard = ({
  title,
  type,
  location,
  startLabel,
  endLabel,
  status,
  isOverlapping,
  draggable,
  onClick,
  onDragStart,
  onResizeStart,
  compact,
}: ScheduleItemCardProps) => (
  <button
    className={`group relative w-full rounded-md border bg-primary/10 p-2 text-left text-xs transition hover:bg-primary/20 ${
      isOverlapping ? 'border-red-500' : 'border-primary/30'
    } ${compact ? 'space-y-1' : 'space-y-2'}`}
    draggable={draggable}
    onClick={onClick}
    onDragStart={onDragStart}
    type="button"
  >
    <p className="truncate font-semibold">{title}</p>
    <p className="truncate text-muted-foreground">{type}</p>
    <div className="flex items-center gap-1 text-muted-foreground">
      <Clock3 className="size-3" />
      <span>
        {startLabel} - {endLabel}
      </span>
    </div>
    <div className="flex items-center gap-1 text-muted-foreground">
      <MapPin className="size-3" />
      <span className="truncate">{location}</span>
    </div>
    <p className="text-[11px] capitalize text-muted-foreground">{status}</p>
    {onResizeStart ? (
      <span
        className="absolute bottom-0 left-1/2 h-1.5 w-12 -translate-x-1/2 cursor-row-resize rounded-full bg-primary/40 opacity-0 group-hover:opacity-100"
        onMouseDown={onResizeStart}
        role="presentation"
      />
    ) : null}
  </button>
);
