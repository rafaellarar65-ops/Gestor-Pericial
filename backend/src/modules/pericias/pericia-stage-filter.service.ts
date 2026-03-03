import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type PericiaOperationalStage =
  | 'NOMEACOES'
  | 'AGENDAR_DATA'
  | 'PROXIMAS_PERICIAS'
  | 'ENVIAR_LAUDOS';

/**
 * Critérios operacionais (fonte única):
 * - NOMEACOES: perícias recém recebidas para triagem inicial.
 *   Campos: não finalizada, sem data de agendamento e status em códigos de nomeação/triagem.
 * - AGENDAR_DATA: fila operacional para marcar data.
 *   Campos: não finalizada, laudo não enviado e sem data de agendamento.
 * - PROXIMAS_PERICIAS: já agendadas e ainda em andamento.
 *   Campos: data de agendamento preenchida e não finalizada.
 * - ENVIAR_LAUDOS: realizadas/produção de laudo pendente de envio.
 *   Campos: não finalizada, laudo não enviado e (data de realização preenchida OU status de produção/envio).
 */
@Injectable()
export class PericiaStageFilterService {
  private readonly stageStatusCodes: Record<Exclude<PericiaOperationalStage, 'AGENDAR_DATA' | 'PROXIMAS_PERICIAS'>, string[]> = {
    NOMEACOES: ['NOVA_NOMEACAO', 'AVALIAR', 'ACEITA', 'AGUARDANDO_ACEITE', 'A_MAJORAR', 'OBSERVACAO_EXTRA'],
    ENVIAR_LAUDOS: ['ENVIAR_LAUDO', 'EM_LAUDO'],
  };

  constructor(private readonly prisma: PrismaService) {}

  async resolveStageStatusIds(stage: PericiaOperationalStage): Promise<string[]> {
    const codes = this.stageStatusCodes[stage as keyof typeof this.stageStatusCodes];
    if (!codes?.length) return [];

    const statuses = await this.prisma.status.findMany({
      where: { codigo: { in: codes } },
      select: { id: true },
    });

    return statuses.map((item) => item.id);
  }

  async buildWhere(stage: PericiaOperationalStage): Promise<Prisma.PericiaWhereInput> {
    const statusIds = await this.resolveStageStatusIds(stage);

    switch (stage) {
      case 'NOMEACOES':
        return {
          finalizada: false,
          dataAgendamento: null,
          OR: [
            ...(statusIds.length ? [{ statusId: { in: statusIds } }] : []),
            { agendada: false },
          ],
        };
      case 'AGENDAR_DATA':
        return {
          dataAgendamento: null,
          finalizada: false,
          laudoEnviado: false,
        };
      case 'PROXIMAS_PERICIAS':
        return {
          dataAgendamento: { not: null },
          finalizada: false,
        };
      case 'ENVIAR_LAUDOS':
        return {
          finalizada: false,
          laudoEnviado: false,
          OR: [
            { dataRealizacao: { not: null } },
            ...(statusIds.length ? [{ statusId: { in: statusIds } }] : []),
          ],
        };
      default:
        return {};
    }
  }
}
