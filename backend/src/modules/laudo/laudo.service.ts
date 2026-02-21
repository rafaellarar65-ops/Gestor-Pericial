import { Injectable, NotFoundException } from '@nestjs/common';
import { ExamStatus } from '@prisma/client';
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
  constructor(private readonly prisma: PrismaService) {}

  createPreLaudo(dto: CreatePreLaudoDto) {
    return this.prisma.preLaudo.create({
      data: {
        periciaId: dto.periciaId,
        sections: dto.sections,
        templateName: dto.templateName,
      },
    });
  }

  async updateSections(dto: UpdateSectionsDto) {
    await this.ensurePreLaudo(dto.preLaudoId);
    return this.prisma.preLaudo.update({ where: { id: dto.preLaudoId }, data: { sections: dto.sections } });
  }

  createExamPlan(dto: CreateExamPlanDto) {
    return this.prisma.examPlan.create({
      data: {
        periciaId: dto.periciaId,
        title: dto.title,
        description: dto.description,
      },
    });
  }

  createExamPerformed(dto: CreateExamPerformedDto) {
    return this.prisma.examPerformed.create({
      data: {
        periciaId: dto.periciaId,
        examPlanId: dto.examPlanId,
        status: dto.status ?? ExamStatus.NOT_STARTED,
        findings: dto.findings,
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
        },
        status: ExamStatus.DONE,
      },
    });
  }

  async exportPdf(dto: ExportPdfDto) {
    const preLaudo = await this.ensurePreLaudo(dto.preLaudoId);
    return {
      preLaudoId: preLaudo.id,
      jobQueued: true,
      queue: 'pdf-generation',
      downloadPath: `exports/laudo-${preLaudo.id}.pdf`,
    };
  }

  async coherenceCheck(dto: CoherenceCheckDto) {
    const preLaudo = await this.ensurePreLaudo(dto.preLaudoId);
    return {
      preLaudoId: preLaudo.id,
      coherent: true,
      issues: [],
      score: 0.91,
    };
  }

  private async ensurePreLaudo(id: string) {
    const preLaudo = await this.prisma.preLaudo.findFirst({ where: { id } });
    if (!preLaudo) throw new NotFoundException('Pré-laudo não encontrado.');
    return preLaudo;
  }
}
