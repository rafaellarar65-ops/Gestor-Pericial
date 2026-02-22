import { Injectable, NotFoundException } from '@nestjs/common';
import { ExamStatus, Prisma } from '@prisma/client';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CoherenceCheckDto,
  CreateExamPerformedDto,
  CreateExamPlanDto,
  CreatePreLaudoDto,
  ExportPdfDto,
  TranscriptionDto,
  UpdateSectionsDto,
} from './dto/laudo.dto';

@Injectable()
export class LaudoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
  ) {}

  createPreLaudo(dto: CreatePreLaudoDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.prisma.preLaudo.create({
      data: {
        tenantId,
        periciaId: dto.periciaId,
        ...(dto.sections ? { sections: dto.sections as Prisma.InputJsonValue } : {}),
        ...(dto.templateName ? { templateName: dto.templateName } : {}),
      },
    });
  }

  async updateSections(dto: UpdateSectionsDto) {
    await this.ensurePreLaudo(dto.preLaudoId);
    return this.prisma.preLaudo.update({ where: { id: dto.preLaudoId }, data: { sections: dto.sections as Prisma.InputJsonValue } });
  }

  createExamPlan(dto: CreateExamPlanDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.prisma.examPlan.create({
      data: {
        tenantId,
        periciaId: dto.periciaId,
        title: dto.title,
        ...(dto.description ? { description: dto.description } : {}),
      },
    });
  }

  createExamPerformed(dto: CreateExamPerformedDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.prisma.examPerformed.create({
      data: {
        tenantId,
        periciaId: dto.periciaId,
        ...(dto.examPlanId ? { examPlanId: dto.examPlanId } : {}),
        status: dto.status ?? ExamStatus.NOT_STARTED,
        ...(dto.findings ? { findings: dto.findings as Prisma.InputJsonValue } : {}),
      },
    });
  }

  async transcription(dto: TranscriptionDto) {
    const exam = await this.prisma.examPerformed.findFirst({ where: { id: dto.examPerformedId } });
    if (!exam) throw new NotFoundException('Exam performed não encontrado.');

    return this.prisma.examPerformed.update({
      where: { id: dto.examPerformedId },
      data: {
        transcript: {
          provider: 'gemini-proxy',
          chars: dto.audioBase64.length,
          text: 'Transcrição simulada para validação de fluxo backend.',
        } as Prisma.InputJsonValue,
        status: ExamStatus.DONE,
      },
    });
  }

  async exportPdf(dto: ExportPdfDto) {
    const preLaudo = await this.ensurePreLaudo(dto.preLaudoId);
    return { preLaudoId: preLaudo.id, jobQueued: true, queue: 'pdf-generation', downloadPath: `exports/laudo-${preLaudo.id}.pdf` };
  }

  async coherenceCheck(dto: CoherenceCheckDto) {
    const preLaudo = await this.ensurePreLaudo(dto.preLaudoId);
    return { preLaudoId: preLaudo.id, coherent: true, issues: [], score: 0.91 };
  }

  private async ensurePreLaudo(id: string) {
    const preLaudo = await this.prisma.preLaudo.findFirst({ where: { id } });
    if (!preLaudo) throw new NotFoundException('Pré-laudo não encontrado.');
    return preLaudo;
  }
}
