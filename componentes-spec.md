# Entrega 2 — Catálogo de Componentes (shadcn/ui-first)

## Índice
- [1) Princípios do catálogo](#1-princípios-do-catálogo)
- [2) Padrões globais de variantes, tamanhos e estados](#2-padrões-globais-de-variantes-tamanhos-e-estados)
- [3) Componentes de ação e entrada](#3-componentes-de-ação-e-entrada)
- [4) Componentes de estrutura e navegação](#4-componentes-de-estrutura-e-navegação)
- [5) Componentes de dados, feedback e domínio](#5-componentes-de-dados-feedback-e-domínio)
- [6) Props de domínio (tipadas a partir de `types.ts`)](#6-props-de-domínio-tipadas-a-partir-de-typests)
- [7) Regras de consistência e acessibilidade](#7-regras-de-consistência-e-acessibilidade)

---

## 1) Princípios do catálogo

1. **Base oficial:** todos os componentes partem de primitives do `shadcn/ui` (Radix + Tailwind).
2. **Domínio médico-jurídico:** extensões por props tipadas de `types.ts` (ex.: `Pericia`, `Status`, `TeleSlot`, `PericiaFinanceiro`).
3. **Eficiência operacional:** foco em ações rápidas, teclado, bulk actions e feedback imediato.
4. **Acessibilidade:** label obrigatório, foco visível, contraste AA, estados de erro claros.

---

## 2) Padrões globais de variantes, tamanhos e estados

### 2.1 Variantes (base)
- `default`
- `secondary`
- `outline`
- `ghost`
- `link`
- `destructive`

### 2.2 Tamanhos (base)
- `sm` (altura ~32px)
- `md` (altura ~40px)
- `lg` (altura ~44-48px)

### 2.3 Estados (base)
- `default`
- `hover`
- `active`
- `focus-visible`
- `disabled`
- `loading`
- `error` (quando aplicável a input/seleção/upload)

---

## 3) Componentes de ação e entrada

## Button
- **Base shadcn:** `Button`
- **Variantes:** `default`, `secondary`, `outline`, `ghost`, `link`, `destructive`
- **Tamanhos:** `sm`, `md`, `lg`
- **Estados:** todos os estados base
- **Quando usar:** ação primária/confirmatória de formulário, filtros, salvar/confirmar
- **Quando NÃO usar:** ações ínfimas em tabela (use `IconButton`), navegação textual (use `Link`)
- **Props de domínio:**
  - `permission?: 'ADMIN' | 'ASSISTANT'`
  - `shortcutHint?: string` (ex.: `Ctrl+S`)
  - `requiresConfirm?: boolean`

## IconButton
- **Base:** `Button` com `size='icon'`
- **Variantes:** `ghost`, `outline`, `destructive`
- **Tamanhos:** `sm`, `md`
- **Estados:** base + tooltip obrigatório
- **Quando usar:** ações de linha (editar, duplicar, anexar, abrir detalhe)
- **Quando NÃO usar:** CTA primário de tela
- **Props de domínio:**
  - `icon: LucideIcon`
  - `label: string` (acessibilidade)

## Input
- **Base:** `Input`
- **Variantes:** `default`, `error` (estilo condicional)
- **Tamanhos:** `sm`, `md`, `lg`
- **Estados:** base + `readonly`
- **Quando usar:** campos curtos (CNJ, nome, valor, telefone)
- **Quando NÃO usar:** textos longos (use `Textarea`)
- **Props de domínio:**
  - `mask?: 'CNJ' | 'PHONE' | 'CURRENCY' | 'DATE'`
  - `cnjNormalized?: boolean`

## Textarea
- **Base:** `Textarea`
- **Variantes:** `default`, `error`
- **Tamanhos:** `md`, `lg`
- **Estados:** base + contador de caracteres
- **Quando usar:** observações, notas de laudo, justificativas
- **Quando NÃO usar:** conteúdo estruturado rico (use `RichTextEditor`)
- **Props de domínio:**
  - `maxLength?: number`
  - `aiAssist?: boolean`

## Select
- **Base:** `Select`
- **Variantes:** `default`, `error`
- **Tamanhos:** `sm`, `md`, `lg`
- **Estados:** base
- **Quando usar:** listas curtas e fechadas (modalidade, categoria)
- **Quando NÃO usar:** lista extensa com busca (use `Combobox`)
- **Props de domínio:**
  - `options: Array<{value:string;label:string;meta?:string}>`

## Combobox (CreatableSelect)
- **Base:** `Popover + Command` (padrão shadcn)
- **Variantes:** `default`, `error`
- **Tamanhos:** `md`, `lg`
- **Estados:** base + `empty-search`
- **Quando usar:** seleção pesquisável (cidade, vara, advogado, tags)
- **Quando NÃO usar:** até 5 opções fixas
- **Props de domínio:**
  - `creatable?: boolean`
  - `onCreateOption?: (label:string)=>void`
  - `entityType?: 'CIDADE' | 'VARA' | 'LAWYER' | 'TAG'`

## DatePicker
- **Base:** `Popover + Calendar`
- **Variantes:** `default`, `error`
- **Tamanhos:** `md`
- **Estados:** base + `disabled-date`
- **Quando usar:** agendamento, data de nomeação, prazos
- **Quando NÃO usar:** input livre com baixa precisão
- **Props de domínio:**
  - `disablePast?: boolean`
  - `businessDaysOnly?: boolean`
  - `deadlineHighlight?: boolean`

## TimePicker
- **Base:** `Select`/input controlado com máscara `HH:mm`
- **Variantes:** `default`, `error`
- **Tamanhos:** `sm`, `md`
- **Estados:** base
- **Quando usar:** horário de perícia/teleperícia
- **Quando NÃO usar:** duração relativa (use select de duração)
- **Props de domínio:**
  - `intervalMinutes?: 5 | 10 | 15 | 30`

## FileUpload (drag-and-drop + click)
- **Base:** `Dropzone + Button + Progress`
- **Variantes:** `default`, `error`
- **Tamanhos:** `md`, `lg`
- **Estados:** `drag-over`, `uploading`, `success`, `error`, `empty`
- **Quando usar:** anexar documentos processuais/laudos/imagens
- **Quando NÃO usar:** conteúdo textual longo
- **Props de domínio:**
  - `category: 'PROCESSO' | 'LAUDO' | 'QUESITOS' | 'OUTROS'`
  - `acceptedTypes?: string[]`
  - `maxSizeMB?: number`
  - `periciaId?: string`

## RichTextEditor
- **Base:** wrapper de editor rico com toolbar mínima
- **Variantes:** `default`, `readonly`
- **Tamanhos:** `md`, `lg`, `full`
- **Estados:** `editing`, `saving`, `readonly`, `error`
- **Quando usar:** elaboração de laudo e seções narrativas
- **Quando NÃO usar:** campos curtos estruturados
- **Props de domínio:**
  - `templateId?: string`
  - `sectionKey?: 'IDENTIFICACAO' | 'ALEGACOES' | 'HISTORIA_MEDICA' | 'HISTORIA_OCUPACIONAL' | 'HMA' | 'QUESITOS' | 'EXAME_FISICO'`
  - `aiSuggestions?: boolean`

## StepWizard
- **Base:** `Tabs/Steps + Buttons + Progress`
- **Variantes:** `default`
- **Tamanhos:** `md`, `lg`
- **Estados:** `current`, `completed`, `blocked`, `error`
- **Quando usar:** fluxos multi-etapas (agendamento em lote, onboarding)
- **Quando NÃO usar:** tarefas de uma única ação
- **Props de domínio:**
  - `steps: Array<{id:string;title:string;optional?:boolean}>`
  - `allowSaveDraft?: boolean`

---

## 4) Componentes de estrutura e navegação

## Card / CardHeader / CardContent / CardFooter
- **Base:** `Card`
- **Variantes:** `default`, `outlined`, `interactive`
- **Tamanhos:** `sm`, `md`, `lg`
- **Estados:** `default`, `hover` (interactive), `loading`
- **Quando usar:** agrupamento semântico de dados, KPIs e módulos
- **Quando NÃO usar:** dados tabulares densos principais
- **Props de domínio:**
  - `severity?: 'info' | 'warning' | 'critical'`

## Dialog (Modal)
- **Base:** `Dialog`
- **Variantes:** `default`, `destructive-confirm`
- **Tamanhos:** `sm`, `md`, `lg`, `xl`
- **Estados:** `open`, `closing`, `loading`
- **Quando usar:** confirmação, edição pontual, ações de risco
- **Quando NÃO usar:** formulário longo (preferir rota/sheet)
- **Props de domínio:**
  - `confirmText?: string`
  - `criticalAction?: boolean`

## Sheet (painel lateral)
- **Base:** `Sheet`
- **Variantes:** `right`, `left`
- **Tamanhos:** `sm`, `md`, `lg`
- **Estados:** `open`, `loading`
- **Quando usar:** detalhe rápido sem sair da listagem
- **Quando NÃO usar:** fluxo com múltiplas etapas críticas
- **Props de domínio:**
  - `entityId?: string`
  - `entityType?: 'PERICIA' | 'LAWYER' | 'CITY'`

## Drawer (mobile)
- **Base:** `Drawer` (fallback mobile de modal/sheet)
- **Variantes:** `bottom`, `full`
- **Tamanhos:** `md`, `full`
- **Estados:** `open`, `dragging`, `loading`
- **Quando usar:** ações no mobile
- **Quando NÃO usar:** edição crítica de laudo

## Tabs
- **Base:** `Tabs`
- **Variantes:** `underline`, `segmented`
- **Tamanhos:** `sm`, `md`
- **Estados:** `active`, `inactive`, `disabled`
- **Quando usar:** separação de conteúdo em mesma entidade
- **Quando NÃO usar:** sequências obrigatórias (use `StepWizard`)
- **Props de domínio:**
  - `withBadge?: boolean`
  - `persistInUrl?: boolean`

## Accordion
- **Base:** `Accordion`
- **Variantes:** `single`, `multiple`
- **Tamanhos:** `md`
- **Estados:** `open`, `closed`
- **Quando usar:** conteúdo secundário expansível
- **Quando NÃO usar:** conteúdo crítico que deve estar sempre visível

## Sidebar (principal com collapse)
- **Base:** layout custom sobre `ScrollArea + Button + Tooltip`
- **Variantes:** `expanded`, `collapsed`
- **Tamanhos:** `full`, `icon-only`
- **Estados:** `active-route`, `hover`, `collapsed`
- **Quando usar:** navegação principal no desktop/tablet
- **Quando NÃO usar:** mobile (usar Drawer/hamburger)
- **Props de domínio:**
  - `role: 'ADMIN' | 'ASSISTANT'`
  - `items: NavItem[]`
  - `notificationCountByRoute?: Record<string, number>`

## Breadcrumb
- **Base:** `Breadcrumb`
- **Variantes:** `default`
- **Tamanhos:** `sm`, `md`
- **Estados:** `default`
- **Quando usar:** todas as páginas internas
- **Quando NÃO usar:** login e telas públicas

## Command Palette (Ctrl+K)
- **Base:** `Command + Dialog`
- **Variantes:** `default`
- **Tamanhos:** `md`, `lg`
- **Estados:** `open`, `typing`, `empty`, `loading`
- **Quando usar:** navegação global e busca de perícia por CNJ/nome
- **Quando NÃO usar:** filtros locais simples
- **Props de domínio:**
  - `searchDomains?: Array<'PERICIA'|'ADVOGADO'|'CIDADE'|'PAGINA'>`
  - `recentItems?: string[]`

---

## 5) Componentes de dados, feedback e domínio

## Table
- **Base:** `Table`
- **Variantes:** `default`, `compact`
- **Tamanhos:** `sm`, `md`
- **Estados:** `loading`, `empty`, `error`
- **Features obrigatórias:** sort, filtro, paginação, seleção, bulk actions
- **Quando usar:** listagens operacionais com até média densidade
- **Quando NÃO usar:** cruzamento avançado (use `DataTable`)

## DataTable (avançada)
- **Base:** `@tanstack/react-table` + primitives shadcn
- **Variantes:** `default`, `dense`, `financial`
- **Tamanhos:** `md`
- **Estados:** `loading`, `empty`, `error`, `partial-data`
- **Quando usar:** lista principal de perícias e relatórios
- **Quando NÃO usar:** datasets pequenos sem filtros complexos
- **Props de domínio:**
  - `entity: 'PERICIA' | 'DESPESA' | 'RECEBIMENTO'`
  - `visibleColumnsByBreakpoint?: Record<'mobile'|'tablet'|'desktop', string[]>`

## Badge
- **Base:** `Badge`
- **Variantes:** `default`, `secondary`, `outline`, `destructive`
- **Tamanhos:** `sm`, `md`
- **Estados:** `default`
- **Quando usar:** metadados curtos (tipo, origem, categoria)
- **Quando NÃO usar:** texto longo ou estado primário de processo

## StatusBadge
- **Base:** `Badge` custom
- **Variantes:** `pericia`, `financeiro`, `telepericia`, `sync`
- **Tamanhos:** `sm`, `md`
- **Estados:** `default`, `with-alert`
- **Quando usar:** status de negócio em qualquer contexto
- **Quando NÃO usar:** categoria estática sem semântica de status
- **Props de domínio:**
  - `statusId?: string`
  - `statusName?: string`
  - `statusGroup?: string`
  - `pagamentoStatus?: 'NAO' | 'PARCIAL' | 'SIM'`
  - `financeiroStatus?: 'SEM_VALOR' | 'A_RECEBER' | 'PARCIAL' | 'PAGO' | 'RECEBIDA_CONCILIADA' | 'RECEBIDA_SEM_HONORARIOS' | 'RECEBIDA_PENDENTE'`
  - `teleStatus?: 'AVAILABLE' | 'BOOKED' | 'BLOCKED'`
  - `syncStatus?: 'IDLE' | 'SYNCING' | 'OK' | 'NOT_FOUND' | 'ERROR' | 'FORBIDDEN'`
  - `isUrgent?: boolean`

## Toast
- **Base:** `useToast + Toaster`
- **Variantes:** `success`, `info`, `warning`, `destructive`
- **Tamanhos:** n/a
- **Estados:** `visible`, `dismissed`
- **Quando usar:** feedback breve pós-ação
- **Quando NÃO usar:** erro bloqueante (use `Alert`/`Dialog`)

## Alert
- **Base:** `Alert`
- **Variantes:** `default`, `warning`, `destructive`, `success`
- **Tamanhos:** `md`
- **Estados:** `default`
- **Quando usar:** mensagens persistentes em página (falha integração/prazo crítico)
- **Quando NÃO usar:** confirmação efêmera

## Avatar / AvatarGroup
- **Base:** `Avatar`
- **Variantes:** `image`, `fallback-initials`
- **Tamanhos:** `sm`, `md`, `lg`
- **Estados:** `default`
- **Quando usar:** usuário atual, equipe vinculada
- **Quando NÃO usar:** ícone de entidade sem pessoa

## Timeline
- **Base:** custom com `Separator + Badge + Tooltip`
- **Variantes:** `processual`, `financeira`, `clinica`
- **Tamanhos:** `md`
- **Estados:** `loading`, `empty`, `with-events`
- **Quando usar:** histórico da perícia (`LogStatus`, `AgendaEvent`, movimentos CNJ)
- **Quando NÃO usar:** listagem comparativa/tabular
- **Props de domínio:**
  - `events: Array<{id:string;date:string;title:string;description?:string;type?:string}>`

## KPICard
- **Base:** `Card`
- **Variantes:** `neutral`, `success`, `warning`, `critical`
- **Tamanhos:** `sm`, `md`
- **Estados:** `loading`, `with-trend`, `no-trend`
- **Quando usar:** dashboard executivo (total aberto, recebimentos, prazo médio)
- **Quando NÃO usar:** dado transacional detalhado
- **Props de domínio:**
  - `value: string | number`
  - `trend?: {direction:'up'|'down'|'flat';percent:number}`
  - `icon?: LucideIcon`

## EmptyState
- **Base:** `Card + Icon + CTA`
- **Variantes:** `default`, `search-empty`, `permission-empty`
- **Tamanhos:** `md`, `lg`
- **Estados:** `default`
- **Quando usar:** ausência de dados ou filtro sem resultado
- **Quando NÃO usar:** loading (use skeleton)

## LoadingSkeleton
- **Base:** `Skeleton`
- **Variantes:** `table`, `form`, `card`, `detail`
- **Tamanhos:** `sm`, `md`, `lg`
- **Estados:** `loading`
- **Quando usar:** operações >200ms
- **Quando NÃO usar:** respostas instantâneas

---

## 6) Props de domínio (tipadas a partir de `types.ts`)

### 6.1 Interfaces recomendadas
```ts
interface StatusBadgeProps {
  statusId?: string;
  statusName?: string;
  statusGroup?: string;
  isUrgent?: boolean;
  pagamentoStatus?: Pericia['pagamentoStatus'];
  financeiroStatus?: PericiaFinanceiro['status'];
  teleStatus?: TeleSlot['status'];
  syncStatus?: CnjSyncMetadata['status'];
}

interface PericiaQuickActionsProps {
  periciaId: string;
  canEdit: boolean;
  canGenerateReport: boolean;
  canBill: boolean;
}

interface DomainDataTableProps<T> {
  entity: 'PERICIA' | 'DESPESA' | 'RECEBIMENTO';
  data: T[];
  role: 'ADMIN' | 'ASSISTANT';
}
```

### 6.2 Regras de permissão por role
- `ASSISTANT` **não acessa** ações médicas sensíveis (edição de laudo clínico).
- `ADMIN` acessa fluxo completo.
- Componentes de ação devem receber `permission` e renderizar estado `disabled + tooltip explicativo` quando bloqueado.

---

## 7) Regras de consistência e acessibilidade

1. **Toda ação ícone-only precisa de tooltip + `aria-label`.**
2. **Todo input precisa de `Label`, `Description` (quando necessário) e `Message` em erro.**
3. **Foco visível padrão em todos os componentes interativos.**
4. **Para operações longas:** desabilitar CTA principal + spinner + texto de progresso.
5. **Padronização de tabela:** header sticky, coluna de ações fixa à direita no desktop.
6. **Atalhos obrigatórios globais:**
   - `Ctrl+K` abrir busca global
   - `Ctrl+S` salvar em formulários extensos
   - `Esc` fechar overlays

---

### Checklist de cobertura da entrega
- [x] Componentes obrigatórios listados
- [x] Variantes, tamanhos e estados definidos
- [x] “Quando usar” vs “quando não usar” por componente
- [x] Props customizadas orientadas ao domínio
- [x] Alinhamento com `types.ts` e arquitetura shadcn/ui
