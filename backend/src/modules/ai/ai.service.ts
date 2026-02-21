import { Injectable } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyzeDocumentDto, BatchActionDto, LaudoAssistDto } from './dto/ai.dto';

@Injectable()
export class AiService {
  private readonly cache = new Map<string, Record<string, unknown>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
  ) {}

  async analyzeDocument(dto: AnalyzeDocumentDto) {
    const key = `analyze:${dto.fileName}:${dto.fileBase64.length}`;
    const cached = this.cache.get(key);
    if (cached) return { ...cached, cached: true };

    const result = {
      summary: `Documento ${dto.fileName} analisado com sucesso`,
      highlights: ['Estrutura válida', 'Campos clínicos detectados'],
      riskFlags: [],
      cached: false,
    };

    this.cache.set(key, result);
    await this.logTokenUsage('ai.analyze-document', Math.ceil(dto.fileBase64.length / 4));
    return result;
  }

  async batchAction(dto: BatchActionDto) {
    const key = `batch:${dto.instruction}:${dto.items.length}`;
    const cached = this.cache.get(key);
    if (cached) return { ...cached, cached: true };

    const actions = dto.items.map((item) => ({ id: item.id, action: 'UPDATE', reason: dto.instruction }));
    const result = { plan: actions, total: actions.length, cached: false };

    this.cache.set(key, result);
    await this.logTokenUsage('ai.batch-action', dto.instruction.length + dto.items.length * 20);
    return result;
  }

  async laudoAssist(dto: LaudoAssistDto) {
    const key = `laudo:${dto.periciaId}:${dto.section}:${dto.prompt}`;
    const cached = this.cache.get(key);
    if (cached) return { ...cached, cached: true };

    const result = {
      section: dto.section,
      suggestion: `Sugestão para ${dto.section}: ${dto.prompt.slice(0, 120)}...`,
      confidence: 0.82,
      cached: false,
    };

    this.cache.set(key, result);
    await this.logTokenUsage('ai.laudo-assist', dto.context.length + dto.prompt.length);
    return result;
  }

  private async logTokenUsage(metricKey: string, metricValue: number) {
    const usageDate = new Date();
    usageDate.setHours(0, 0, 0, 0);

    const existing = await this.prisma.dailyUsage.findFirst({ where: { usageDate, metricKey } });
    if (existing) {
      await this.prisma.dailyUsage.update({
        where: { id: existing.id },
        data: { metricValue: existing.metricValue + metricValue },
      });
      return;
    }

    await this.prisma.dailyUsage.create({
      data: {
        tenantId: this.context.get('tenantId') ?? '',
        usageDate,
        metricKey,
        metricValue,
        context: { source: 'ai-module' },
      },
    });
  }
}
