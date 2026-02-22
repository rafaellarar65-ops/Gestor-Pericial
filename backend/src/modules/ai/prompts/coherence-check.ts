import { ExamPerformed, PromptBuildResult } from './types';

interface BuildCoherenceCheckPromptInput {
  alegacoesClinicas: string[];
  achadosExame: ExamPerformed[];
  contextoDocumental: string;
}

export function buildCoherenceCheckPrompt(input: BuildCoherenceCheckPromptInput): PromptBuildResult {
  return {
    version: 'v2.1.0',
    system: `Você é um validador de coerência clínica para apoio pericial.
Objetivo: identificar inconsistências entre alegações, exame físico e documentação.
Regras:
- Não emitir diagnóstico final;
- Não afirmar incapacidade;
- Não concluir nexo causal;
- Sempre propor pergunta de esclarecimento para o perito.
Resposta somente em JSON (array de CoherenceIssue).`,
    user: `Alegações clínicas: ${input.alegacoesClinicas.join(' | ')}
Achados do exame físico: ${JSON.stringify(input.achadosExame)}
Contexto documental: ${input.contextoDocumental}

Detecte inconsistências de lateralidade, temporalidade, fisiopatologia e incongruência documental.
Se não houver inconsistência relevante, retornar [].`,
    fewShot: [
      {
        role: 'user',
        content:
          'Alegações: dor lombar irradiada apenas para perna direita. Achados: Lasegue positivo bilateral. Contexto: sem exame de imagem recente.',
      },
      {
        role: 'assistant',
        content: `[
  {
    "id": "coh-001",
    "severidade": "media",
    "categoria": "lateralidade",
    "descricao": "Há divergência entre irradiação referida unilateral à direita e manobra de Lasègue positiva bilateral.",
    "evidencias": [
      "dor irradiada apenas para perna direita",
      "Lasegue positivo bilateral"
    ],
    "sugestaoPerguntaPerito": "Durante o exame, a dor provocada na manobra foi simétrica ou predominante à direita?"
  }
]`,
      },
    ],
    outputSchema: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'severidade', 'categoria', 'descricao', 'evidencias', 'sugestaoPerguntaPerito'],
        properties: {
          id: { type: 'string' },
          severidade: { type: 'string', enum: ['baixa', 'media', 'alta'] },
          categoria: {
            type: 'string',
            enum: ['lateralidade', 'temporalidade', 'fisiopatologia', 'incongruencia_documental'],
          },
          descricao: { type: 'string' },
          evidencias: { type: 'array', minItems: 1, items: { type: 'string' } },
          sugestaoPerguntaPerito: { type: 'string' },
        },
      },
    },
    safetyChecklist: [
      'Sem conclusão diagnóstica/pericial',
      'Cada issue com evidência textual',
      'Sempre com pergunta útil ao perito',
      'Retorna [] quando apropriado',
    ],
  };
}
