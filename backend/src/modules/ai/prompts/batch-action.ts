import { PromptBuildResult } from './types';

interface BuildBatchActionPromptInput {
  instruction: string;
  availableFields: string[];
  availableActions: string[];
  timezone: string;
}

export function buildBatchActionPrompt(input: BuildBatchActionPromptInput): PromptBuildResult {
  return {
    version: 'v2.1.0',
    system: `Você interpreta linguagem natural para montar plano de ação em lote (AiJobPlan).
Regras de segurança:
1) Nunca executar ações diretamente.
2) requiresHumanApproval deve ser sempre true.
3) previewMessage deve pedir revisão humana antes da execução.
4) Em ambiguidades (tempo, cidade, escopo), elevar riskLevel e explicitar dúvida.
5) Responder estritamente em JSON válido.`,
    user: `Comando do usuário: "${input.instruction}"
Campos permitidos para filtros: ${input.availableFields.join(', ')}
Ações permitidas: ${input.availableActions.join(', ')}
Timezone do sistema: ${input.timezone}

Produza AiJobPlan com filtros e ações planejadas, nunca executadas.`,
    fewShot: [
      {
        role: 'user',
        content: 'agendar todas as perícias de BH para semana que vem',
      },
      {
        role: 'assistant',
        content: `{
  "intent": "agendar_pericias",
  "filters": [
    { "field": "cidade", "operator": "eq", "value": "Belo Horizonte" },
    { "field": "periodo", "operator": "between", "value": ["2026-03-02", "2026-03-08"] }
  ],
  "actions": [
    { "type": "schedule", "params": { "strategy": "primeiro_slot_disponivel", "timezone": "America/Sao_Paulo" } }
  ],
  "requiresHumanApproval": true,
  "previewMessage": "Plano preparado para agendar perícias de Belo Horizonte na próxima semana. Revise quantidade, conflitos de agenda e datas antes de confirmar.",
  "riskLevel": "medio"
}`,
      },
      {
        role: 'user',
        content: 'remarca tudo para sexta',
      },
      {
        role: 'assistant',
        content: `{
  "intent": "reschedule_pericias",
  "filters": [
    { "field": "status", "operator": "in", "value": ["agendada"] }
  ],
  "actions": [
    { "type": "reschedule", "params": { "targetDay": "sexta", "timezone": "America/Sao_Paulo" } }
  ],
  "requiresHumanApproval": true,
  "previewMessage": "Comando ambíguo: 'tudo' pode envolver múltiplas cidades e peritos. Revise escopo e período exatos antes de confirmar o reagendamento.",
  "riskLevel": "alto"
}`,
      },
    ],
    outputSchema: {
      type: 'object',
      additionalProperties: false,
      required: ['intent', 'filters', 'actions', 'requiresHumanApproval', 'previewMessage', 'riskLevel'],
      properties: {
        intent: { type: 'string' },
        filters: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['field', 'operator', 'value'],
            properties: {
              field: { type: 'string' },
              operator: { type: 'string', enum: ['eq', 'neq', 'in', 'between', 'contains'] },
              value: {
                oneOf: [
                  { type: 'string' },
                  { type: 'number' },
                  { type: 'boolean' },
                  { type: 'array', items: { type: 'string' } },
                ],
              },
            },
          },
        },
        actions: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['type', 'params'],
            properties: {
              type: { type: 'string', enum: ['schedule', 'reschedule', 'notify', 'tag', 'export', 'assign'] },
              params: { type: 'object' },
            },
          },
        },
        requiresHumanApproval: { type: 'boolean' },
        previewMessage: { type: 'string' },
        riskLevel: { type: 'string', enum: ['baixo', 'medio', 'alto'] },
      },
    },
    safetyChecklist: [
      'Human-in-the-loop obrigatório',
      'Sem execução automática',
      'Tratamento explícito de ambiguidade',
      'JSON conforme schema',
    ],
  };
}
