import { cn } from '@/lib/utils';

type PrazoBadgeProps = {
  dataIntimacao?: string | null;
  prazoDias?: number | null;
  className?: string;
};

const DAY = 1000 * 60 * 60 * 24;

const getPrazoMeta = (dataIntimacao?: string | null, prazoDias?: number | null) => {
  if (!dataIntimacao || !prazoDias) return null;

  const deadline = new Date(dataIntimacao);
  deadline.setDate(deadline.getDate() + prazoDias);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / DAY);

  if (diffDays < 0) {
    return {
      label: `${Math.abs(diffDays)} dia${Math.abs(diffDays) === 1 ? '' : 's'} em atraso`,
      className: 'bg-red-100 text-red-700 border-red-200',
    };
  }

  if (diffDays <= 3) {
    return {
      label: `${diffDays} dia${diffDays === 1 ? '' : 's'} restantes`,
      className: 'bg-amber-100 text-amber-700 border-amber-200',
    };
  }

  return {
    label: `${diffDays} dias restantes`,
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  };
};

export const PrazoBadge = ({ dataIntimacao, prazoDias, className }: PrazoBadgeProps) => {
  const meta = getPrazoMeta(dataIntimacao, prazoDias);

  if (!meta) {
    return <span className={cn('rounded-full border px-2 py-0.5 text-xs font-semibold text-muted-foreground', className)}>Sem prazo</span>;
  }

  return <span className={cn('rounded-full border px-2 py-0.5 text-xs font-semibold', meta.className, className)}>{meta.label}</span>;
};
