import { ExamPerformed, PromptBuildResult, TipoPericia } from './types';

interface BuildLaudoAssistantPromptInput {
  tipoPericia: TipoPericia;
  secaoLaudo: string;
  examPerformed: ExamPerformed[];
  protocolos: string[];
  quesitos: string[];
}

export function buildLaudoAssistantPrompt(input: BuildLaudoAssistantPromptInput): PromptBuildResult {
  return {
    version: 'v2.1.0',
    system: `Você é um assistente de redação técnica para seções de laudo pericial.
Restrições absolutas:
- NUNCA concluir nexo causal;
- NUNCA afirmar incapacidade laboral;
- NUNCA recomendar tratamento;
- NUNCA substituir o julgamento do perito.

Produza texto objetivo, auditável e com sinalização de lacunas documentais.
Se confidence.score < 0.7, preencher textoSugerido com exatamente: "Não foi possível determinar com confiança".`,
    user: `Tipo de perícia: ${input.tipoPericia}
Seção alvo: ${input.secaoLaudo}
Achados de exame físico (ExamPerformed): ${JSON.stringify(input.examPerformed)}
Protocolos recuperados (RAG): ${input.protocolos.join(' | ')}
Quesitos processuais: ${input.quesitos.join(' | ')}

Retorne JSON para preenchimento assistido da seção.
Não inclua texto fora do JSON.`,
    fewShot: [
      {
        role: 'user',
        content:
          'Tipo: previdenciaria\nSeção: Exame Físico\nAchados: [{"sistema":"osteomuscular","achado":"Lasegue positivo bilateral","lateralidade":"bilateral"}]\nProtocolos: ortopedia lombar\nQuesitos: descrever achados objetivos',
      },
      {
        role: 'assistant',
        content: `{
  "secao": "Exame Físico",
  "textoSugerido": "No exame osteomuscular, foi registrada positividade bilateral da manobra de Lasègue, conforme achado objetivo informado. Recomenda-se manter a descrição técnica dos achados observados e sua reprodutibilidade no ato pericial.",
  "topicosCobertos": [
    "Achado objetivo do exame físico",
    "Linguagem técnica descritiva",
    "Sem inferência conclusiva"
  ],
  "pendencias": [
    "Informar grau de dor referida durante a manobra",
    "Registrar correlação com outras manobras do mesmo segmento"
  ],
  "alertasEticos": [
    "Sem conclusão de nexo causal",
    "Sem afirmação de incapacidade"
  ],
  "confidence": {
    "score": 0.78,
    "justificativa": "Achado objetivo descrito, com lacunas moderadas de detalhamento complementar."
  }
}`,
      },
    ],
    outputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['secao', 'textoSugerido', 'topicosCobertos', 'pendencias', 'alertasEticos', 'confidence'],
      properties: {
        secao: { type: 'string' },
        textoSugerido: { type: 'string' },
        topicosCobertos: { type: 'array', minItems: 1, items: { type: 'string' } },
        pendencias: { type: 'array', minItems: 1, items: { type: 'string' } },
        alertasEticos: { type: 'array', minItems: 1, items: { type: 'string' } },
        confidence: {
          type: 'object',
          additionalProperties: false,
          required: ['score', 'justificativa'],
          properties: {
            score: { type: 'number' },
            justificativa: { type: 'string' },
          },
        },
      },
    },
    safetyChecklist: [
      'Texto revisável pelo perito',
      'Nenhuma conclusão pericial automática',
      'Fallback textual quando confidence < 0.7',
      'JSON puro e validável',
    ],
  };
}
