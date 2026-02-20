# Entrega 6 — Guia de Responsividade

## Índice
- [1) Breakpoints e regras-base](#1-breakpoints-e-regras-base)
- [2) Sidebar e navegação](#2-sidebar-e-navegação)
- [3) Tabelas por contexto](#3-tabelas-por-contexto)
- [4) Formulários](#4-formulários)
- [5) Modais, Sheets e Drawers](#5-modais-sheets-e-drawers)
- [6) Dashboard](#6-dashboard)
- [7) Página de Laudo](#7-página-de-laudo)
- [8) Regras por página crítica](#8-regras-por-página-crítica)

---

## 1) Breakpoints e regras-base

- **Mobile:** `< 640px`
- **Tablet:** `640px–1023px`
- **Desktop:** `>= 1024px`
- **Wide:** `>= 1440px`

### Grid e espaçamento
- Mobile: 4 colunas, gutter 12px, margem 12px.
- Tablet: 8 colunas, gutter 16px, margem 16px.
- Desktop/Wide: 12 colunas, gutter 20px, margem 24px.

### Priorização de conteúdo
1. Contexto do caso (status, prazo, CNJ)
2. Próxima ação recomendada
3. Dados secundários/histórico

---

## 2) Sidebar e navegação

## Desktop
- Sidebar fixa expandida por padrão (280px).
- Estado colapsado opcional (80px), persistido por usuário.

## Tablet
- Sidebar inicia colapsada (ícones + tooltip).
- Expande por toggle.

## Mobile
- Sidebar vira **hamburger + Drawer** full-height.
- Header fixo com:
  - botão menu
  - busca global
  - ação principal da tela (quando aplicável)

---

## 3) Tabelas por contexto

## 3.1 Lista de Perícias (`/pericias`)

### Desktop (DataTable completa)
Colunas visíveis:
- `processoCNJ`
- `autorNome`
- `reuNome`
- `cidadeId`
- `statusId`
- `dataAgendamento`
- `pagamentoStatus`
- `isUrgent`
- ações

### Tablet
Colunas visíveis:
- `processoCNJ`
- `autorNome`
- `cidadeId`
- `statusId`
- `dataAgendamento`
- ações

### Mobile (cards/lista)
Card com:
- CNJ
- autor
- cidade
- status
- data agendada
- ações em menu (`Sheet`)

## 3.2 Financeiro (`/financeiro`)

### Desktop
- tabela de recebimentos com colunas: data, CNJ, origem, bruto, líquido, status conciliação.

### Tablet
- remove colunas secundárias (descrição longa, metadados batch).

### Mobile
- cards por recebimento:
  - valor líquido (destaque)
  - CNJ
  - data
  - status

## 3.3 Esclarecimentos (`/esclarecimentos`)

### Desktop
- tabela com prazo restante, intimado em, responsável, status.

### Tablet
- esconde responsável e metadados.

### Mobile
- lista ordenada por urgência (vencidos primeiro), com badge e CTA resolver.

---

## 4) Formulários

## Desktop
- 2 a 3 colunas para formulários longos.
- Seções com `Card` e títulos fixos.

## Tablet
- 2 colunas quando campo curto; 1 coluna para campos longos.

## Mobile
- 1 coluna sempre.
- Labels sempre acima do campo.
- CTA principal em barra fixa inferior (`Salvar`, `Continuar`).

### Regras adicionais
- Máscaras e validações em tempo real.
- Erro inline abaixo do campo.
- Campos dependentes colapsáveis para reduzir carga cognitiva.

---

## 5) Modais, Sheets e Drawers

## Desktop
- `Dialog` central para confirmação/edição curta.
- `Sheet` lateral para detalhe sem perder contexto.

## Tablet
- prefere `Sheet` para formulários médios.

## Mobile
- modais devem virar **páginas full-screen** (`Drawer`/`Sheet`).
- Nunca usar modal pequeno com scroll interno em mobile.

---

## 6) Dashboard

## Desktop
- linha 1: 4 `KPICard`
- linha 2: agenda + pendências
- linha 3: tabela resumo

## Tablet
- KPIs em grade 2x2
- blocos principais empilhados

## Mobile
- KPIs em **carrossel horizontal**
- gráficos/tabelas em largura total
- cards de pendências com CTA único

---

## 7) Página de Laudo

## Desktop
- edição completa (3 colunas: estrutura, editor, apoio IA)

## Tablet
- edição simplificada (2 colunas), com painel IA em aba recolhível

## Mobile
- **somente leitura**
- banner fixo: “Edição de laudo disponível apenas no desktop”
- ações permitidas: visualizar, compartilhar, baixar PDF

---

## 8) Regras por página crítica

## Detalhe da Perícia
- Desktop: tabs horizontais completas + painel lateral de atividade.
- Tablet: tabs roláveis + painel atividade colapsável.
- Mobile: tabs scroll horizontal, priorizando “Dados” e “Timeline”.

## Agendar em Lote
- Desktop/tablet: wizard em uma tela com stepper superior.
- Mobile: uma etapa por tela com progresso fixo.

## Inbox de Email
- Desktop: 3 painéis (pastas/lista/leitura).
- Tablet: 2 painéis (lista/leitura).
- Mobile: 1 painel por vez com navegação por voltar.

## Mapa de Comarcas
- Desktop only com mapa interativo.
- Tablet: fallback para tabela por cidade + mini mapa estático.
- Mobile: redirecionar para “Cidades”.

---

## Checklist de implementação
- [x] Sidebar conforme regra desktop/tablet/mobile
- [x] Tabelas com fallback para cards no mobile
- [x] Formulários 1 coluna no mobile
- [x] Modais convertidos para full-screen em mobile
- [x] Dashboard com KPI carrossel no mobile
- [x] Laudo mobile em modo leitura
