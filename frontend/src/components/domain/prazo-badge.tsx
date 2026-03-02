import { AlertCircle, AlertTriangle, Clock } from 'lucide-react';

export type PrazoBadgeProps = {
  dataVencimento?: string | Date | null;
  dataIntimacao?: string;
  prazoDias?: number;
  tipo?: 'laudo' | 'esclarecimento' | 'agendamento';
  isUrgent?: boolean;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getDiffDays = (dataVencimento: string | Date) => {
  const deadline = new Date(dataVencimento);
  if (Number.isNaN(deadline.getTime())) return null;
  const today = startOfDay(new Date());
  const dueDate = startOfDay(deadline);
  return Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const PrazoBadge = ({ dataVencimento, dataIntimacao, prazoDias, tipo = 'agendamento', isUrgent = false }: PrazoBadgeProps) => {
  if (isUrgent) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">
        <AlertTriangle aria-label={`Urgente ${tipo}`} size={12} /> URGENTE
      </span>
    );
  }

  const fallbackData = dataIntimacao && prazoDias !== undefined
    ? new Date(new Date(dataIntimacao).getTime() + prazoDias * 24 * 60 * 60 * 1000)
    : null;

  const dueDate = dataVencimento ?? fallbackData;
  if (!dueDate) return null;

  const diasRestantes = getDiffDays(dueDate);
  if (diasRestantes === null) return null;

  if (diasRestantes < 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive">
        <AlertCircle aria-label={`Vencido ${tipo}`} size={12} /> Vencido há {Math.abs(diasRestantes)} dias
      </span>
    );
  }

  if (diasRestantes === 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/10 px-2 py-1 text-xs font-semibold text-orange-600">
        <Clock aria-label={`Vence hoje ${tipo}`} size={12} /> Vence hoje
      </span>
    );
  }

  if (diasRestantes <= 3) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-orange-500/10 px-2 py-1 text-xs font-semibold text-orange-600">
        <Clock aria-label={`Prazo curto ${tipo}`} size={12} /> {diasRestantes} dias
      </span>
    );
  }

  if (diasRestantes <= 7) {
    return <span className="inline-flex rounded-md bg-yellow-500/10 px-2 py-1 text-xs font-semibold text-yellow-700">{diasRestantes} dias</span>;
  }

  return <span className="inline-flex rounded-md bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">{diasRestantes} dias</span>;
};
