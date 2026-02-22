# Arquitetura de IA — Pericias Manager Pro

## Fluxo de dados (alto nível)
1. Upload de PDF/processo no backend.
2. Extração de texto/OCR + normalização.
3. Chamada dos prompts de análise (`master`, `specific`, `coherence`, `laudo`, `batch`).
4. Enriquecimento com RAG (pgvector).
5. Aplicação de guardrails (temas proibidos, confiança, anti-alucinação).
6. Persistência de saída JSON + trilha de auditoria.
7. Revisão humana obrigatória pelo perito antes de uso final.

## Serviços envolvidos
- API NestJS (orquestração e autenticação).
- Serviço de IA (Gemini Flash primário, Claude Sonnet fallback).
- PostgreSQL + pgvector (base vetorial).
- Cache (Redis recomendado para respostas de leitura frequente).
- Logging observável (prompt, resposta, tokens, latência).

## Cache
- Chave por hash de entrada (documento + versão de prompt + modelo).
- TTL sugerido:
  - análise documental: 24h,
  - batch plan: 2h,
  - assistente de laudo: 12h.
- Invalidar em atualização de documento/protocolo.

## Custos estimados por operação (referência)
- Master analysis (Gemini Flash): baixo a médio.
- Specific analysis: médio.
- Laudo assistant: baixo.
- Batch action: baixo.
- Coherence check: baixo.
- Escalonamento para Gemini Pro: usar somente casos complexos/ambíguos para controle de custo.

## Observações de governança
- A IA organiza e sugere; nunca conclui pericialmente.
- Saídas devem ser JSON versionado para rastreabilidade.
- Toda resposta precisa de revisão explícita do perito responsável.
