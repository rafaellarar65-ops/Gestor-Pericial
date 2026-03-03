# Plano Incremental — Frontend Perícias Manager Pro

## Objetivo
Entregar o frontend completo em ondas curtas, com valor utilizável a cada etapa, mantendo TypeScript strict, integração real com API e baixo risco de retrabalho.

## Premissas
- Reaproveitar os artefatos já produzidos: `tailwind-preset.ts`, `css-variables.css`, `design-tokens.ts`, `sidebar-config.ts`, `componentes-spec.md`, `wireframes.md`, `backend/swagger-spec.json` e `backend/prisma/schema.prisma`.
- Evitar lógica de negócio no frontend (somente estado de UI + orquestração de chamadas).
- Cada fase deve terminar com critérios de aceite e validação técnica mínima.

---

## Fase 0 — Fundação técnica (1 a 2 dias)

### Escopo
1. Criar app React 18 + Vite + TypeScript strict.
2. Configurar Tailwind + shadcn/ui usando `tailwind-preset.ts` e `css-variables.css`.
3. Definir estrutura de pastas base:
   - `src/app`
   - `src/pages`
   - `src/components/ui`
   - `src/components/domain`
   - `src/lib`
   - `src/services`
   - `src/stores`
   - `src/hooks`
   - `src/types`
4. Configurar React Router com rotas lazy (`React.lazy` + `Suspense`).
5. Configurar TanStack Query Provider, ErrorBoundary base e layout autenticado.
6. Setup de lint/format/test (ESLint, Prettier, Vitest + Testing Library).

### Entregáveis
- Projeto sobe localmente e compila sem warnings de TypeScript.
- Tema claro/escuro funcional com variáveis CSS.
- Shell da aplicação com Sidebar + Header + Breadcrumb placeholders.

### Critérios de aceite
- `npm run build` e `npm run test` passando.
- Sem `any` e sem `@ts-ignore`.

---

## Fase 1 — Camada de dados e autenticação (1 a 2 dias)

### Escopo
1. Gerar/definir tipos de API a partir de `backend/swagger-spec.json`.
2. Implementar `api-client` com interceptors (token, refresh, tratamento de erro).
3. Criar chaves e fábrica de query options por domínio.
4. Implementar `authStore` e `uiStore` (somente estado de interface/sessão local).
5. Implementar fluxo de login + proteção de rotas.

### Entregáveis
- Login funcional com backend real.
- Sessão persistida e refresh token operando.
- Tratamento padronizado para erros HTTP.

### Critérios de aceite
- Testes unitários do client/interceptors.
- Teste de integração do fluxo de login.

---

## Fase 2 — Design system mínimo viável (2 a 3 dias)

### Escopo
1. Implementar componentes base críticos (`Button`, `Input`, `Select`, `Dialog`, `Toast`, `Tabs`, `Badge`, `Table`).
2. Implementar componentes de domínio prioritários:
   - `StatusBadge`
   - `KPICard`
   - `FilterBar`
   - `DataTable` server-side
3. Garantir variantes via `cva`, acessibilidade e documentação curta por componente.

### Entregáveis
- Biblioteca mínima para viabilizar as páginas críticas.

### Critérios de aceite
- Testes de render/interação dos componentes críticos.
- A11y básica (labels, foco, aria)

---

## Fase 3 — Páginas críticas (MVP funcional) (4 a 6 dias)

### Escopo
1. **Dashboard** (`/`) com KPIs + gráfico + tabela resumo via `/pericias/dashboard`.
2. **Lista de Perícias** (`/pericias`) com filtros, sort e paginação server-side.
3. **Detalhe da Perícia** (`/pericias/:id`) com tabs (Dados/Docs/Financeiro/Laudo/Timeline).
4. **Financeiro** (`/financeiro`) com tabela e gráficos básicos.
5. **Agendamento em Lote** (`/agendar`) em wizard multi-step.

### Entregáveis
- Fluxo operacional principal navegável ponta-a-ponta.

### Critérios de aceite
- Toda página com loading/error/empty state.
- Smoke E2E dos fluxos principais.

---

## Fase 4 — Cobertura das demais páginas por domínio (5 a 8 dias)

### Escopo por ondas
1. **Agenda:** `/agenda`, `/pericias-hoje`, `/telepericias`.
2. **Perícias/Laudos:** `/nomeacoes`, `/laudos-pendentes`, `/laudo-v2`, `/manobras`, `/base-conhecimento`.
3. **Financeiro expandido:** `/cobranca`, `/relatorios-financeiros`, `/despesas`.
4. **Cadastros/comunicação/config:** `/cidades`, `/advogados`, `/comunicacao`, `/inbox-email`, `/configuracoes`, `/documentacao`, etc.

### Entregáveis
- Cobertura de wireframes restantes com padrão visual e técnico consistente.

### Critérios de aceite
- Rotas lazy para todas as páginas.
- Estados de UI consistentes e responsividade mínima validada.

---

## Fase 5 — Features transversais e robustez (2 a 4 dias)

### Escopo
1. Command Palette (Ctrl+K).
2. Persistência de colapso da Sidebar e preferências de tema.
3. Breadcrumbs automáticos por rota.
4. PWA básico (manifest + service worker).
5. Otimizações de performance (memoização, virtualização > 100 itens).

### Entregáveis
- Experiência de uso mais fluida e pronta para operação contínua.

### Critérios de aceite
- Auditoria de performance e acessibilidade em páginas críticas.

---

## Fase 6 — Qualidade final e go-live (2 a 3 dias)

### Escopo
1. Endurecer suite de testes (unitário + integração + smoke E2E).
2. Revisar acessibilidade (teclado, contraste, navegação).
3. Revisar observabilidade de erros e estados de falha.
4. Checklist final de release.

### Entregáveis
- Versão candidata a produção com risco controlado.

### Critérios de aceite
- Build estável.
- Testes críticos aprovados.
- Sem blockers de acessibilidade conhecidos.

---

## Estratégia de entrega (marcos)
- **Marco A (fim Fase 1):** base técnica + login + API pronta.
- **Marco B (fim Fase 3):** MVP com rotas e fluxos críticos.
- **Marco C (fim Fase 4):** cobertura ampla de páginas.
- **Marco D (fim Fase 6):** hardening e release.

## Priorização prática (ordem sugerida)
1. Infra e autenticação.
2. DataTable + filtros server-side.
3. Dashboard e Lista de Perícias.
4. Detalhe da Perícia.
5. Financeiro e Agendamento em Lote.
6. Restante das páginas.
7. Features transversais e hardening.

## Riscos e mitigação
- **Risco:** divergência Swagger x backend real.
  - **Mitigação:** contrato tipado + testes de integração por endpoint crítico.
- **Risco:** escopo grande (30+ páginas).
  - **Mitigação:** fatiamento por domínio e marcos com aceite.
- **Risco:** regressão visual/comportamental.
  - **Mitigação:** componentes reutilizáveis + testes de interação + revisão por checklist.
