export type TipoPericia =
  | 'previdenciaria'
  | 'acidentaria'
  | 'civel'
  | 'trabalhista'
  | 'securitaria'
  | 'administrativa'
  | 'outra';

export interface JsonSchemaHint {
  type?: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  description?: string;
  required?: string[];
  properties?: Record<string, JsonSchemaHint>;
  items?: JsonSchemaHint;
  enum?: string[];
  minItems?: number;
  additionalProperties?: boolean | JsonSchemaHint;
  oneOf?: JsonSchemaHint[];
}

export interface AiMasterAnalysis {
  tipoAcaoEstimado: string;
  tipoPericiaSugerido: TipoPericia;
  resumoExecutivo: string;
  entidadesExtraidas: {
    partes: string[];
    datasRelevantes: string[];
    documentosCitados: string[];
    condicoesAlegadas: string[];
  };
  timeline: Array<{
    data: string;
    evento: string;
    fonte: string;
  }>;
  pendenciasDocumentais: string[];
  quesitosIdentificados: string[];
  riscosProcessuais: string[];
  confidence: {
    score: number;
    justificativa: string;
  };
  auditoria: {
    trechosSuporte: string[];
    limitesDaAnalise: string[];
  };
}

export interface AiSpecificAnalysis {
  tipoPericia: TipoPericia;
  adequacaoDocumental: string[];
  pontosCriticos: string[];
  inconsistenciasAparentes: string[];
  quesitosTecnicosSugeridos: string[];
  planoEntrevistaPericial: string[];
  examesComplementaresSugeridos: string[];
  confidence: {
    score: number;
    justificativa: string;
  };
}

export interface ExamPerformed {
  sistema: string;
  achado: string;
  lateralidade?: 'direita' | 'esquerda' | 'bilateral' | 'nao_aplicavel';
  intensidade?: 'leve' | 'moderada' | 'grave' | 'nao_aplicavel';
  observacoes?: string;
}

export interface AiJobPlan {
  intent: string;
  filters: Array<{
    field: string;
    operator: 'eq' | 'neq' | 'in' | 'between' | 'contains';
    value: string | number | boolean | string[];
  }>;
  actions: Array<{
    type: 'schedule' | 'reschedule' | 'notify' | 'tag' | 'export' | 'assign';
    params: Record<string, string | number | boolean>;
  }>;
  requiresHumanApproval: true;
  previewMessage: string;
  riskLevel: 'baixo' | 'medio' | 'alto';
}

export interface CoherenceIssue {
  id: string;
  severidade: 'baixa' | 'media' | 'alta';
  categoria: 'lateralidade' | 'temporalidade' | 'fisiopatologia' | 'incongruencia_documental';
  descricao: string;
  evidencias: string[];
  sugestaoPerguntaPerito: string;
}

export interface PromptBuildResult {
  version: string;
  system: string;
  user: string;
  fewShot: Array<{ role: 'user' | 'assistant'; content: string }>;
  outputSchema: JsonSchemaHint;
  safetyChecklist: string[];
}
