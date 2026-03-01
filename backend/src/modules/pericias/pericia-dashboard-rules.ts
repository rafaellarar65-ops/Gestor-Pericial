import { Prisma } from '@prisma/client';

export const DASHBOARD_BUCKET_STATUS_CODES = {
  nomeacoes: ['AVALIAR', 'MAJORAR', 'AGUARDANDO_ACEITE_HONORARIOS', 'FAZER_INDIRETA'],
  agendarData: ['AGENDAR_DATA', 'TELEPERICIA'],
  proximasPericias: ['DATA_AGENDADA'],
  enviarLaudos: ['ENVIAR_LAUDO'],
  esclarecimentos: ['ESCLARECIMENTOS'],
  aReceber: ['AGUARDANDO_PAG', 'RECEBIDO_PARCIALMENTE'],
  ausenciasPendentes: ['AUSENTE', 'AUSENCIA_INFORMADA'],
} as const;

export type DashboardBucket = keyof typeof DASHBOARD_BUCKET_STATUS_CODES;

export const buildDashboardBucketWheres = (params: {
  statusIdsByCode: Record<string, string>;
  today: Date;
  nextWeek: Date;
}): Record<DashboardBucket, Prisma.PericiaWhereInput> => {
  const ids = (codes: readonly string[]) =>
    codes.map((code) => params.statusIdsByCode[code]).filter((value): value is string => Boolean(value));

  const nomeacoesIds = ids(DASHBOARD_BUCKET_STATUS_CODES.nomeacoes);
  const agendarIds = ids(DASHBOARD_BUCKET_STATUS_CODES.agendarData);
  const proximasIds = ids(DASHBOARD_BUCKET_STATUS_CODES.proximasPericias);
  const laudosIds = ids(DASHBOARD_BUCKET_STATUS_CODES.enviarLaudos);
  const esclarecimentosIds = ids(DASHBOARD_BUCKET_STATUS_CODES.esclarecimentos);
  const receberIds = ids(DASHBOARD_BUCKET_STATUS_CODES.aReceber);
  const ausenciasIds = ids(DASHBOARD_BUCKET_STATUS_CODES.ausenciasPendentes);

  return {
    /**
     * NOMEAÇÕES:
     * - fila inicial de triagem;
     * - exclusiva por códigos de status oficiais.
     */
    nomeacoes: {
      finalizada: false,
      statusId: { in: nomeacoesIds },
    },
    /**
     * AGENDAR DATA:
     * - perícias aprovadas para marcação;
     * - sem interseção com nomeações por status exclusivo.
     */
    agendarData: {
      finalizada: false,
      statusId: { in: agendarIds },
    },
    /**
     * PRÓXIMAS PERÍCIAS:
     * - já agendadas para os próximos 7 dias;
     * - restritas ao status oficial de agenda.
     */
    proximasPericias: {
      finalizada: false,
      statusId: { in: proximasIds },
      dataAgendamento: { gte: params.today, lte: params.nextWeek },
    },
    /**
     * ENVIAR LAUDOS:
     * - produção/envio do laudo em andamento;
     * - restrita ao status oficial ENVIAR_LAUDO.
     */
    enviarLaudos: {
      finalizada: false,
      statusId: { in: laudosIds },
    },
    /**
     * ESCLARECIMENTOS:
     * - intimações de complementação;
     * - status oficial dedicado.
     */
    esclarecimentos: {
      finalizada: false,
      statusId: { in: esclarecimentosIds },
    },
    /**
     * A RECEBER:
     * - laudo já enviado e aguardando recebimento;
     * - status financeiros oficiais.
     */
    aReceber: {
      statusId: { in: receberIds },
    },
    /**
     * AUSÊNCIAS PENDENTES (critical):
     * - usa status de ausência oficial;
     * - alinhado ao card "Ausências Pendentes".
     */
    ausenciasPendentes: {
      statusId: { in: ausenciasIds },
      finalizada: false,
    },
  };
};
