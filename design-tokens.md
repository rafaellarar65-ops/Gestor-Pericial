# Entrega 1 — Design Tokens (Perícias Manager Pro)

## Índice
- [1) Princípios de base](#1-princípios-de-base)
- [2) Cores](#2-cores)
  - [2.1 Tokens globais (Light e Dark-ready)](#21-tokens-globais-light-e-dark-ready)
  - [2.2 Paleta semântica por intenção](#22-paleta-semântica-por-intenção)
  - [2.3 Cores semânticas para status de perícia](#23-cores-semânticas-para-status-de-perícia)
  - [2.4 Mapeamento de enums de `types.ts` para cores](#24-mapeamento-de-enums-de-typests-para-cores)
- [3) Tipografia](#3-tipografia)
- [4) Espaçamento e dimensão](#4-espaçamento-e-dimensão)
- [5) Bordas, raios e strokes](#5-bordas-raios-e-strokes)
- [6) Sombras e elevação](#6-sombras-e-elevação)
- [7) Breakpoints responsivos](#7-breakpoints-responsivos)
- [8) Motion e feedback](#8-motion-e-feedback)
- [9) Convenções de implementação (Tailwind + shadcn/ui)](#9-convenções-de-implementação-tailwind--shadcnui)

---

## 1) Princípios de base

1. **Leitura clínica primeiro**: interfaces data-dense devem privilegiar legibilidade contínua (tabelas, formulários e timelines).
2. **Semântica consistente**: a mesma cor sempre significa o mesmo estado de negócio.
3. **Acessibilidade WCAG 2.1 AA**: contraste mínimo 4.5:1 em texto normal e foco visível por teclado.
4. **Escalável para dark mode**: mesmo sendo fase futura, tokens já definidos com estrutura `light/dark`.
5. **Shadcn/ui first**: tokens devem plugar diretamente no padrão de variáveis CSS do ecossistema (`--background`, `--foreground`, `--primary` etc.).

---

## 2) Cores

### 2.1 Tokens globais (Light e Dark-ready)

> Formato sugerido: `H S% L%` para uso direto em CSS vars do shadcn/ui.

| Token | Light | Dark (futuro) | Uso principal |
|---|---:|---:|---|
| `--background` | `210 20% 98%` | `224 24% 10%` | Fundo global da aplicação |
| `--foreground` | `222 47% 11%` | `210 20% 96%` | Texto primário |
| `--card` | `0 0% 100%` | `224 22% 14%` | Cards, painéis |
| `--card-foreground` | `222 47% 11%` | `210 20% 96%` | Texto dentro de card |
| `--popover` | `0 0% 100%` | `224 22% 14%` | Dropdowns/popovers |
| `--popover-foreground` | `222 47% 11%` | `210 20% 96%` | Texto em popovers |
| `--border` | `214 24% 89%` | `217 19% 27%` | Bordas padrão |
| `--input` | `214 24% 89%` | `217 19% 27%` | Borda de input |
| `--ring` | `221 83% 53%` | `217 91% 60%` | Focus ring |
| `--muted` | `210 16% 93%` | `217 19% 20%` | Blocos neutros |
| `--muted-foreground` | `215 16% 41%` | `215 20% 72%` | Texto secundário |

### 2.2 Paleta semântica por intenção

| Escala | Token | Hex (light) | Uso |
|---|---|---|---|
| Primary | `--primary` | `#2563EB` | CTA principal, links e estados ativos |
| Primary fg | `--primary-foreground` | `#FFFFFF` | Texto sobre primary |
| Secondary | `--secondary` | `#E2E8F0` | Ações secundárias e áreas de apoio |
| Secondary fg | `--secondary-foreground` | `#0F172A` | Texto sobre secondary |
| Destructive | `--destructive` | `#DC2626` | Exclusão, falha crítica |
| Destructive fg | `--destructive-foreground` | `#FFFFFF` | Texto em botões de risco |
| Warning | `--warning` | `#D97706` | Prazo próximo, atenção |
| Warning fg | `--warning-foreground` | `#FFFFFF` | Texto sobre warning |
| Success | `--success` | `#16A34A` | Concluído, pagamento recebido |
| Success fg | `--success-foreground` | `#FFFFFF` | Texto sobre success |
| Info | `--info` | `#0284C7` | Informativo, integração/sincronia |
| Info fg | `--info-foreground` | `#FFFFFF` | Texto sobre info |

### 2.3 Cores semânticas para status de perícia

Como `Status` é entidade configurável (`id`, `nome`, `grupo`, `cor`), o sistema deve aplicar **fallback por grupo semântico** e permitir override por `status.cor` quando existir.

| Grupo semântico (recomendado) | Cor base | Uso na UI |
|---|---|---|
| `NOVA_NOMEACAO` | `#2563EB` (Primary) | Itens recém-chegados / triagem |
| `AGENDAMENTO_PENDENTE` | `#D97706` (Warning) | Exige ação administrativa |
| `AGENDADA` | `#0EA5E9` (Info) | Evento confirmado em agenda |
| `EM_ANDAMENTO` | `#7C3AED` (Violet) | Exame/produção de laudo em curso |
| `AGUARDANDO_ESCLARECIMENTO` | `#F59E0B` (Amber) | Pendência externa com prazo |
| `LAUDO_ENVIADO` | `#16A34A` (Success) | Entrega concluída |
| `FINALIZADA` | `#15803D` (Success-700) | Ciclo encerrado |
| `ARQUIVADA/CANCELADA` | `#64748B` (Muted-600) | Sem ação operacional |
| `ATRASADA/URGENTE` | `#DC2626` (Destructive) | SLA estourado / risco jurídico |

#### Regra visual padrão para badges de status
- **Fundo**: versão 10-15% de opacidade da cor base.
- **Texto**: cor base em tom 700+.
- **Borda**: cor base em 30-40% de opacidade.
- **Urgência (`isUrgent`)**: adicionar ponto pulsante + ícone `AlertTriangle` em vermelho.

### 2.4 Mapeamento de enums de `types.ts` para cores

#### `Pericia.pagamentoStatus` (`'NAO' | 'PARCIAL' | 'SIM'`)

| Valor | Label UI | Cor |
|---|---|---|
| `NAO` | Não recebido | `#DC2626` (Destructive) |
| `PARCIAL` | Parcial | `#D97706` (Warning) |
| `SIM` | Recebido | `#16A34A` (Success) |

#### `PericiaFinanceiro.status`

| Valor | Cor |
|---|---|
| `SEM_VALOR` | `#64748B` |
| `A_RECEBER` | `#D97706` |
| `PARCIAL` | `#F59E0B` |
| `PAGO` | `#16A34A` |
| `RECEBIDA_CONCILIADA` | `#15803D` |
| `RECEBIDA_SEM_HONORARIOS` | `#0284C7` |
| `RECEBIDA_PENDENTE` | `#7C3AED` |

#### `TeleSlot.status` (`'AVAILABLE' | 'BOOKED' | 'BLOCKED'`)

| Valor | Cor |
|---|---|
| `AVAILABLE` | `#16A34A` |
| `BOOKED` | `#0284C7` |
| `BLOCKED` | `#64748B` |

#### `CnjSyncMetadata.status`

| Valor | Cor |
|---|---|
| `IDLE` | `#64748B` |
| `SYNCING` | `#2563EB` |
| `OK` | `#16A34A` |
| `NOT_FOUND` | `#D97706` |
| `ERROR` | `#DC2626` |
| `FORBIDDEN` | `#B91C1C` |

---

## 3) Tipografia

**Família principal:** `Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`

**Família monoespaçada (code/CNJ raw):** `JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace`

| Token | Size | Line-height | Letter-spacing | Peso padrão | Uso |
|---|---:|---:|---:|---:|---|
| `h1` | `32px` (2rem) | `40px` | `-0.02em` | 700 | Título de página principal |
| `h2` | `24px` (1.5rem) | `32px` | `-0.01em` | 600 | Seções grandes |
| `h3` | `20px` (1.25rem) | `28px` | `-0.01em` | 600 | Blocos internos/card header |
| `h4` | `18px` (1.125rem) | `26px` | `0` | 600 | Subseções |
| `body` | `14px` (0.875rem) | `22px` | `0` | 400 | Texto padrão de interface |
| `small` | `13px` | `20px` | `0.002em` | 400/500 | Apoio/descrição |
| `caption` | `12px` | `18px` | `0.01em` | 500 | Labels auxiliares/metadata |
| `code` | `12px` | `18px` | `0` | 500 | IDs, CNJ normalizado |

**Pesos permitidos:** `400`, `500`, `600`, `700`.

---

## 4) Espaçamento e dimensão

> Base de grid = **4px**. Escala solicitada em múltiplos de 4.

| Token | Valor |
|---|---:|
| `space-0` | `0px` |
| `space-1` | `4px` |
| `space-2` | `8px` |
| `space-3` | `12px` |
| `space-4` | `16px` |
| `space-5` | `20px` |
| `space-6` | `24px` |
| `space-8` | `32px` |
| `space-10` | `40px` |
| `space-12` | `48px` |
| `space-16` | `64px` |
| `space-20` | `80px` |
| `space-24` | `96px` |

### Densidade por contexto
- **Tabelas densas**: célula vertical `8px`, horizontal `12px`.
- **Formulários padrão**: gap vertical `16px` e horizontal `16px`.
- **Cards dashboard**: padding interno `20px`.

---

## 5) Bordas, raios e strokes

| Elemento | Radius |
|---|---:|
| Input / Select / Textarea | `8px` |
| Botão (md) | `10px` |
| Card | `12px` |
| Modal / Sheet | `16px` |
| Badge | `999px` (pill) |
| Avatar | `999px` (circular) |

**Border width padrão:** `1px`.

**Regra de foco acessível:**
- `outline: none`
- `box-shadow: 0 0 0 2px hsl(var(--background)), 0 0 0 4px hsl(var(--ring));`

---

## 6) Sombras e elevação

| Nível | Token | Valor CSS |
|---|---|---|
| Sm (cards) | `--shadow-sm` | `0 1px 2px rgba(15, 23, 42, 0.08), 0 1px 1px rgba(15, 23, 42, 0.04)` |
| Md (modais) | `--shadow-md` | `0 8px 24px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(15, 23, 42, 0.08)` |
| Lg (dropdown/popover) | `--shadow-lg` | `0 12px 32px rgba(15, 23, 42, 0.16), 0 4px 12px rgba(15, 23, 42, 0.1)` |

**Uso recomendado:**
- Card padrão: `shadow-sm` + borda.
- Modal central: `shadow-md`.
- Command palette / dropdown contextual: `shadow-lg`.

---

## 7) Breakpoints responsivos

| Breakpoint | Faixa | Convenção |
|---|---|---|
| Mobile | `< 640px` | `default` (base) |
| Tablet | `640px – 1023px` | `sm:` |
| Desktop | `>= 1024px` | `lg:` |
| Wide | `>= 1440px` | `2xl:` custom (`1440px`) |

### Larguras máximas sugeridas
- Conteúdo padrão: `max-w-[1280px]`.
- Telas analíticas (wide): `max-w-[1440px]` com gutters maiores.

---

## 8) Motion e feedback

- **Duração padrão:** `150ms` (hover/focus), `220ms` (dialog/sheet), `300ms` (feedback contextual).
- **Easing:** `cubic-bezier(0.2, 0.8, 0.2, 1)`.
- **Loading > 200ms:** mostrar `LoadingSkeleton`.
- **Ações salvas com sucesso:** toast `success` com auto-dismiss em 4s.
- **Ações destrutivas:** confirmação obrigatória com botão destructive.

---

## 9) Convenções de implementação (Tailwind + shadcn/ui)

### 9.1 Estrutura de variáveis (`globals.css`)
```css
:root {
  --background: 210 20% 98%;
  --foreground: 222 47% 11%;
  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;
  --popover: 0 0% 100%;
  --popover-foreground: 222 47% 11%;

  --primary: 221 83% 53%;
  --primary-foreground: 0 0% 100%;
  --secondary: 210 16% 93%;
  --secondary-foreground: 222 47% 11%;

  --muted: 210 16% 93%;
  --muted-foreground: 215 16% 41%;

  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 100%;

  --warning: 35 84% 46%;
  --warning-foreground: 0 0% 100%;
  --success: 142 76% 36%;
  --success-foreground: 0 0% 100%;
  --info: 199 95% 40%;
  --info-foreground: 0 0% 100%;

  --border: 214 24% 89%;
  --input: 214 24% 89%;
  --ring: 221 83% 53%;
  --radius: 0.75rem;
}
```

### 9.2 Tokens de status (recomendação)
Criar mapa central `statusColorMap.ts` com fallback por grupo e por enums fixos (`pagamentoStatus`, `PericiaFinanceiro.status`, `TeleSlot.status`, `CnjSyncMetadata.status`) para manter consistência entre Table, Badge, Timeline e KPIs.

---

### Checklist de validação desta entrega
- [x] Paleta completa com Light + Dark-ready
- [x] Tipografia completa (h1-h4, body, small, caption, code)
- [x] Escala de spacing solicitada
- [x] Border-radius por tipo de componente
- [x] Sombras (sm/md/lg)
- [x] Breakpoints (mobile/tablet/desktop/wide)
- [x] Mapeamento semântico de status baseado em `types.ts`
