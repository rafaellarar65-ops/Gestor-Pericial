import type { PericiaStatus } from '@/types/api';

const statusClass: Record<PericiaStatus, string> = {
  NOVA_NOMEACAO: 'bg-info/10 text-info',
  AGENDADA: 'bg-warning/10 text-warning',
  EM_ANDAMENTO: 'bg-primary/10 text-primary',
  LAUDO_ENVIADO: 'bg-success/10 text-success',
  FINALIZADA: 'bg-muted text-foreground',
};

export const StatusBadge = ({ status }: { status: PericiaStatus }) => (
  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClass[status]}`}>{status}</span>
);
