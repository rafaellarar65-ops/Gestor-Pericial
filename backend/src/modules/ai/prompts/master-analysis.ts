import { AiMasterAnalysis, PromptBuildResult, TipoPericia } from './types';

interface BuildMasterAnalysisPromptInput {
  tipoAcaoEstimado: string;
  textoDocumento: string;
  idioma?: 'pt-BR';
}

const masterSchema: PromptBuildResult['outputSchema'] = {
  type: 'object',
  additionalProperties: false,
  required: [
    'tipoAcaoEstimado',
    'tipoPericiaSugerido',
    'resumoExecutivo',
    'entidadesExtraidas',
    'timeline',
    'pendenciasDocumentais',
    'quesitosIdentificados',
    'riscosProcessuais',
    'confidence',
    'auditoria',
  ],
  properties: {
    tipoAcaoEstimado: { type: 'string' },
    tipoPericiaSugerido: {
      type: 'string',
      enum: ['previdenciaria', 'acidentaria', 'civel', 'trabalhista', 'securitaria', 'administrativa', 'outra'],
    },
    resumoExecutivo: { type: 'string' },
    entidadesExtraidas: {
      type: 'object',
      additionalProperties: false,
      required: ['partes', 'datasRelevantes', 'documentosCitados', 'condicoesAlegadas'],
      properties: {
        partes: { type: 'array', minItems: 1, items: { type: 'string' } },
        datasRelevantes: { type: 'array', minItems: 1, items: { type: 'string' } },
        documentosCitados: { type: 'array', minItems: 1, items: { type: 'string' } },
        condicoesAlegadas: { type: 'array', minItems: 1, items: { type: 'string' } },
      },
    },
    timeline: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['data', 'evento', 'fonte'],
        properties: {
          data: { type: 'string' },
          evento: { type: 'string' },
          fonte: { type: 'string' },
        },
      },
    },
    pendenciasDocumentais: { type: 'array', minItems: 1, items: { type: 'string' } },
    quesitosIdentificados: { type: 'array', minItems: 1, items: { type: 'string' } },
    riscosProcessuais: { type: 'array', minItems: 1, items: { type: 'string' } },
    confidence: {
      type: 'object',
      additionalProperties: false,
      required: ['score', 'justificativa'],
      properties: {
        score: { type: 'number' },
        justificativa: { type: 'string' },
      },
    },
    auditoria: {
      type: 'object',
      additionalProperties: false,
      required: ['trechosSuporte', 'limitesDaAnalise'],
      properties: {
        trechosSuporte: { type: 'array', minItems: 1, items: { type: 'string' } },
        limitesDaAnalise: { type: 'array', minItems: 1, items: { type: 'string' } },
      },
    },
  },
};

export function buildMasterAnalysisPrompt(input: BuildMasterAnalysisPromptInput): PromptBuildResult {
  return {
    version: 'v2.1.0',
    system: `Você é um assistente de apoio pericial médico-legal para leitura inicial de documentos processuais.
Contexto crítico: a IA apenas organiza/extrai/sugere; decisão pericial é exclusivamente humana.

Regras mandatórias:
1) NUNCA concluir nexo causal, incapacidade laboral, culpa, fraude ou mérito processual.
2) Executar raciocínio interno em 4 etapas: extração factual -> validação cruzada -> detecção de lacunas -> síntese.
3) Não expor o raciocínio interno. Retornar somente JSON válido.
4) Para ausências documentais, usar "não identificado" e registrar em pendências/limites.
5) Confidence score entre 0 e 1, calibrado por: completude documental + coerência interna + rastreabilidade de evidências.
6) Todo fato relevante deve ser ancorado em trechos literais no campo auditoria.trechosSuporte.`,
    user: `Tipo de ação estimado (fornecido pelo sistema): ${input.tipoAcaoEstimado}
Idioma de saída: ${input.idioma ?? 'pt-BR'}

Tarefa:
- Classificar tipo pericial sugerido;
- Extrair entidades e linha do tempo;
- Identificar quesitos e riscos processuais;
- Sinalizar pendências para revisão do perito.

Formato obrigatório:
- JSON puro (sem markdown, sem comentários, sem texto antes/depois).
- Respeitar o schema fornecido.

---DOCUMENTO_INICIO---
${input.textoDocumento}
---DOCUMENTO_FIM---`,
    fewShot: [
      {
        role: 'user',
        content:
          'Tipo de ação estimado: previdenciária\nDocumento: autora pede benefício por incapacidade, junta laudo ortopédico com lombociatalgia e atestado de 120 dias.',
      },
      {
        role: 'assistant',
        content: JSON.stringify(
          {
            tipoAcaoEstimado: 'previdenciária',
            tipoPericiaSugerido: 'previdenciaria' as TipoPericia,
            resumoExecutivo:
              'Pedido previdenciário com alegação de limitação funcional por lombociatalgia e documentação clínica parcial no trecho recebido.',
            entidadesExtraidas: {
              partes: ['Autora', 'INSS'],
              datasRelevantes: ['não identificado'],
              documentosCitados: ['laudo ortopédico', 'atestado de 120 dias'],
              condicoesAlegadas: ['lombociatalgia'],
            },
            timeline: [{ data: 'não identificado', evento: 'Emissão de atestado por 120 dias', fonte: 'atestado de 120 dias' }],
            pendenciasDocumentais: ['Exame de imagem atualizado', 'Evolução clínica cronológica em prontuário'],
            quesitosIdentificados: ['Limitação funcional descrita pelo autor', 'Compatibilidade temporal entre sintomas e documentos juntados'],
            riscosProcessuais: ['Trecho documental curto para avaliação integral do caso'],
            confidence: {
              score: 0.74,
              justificativa: 'Há alegação clínica explícita e documentação mínima, porém sem cronologia clínica completa.',
            },
            auditoria: {
              trechosSuporte: ['pede benefício por incapacidade', 'laudo ortopédico', 'lombociatalgia', 'atestado de 120 dias'],
              limitesDaAnalise: ['Não há exames complementares no trecho', 'Não há datas detalhadas para ordenar evolução clínica'],
            },
          } satisfies AiMasterAnalysis,
          null,
          2,
        ),
      },
      {
        role: 'user',
        content:
          'Tipo de ação estimado: acidentária\nDocumento: trabalhador relata queda em 14/02/2023, CAT anexada, dor em ombro esquerdo; atestado de 15 dias e retorno ao trabalho em função adaptada.',
      },
      {
        role: 'assistant',
        content: JSON.stringify(
          {
            tipoAcaoEstimado: 'acidentária',
            tipoPericiaSugerido: 'acidentaria' as TipoPericia,
            resumoExecutivo:
              'Há relato de acidente com CAT e afastamento curto, seguido de retorno em função adaptada, exigindo validação cronológica documental.',
            entidadesExtraidas: {
              partes: ['Trabalhador', 'Empregador'],
              datasRelevantes: ['14/02/2023'],
              documentosCitados: ['CAT', 'atestado de 15 dias'],
              condicoesAlegadas: ['dor em ombro esquerdo'],
            },
            timeline: [
              { data: '14/02/2023', evento: 'Relato de queda', fonte: 'relata queda em 14/02/2023' },
              { data: 'não identificado', evento: 'Afastamento por 15 dias', fonte: 'atestado de 15 dias' },
            ],
            pendenciasDocumentais: ['Exames de imagem do ombro esquerdo', 'Descrição detalhada da função adaptada'],
            quesitosIdentificados: ['Cronologia entre evento, afastamento e retorno', 'Descrição objetiva de limitação funcional no período pós-evento'],
            riscosProcessuais: ['Dados de reabilitação e evolução funcional pouco detalhados'],
            confidence: {
              score: 0.79,
              justificativa: 'Há marco temporal e documentos-chave, com lacunas moderadas sobre evolução pós-retorno.',
            },
            auditoria: {
              trechosSuporte: ['queda em 14/02/2023', 'CAT anexada', 'dor em ombro esquerdo', 'retorno ao trabalho em função adaptada'],
              limitesDaAnalise: ['Sem laudo de imagem anexado no trecho', 'Sem descrição técnica da função adaptada'],
            },
          } satisfies AiMasterAnalysis,
          null,
          2,
        ),
      },
    ],
    outputSchema: masterSchema,
    safetyChecklist: [
      'Sem conclusão de nexo/incapacidade',
      'Somente fatos presentes no documento',
      'Campos obrigatórios preenchidos mesmo com "não identificado" quando faltar dado',
      'Resposta final em JSON puro',
    ],
  };
}
