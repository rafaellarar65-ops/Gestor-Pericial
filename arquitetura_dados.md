diff --git a/arquitetura_dados.md b/arquitetura_dados.md
index 0edfe915df4a0e807d792466ff7ffd612cd99708..9ba5a9e25906dd1c28925858b8277dcc806cdc33 100644
--- a/arquitetura_dados.md
+++ b/arquitetura_dados.md
@@ -1,218 +1,309 @@
-# Arquitetura de Dados — Perícias Manager Pro
-
-## Índice
-- [1) Objetivo](#1-objetivo)
-- [2) Princípios de modelagem](#2-princípios-de-modelagem)
-- [3) Entidades centrais e relacionamentos](#3-entidades-centrais-e-relacionamentos)
-- [4) Dicionário de domínios (enums/status)](#4-dicionário-de-domínios-enumsstatus)
-- [5) Fluxos de dados por módulo](#5-fluxos-de-dados-por-módulo)
-- [6) Regras de consistência e integridade](#6-regras-de-consistência-e-integridade)
-- [7) Estratégia de índices e performance](#7-estratégia-de-índices-e-performance)
-- [8) Segurança, permissões e auditoria](#8-segurança-permissões-e-auditoria)
-- [9) Sincronização e integrações externas](#9-sincronização-e-integrações-externas)
-- [10) Versionamento e migração](#10-versionamento-e-migração)
-
----
+# Arquitetura de Dados — Perícias Manager Pro (v1.0 Revisada)
 
 ## 1) Objetivo
 
-Definir a arquitetura de dados de forma implementável para suportar o ciclo completo da perícia judicial médica, com foco em:
-- rastreabilidade legal;
-- robustez financeira;
-- eficiência operacional;
-- extensibilidade para IA e integrações (DataJud, SISPERJUD, e-mail).
+Definir arquitetura de dados implementável, escalável e auditável para suportar:
+- ciclo completo da perícia judicial médica
+- rastreabilidade legal
+- robustez financeira
+- multi-clínica (multi-tenant)
+- suporte a IA e integrações externas
 
 ---
 
-## 2) Princípios de modelagem
+## 2) Princípios de Modelagem
 
-1. **Case-centric model:** `Pericia` é a entidade núcleo.
-2. **Entidades normalizadas + objetos derivados:** guardar fonte primária e calcular KPIs/visões.
-3. **Auditabilidade por padrão:** mudanças críticas geram `LogStatus` e `ActivityLog`.
-4. **Soft coupling com integrações:** metadados de sync em campos dedicados (`cnjSync`, `IntegrationSettings`).
-5. **Permissão por role no acesso e na mutação:** `ADMIN`/`ASSISTANT`.
+1. **Case-centric model:** `Pericia` é entidade núcleo.
+2. **Multi-tenant obrigatório:** todas as entidades operacionais possuem `tenantId`.
+3. **Fonte primária imutável + projeções derivadas.**
+4. **Auditabilidade por padrão.**
+5. **Controle de concorrência explícito** (`Lock`).
+6. **Permissão baseada em Role + Tenant.**
 
 ---
 
-## 3) Entidades centrais e relacionamentos
-
-## 3.1 Núcleo do caso
-- **Pericia** (raiz)
-  - FK: `cidadeId`, `varaId`, `tipoPericiaId`, `modalidadeId`, `statusId`
-  - agregações: `financeiro`, `kpis`, `esclarecimentos`, `cnjSync`, `cnjData`
-  - relacionamentos por referência:
-    - `documentIds[]` → `CaseDocument`
-    - `lawyerIds[]` → `Lawyer`
-    - `preLaudoId` → `PreLaudo`
-
-## 3.2 Cadastros estruturantes
-- `Cidade` 1:N `Vara`
-- `Cidade` 1:N `Pericia`
-- `Status` 1:N `Pericia`
-- `TipoPericia` 1:N `Pericia`
-- `Modalidade` 1:N `Pericia`
-- `Lawyer` N:N `Pericia` (via `lawyerIds`)
-
-## 3.3 Agenda e operação
-- `AgendaEvent` N:1 `Pericia` (opcional)
-- `AgendaTask` N:1 `Pericia`
-- `SchedulingBatch` 1:N `SchedulingBatchItem`
-- `BatchApplyRequest/Response` como contrato transacional da aplicação em lote
-
-## 3.4 Laudo e base técnica
-- `PreLaudo` 1:1 `Pericia`
-- `LaudoTemplate` 1:N `LaudoSection` 1:N `LaudoField`
-- `PhysicalManeuver` catálogo clínico reutilizável
-- `KnowledgeItem` base de conhecimento indexável por tags
-
-## 3.5 Financeiro
-- `Recebimento` N:1 `Pericia`
-- `ImportBatch` 1:N `Recebimento`
-- `UnmatchedPayment` N:1 `ImportBatch` (opcional)
-- `Despesa` (ligação opcional com `cidadeId`)
-- `BankTransaction`, `CashLedgerItem`, `PaymentProfile`, `Payer` para conciliação/analítica
-
-## 3.6 Comunicação
-- `EmailConfig` (por `UserProfile`)
-- `EmailTemplate` (em `IntegrationSettings`)
-- `EmailHeader`/`EmailDetail` como modelo de ingestão/visualização de mensagens
-
-## 3.7 Segurança e observabilidade
-- `UserProfile` (auth + role)
-- `ActivityLog` (ações relevantes)
-- `DailyUsage` (telemetria operacional)
+## 3) Modelo Multi-Tenant
 
----
+### 3.1 Entidade Tenant
 
-## 4) Dicionário de domínios (enums/status)
+## `Tenant`
+- `id` (PK)
+- `nome`
+- `createdAt`
+- `ativo`
 
-## 4.1 Status de perícia (configurável)
-- Entidade `Status`: `id`, `nome`, `grupo`, `ordem`, `cor`
-- Regra: ordenação por `ordem` nas filas operacionais.
+### 3.2 Regra
 
-## 4.2 Financeiro
-- `Pericia.pagamentoStatus`: `NAO` | `PARCIAL` | `SIM`
-- `PericiaFinanceiro.status`: `SEM_VALOR` | `A_RECEBER` | `PARCIAL` | `PAGO` | `RECEBIDA_CONCILIADA` | `RECEBIDA_SEM_HONORARIOS` | `RECEBIDA_PENDENTE`
+Todas as entidades de negócio contêm:
+- `tenantId` (FK `Tenant.id`) **NOT NULL**
 
-## 4.3 Agenda e lote
-- `AgendaEventType`: `PERICIA` | `LAUDO` | `DESLOCAMENTO` | `PRAZO` | `BLOCO_TRABALHO`
-- `SchedulingBatch.status`: `PENDING_CONFIRMATION` | `CONFIRMED` | `CANCELLED`
+Aplica-se a:
+- `Pericia`
+- `Recebimento`
+- `Despesa`
+- `AgendaEvent`
+- `Lawyer`
+- `Cidade` (ou tabela pivot `TenantCidade`)
+- `ImportBatch`
+- `PreLaudo`
+- `ActivityLog`
+- `LogStatus`
+- `Lock`
 
-## 4.4 Teleperícia
-- `TeleSlot.status`: `AVAILABLE` | `BOOKED` | `BLOCKED`
+---
 
-## 4.5 IA/automação
-- `AiIntent`: `BATCH_UPDATE_PERICIA` | `CREATE_CONFIG` | `UNKNOWN`
-- `RuleTrigger`: `ON_STATUS_ENTER` | `ON_FIELD_SET` | `ON_FIN_EVENT_CREATED`
+## 4) Entidades Centrais e Relacionamentos
+
+### 4.1 Núcleo
+
+## `Pericia` (raiz)
+
+- `id` (PK)
+- `tenantId` (FK)
+- `processoCNJ` (unique por tenant)
+- `processoCNJ_digits` (index)
+- `cidadeId` (FK)
+- `varaId` (FK)
+- `tipoPericiaId` (FK)
+- `modalidadeId` (FK)
+- `statusId` (FK)
+- `juizNome`
+- `autorNome`
+- `reuNome`
+- `observacoes`
+- `extraObservation`
+- `isUrgent`
+- `agendada`
+- `laudoEnviado`
+- `finalizada`
+- `pagamentoStatus`
+- `dataNomeacao`
+- `dataAgendamento`
+- `horaAgendamento`
+- `dataRealizacao`
+- `dataEnvioLaudo`
+- `honorariosPrevistosJG`
+- `honorariosPrevistosPartes`
+- `origemImportacao`
+- `createdAt`
+- `updatedAt`
+
+**Regras:**
+- `processoCNJ` unique (`tenantId`, `processoCNJ_digits`)
+- alteração de status gera `LogStatus` obrigatório
+
+### 4.2 Relacionamentos N:N (Join Tables obrigatórias)
+
+## `PericiaLawyer`
+- `id`
+- `tenantId`
+- `periciaId` (FK)
+- `lawyerId` (FK)
+- `createdAt`
+
+## `PericiaDocument`
+- `id`
+- `tenantId`
+- `periciaId` (FK)
+- `documentId` (FK)
+- `categoria`
+- `createdAt`
+
+### 4.3 Financeiro
+
+#### Fonte Primária
+## `Recebimento`
+- `id`
+- `tenantId`
+- `periciaId` (FK)
+- `batchId` (FK opcional)
+- `valorBruto`
+- `valorLiquido`
+- `dataRecebimento`
+- `origem`
+- `createdAt`
+
+#### Projeção Materializada
+## `PericiaFinanceiro` (materializado)
+- `periciaId` (PK/FK)
+- `valorPrevisto`
+- `valorRecebido`
+- `saldoAberto`
+- `status`
+- `atualizadoEm`
+
+**Regra:**
+Sempre que:
+- inserir/editar/excluir `Recebimento`
+- alterar honorários previstos
+
+→ recalcular `PericiaFinanceiro`  
+→ recalcular KPIs derivados
+
+### 4.4 KPIs
+
+KPIs **NÃO** são fonte primária.  
+Podem ser:
+- view materializada
+- tabela derivada atualizada por job assíncrono
+
+### 4.5 Logs
+
+## `LogStatus` (somente mudança de status)
+- `id`
+- `tenantId`
+- `periciaId`
+- `statusAnterior`
+- `statusNovo`
+- `motivo`
+- `userId`
+- `createdAt`
+
+## `ActivityLog` (ação ampla)
+- `id`
+- `tenantId`
+- `entityType`
+- `entityId`
+- `action`
+- `payloadJson`
+- `userId`
+- `createdAt`
+
+### 4.6 Lock (controle de concorrência)
+
+## `Lock`
+- `id`
+- `tenantId`
+- `entityType`
+- `entityId`
+- `lockedBy` (`userId`)
+- `lockedAt`
+- `expiresAt`
+- `reason`
+
+**Regras:**
+- Lock obrigatório para:
+  - edição de laudo
+  - aplicação de lote
+  - importação financeira
+- TTL padrão: **30 minutos** (renovável)
+- Apenas `ADMIN` pode forçar unlock
 
 ---
 
-## 5) Fluxos de dados por módulo
+## 5) Agenda e Lote
+
+## `AgendaEvent`
+- `id`
+- `tenantId`
+- `periciaId` (nullable)
+- `type`
+- `start`
+- `end`
+- `createdAt`
+
+## `SchedulingBatch`
+- `id`
+- `tenantId`
+- `status`
+- `createdBy`
+- `createdAt`
+
+## `SchedulingBatchItem`
+- `id`
+- `batchId`
+- `periciaId`
+- `statusAplicacao`
+- `erro`
 
-## 5.1 Operacional (nomeação → execução)
-1. ingestão de nomeação cria/atualiza `Pericia`
-2. agenda gera `AgendaEvent` + `AgendaTask`
-3. mudanças de status gravam `LogStatus`
+---
 
-## 5.2 Laudo
-1. abertura de editor carrega `PreLaudo` e template
-2. updates frequentes persistem `laudoRealtime`/`laudoV2`
-3. envio atualiza `dataEnvioLaudo`, `laudoEnviado`, `statusId`
+## 6) Integrações
 
-## 5.3 Financeiro
-1. importação cria `ImportBatch`
-2. matching gera `Recebimento` e/ou `UnmatchedPayment`
-3. recalcula `PericiaFinanceiro` e KPIs derivados
+### CNJ Sync
+`Pericia`:
+- `cnjSyncStatus`
+- `cnjLastSyncAt`
 
-## 5.4 Comunicação
-1. templates vêm de `IntegrationSettings.emailTemplates`
-2. mensagens vinculadas ao caso por CNJ/periciaId quando possível
+### Snapshot
+Tabela separada: `CnjMovement`
+- `periciaId`
+- `movimentoData`
+- `descricao`
+- `rawJson`
 
 ---
 
-## 6) Regras de consistência e integridade
+## 7) Regras de Integridade
 
-1. `Pericia.processoCNJ` deve ser único por tenant/usuário.
-2. `agendada=true` exige `dataAgendamento` (e idealmente `horaAgendamento`).
-3. `laudoEnviado=true` exige `dataEnvioLaudo`.
-4. `finalizada=true` não pode coexistir com status de pendência operacional.
-5. `Recebimento.periciaId` deve existir e manter soma coerente com `PericiaFinanceiro.valorRecebido`.
-6. `SchedulingBatchItem.periciaId` bloqueado não pode ser reaplicado sem unlock.
-7. alterações de `statusId` sempre registram `LogStatus`.
+1. `agendada = true` exige `dataAgendamento`.
+2. `laudoEnviado = true` exige `dataEnvioLaudo`.
+3. `finalizada = true` bloqueia novos `AgendaEvent` operacionais.
+4. `Recebimento.periciaId` obrigatório.
+5. Lock ativo impede update concorrente.
+6. Status só pode evoluir conforme fluxo permitido (máquina de estados).
 
 ---
 
-## 7) Estratégia de índices e performance
+## 8) Índices Estratégicos
 
-## 7.1 Consultas quentes
-- lista de perícias: filtro por `statusId`, `cidadeId`, `varaId`, `pagamentoStatus`, `dataAgendamento`
-- agenda: intervalo por `start/end`
-- cobrança: ordenação por aging e saldo aberto
+## `Pericia`
+- (`tenantId`, `statusId`, `dataAgendamento`)
+- (`tenantId`, `cidadeId`, `statusId`)
+- (`tenantId`, `pagamentoStatus`)
+- (`tenantId`, `processoCNJ_digits` UNIQUE)
 
-## 7.2 Índices recomendados
-- `Pericia`: 
-  - `(statusId, dataAgendamento)`
-  - `(cidadeId, statusId)`
-  - `(pagamentoStatus, dataNomeacao)`
-  - `processoCNJ_digits` (busca exata rápida)
-- `AgendaEvent`: `(start, type)`, `(periciaId, start)`
-- `Recebimento`: `(periciaId, dataRecebimento)`, `(batchId)`
-- `LogStatus`: `(periciaId, data)`
+## `Recebimento`
+- (`tenantId`, `periciaId`, `dataRecebimento`)
+- (`tenantId`, `batchId`)
 
-## 7.3 Estratégia de leitura
-- projeções leves para listagens (evitar payload completo de `Pericia`).
-- lazy load de blocos pesados (CNJ movimentos, histórico extenso).
+## `AgendaEvent`
+- (`tenantId`, `start`)
+- (`tenantId`, `periciaId`, `start`)
 
----
+## `LogStatus`
+- (`tenantId`, `periciaId`, `createdAt` DESC)
 
-## 8) Segurança, permissões e auditoria
+---
 
-## 8.1 Modelo de acesso
-- **ADMIN**: leitura/escrita total.
-- **ASSISTANT**: sem ações clínicas críticas (ex.: fechamento de laudo).
+## 9) Segurança
 
-## 8.2 Regras por dado sensível
-- limitar edição de campos médicos e parecer final por role.
-- segregar credenciais (`EmailConfig.password`, tokens de integração).
+### Modelo RBAC
+`UserProfile`:
+- `id`
+- `tenantId`
+- `role` (`ADMIN` | `ASSISTANT`)
 
-## 8.3 Auditoria obrigatória
-- `ActivityLog` para ações-chave:
-  - criar/editar perícia
-  - mudança de status
-  - envio de laudo
-  - importação financeira
-  - execução de ação IA em lote
+### Regras
+`ASSISTANT` não pode:
+- alterar laudo final
+- forçar unlock
+- alterar integrações
 
 ---
 
-## 9) Sincronização e integrações externas
+## 10) Versionamento
 
-## 9.1 DataJud/CNJ
-- armazenar snapshot em `cnjData` e metadados em `cnjSync`.
-- política de reconciliação: último sync válido vence, mantendo histórico de movimentos.
+Entidades com schema evolutivo:
+- `PhysicalManeuver`
+- `ExamPerformed`
+- `LaudoTemplate`
 
-## 9.2 SISPERJUD
-- parâmetros em `IntegrationSettings` (`sisperjudUrl`, `sisperjudToken`).
-- retries exponenciais para falhas transitórias.
+Campo:
+- `schemaVersion`
 
-## 9.3 E-mail
-- config por usuário (`UserProfile.emailConfig`).
-- templates globais em `IntegrationSettings.emailTemplates`.
+Migrações:
+- idempotentes
+- registradas em tabela `MigrationLog`
 
 ---
 
-## 10) Versionamento e migração
-
-1. **Schema version explícita** nas entidades com evolução frequente (`PhysicalManeuver.schemaVersion`, `ExamPerformed.schemaVersion`).
-2. **Migrações idempotentes** por lote com log de execução.
-3. **Backfill controlado** para campos derivados (`kpis`, `financeiro`).
-4. **Compatibilidade retroativa** para campos legados (`laudoV2`) enquanto coexistir com `laudoRealtime`.
-
----
+## ✅ Resultado
 
-## Checklist de implementação
-- [x] Modelo centrado em `Pericia` com relacionamentos claros
-- [x] Regras de integridade de negócio definidas
-- [x] Índices recomendados para consultas quentes
-- [x] Diretrizes de segurança/roles/auditoria
-- [x] Estratégia de integração e versionamento
+Agora o documento:
+- é multi-tenant
+- é relacional real
+- tem concorrência tratada
+- tem auditoria formal
+- define fonte primária vs projeção
+- está pronto para Prisma/Postgres
