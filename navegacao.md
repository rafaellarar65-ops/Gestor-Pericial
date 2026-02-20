# Entrega 3 — Mapa de Navegação (Perícias Manager Pro)

## Índice
- [1) Princípios da arquitetura de navegação](#1-princípios-da-arquitetura-de-navegação)
- [2) Estrutura global (desktop/tablet/mobile)](#2-estrutura-global-desktoptabletmobile)
- [3) Sidebar principal (grupos, itens, regras)](#3-sidebar-principal-grupos-itens-regras)
- [4) Matriz de visibilidade por role](#4-matriz-de-visibilidade-por-role)
- [5) Navegação secundária](#5-navegação-secundária)
- [6) Tabs por contexto de página](#6-tabs-por-contexto-de-página)
- [7) Atalhos globais de teclado](#7-atalhos-globais-de-teclado)

---

## 1) Princípios da arquitetura de navegação

1. **Operacional primeiro:** o que precisa de ação diária fica no topo e com badges.
2. **Poucos cliques:** 1 clique para listas principais, 2 cliques para ação detalhada.
3. **Consistência entre desktop e mobile:** mesma IA, mudando apenas apresentação.
4. **Role-aware:** `ASSISTANT` não vê módulos clínicos sensíveis (ex.: edição de laudo).

---

## 2) Estrutura global (desktop/tablet/mobile)

### Desktop
- Sidebar esquerda fixa (280px expandida / 80px colapsada).
- Header superior com:
  - busca global (`Ctrl+K`)
  - notificações
  - perfil/role
- Área de conteúdo com breadcrumbs + ações contextuais.

### Tablet
- Sidebar padrão colapsada (ícones + tooltip).
- Pode expandir temporariamente por hover/click.

### Mobile
- Navegação por **hamburger + Drawer**.
- Ações primárias da tela em sticky bottom quando aplicável.

---

## 3) Sidebar principal (grupos, itens, regras)

> Ícones sugeridos: `lucide-react`.

## Grupo: Visão Geral

| Label | Rota | Ícone | Badge | Role | Atalho |
|---|---|---|---|---|---|
| Dashboard | `/` | `LayoutDashboard` | — | ADMIN, ASSISTANT | `g d` |

## Grupo: Operacional

| Label | Rota | Ícone | Badge | Role | Atalho |
|---|---|---|---|---|---|
| Nomeações | `/nomeacoes` | `Inbox` | qtd novas nomeações | ADMIN, ASSISTANT | `g n` |
| Agenda | `/agenda` | `CalendarDays` | — | ADMIN, ASSISTANT | `g a` |
| Perícias do Dia | `/pericias-hoje` | `CalendarCheck2` | qtd hoje | ADMIN, ASSISTANT | `g h` |
| Agendar em Lote | `/agendar` | `CalendarPlus2` | — | ADMIN, ASSISTANT | `g l` |
| Esclarecimentos | `/esclarecimentos` | `MessageSquareWarning` | prazos pendentes | ADMIN, ASSISTANT | `g e` |
| Agenda Geral / Próximas | `/agenda-geral` | `ListChecks` | — | ADMIN, ASSISTANT | `g p` |
| Teleperícias | `/telepericias` | `Video` | slots do dia | ADMIN, ASSISTANT | `g t` |

## Grupo: Central Técnica

| Label | Rota | Ícone | Badge | Role | Atalho |
|---|---|---|---|---|---|
| Laudos Pendentes | `/laudos` | `FileClock` | qtd pendentes | ADMIN | `g r` |
| Base de Conhecimento | `/conhecimento` | `BookOpenText` | — | ADMIN, ASSISTANT | `g k` |
| Manobras | `/manobras` | `Stethoscope` | — | ADMIN, ASSISTANT | `g m` |

## Grupo: Cadastros

| Label | Rota | Ícone | Badge | Role | Atalho |
|---|---|---|---|---|---|
| Perícias (Lista) | `/pericias` | `FolderKanban` | — | ADMIN, ASSISTANT | `g i` |
| Nova Perícia | `/pericias/nova` | `FilePlus2` | — | ADMIN, ASSISTANT | `c p` |
| Cidades | `/cidades` | `Building2` | — | ADMIN, ASSISTANT | `g c` |
| Mapa de Comarcas* | `/mapa-comarcas` | `Map` | — | ADMIN, ASSISTANT | `g o` |

\*Página prevista no blueprint (desktop only), mesmo que ainda não esteja nas rotas atuais.

## Grupo: Financeiro

| Label | Rota | Ícone | Badge | Role | Atalho |
|---|---|---|---|---|---|
| Financeiro | `/financeiro` | `Wallet` | saldo aberto | ADMIN, ASSISTANT | `g f` |
| Cobrança | `/financeiro/cobranca` | `BadgeDollarSign` | cobranças vencendo | ADMIN, ASSISTANT | `g b` |
| Relatórios Financeiros | `/relatorios` | `BarChart3` | — | ADMIN | `g y` |
| Despesas | `/despesas` | `Receipt` | — | ADMIN, ASSISTANT | `g x` |

## Grupo: Comunicação

| Label | Rota | Ícone | Badge | Role | Atalho |
|---|---|---|---|---|---|
| Hub de Comunicação | `/comunicacao` | `MessagesSquare` | templates novos | ADMIN, ASSISTANT | `g u` |
| Inbox de Email | `/email-inbox` | `Mail` | não lidos | ADMIN, ASSISTANT | `g w` |
| Advogados | `/advogados` | `Scale` | — | ADMIN, ASSISTANT | `g v` |

## Grupo: Sistema

| Label | Rota | Ícone | Badge | Role | Atalho |
|---|---|---|---|---|---|
| Configurações | `/configuracoes` | `Settings` | — | ADMIN | `g s` |
| Documentação | `/documentacao` | `BookMarked` | — | ADMIN, ASSISTANT | `g ?` |
| Upload Mobile (PWA) | `/mobile-upload/:sessionId` | `QrCode` | — | ADMIN, ASSISTANT | — |

---

## 4) Matriz de visibilidade por role

## `ADMIN`
- Acesso total a todos os grupos e páginas.
- Pode abrir/editar Laudo V2 (`/pericias/:id/laudo-v2`), configurações e analytics financeiros.

## `ASSISTANT`
- Acesso operacional e administrativo.
- **Sem acesso a conteúdo clínico sensível:**
  - edição final de laudo
  - configurações críticas de IA e integrações
  - relatórios estratégicos restritos (opcional por política)

### Regras práticas por item sensível
- **Laudos Pendentes**: visível, mas ações clínicas bloqueadas via permissão granular (pode organizar fila, não assinar conteúdo médico).
- **Configurações**: oculto para `ASSISTANT` por padrão.
- **Relatórios Financeiros avançados**: preferencialmente `ADMIN`.

---

## 5) Navegação secundária

## 5.1 Breadcrumbs (todas as páginas autenticadas)

Formato:
- `Dashboard / Grupo / Página`
- Em páginas de detalhe:
  - `Dashboard / Perícias / 0001234-56.2024.8.13.0001`

Exemplos:
- `/pericias` → `Dashboard / Cadastros / Perícias`
- `/pericias/:id` → `Dashboard / Cadastros / Perícias / Detalhe`
- `/financeiro/cobranca` → `Dashboard / Financeiro / Cobrança`

## 5.2 Command Palette (`Ctrl+K`)

Escopos de busca:
- **Navegação:** nome de páginas/rotas.
- **Entidades:** CNJ, autor, réu, cidade, advogado.
- **Ações rápidas:** “Nova perícia”, “Agendar em lote”, “Abrir esclarecimentos pendentes”.

Resultado padrão:
- Grupo + ícone + label + subtítulo (ex.: CNJ + comarca + status).
- Enter navega direto; `Cmd/Ctrl+Enter` abre em nova aba.

## 5.3 Header contextual por página
- Título + subtítulo de contexto.
- Ações primárias à direita.
- Chips de filtros ativos.

---

## 6) Tabs por contexto de página

## 6.1 Detalhe da Perícia (`/pericias/:id`)
Tabs obrigatórias:
1. **Dados**
2. **Documentos**
3. **Financeiro**
4. **Laudo**
5. **Timeline**
6. **Esclarecimentos**

## 6.2 Configurações (`/configuracoes`)
Tabs sugeridas:
1. Conta
2. Aparência
3. Status
4. Tipos
5. Integrações
6. Templates
7. Regras

## 6.3 Financeiro (`/financeiro`)
Tabs sugeridas:
1. Visão Geral
2. Recebimentos
3. Pendências
4. Conciliação

## 6.4 Hub de Comunicação (`/comunicacao`)
Tabs sugeridas:
1. Templates
2. Gerador
3. Histórico de envios

---

## 7) Atalhos globais de teclado

| Atalho | Ação |
|---|---|
| `Ctrl+K` | Abrir Command Palette |
| `g d` | Ir para Dashboard |
| `g i` | Ir para Perícias |
| `g a` | Ir para Agenda |
| `g f` | Ir para Financeiro |
| `c p` | Criar Nova Perícia |
| `Ctrl+S` | Salvar formulário/página editável |
| `Esc` | Fechar Dialog/Sheet/Drawer |

---

### Checklist da entrega
- [x] Organização de navegação em grupos lógicos
- [x] Mapeamento de ícone, label, badge, role e atalhos
- [x] Breadcrumbs definidos
- [x] Command Palette definida
- [x] Tabs por páginas-chave definidas
