# Pipeline RAG — Base de Conhecimento (Pericias Manager Pro)

## 1) Indexação em pgvector
- Tabela `KnowledgeItem`: armazenar `id`, `title`, `content`, `source`, `updatedAt`, `embedding vector(768)`.
- Tabela `PhysicalManeuver`: armazenar `id`, `nome`, `descricao`, `interpretacao`, `contraindicacoes`, `embedding vector(768)`.
- Criar índice `ivfflat` por tabela com distância de cosseno (`vector_cosine_ops`) e `lists` ajustado por volume.

## 2) Embedding recomendado
- Preferência: `text-embedding-004` (Google), por custo/qualidade para texto técnico em PT-BR.
- Alternativa equivalente em indisponibilidade: modelo com dimensão compatível e estabilidade semântica médica.

## 3) Estratégia de chunk para protocolos longos
- Chunk alvo: 600–900 tokens.
- Overlap: 80–120 tokens para preservar continuidade clínica.
- Segmentar por seções semânticas (`indicação`, `método`, `interpretação`, `limitações`).
- Salvar metadados de seção para reranking contextual.

## 4) Query pipeline
1. Pergunta do perito em linguagem natural.
2. Normalização (remoção de ruído, expansão de siglas críticas).
3. Geração de embedding da pergunta.
4. Busca vetorial top-k em `KnowledgeItem` e `PhysicalManeuver`.
5. Reranking por metadados (especialidade, atualização, aderência ao tipo de perícia).
6. Montagem de contexto com citações rastreáveis.
7. LLM (Gemini 2.0 Flash por padrão) gera resposta JSON estruturada.
8. Guardrail verifica alucinação (fatos precisam existir no contexto recuperado).

## 5) Fallback quando RAG não encontra relevância
- Critério: score máximo de similaridade abaixo do limiar (ex.: 0.65).
- Retorno padrão: "Não foi possível determinar com confiança" + pendência explícita.
- Estratégia adicional:
  - ampliar top-k,
  - reescrever consulta,
  - escalar para Gemini Pro apenas se necessário.
