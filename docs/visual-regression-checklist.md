# Checklist visual de regressão (baseline)

## 1) Mapeamento de diferenças vs `wireframes.md`

### `/dashboard`
- Wireframe pede estrutura em grid de 12 colunas, com linha de KPIs, blocos operacionais e resumo. A tela estava com hierarquia visual muito “promocional” (cores e estilos ad-hoc), sem consistência de densidade entre cards e blocos secundários.
- Ajuste aplicado: unificação de painéis com `Card`, tipografia semântica (`text-lg`, `text-sm`, `text-xs`) e blocos de ação em grade uniforme para restaurar ritmo visual próximo do protótipo.
- Ajuste aplicado: substituição de cores hardcoded por tokens semânticos (`primary`, `warning`, `info`, `success`, `foreground/background`).

### `/nomeacoes`
- Wireframe pede header + área principal de triagem com foco em estrutura de painel e agrupamentos operacionais.
- Tela estava com classes hardcoded de azul/cinza e contraste inconsistente entre cabeçalhos de grupo e cards internos.
- Ajuste aplicado: banner principal e headers de grupos com tokens semânticos, cards internos densos e padronizados (`Card`), mantendo abertura/fechamento de seções.

### `/fila-agendamento`
- Wireframe geral do sistema pede hierarquia com header, blocos em painel e organização por abas/painéis.
- A implementação continha desvio estrutural (código duplicado/quebrado no trecho de seleção), inconsistência de abas e hardcodes em cor/spacing.
- Ajuste aplicado: reconstrução da tela com 3 painéis (`fila`, `preparacao`, `historico`), componentes reutilizáveis (`Card`, `Button`, `Input`, `Tabs`) e modal de lote com estrutura consistente.

## 2) Baseline de captura para regressão visual

> Objetivo: garantir que densidade de cards, tipografia de cabeçalhos, espaçamentos e estrutura de painéis/abas não desviem em futuras alterações.

### Cenários base
1. **Dashboard (desktop)**
   - URL: `/`
   - Capturar:
     - Card “Central de Notificações”.
     - Grade completa dos cards de ação.
     - Painel “Novas funcionalidades integradas”.
2. **Nomeações (desktop)**
   - URL: `/nomeacoes`
   - Capturar:
     - Banner principal.
     - Primeiro grupo expandido + um grupo recolhido.
     - Grid de cards de processos.
3. **Fila de Agendamento (desktop)**
   - URL: `/fila-agendamento`
   - Capturar:
     - Aba `fila` com cards por cidade.
     - Aba `preparacao` com lista populada.
     - Aba `historico` com badge de status e ações.
     - Modal “Novo Agendamento” aberto.

### Critérios de aceitação visual
- Cabeçalhos principais em destaque consistente (`text-2xl font-semibold`).
- Subdescrições com `text-sm` + `text-muted-foreground`.
- Distância vertical entre blocos principais homogênea (`space-y-4` / `space-y-3`).
- Cards com borda, raio e sombra do sistema (`Card`).
- Sem uso de cores hex/hardcoded para tons operacionais principais.

### Procedimento recomendado em PR
- Comparar imagens baseline x imagem da branch.
- Marcar regressão quando houver:
  - quebra de densidade (cards muito altos/baixos);
  - troca de escala tipográfica de heading/subheading;
  - alteração de padding/margens entre blocos;
  - alteração de estrutura de abas/painéis.
