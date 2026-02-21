# Revisão Arquivo por Arquivo — Melhorias e Possíveis Bugs

## Escopo revisado
- `README.md`
- `design-tokens.md`
- `componentes.md`
- `navegacao.md`
- `wireframes.md`
- `fluxos.md`
- `responsividade.md`
- `spec-detalhe-pericia.md`
- `arquitetura_dados.md`

## Resultado executivo
- **Bug crítico encontrado e corrigido:** `arquitetura_dados.md` estava com conteúdo de *diff git* (linhas `diff --git`, `+`, `-`), o que tornava o artefato inválido para uso documental.
- **Risco moderado mapeado:** inconsistências potenciais entre nomes de arquivos solicitados no prompt e arquivos atuais do repositório (ex.: `fluxos.md` vs `fluxos-usuario.md`).
- **Risco baixo mapeado:** divergências futuras de rota entre docs de navegação/wireframes caso não haja fonte única de verdade.

---

## Avaliação por arquivo

### 1) README.md
- **Status:** mínimo, sem contexto funcional.
- **Risco:** onboarding fraco para equipe e IA.
- **Ação sugerida:** adicionar mapa de artefatos e convenções do projeto.

### 2) design-tokens.md
- **Status:** bom nível de detalhamento semântico.
- **Riscos potenciais:**
  - divergência futura com implementação real em Tailwind/CSS vars;
  - manutenção manual de listas de status.
- **Ação sugerida:** manter tabela de “fonte de verdade” vinculada ao arquivo técnico de tokens.

### 3) componentes.md
- **Status:** abrangente para catálogo macro.
- **Risco potencial:** evolução de props sem atualização dos exemplos JSX.
- **Ação sugerida:** checklist de revisão de catálogo a cada release de UI.

### 4) navegacao.md
- **Status:** estrutura clara por grupos e papéis.
- **Risco potencial:** rotas/breadcrumbs podem desalinhar com config real de sidebar.
- **Ação sugerida:** validar periodicamente com arquivo de configuração de rotas.

### 5) wireframes.md
- **Status:** cobertura ampla de páginas e layout.
- **Risco potencial:** documento extenso sujeito a deriva de conteúdo.
- **Ação sugerida:** criar bloco “última revisão por módulo” para governança.

### 6) fluxos.md
- **Status:** fluxos críticos descritos com ações e feedback.
- **Risco potencial:** contagem de cliques e erros pode envelhecer após ajustes de UX.
- **Ação sugerida:** revisar fluxos junto com testes E2E críticos.

### 7) responsividade.md
- **Status:** regras por breakpoint e contexto bem definidas.
- **Risco potencial:** divergência entre especificação e componentes reais.
- **Ação sugerida:** anexar matriz de visibilidade por breakpoint em formato testável.

### 8) spec-detalhe-pericia.md
- **Status:** detalhamento forte para página crítica.
- **Risco potencial:** alta complexidade exige sincronismo contínuo com `types.ts`.
- **Ação sugerida:** manter seção de “campos novos/deprecados” por versão.

### 9) arquitetura_dados.md
- **Status anterior:** inválido (conteúdo de patch/diff no corpo).
- **Correção aplicada:** arquivo reescrito em formato final consolidado, com:
  - modelo multi-tenant;
  - entidades centrais;
  - regras de integridade;
  - auditoria e RBAC;
  - índices de performance;
  - estratégia de evolução.

---

## Próximos passos recomendados
1. Padronizar nomenclatura de arquivos para coincidir com as entregas do prompt original.
2. Definir um “arquivo canônico” para rotas e breadcrumbs.
3. Criar checklist mensal de consistência entre documentação e implementação.
