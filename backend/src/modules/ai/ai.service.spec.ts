import { AiService } from './ai.service';

describe('AiService', () => {
  const prisma = {
    dailyUsage: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
  } as any;

  const context = { get: jest.fn().mockReturnValue('t-1') };

  let service: AiService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AiService(prisma, context as any);
  });

  it('builds master-analysis prompt payload (happy path)', async () => {
    prisma.dailyUsage.findFirst.mockResolvedValue(null);
    prisma.dailyUsage.create.mockResolvedValue({ id: 'du-1' });

    const result = (await service.analyzeDocument({
      fileName: 'doc.pdf',
      fileBase64: Buffer.from('texto do documento').toString('base64'),
      tipoAcaoEstimado: 'previdenciária',
    })) as any;

    expect(result.task).toBe('master-analysis');
    expect(result.prompt.outputSchema.type).toBe('object');
    expect(result.cached).toBe(false);
  });

  it('returns cached response for same payload (edge case)', async () => {
    prisma.dailyUsage.findFirst.mockResolvedValue(null);
    prisma.dailyUsage.create.mockResolvedValue({ id: 'du-1' });

    await service.analyzeDocument({
      fileName: 'doc.pdf',
      fileBase64: Buffer.from('texto do documento').toString('base64'),
      tipoAcaoEstimado: 'previdenciária',
    });
    const second = (await service.analyzeDocument({
      fileName: 'doc.pdf',
      fileBase64: Buffer.from('texto do documento').toString('base64'),
      tipoAcaoEstimado: 'previdenciária',
    })) as any;

    expect(second.cached).toBe(true);
  });

  it('always marks batch actions as requiring human approval', async () => {
    prisma.dailyUsage.findFirst.mockResolvedValue(null);
    prisma.dailyUsage.create.mockResolvedValue({ id: 'du-1' });

    const result = (await service.batchAction({
      instruction: 'agendar perícias de BH',
      items: [{ id: '1', payload: { cidade: 'Belo Horizonte' } }],
    })) as any;

    expect(result.requiresHumanApproval).toBe(true);
    expect(result.prompt.safetyChecklist).toContain('Human-in-the-loop obrigatório');
  });

  it('enforces confidence fallback on low-confidence model output', async () => {
    prisma.dailyUsage.findFirst.mockResolvedValue(null);
    prisma.dailyUsage.create.mockResolvedValue({ id: 'du-1' });

    const result = (await service.processAiOutput({
      task: 'laudo-assistant',
      rawResponse: {
        textoSugerido: 'texto original',
        confidence: { score: 0.4, justificativa: 'dados insuficientes' },
      },
    })) as any;

    expect(result.confidenceOk).toBe(false);
    expect(result.processedResponse.textoSugerido).toBe('Não foi possível determinar com confiança');
  });

  it('flags prohibited medical-legal conclusions', async () => {
    prisma.dailyUsage.findFirst.mockResolvedValue(null);
    prisma.dailyUsage.create.mockResolvedValue({ id: 'du-1' });

    const result = (await service.processAiOutput({
      task: 'master-analysis',
      rawResponse: {
        resumoExecutivo: 'Há nexo causal estabelecido no caso e incapacidade laboral.',
        confidence: { score: 0.88, justificativa: 'texto assertivo' },
      },
    })) as any;

    expect(result.prohibitedHits).toContain('conclusao_de_nexo_causal');
    expect(result.approvedForHumanReview).toBe(false);
  });

  it('executes task, validates schema and writes activity log', async () => {
    prisma.dailyUsage.findFirst.mockResolvedValue(null);
    prisma.dailyUsage.create.mockResolvedValue({ id: 'du-1' });
    prisma.activityLog.create.mockResolvedValue({ id: 'log-1' });

    const built = (await service.analyzeDocument({
      fileName: 'doc.pdf',
      fileBase64: Buffer.from('texto').toString('base64'),
      tipoAcaoEstimado: 'previdenciária',
    })) as any;

    const result = (await service.executeTask({
      task: 'master-analysis',
      prompt: built.prompt,
      mockResponse: {
        tipoAcaoEstimado: 'previdenciária',
        tipoPericiaSugerido: 'previdenciaria',
        resumoExecutivo: 'resumo',
        entidadesExtraidas: { partes: ['a'], datasRelevantes: ['d'], documentosCitados: ['x'], condicoesAlegadas: ['y'] },
        timeline: [{ data: 'd', evento: 'e', fonte: 'f' }],
        pendenciasDocumentais: ['p'],
        quesitosIdentificados: ['q'],
        riscosProcessuais: ['r'],
        confidence: { score: 0.8, justificativa: 'ok' },
        auditoria: { trechosSuporte: ['t'], limitesDaAnalise: ['l'] },
      },
    })) as any;

    expect(result.schemaValidation.valid).toBe(true);
    expect(result.modelUsed).toBe('gemini-2.0-flash');
    expect(prisma.activityLog.create).toHaveBeenCalled();
  });
});
