export interface AiGuardrailsConfig {
  prohibitedTopics: string[];
  hallucinationFilter: {
    enabled: boolean;
    strategy: 'citation-required' | 'cross-check-documents';
    missingEvidenceResponse: string;
  };
  confidence: {
    threshold: number;
    lowConfidenceResponse: string;
  };
  modelPolicy: {
    defaultModel: 'gemini-2.0-flash';
    escalationModel: 'gemini-2.0-pro' | 'claude-sonnet';
    escalationRules: string[];
  };
  maxTokensPerRequest: {
    analyzeDocument: number;
    specificAnalysis: number;
    laudoAssistant: number;
    batchAction: number;
    coherenceCheck: number;
  };
  rateLimitPerUserPerDay: {
    requests: number;
    tokens: number;
  };
  logging: {
    mandatory: true;
    fields: Array<'userId' | 'tenantId' | 'timestamp' | 'prompt' | 'response' | 'tokens' | 'latencyMs' | 'model'>;
    retentionDays: number;
  };
}

export const guardrailsConfig: AiGuardrailsConfig = {
  prohibitedTopics: [
    'conclusao_de_nexo_causal',
    'afirmacao_de_incapacidade_laboral',
    'recomendacao_de_tratamento',
    'juizo_de_valor_sobre_autor_reu_perito_ou_advogados',
  ],
  hallucinationFilter: {
    enabled: true,
    strategy: 'cross-check-documents',
    missingEvidenceResponse: 'Informação não localizada nos documentos fornecidos.',
  },
  confidence: {
    threshold: 0.7,
    lowConfidenceResponse: 'Não foi possível determinar com confiança',
  },
  modelPolicy: {
    defaultModel: 'gemini-2.0-flash',
    escalationModel: 'gemini-2.0-pro',
    escalationRules: [
      'usar modelo de escalonamento para documentos extensos e múltiplas contradições',
      'usar Claude Sonnet como fallback quando Gemini estiver indisponível',
    ],
  },
  maxTokensPerRequest: {
    analyzeDocument: 6000,
    specificAnalysis: 3500,
    laudoAssistant: 2500,
    batchAction: 1200,
    coherenceCheck: 1800,
  },
  rateLimitPerUserPerDay: {
    requests: 300,
    tokens: 450000,
  },
  logging: {
    mandatory: true,
    fields: ['userId', 'tenantId', 'timestamp', 'prompt', 'response', 'tokens', 'latencyMs', 'model'],
    retentionDays: 180,
  },
};
