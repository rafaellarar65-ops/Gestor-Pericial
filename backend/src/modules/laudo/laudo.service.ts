import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ExamStatus, Prisma } from '@prisma/client';
import { RequestContextService } from '../../common/request-context.service';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CoherenceCheckDto,
  CreateExamPerformedDto,
  CreateExamPlanDto,
  CreatePreLaudoDto,
  ExportPdfDto,
  TranscribeLaudoDto,
  TranscriptionDto,
  UpdateSectionsDto,
} from './dto/laudo.dto';



const LAUDO_SECTIONS = [
  'IDENTIFICACAO',
  'ALEGACOES',
  'HISTORIA_MEDICA',
  'HISTORIA_OCUPACIONAL',
  'HMA',
  'QUESITOS',
  'EXAME_FISICO',
] as const;

type LaudoSectionKey = (typeof LAUDO_SECTIONS)[number];

type LaudoSectionContent = {
  preLaudo: string;
  transcricaoIA: string;
  anotacoes: string;
};

type LaudoSectionsMap = Record<LaudoSectionKey, LaudoSectionContent>;


const SECTION_TITLES: Record<LaudoSectionKey, string> = {
  IDENTIFICACAO: 'Identificação',
  ALEGACOES: 'Alegações',
  HISTORIA_MEDICA: 'História Médica',
  HISTORIA_OCUPACIONAL: 'História Ocupacional',
  HMA: 'História da Moléstia Atual',
  QUESITOS: 'Quesitos',
  EXAME_FISICO: 'Exame Físico',
};
@Injectable()
export class LaudoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
  ) {}

  listPreLaudos() {
    return this.prisma.preLaudo.findMany({ orderBy: { createdAt: 'desc' } });
  }

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

  async transcribeLaudo(laudoId: string, dto: TranscribeLaudoDto) {
    if (dto.audioBase64.length > 13_981_016) {
      throw new BadRequestException('Áudio excede o limite de 10MB.');
    }

    const preLaudo = await this.ensurePreLaudo(laudoId);
    const sections = this.normalizeSections(preLaudo.sections);
    const transcription = this.buildMockTranscription(dto.audioBase64);
    const mergedSections = this.mergeTranscriptionIntoSections(sections, transcription);

    const updated = await this.prisma.preLaudo.update({
      where: { id: laudoId },
      data: {
        laudoRealtime: {
          lastAudioChars: dto.audioBase64.length,
          updatedAt: new Date().toISOString(),
          rawTranscription: transcription,
        } as Prisma.InputJsonValue,
        sections: mergedSections as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });

    return {
      preLaudoId: updated.id,
      transcription,
      sections: mergedSections,
      updatedAt: updated.updatedAt,
    };
  }

  async exportDocx(laudoId: string) {
    const preLaudo = await this.ensurePreLaudo(laudoId);
    const sections = this.normalizeSections(preLaudo.sections);

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'Laudo Pericial V2', bold: true, size: 32 })],
            }),
            new Paragraph({ text: `Perícia: ${preLaudo.periciaId}` }),
            ...LAUDO_SECTIONS.flatMap((key) => [
              new Paragraph({ text: '' }),
              new Paragraph({
                children: [new TextRun({ text: SECTION_TITLES[key], bold: true, size: 26 })],
              }),
              new Paragraph({
                children: [new TextRun({ text: 'Pré-laudo: ', bold: true }), new TextRun(sections[key].preLaudo || '—')],
              }),
              new Paragraph({
                children: [new TextRun({ text: 'Transcrição IA: ', bold: true }), new TextRun(sections[key].transcricaoIA || '—')],
              }),
              new Paragraph({
                children: [new TextRun({ text: 'Anotações: ', bold: true }), new TextRun(sections[key].anotacoes || '—')],
              }),
            ]),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    return {
      fileName: `laudo-v2-${preLaudo.id}.docx`,
      buffer,
    };
  }


  private mergeTranscriptionIntoSections(
    sections: LaudoSectionsMap,
    transcription: string,
  ): LaudoSectionsMap {
    const next = { ...sections };
    next.HISTORIA_MEDICA = {
      ...next.HISTORIA_MEDICA,
      transcricaoIA: [next.HISTORIA_MEDICA.transcricaoIA, transcription].filter(Boolean).join('\n\n'),
    };
    return next;
  }

  private buildMockTranscription(audioBase64: string): string {
    const sample = audioBase64.slice(0, 64);
    return `Transcrição parcial (simulada) gerada a partir de ${audioBase64.length} caracteres de áudio. Trecho: ${sample}...`;
  }

  private normalizeSections(rawSections: Prisma.JsonValue | null): LaudoSectionsMap {
    const source = rawSections && typeof rawSections === 'object' && !Array.isArray(rawSections)
      ? (rawSections as Record<string, unknown>)
      : {};

    return LAUDO_SECTIONS.reduce<LaudoSectionsMap>((acc, key) => {
      const current = source[key];
      const currentRecord = current && typeof current === 'object' && !Array.isArray(current)
        ? (current as Record<string, unknown>)
        : {};

      acc[key] = {
        preLaudo: typeof currentRecord.preLaudo === 'string' ? currentRecord.preLaudo : '',
        transcricaoIA: typeof currentRecord.transcricaoIA === 'string' ? currentRecord.transcricaoIA : '',
        anotacoes: typeof currentRecord.anotacoes === 'string' ? currentRecord.anotacoes : '',
      };

      return acc;
    }, {} as LaudoSectionsMap);
  }

  private async ensurePreLaudo(id: string) {
    const preLaudo = await this.prisma.preLaudo.findFirst({ where: { id } });
    if (!preLaudo) throw new NotFoundException('Pré-laudo não encontrado.');
    return preLaudo;
  }
}
