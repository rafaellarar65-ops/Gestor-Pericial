import { BadRequestException, GatewayTimeoutException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PDFParse } from 'pdf-parse';
import { setTimeout as delay } from 'node:timers/promises';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AnalyzeDocumentDto,
  AnalyzePdfDto,
  BatchActionDto,
  CoherenceCheckDto,
  ExecuteAiTaskDto,
  LaudoAssistDto,
  ProcessAiOutputDto,
  SpecificAnalysisDto,
  TranscribeAudioDto,
  analyzePdfPromptType,
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
  private readonly logger = new Logger(AiService.name);
  private readonly genAI: GoogleGenerativeAI | null;
  private readonly geminiModel: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
  ) {
    const apiKey = process.env.GEMINI_API_KEY;
    this.genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
    this.geminiModel = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';
  }


  async transcribeAudio(dto: TranscribeAudioDto) {
    const startedAt = Date.now();
    const transcription = await this.withTimeout(this.transcribe(dto.audio), 60_000, 'Tempo limite excedido para transcrição de áudio.');

    await this.logTokenUsage('ai.transcribe-audio', Math.ceil(dto.audio.length / 4));
    this.logger.log(JSON.stringify({ event: 'ai.transcribe-audio.success', latencyMs: Date.now() - startedAt }));

    return { text: transcription };
  }

  async analyzePdf(dto: AnalyzePdfDto) {
    const startedAt = Date.now();
    const tenantId = this.context.get('tenantId') ?? '';

    const document = await this.prisma.caseDocument.findFirst({
      where: { id: dto.documentId, tenantId },
    });

    if (!document) {
      throw new NotFoundException('Documento não encontrado para este tenant.');
    }

    if (!document.storagePath) {
      throw new BadRequestException('Documento sem storagePath para processamento.');
    }

    const pdfBuffer = await this.withTimeout(this.fetchPdfBuffer(document.storagePath), 60_000, 'Tempo limite excedido ao baixar PDF.');

    const parser = new PDFParse({ data: pdfBuffer });
    const parsed = await this.withTimeout(parser.getText(), 60_000, 'Tempo limite excedido ao extrair texto do PDF.');
    await parser.destroy();
    const extractedText = parsed.text?.trim();

    if (!extractedText) {
      throw new BadRequestException('Não foi possível extrair texto do PDF informado.');
    }

    const analysis = await this.withTimeout(this.analyzePdfText(extractedText, dto.promptType), 60_000, 'Tempo limite excedido na análise de IA do PDF.');

    await this.logTokenUsage('ai.analyze-pdf', Math.ceil(extractedText.length / 4));

    this.logger.log(
      JSON.stringify({
        event: 'ai.analyze-pdf.success',
        promptType: dto.promptType,
        documentId: dto.documentId,
        latencyMs: Date.now() - startedAt,
      }),
    );

    return analysis;
  }


  private requireGenAI(): GoogleGenerativeAI {
    if (!this.genAI) {
      throw new InternalServerErrorException('GEMINI_API_KEY não configurada no backend.');
    }

    return this.genAI;
  }

  private async transcribe(audioInput: string): Promise<string> {
    const normalized = this.normalizeAudioInput(audioInput);
    const model = this.requireGenAI().getGenerativeModel({ model: this.geminiModel });

    const prompt =
      'Transcreva este áudio de consulta médica. Organize em seções: Identificação, História Médica, Exame Físico, etc. Formato: texto estruturado por seções.';

    const response = await model.generateContent([
      { inlineData: { data: normalized.base64, mimeType: normalized.mimeType } },
      { text: prompt },
    ]);

    const text = response.response.text();
    if (!text?.trim()) {
      throw new InternalServerErrorException('Gemini não retornou conteúdo de transcrição.');
    }

    return text.trim();
  }

  private async analyzePdfText(text: string, promptType: AnalyzePdfDto['promptType']): Promise<Record<string, unknown>> {
    const model = this.requireGenAI().getGenerativeModel({ model: this.geminiModel });
    const prompt = this.getAnalyzePdfPrompt(promptType, text);

    const response = await model.generateContent(prompt);
    const raw = response.response.text();

    if (!raw?.trim()) {
      throw new InternalServerErrorException('Gemini não retornou conteúdo para análise de PDF.');
    }

    return this.parseModelJsonResponse(raw);
  }

  private getAnalyzePdfPrompt(promptType: AnalyzePdfDto['promptType'], text: string): string {
    const preLaudoPrompt = `Analise este processo judicial de perícia médica.\n\nExtraia:\n1. Dados do processo (CNJ, vara, comarca, partes)\n2. Condições médicas alegadas (nome, CID, lateralidade)\n3. Linha do tempo de eventos\n4. Questões particulares a investigar\n5. Checklist documental\n\nFormato de resposta: JSON conforme interface AiMasterAnalysis em types.ts`;

    const summaryPrompt =
      'Resuma o processo pericial com foco em fatos clínicos e processuais, retornando JSON com resumoExecutivo, riscos e próximos passos.';

    const lawyersPrompt =
      'Extraia informações úteis para advogados (partes, pedidos, provas, inconsistências) e retorne JSON estruturado com campos claros.';

    const selectedPrompt =
      promptType === analyzePdfPromptType.PRE_LAUDO
        ? preLaudoPrompt
        : promptType === analyzePdfPromptType.SUMMARY
          ? summaryPrompt
          : lawyersPrompt;

    return `${selectedPrompt}\n\nTexto do documento:\n${text}`;
  }

  private parseModelJsonResponse(rawResponse: string): Record<string, unknown> {
    const normalized = rawResponse
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();

    try {
      const parsed = JSON.parse(normalized) as unknown;
      return this.normalizeParsedObject(parsed);
    } catch {
      throw new InternalServerErrorException('Resposta da IA não está em JSON válido.');
    }
  }

  private normalizeAudioInput(audioInput: string): { base64: string; mimeType: string } {
    if (audioInput.startsWith('http://') || audioInput.startsWith('https://')) {
      throw new BadRequestException('URL de áudio não suportada nesta versão. Envie base64 ou data URL.');
    }

    if (audioInput.startsWith('data:')) {
      const [meta, base64] = audioInput.split(',', 2);
      if (!base64) {
        throw new BadRequestException('Audio data URL inválida.');
      }

      const mimeType = meta.split(';')[0].replace('data:', '') || 'audio/webm';
      return { base64, mimeType };
    }

    return { base64: audioInput, mimeType: 'audio/webm' };
  }

  private async fetchPdfBuffer(storagePath: string): Promise<Buffer> {
    if (storagePath.startsWith('http://') || storagePath.startsWith('https://')) {
      const response = await fetch(storagePath);
      if (!response.ok) {
        throw new InternalServerErrorException(`Falha ao baixar PDF: ${response.statusText}`);
      }

      const data = await response.arrayBuffer();
      return Buffer.from(data);
    }

    throw new BadRequestException('Apenas storagePath em URL pública é suportado para análise de PDF.');
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
    const timeoutPromise = delay(timeoutMs).then(() => {
      throw new GatewayTimeoutException(timeoutMessage);
    });

    return Promise.race([promise, timeoutPromise]) as Promise<T>;
  }

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
