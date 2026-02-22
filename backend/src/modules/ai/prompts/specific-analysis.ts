import { PromptBuildResult, TipoPericia } from './types';

interface BuildSpecificAnalysisPromptInput {
  tipoPericia: TipoPericia;
  resumoCaso: string;
  evidencias: string[];
}

const focoPorPericia: Record<TipoPericia, string[]> = {
  previdenciaria: ['histórico funcional', 'documentos previdenciários', 'cronologia dos sintomas'],
  acidentaria: ['cronologia do evento', 'CAT/BO/documentos ocupacionais', 'sequelas alegadas'],
  civel: ['dano alegado', 'comprovação documental', 'consistência cronológica'],
  trabalhista: ['atividade laboral', 'exposição ocupacional', 'registros de afastamento'],
  securitaria: ['cobertura contratual citada', 'evento gatilho', 'documentação médica do sinistro'],
  administrativa: ['requisitos normativos', 'documentos oficiais', 'rastreabilidade da decisão administrativa'],
  outra: ['delimitação do objeto pericial', 'fatos incontroversos', 'lacunas documentais'],
};

export function buildSpecificAnalysisPrompt(input: BuildSpecificAnalysisPromptInput): PromptBuildResult {
  const focos = focoPorPericia[input.tipoPericia].join(', ');

  return {
    version: 'v2.1.0',
    system: `Você é um assistente de apoio técnico para análise pericial específica.
Regras fixas:
- Não concluir nexo causal;
- Não afirmar incapacidade;
- Não recomendar tratamento;
- Não emitir juízo sobre credibilidade das partes.
Use raciocínio interno por etapas e responda somente JSON válido.`,
    user: `Tipo de perícia: ${input.tipoPericia}
Focos mandatórios para este tipo: ${focos}
Resumo do caso: ${input.resumoCaso}
Evidências disponíveis: ${input.evidencias.join(' | ')}

Gere análise estruturada com linguagem técnica e revisável pelo perito.
Se a base for insuficiente, deixe explícito nas inconsistências e reduza confidence score.`,
    fewShot: [
      {
        role: 'user',
        content:
          'Tipo de perícia: trabalhista\nResumo: auxiliar de produção refere dor em punhos há 2 anos; afastamentos intermitentes.\nEvidências: ASO periódico | atestado ortopédico sem CID detalhado | descrição de função repetitiva.',
      },
      {
        role: 'assistant',
        content: `{
  "tipoPericia": "trabalhista",
  "adequacaoDocumental": [
    "Há descrição funcional ocupacional e atestados, porém sem detalhamento clínico seriado"
  ],
  "pontosCriticos": [
    "Falta cronologia objetiva dos períodos de crise e melhora",
    "Ausência de exame complementar no conjunto enviado"
  ],
  "inconsistenciasAparentes": [
    "Atestado sem CID detalhado dificulta correlação com queixa atual"
  ],
  "quesitosTecnicosSugeridos": [
    "Descrever tarefas com maior repetitividade e frequência",
    "Precisar períodos de afastamento e retorno por função"
  ],
  "planoEntrevistaPericial": [
    "Explorar evolução temporal dos sintomas",
    "Caracterizar fatores de piora/melhora durante jornada"
  ],
  "examesComplementaresSugeridos": [
    "não identificado"
  ],
  "confidence": {
    "score": 0.71,
    "justificativa": "Há elementos ocupacionais mínimos, mas documentação clínica incompleta."
  }
}`,
      },
    ],
    outputSchema: {
      type: 'object',
      additionalProperties: false,
      required: [
        'tipoPericia',
        'adequacaoDocumental',
        'pontosCriticos',
        'inconsistenciasAparentes',
        'quesitosTecnicosSugeridos',
        'planoEntrevistaPericial',
        'examesComplementaresSugeridos',
        'confidence',
      ],
      properties: {
        tipoPericia: {
          type: 'string',
          enum: ['previdenciaria', 'acidentaria', 'civel', 'trabalhista', 'securitaria', 'administrativa', 'outra'],
        },
        adequacaoDocumental: { type: 'array', minItems: 1, items: { type: 'string' } },
        pontosCriticos: { type: 'array', minItems: 1, items: { type: 'string' } },
        inconsistenciasAparentes: { type: 'array', minItems: 1, items: { type: 'string' } },
        quesitosTecnicosSugeridos: { type: 'array', minItems: 1, items: { type: 'string' } },
        planoEntrevistaPericial: { type: 'array', minItems: 1, items: { type: 'string' } },
        examesComplementaresSugeridos: { type: 'array', minItems: 1, items: { type: 'string' } },
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
      'Sem conclusão pericial automática',
      'Sem recomendação terapêutica',
      'Formato JSON válido e completo',
      'Pontuação de confiança coerente com completude documental',
    ],
  };
}
