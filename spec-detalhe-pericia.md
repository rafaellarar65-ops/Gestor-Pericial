# Entrega 7 — Especificação da Página Crítica: Detalhe da Perícia

## Índice
- [1) Escopo e objetivo](#1-escopo-e-objetivo)
- [2) Layout pixel-perfect](#2-layout-pixel-perfect)
- [3) Header contextual](#3-header-contextual)
- [4) Tabs e conteúdo](#4-tabs-e-conteúdo)
- [5) Mapeamento 1:1 com `Pericia` (types.ts)](#5-mapeamento-11-com-pericia-typests)
- [6) Regras de obrigatoriedade](#6-regras-de-obrigatoriedade)
- [7) Estados visuais (status/urgência/prazo)](#7-estados-visuais-statusurgênciaprazo)
- [8) Interações e comportamentos](#8-interações-e-comportamentos)
- [9) Responsividade da página](#9-responsividade-da-página)

---

## 1) Escopo e objetivo

**URL:** `/pericias/:id`  
**Acesso:** ADMIN, ASSISTANT (com permissão granular por ação)  
**Objetivo:** fornecer visão única 360º do caso, com operação rápida de dados, documentos, financeiro, laudo e histórico.

---

## 2) Layout pixel-perfect

## 2.1 Estrutura geral (desktop)
- Container: `max-width: 1440px`
- Padding horizontal: `24px`
- Espaçamento vertical entre blocos: `16px`
- Grid: 12 colunas (gutter 20px)

### Distribuição
- **Header da página:** full width
- **Tabs:** full width
- **Conteúdo principal:** 9 colunas
- **Painel lateral de contexto:** 3 colunas

## 2.2 Medidas dos blocos
- Card principal: radius `12px`, padding `20px`, border `1px`
- Linhas de formulário: altura mínima `40px`
- Tabs: altura `44px`
- Área útil mínima por tab: `min-height: 520px`
- Painel lateral sticky: topo `88px`, largura ~`320px`

---

## 3) Header contextual

## 3.1 Composição visual
Da esquerda para direita:
1. Breadcrumb: `Dashboard / Perícias / [CNJ]`
2. Título principal: `processoCNJ`
3. Subtítulo: `autorNome` × `reuNome`
4. Badges: `StatusBadge(statusId)`, `urgente`, `pagamentoStatus`
5. Ações primárias:
   - `Editar Perícia`
   - `Abrir Laudo V2` (ADMIN)
   - `Registrar Recebimento`
   - menu `Mais ações`

## 3.2 Componentes exatos
- `Breadcrumb`
- `Badge` / `StatusBadge`
- `Button` (`default`, `outline`, `ghost`)
- `DropdownMenu` para ações secundárias

---

## 4) Tabs e conteúdo

Tabs obrigatórias:
1. **Dados**
2. **Documentos**
3. **Financeiro**
4. **Laudo**
5. **Timeline**
6. **Esclarecimentos**

## 4.1 Tab Dados

### Seções
- **Dados Processuais**
- **Partes e Vara**
- **Agenda/Realização**
- **Meta e Flags**

### Componentes
- `Input`: CNJ, juiz, autor, réu, local
- `Select/Combobox`: cidade, vara, tipo, modalidade, status
- `DatePicker`: nomeação/agendamento/realização/envio
- `TimePicker`: hora agendamento
- `Switch/Checkbox`: `agendada`, `laudoEnviado`, `finalizada`, `isUrgent`
- `Textarea`: `observacoes`, `extraObservation`

### Ações contextuais
- salvar alterações
- alterar status rápido
- marcar urgência

## 4.2 Tab Documentos

### Conteúdo
- tabela/lista de `CaseDocument`
- filtros por categoria (`PROCESSO`, `LAUDO`, `QUESITOS`, `OUTROS`)
- preview de arquivo

### Componentes
- `FileUpload`
- `DataTable`
- `Dialog` de preview/renomear/excluir

### Ações
- upload múltiplo
- download
- categorizar

## 4.3 Tab Financeiro

### Conteúdo
- resumo `PericiaFinanceiro`
- histórico de `Recebimento`
- pendências e saldo aberto

### Componentes
- `KPICard` (valor esperado, recebido, saldo)
- `StatusBadge` financeiro
- `DataTable` de recebimentos
- `Dialog` “Novo recebimento”

### Ações
- lançar recebimento
- vincular batch
- reprocessar conciliação

## 4.4 Tab Laudo

### Conteúdo
- estado do laudo (`preLaudoId`, status de elaboração)
- atalhos para abrir `/pericias/:id/laudo-v2`
- resumo das últimas edições

### Componentes
- `Card` resumo
- `Button` abrir editor
- `Timeline` de versões

### Ações
- abrir editor
- exportar PDF
- registrar envio

## 4.5 Tab Timeline

### Conteúdo
- linha do tempo de `LogStatus`, `AgendaEvent`, envios e recebimentos
- movimentos CNJ (`cnjData.movimentos`) quando existir

### Componentes
- `Timeline`
- filtros por tipo de evento

## 4.6 Tab Esclarecimentos

### Conteúdo
- bloco de prazo: `esclarecimentos.dataIntimacao`, `prazoDias`, `resolvido`
- contagem regressiva e indicador de atraso

### Componentes
- `Alert` (vencido / próximo)
- `DatePicker`, `Input number`, `Checkbox`
- `Button` marcar resolvido

---

## 5) Mapeamento 1:1 com `Pericia` (types.ts)

| Campo `Pericia` | UI (componente) | Tab |
|---|---|---|
| `id` | texto somente leitura (`code`) | Dados |
| `processoCNJ` | `Input` com máscara CNJ | Dados |
| `processoCNJ_digits` | `Input` readonly | Dados |
| `cidadeId` | `Combobox` Cidade | Dados |
| `varaId` | `Combobox` Vara | Dados |
| `tipoPericiaId` | `Select` Tipo | Dados |
| `modalidadeId` | `Select` Modalidade | Dados |
| `statusId` | `Select` + `StatusBadge` | Dados/Header |
| `statusUpdatedAt` | `caption` readonly | Dados |
| `juizNome` | `Input` | Dados |
| `autorNome` | `Input` | Dados |
| `reuNome` | `Input` | Dados |
| `observacoes` | `Textarea` | Dados |
| `extraObservation` | `Textarea` | Dados |
| `isUrgent` | `Switch` + badge urgente | Header/Dados |
| `agendada` | `Checkbox` | Dados |
| `laudoEnviado` | `Checkbox` | Dados/Laudo |
| `finalizada` | `Checkbox` | Dados |
| `pagamentoStatus` | `StatusBadge` | Header/Financeiro |
| `financeiro` | cards + tabela | Financeiro |
| `kpis` | cards readonly | Financeiro |
| `dataNomeacao` | `DatePicker` | Dados |
| `dataAgendamento` | `DatePicker` | Dados |
| `horaAgendamento` | `TimePicker` | Dados |
| `localPericia` | `Input` | Dados |
| `localId` | `Select` local cadastrado | Dados |
| `dataRealizacao` | `DatePicker` | Dados |
| `dataEnvioLaudo` | `DatePicker` | Laudo |
| `dataUltimoEnvio` | `caption` readonly | Laudo |
| `createdAt` | `caption` readonly | Dados |
| `honorariosPrevistosJG` | `Input currency` | Financeiro |
| `honorariosPrevistosPartes` | `Input currency` | Financeiro |
| `origemImportacao` | `Badge`/texto | Dados |
| `dataImportacao` | `caption` readonly | Dados |
| `checklist` | checklist interativo | Dados |
| `suggestion` | `Alert` IA sugestão | Dados |
| `locks` | alerta lock | Dados/Header |
| `lawyerIds` | `Combobox` múltiplo | Dados |
| `documentIds` | lista vinculada | Documentos |
| `preLaudoId` | referência/atalho | Laudo |
| `cnjSync` | status sync badge | Timeline/Header |
| `cnjData` | timeline movimentos | Timeline |
| `esclarecimentos` | formulário prazo | Esclarecimentos |
| `indiretaInfo` | card de prazo indireta | Dados |
| `telepericiaContato` | formulário contato | Dados |

---

## 6) Regras de obrigatoriedade

## Obrigatórios (bloqueiam salvar)
- `processoCNJ`
- `cidadeId`
- `varaId`
- `tipoPericiaId`
- `modalidadeId`
- `statusId`
- `juizNome`
- `autorNome`
- `reuNome`
- `dataNomeacao`

## Opcionais (sem bloqueio)
- `observacoes`, `extraObservation`
- `dataAgendamento`, `horaAgendamento`
- `localPericia`, `localId`
- `dataEnvioLaudo`, `dataUltimoEnvio`
- `cnjData`, `telepericiaContato`, `indiretaInfo`

### Tratamento visual
- Obrigatório: label com `*` + erro inline.
- Opcional: label padrão + placeholder contextual.
- Campo readonly: fundo muted + cursor default.

---

## 7) Estados visuais (status/urgência/prazo)

- `StatusBadge` sempre visível no header.
- `isUrgent = true`: badge vermelho + ícone `AlertTriangle` + borda do card em tom crítico.
- Prazo de esclarecimento:
  - `>7 dias`: neutro
  - `<=7 dias`: warning
  - vencido: destructive com contagem negativa
- `pagamentoStatus` com semântica:
  - `NAO` vermelho
  - `PARCIAL` amarelo
  - `SIM` verde

---

## 8) Interações e comportamentos

1. **Auto-save** em campos textuais com debounce 800ms.
2. **Salvar explícito** para mudanças estruturais (status, datas, financeiro).
3. **Troca de tab com alterações pendentes:** modal “Salvar antes de sair?”.
4. **Alteração de status:** abre modal com motivo (auditável).
5. **Upload de documento:** progresso por arquivo + retry individual.
6. **Ações bloqueadas por role:** botão disabled + tooltip explicativo.
7. **Conflito de edição simultânea:** banner + opção recarregar/manter rascunho.

---

## 9) Responsividade da página

## Desktop
- layout 9/3 com painel lateral sticky
- tabs completas com labels

## Tablet
- layout 12 colunas sem painel fixo
- painel lateral vira acordeão abaixo do conteúdo

## Mobile
- header compacto + badges essenciais
- tabs roláveis horizontalmente
- conteúdo em coluna única
- ações principais em barra inferior sticky
- seções avançadas em `Accordion`
