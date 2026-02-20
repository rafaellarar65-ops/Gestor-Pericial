# Entrega 5 — Fluxos de Usuário Críticos

## Índice
1. [Fluxo Completo de uma Perícia](#1-fluxo-completo-de-uma-perícia)
2. [Agendamento em Lote](#2-agendamento-em-lote)
3. [Elaboração de Laudo](#3-elaboração-de-laudo)
4. [Importação Financeira](#4-importação-financeira)
5. [Busca Global](#5-busca-global)
6. [Assistente IA (Batch Update)](#6-assistente-ia-batch-update)
7. [Teleperícia](#7-teleperícia)
8. [Primeiro Acesso](#8-primeiro-acesso)

---

## 1) Fluxo Completo de uma Perícia
**Objetivo:** fechar o ciclo ponta-a-ponta: Nomeação → Agendamento → Exame → Laudo → Envio → Cobrança → Recebimento.

**Páginas envolvidas:**
- `/nomeacoes`
- `/pericias/:id`
- `/agendar` ou `/agenda`
- `/pericias/:id/laudo-v2`
- `/financeiro/cobranca`
- `/financeiro`

**Passo a passo (usuário):**
1. Em **Nomeações**, filtra novas e seleciona processo CNJ.
2. Clica em **Aceitar Nomeação** (cria/ativa `Pericia`).
3. Abre detalhe da perícia e revisa dados básicos (`cidadeId`, `varaId`, `tipoPericiaId`, `statusId`).
4. Agenda data/hora (`dataAgendamento`, `horaAgendamento`) via agenda/lote.
5. No dia, marca realização (`dataRealizacao`) e checklist concluído.
6. Abre **Laudo V2** e preenche seções, valida coerência, exporta PDF.
7. Registra envio (`dataEnvioLaudo`) e altera status para laudo enviado.
8. Vai em **Cobrança**, dispara contato/template.
9. Ao receber, registra `Recebimento` e concilia saldo em Financeiro.

**Feedback do sistema:**
- Toast de sucesso por etapa crítica (aceite, agendamento, envio, recebimento).
- Badge de status atualizado em tempo real (`StatusBadge`).
- Loading/skeleton para operações >200ms.
- Modal de confirmação em ações destrutivas/irreversíveis.

**Cenários de erro:**
- CNJ inválido/duplicado: erro inline + sugestão de caso existente.
- Conflito de agenda: modal com alternativas de horário.
- Falha de geração PDF: manter rascunho + retry sem perder conteúdo.
- Recebimento não conciliado: status financeiro “pendente” + fila de revisão.

**Estimativa de cliques:** ~18 a 26 cliques (sem atalhos).

---

## 2) Agendamento em Lote
**Objetivo:** agendar várias perícias com consistência e baixo esforço.

**Páginas envolvidas:**
- `/agendar`
- `/agenda`
- `/pericias`

**Passo a passo (usuário):**
1. Abre **Agendar em Lote**.
2. Seleciona perícias elegíveis (filtro por cidade/status).
3. Define datas/horários por bloco.
4. Escolhe local/modalidade padrão (com override por item).
5. Revisa conflitos e itens inválidos.
6. Confirma aplicação (gera `BatchApplyRequest`).
7. Sistema retorna resumo (`BatchApplyResponse`).
8. Usuário valida visualmente na Agenda.

**Feedback do sistema:**
- Barra de progresso por etapa do wizard.
- Preview de alterações por item (antes/depois).
- Toast com resumo: “15 aplicadas, 2 com erro”.

**Cenários de erro:**
- Item bloqueado por lock (`locks.schedulingBatchId`): item marcado como skipped.
- Horário fora da janela: validação inline no passo 2.
- Falha parcial na aplicação: relatório CSV de erros para retrabalho.

**Estimativa de cliques:** ~9 a 14 cliques para lote médio (10–20 casos).

---

## 3) Elaboração de Laudo
**Objetivo:** gerar laudo consistente, auditável e exportável.

**Páginas envolvidas:**
- `/laudos`
- `/pericias/:id/laudo-v2`

**Passo a passo (usuário):**
1. Abre fila de laudos pendentes e escolhe um caso.
2. Carrega template (`LaudoTemplate`) e dados prévios (`PreLaudo`).
3. Preenche identificação, alegações e histórico.
4. Registra exame físico e manobras executadas (`ExamPerformedItem`).
5. Usa assistente IA para coerência textual/técnica.
6. Resolve alertas (`CoherenceIssue`) com sugestões.
7. Salva versão final, gera PDF e marca envio.

**Feedback do sistema:**
- Autosave com indicador “salvo há X segundos”.
- Chips de qualidade (erros/avisos/info).
- Toast ao exportar PDF com link para arquivo.

**Cenários de erro:**
- IA indisponível: fallback manual com aviso não bloqueante.
- Conflito de edição simultânea: modal para mesclar/duplicar versão.
- Campo obrigatório ausente: bloqueia “Finalizar” e destaca seção.

**Estimativa de cliques:** ~14 a 22 cliques (varia pela complexidade clínica).

---

## 4) Importação Financeira
**Objetivo:** importar extratos/CSV e refletir saldos automaticamente.

**Páginas envolvidas:**
- `/financeiro`
- `/relatorios` (validação pós-processo)

**Passo a passo (usuário):**
1. Em Financeiro, clica “Importar CSV”.
2. Faz upload do arquivo e escolhe origem (`FontePagamento`).
3. Sistema processa e executa matching automático.
4. Usuário revisa matched/suggested/unmatched.
5. Ajusta manualmente pendências.
6. Confirma importação (`ImportBatch`).
7. Visualiza atualização de recebimentos/saldos.

**Feedback do sistema:**
- Progress bar por etapas (upload → parse → matching → confirmação).
- Cards de resumo: bruto, líquido, vinculados, não vinculados.
- Toast de conclusão com link para lote importado.

**Cenários de erro:**
- CSV inválido: mensagem com linha/coluna problemática.
- CNJ sem correspondência: cria `UnmatchedPayment` e envia para fila.
- Reimport duplicada: alerta com opção “reverter lote anterior”.

**Estimativa de cliques:** ~7 a 12 cliques.

---

## 5) Busca Global
**Objetivo:** encontrar rapidamente perícia, página ou entidade por teclado.

**Páginas envolvidas:**
- qualquer página autenticada (overlay global)

**Passo a passo (usuário):**
1. Pressiona `Ctrl+K`.
2. Digita CNJ, nome, cidade ou ação.
3. Navega com setas pelos resultados.
4. Enter abre detalhe/rota.

**Feedback do sistema:**
- Resultados em até 200ms com agrupamento por tipo.
- Highlight de trecho encontrado.
- “Recentes” quando campo vazio.

**Cenários de erro:**
- Sem resultados: `EmptyState` com ações sugeridas (“Nova perícia”).
- Busca lenta: skeleton curto + debounce.

**Estimativa de cliques:** 0 a 2 (teclado-first).

---

## 6) Assistente IA (Batch Update)
**Objetivo:** atualizar múltiplas perícias via linguagem natural com segurança.

**Páginas envolvidas:**
- `/pericias`
- Modal de Assistente IA

**Passo a passo (usuário):**
1. Seleciona subconjunto de perícias (ou deixa IA filtrar).
2. Abre assistente IA e escreve comando (ex.: “marcar como agendada em BH para próxima semana”).
3. Sistema gera plano (`AiJobPlan`) e preview (`AiJobPreview`).
4. Usuário revisa itens afetados e diffs.
5. Confirma execução em lote.
6. Sistema aplica mudanças e registra log.

**Feedback do sistema:**
- Preview obrigatório com affected count + diff por campo.
- Toast com total aplicado/ignorados.
- Link para log de auditoria.

**Cenários de erro:**
- Intenção ambígua (`UNKNOWN`): pede refinamento antes de executar.
- Ação sem permissão de role: bloqueia com explicação.
- Falha parcial: rollback por item + relatório de erros.

**Estimativa de cliques:** ~5 a 9 cliques.

---

## 7) Teleperícia
**Objetivo:** executar fluxo remoto completo com evidências documentadas.

**Páginas envolvidas:**
- `/telepericias`
- `/pericias/:id`
- `/mobile-upload/:sessionId`

**Passo a passo (usuário):**
1. Cria slot (`TeleSlot`) com duração.
2. Vincula perícia e contato (`telepericiaContato`).
3. Envia link/convite.
4. Paciente envia documentos/exames pelo Upload Mobile.
5. Perito realiza sessão remota e registra achados.
6. Dados ficam anexados ao caso para laudo.

**Feedback do sistema:**
- Status do slot: available/booked/blocked.
- Notificação de upload concluído.
- Timeline com eventos de teleperícia.

**Cenários de erro:**
- Link expirado: gerar novo token/sessão.
- Falha de upload móvel: retry com fila offline.
- Contato inválido: validação de WhatsApp/formato.

**Estimativa de cliques:** ~8 a 13 cliques (perito); paciente ~3 a 6.

---

## 8) Primeiro Acesso
**Objetivo:** garantir setup inicial rápido e seguro.

**Páginas envolvidas:**
- `/login`
- `/configuracoes`
- `/` (dashboard)

**Passo a passo (usuário):**
1. Faz login inicial.
2. Tour guiado de 4 a 6 passos (menu, busca global, agenda, perícias).
3. Configura dados essenciais:
   - status/tipos/modalidades
   - cidades/varas
   - integração e templates
4. Sistema valida checklist de implantação.
5. Redireciona ao dashboard com quick actions.

**Feedback do sistema:**
- Checklist visual de progresso (0% → 100%).
- Toast por etapa concluída.
- Banner “faltam X passos para operação completa”.

**Cenários de erro:**
- Integração externa falha: salvar rascunho + retestar depois.
- Usuário sem role adequada: bloquear setup crítico.

**Estimativa de cliques:** ~12 a 20 cliques (configuração inicial completa).

---

## Padrões transversais de UX nos fluxos
- **Confirmação obrigatória** para ações destrutivas/em lote.
- **Feedback imediato** em todas as ações (toast, badge, loading).
- **Persistência de progresso** em fluxos longos (wizard e laudo).
- **Acessibilidade:** navegação por teclado e foco previsível.
- **Auditoria:** registrar ações críticas (`ActivityLog`).
