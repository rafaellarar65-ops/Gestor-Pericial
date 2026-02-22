import { Injectable } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AnalyzeDocumentDto,
  BatchActionDto,
  CoherenceCheckDto,
  ExecuteAiTaskDto,
  LaudoAssistDto,
  ProcessAiOutputDto,
  SpecificAnalysisDto,
} from './dto/ai.dto';
import { guardrailsConfig } from './guardrails-config';
import { buildBatchActionPrompt } from './prompts/batch-action';
import { buildCoherenceCheckPrompt } from './prompts/coherence-check';
import { buildLaudoAssistantPrompt } from './prompts/laudo-assistant';
import { buildMasterAnalysisPrompt } from './prompts/master-analysis';
import { buildSpecificAnalysisPrompt } from './prompts/specific-analysis';
import { JsonSchemaHint, PromptBuildResult } from './prompts/types';

@Injectable()
export class AiService {
  private readonly cache = new Map<string, Record<string, unknown>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
  ) {}

  async analyzeDocument(dto: AnalyzeDocumentDto) {
    const key = `analyze:${dto.fileName}:${dto.fileBase64.length}:${dto.tipoAcaoEstimado ?? 'nao_informado'}`;
    const cached = this.cache.get(key);
    if (cached) return { ...cached, cached: true };

    const textoDocumento = this.decodeBase64Safely(dto.fileBase64);
    const prompt = buildMasterAnalysisPrompt({
      tipoAcaoEstimado: dto.tipoAcaoEstimado ?? 'não identificado',
      textoDocumento,
      idioma: 'pt-BR',
    });

    const result = this.makeBuildResponse('master-analysis', prompt, { reviewRequired: true, cached: false });
    this.cache.set(key, result);
    await this.logTokenUsage('ai.analyze-document', Math.ceil(textoDocumento.length / 4));
    return result;
  }

  async specificAnalysis(dto: SpecificAnalysisDto) {
    const key = `specific:${dto.tipoPericia}:${dto.resumoCaso.length}:${dto.evidencias.length}`;
    const cached = this.cache.get(key);
    if (cached) return { ...cached, cached: true };

    const prompt = buildSpecificAnalysisPrompt({
      tipoPericia: dto.tipoPericia,
      resumoCaso: dto.resumoCaso,
      evidencias: dto.evidencias,
    });

    const result = this.makeBuildResponse('specific-analysis', prompt, { reviewRequired: true, cached: false });
    this.cache.set(key, result);
    await this.logTokenUsage('ai.specific-analysis', dto.resumoCaso.length + dto.evidencias.join(' ').length);
    return result;
  }

  async batchAction(dto: BatchActionDto) {
    const key = `batch:${dto.instruction}:${dto.items.length}`;
    const cached = this.cache.get(key);
    if (cached) return { ...cached, cached: true };

    const availableFields = Array.from(new Set(dto.items.flatMap((item) => Object.keys(item.payload ?? {}))));
    const prompt = buildBatchActionPrompt({
      instruction: dto.instruction,
      availableFields: availableFields.length ? availableFields : ['cidade', 'status', 'data', 'peritoResponsavel'],
      availableActions: ['schedule', 'reschedule', 'notify', 'tag', 'export', 'assign'],
      timezone: 'America/Sao_Paulo',
    });

    const result = this.makeBuildResponse('batch-action', prompt, { requiresHumanApproval: true, cached: false });
    this.cache.set(key, result);
    await this.logTokenUsage('ai.batch-action', dto.instruction.length + dto.items.length * 20);
    return result;
  }

  async coherenceCheck(dto: CoherenceCheckDto) {
    const key = `coherence:${dto.alegacoesClinicas.join('|')}:${dto.achadosExame.length}:${dto.contextoDocumental.length}`;
    const cached = this.cache.get(key);
    if (cached) return { ...cached, cached: true };

    const prompt = buildCoherenceCheckPrompt({
      alegacoesClinicas: dto.alegacoesClinicas,
      achadosExame: dto.achadosExame,
      contextoDocumental: dto.contextoDocumental,
    });

    const result = this.makeBuildResponse('coherence-check', prompt, { reviewRequired: true, cached: false });
    this.cache.set(key, result);
    await this.logTokenUsage('ai.coherence-check', dto.contextoDocumental.length + dto.alegacoesClinicas.join(' ').length);
    return result;
  }

  async laudoAssist(dto: LaudoAssistDto) {
    const key = `laudo:${dto.periciaId}:${dto.section}:${dto.tipoPericia}:${dto.examPerformed.length}`;
    const cached = this.cache.get(key);
    if (cached) return { ...cached, cached: true };

    const prompt = buildLaudoAssistantPrompt({
      tipoPericia: dto.tipoPericia,
      secaoLaudo: dto.section,
      examPerformed: dto.examPerformed,
      protocolos: dto.protocolos ?? [],
      quesitos: dto.quesitos ?? [],
    });

    const result = this.makeBuildResponse('laudo-assistant', prompt, {
      reviewRequired: true,
      confidencePolicy: guardrailsConfig.confidence,
      cached: false,
    });

    this.cache.set(key, result);
    await this.logTokenUsage('ai.laudo-assist', JSON.stringify(dto.examPerformed).length + (dto.quesitos?.join(' ').length ?? 0));
    return result;
  }

  async executeTask(dto: ExecuteAiTaskDto) {
    const startedAt = Date.now();
    const providerResponse = await this.callPrimaryModel(dto.task, dto.prompt, dto.mockResponse);

    const processed = await this.processAiOutput({
      task: dto.task,
      rawResponse: providerResponse.rawResponse,
      sourceFragments: dto.sourceFragments,
    });

    const schemaValidation = this.validateAgainstSchema(processed.processedResponse as Record<string, unknown>, providerResponse.schema);

    const latencyMs = Date.now() - startedAt;
    const tokens = Math.ceil(JSON.stringify(dto.prompt).length / 4) + Math.ceil(JSON.stringify(providerResponse.rawResponse).length / 4);

    await this.logAiInteraction({
      task: dto.task,
      model: providerResponse.model,
      prompt: dto.prompt,
      response: providerResponse.rawResponse,
      tokens,
      latencyMs,
    });

    return {
      ...processed,
      schemaValidation,
      modelUsed: providerResponse.model,
      tokens,
      latencyMs,
    };
  }

  async processAiOutput(dto: ProcessAiOutputDto) {
    const payload = this.parseRawResponse(dto.rawResponse);
    const confidenceScore = this.extractConfidenceScore(payload);
    const confidenceOk = confidenceScore === null || confidenceScore >= guardrailsConfig.confidence.threshold;

    const prohibitedHits = this.detectProhibitedTopics(JSON.stringify(payload).toLowerCase());
    const hallucinationRisk = this.detectHallucinationRisk(payload, dto.sourceFragments ?? []);

    const safePayload = confidenceOk
      ? payload
      : {
          ...payload,
          textoSugerido: guardrailsConfig.confidence.lowConfidenceResponse,
          resumoExecutivo: guardrailsConfig.confidence.lowConfidenceResponse,
        };

    const result = {
      task: dto.task,
      validJson: true,
      confidenceScore,
      confidenceOk,
      prohibitedHits,
      hallucinationRisk,
      approvedForHumanReview: prohibitedHits.length === 0,
      processedResponse: safePayload,
    };

    await this.logTokenUsage('ai.process-output', JSON.stringify(dto.rawResponse).length);
    return result;
  }

  private makeBuildResponse(task: string, prompt: PromptBuildResult, extra: Record<string, unknown>) {
    return {
      task,
      provider: guardrailsConfig.modelPolicy.defaultModel,
      prompt,
      outputMode: 'json',
      ...extra,
    };
  }

  private async callPrimaryModel(task: string, prompt: Record<string, unknown>, mockResponse?: unknown) {
    const schema = (prompt.outputSchema as JsonSchemaHint | undefined) ?? { type: 'object' };

    if (mockResponse !== undefined) {
      return {
        model: guardrailsConfig.modelPolicy.defaultModel,
        rawResponse: mockResponse,
        schema,
      };
    }

    return {
      model: guardrailsConfig.modelPolicy.defaultModel,
      rawResponse: { note: 'provider_call_placeholder', task },
      schema,
    };
  }

  private validateAgainstSchema(payload: Record<string, unknown>, schema: JsonSchemaHint) {
    const errors: string[] = [];

    if (schema.type === 'object' && schema.required) {
      for (const field of schema.required) {
        if (!(field in payload)) errors.push(`Campo obrigatório ausente: ${field}`);
      }
    }

    if (schema.type === 'array' && !Array.isArray(payload)) {
      errors.push('Resposta não é array conforme schema');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private parseRawResponse(rawResponse: unknown): Record<string, unknown> {
    if (typeof rawResponse === 'string') {
      const parsed = JSON.parse(rawResponse) as unknown;
      return this.normalizeParsedObject(parsed);
    }

    return this.normalizeParsedObject(rawResponse);
  }

  private normalizeParsedObject(value: unknown): Record<string, unknown> {
    if (Array.isArray(value)) return { data: value };
    if (value && typeof value === 'object') return value as Record<string, unknown>;
    return { data: value ?? null };
  }

  private extractConfidenceScore(payload: Record<string, unknown>): number | null {
    const confidence = payload.confidence;
    if (!confidence || typeof confidence !== 'object') return null;

    const score = (confidence as { score?: unknown }).score;
    return typeof score === 'number' ? score : null;
  }

  private detectProhibitedTopics(text: string): string[] {
    const probes: Array<{ key: string; patterns: string[] }> = [
      { key: 'conclusao_de_nexo_causal', patterns: ['nexo causal estabelecido', 'há nexo causal'] },
      { key: 'afirmacao_de_incapacidade_laboral', patterns: ['incapacidade laboral', 'incapaz para o trabalho'] },
      { key: 'recomendacao_de_tratamento', patterns: ['recomendo tratamento', 'deve iniciar tratamento'] },
      { key: 'juizo_de_valor_sobre_autor_reu_perito_ou_advogados', patterns: ['má-fé', 'simulação intencional'] },
    ];

    return probes.filter((probe) => probe.patterns.some((pattern) => text.includes(pattern))).map((probe) => probe.key);
  }

  private detectHallucinationRisk(payload: Record<string, unknown>, sourceFragments: string[]) {
    if (!guardrailsConfig.hallucinationFilter.enabled || sourceFragments.length === 0) {
      return { hasRisk: false, evidence: [] as string[] };
    }

    const joinedSources = sourceFragments.join(' ').toLowerCase();
    const evidence = (payload.auditoria as { trechosSuporte?: unknown })?.trechosSuporte;
    const snippets = Array.isArray(evidence) ? evidence.filter((item): item is string => typeof item === 'string') : [];

    const missing = snippets.filter((snippet) => !joinedSources.includes(snippet.toLowerCase()));
    return { hasRisk: missing.length > 0, evidence: missing };
  }

  private async logAiInteraction(input: {
    task: string;
    model: string;
    prompt: Record<string, unknown>;
    response: unknown;
    tokens: number;
    latencyMs: number;
  }) {
    try {
      await this.prisma.activityLog.create({
        data: {
          tenantId: this.context.get('tenantId') ?? '',
          entityType: 'ai-interaction',
          entityId: input.task,
          action: 'execute',
          payloadJson: ({
            model: input.model,
            prompt: input.prompt,
            response: input.response,
            tokens: input.tokens,
            latencyMs: input.latencyMs,
          } as unknown) as any,
        },
      });
    } catch {
      // no-op: não bloquear fluxo por falha de auditoria
    }
  }

  private decodeBase64Safely(fileBase64: string): string {
    try {
      return Buffer.from(fileBase64, 'base64').toString('utf-8');
    } catch {
      return fileBase64;
    }
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
