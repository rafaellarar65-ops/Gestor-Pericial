import type { PericiaStatus } from '@/types/api';

const statusClass: Record<PericiaStatus, string> = {
  AVALIAR: 'bg-blue-100 text-blue-700',
  MAJORAR: 'bg-orange-100 text-orange-700',
  AGUARDANDO_ACEITE_HONORARIOS: 'bg-amber-100 text-amber-700',
  AGENDAR_DATA: 'bg-indigo-100 text-indigo-700',
  DATA_AGENDADA: 'bg-cyan-100 text-cyan-700',
  AUSENTE: 'bg-rose-100 text-rose-700',
  AUSENCIA_INFORMADA: 'bg-pink-100 text-pink-700',
  ENVIAR_LAUDO: 'bg-violet-100 text-violet-700',
  LAUDO_ENVIADO: 'bg-emerald-100 text-emerald-700',
  ESCLARECIMENTOS: 'bg-fuchsia-100 text-fuchsia-700',
  AGUARDANDO_PAG: 'bg-yellow-100 text-yellow-700',
  RECEBIDO_PARCIALMENTE: 'bg-orange-100 text-orange-700',
  FINALIZADA: 'bg-slate-200 text-slate-700',
  RECUSAR: 'bg-red-100 text-red-700',
  CANCELADA: 'bg-zinc-200 text-zinc-700',
  TELEPERICIA: 'bg-sky-100 text-sky-700',
  FAZER_INDIRETA: 'bg-purple-100 text-purple-700',
};

export const StatusBadge = ({ status }: { status: PericiaStatus }) => (
  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusClass[status]}`}>{status}</span>
);
