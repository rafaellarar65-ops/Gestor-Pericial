# Arquitetura de Dados — Perícias Manager Pro (v1.1)

## 1) Objetivo
Definir uma arquitetura de dados **implementável, auditável e multi-tenant** para sustentar o ciclo completo da perícia médica judicial:
- nomeação
- agendamento
- execução clínica
- laudo
- cobrança e recebimento
- comunicação e integrações

---

## 2) Princípios de modelagem
1. **Case-centric model**: `Pericia` é a entidade raiz.
2. **Multi-tenant obrigatório**: dados operacionais isolados por `tenantId`.
3. **Fonte primária x projeção derivada**: dados transacionais não devem depender de KPI materializado.
4. **Auditabilidade por padrão**: eventos críticos sempre geram histórico.
5. **Controle de concorrência**: lock explícito para edição de conteúdo sensível (ex.: laudo).
6. **RBAC por perfil**: `ADMIN` e `ASSISTANT` com restrições por ação.

---

## 3) Modelo multi-tenant

### 3.1 Entidade base
### `Tenant`
- `id` (PK)
- `nome`
- `ativo`
- `createdAt`

### 3.2 Regra estrutural
Toda entidade de negócio deve conter:
- `tenantId` (FK para `Tenant.id`, NOT NULL)

Aplicação mínima: `Pericia`, `Recebimento`, `Despesa`, `AgendaEvent`, `Lawyer`, `Cidade`, `ImportBatch`, `PreLaudo`, `ActivityLog`, `LogStatus`, `Lock`.

---

## 4) Entidades centrais

### 4.1 Núcleo do caso
### `Pericia`
- `id` (PK)
- `tenantId` (FK)
- `processoCNJ` (texto original)
- `processoCNJ_digits` (somente dígitos, indexável)
- `cidadeId`, `varaId`, `tipoPericiaId`, `modalidadeId`, `statusId` (FKs)
- `autorNome`, `reuNome`, `juizNome`
- `isUrgent`
- `dataNomeacao`, `dataAgendamento`, `horaAgendamento`, `dataRealizacao`, `dataEnvioLaudo`
- `pagamentoStatus` (`NAO | PARCIAL | SIM`)
- `honorariosPrevistosJG`, `honorariosPrevistosPartes`
- `createdAt`, `updatedAt`

**Restrições:**
- unique (`tenantId`, `processoCNJ_digits`)
- mudança de `statusId` exige gravação em `LogStatus`

### 4.2 Relacionamentos N:N
### `PericiaLawyer`
- `id`, `tenantId`, `periciaId`, `lawyerId`, `createdAt`

### `PericiaDocument`
- `id`, `tenantId`, `periciaId`, `documentId`, `categoria`, `createdAt`

### 4.3 Agenda e operação
### `AgendaEvent`
- `id`, `tenantId`, `periciaId` (opcional)
- `type` (`PERICIA | LAUDO | DESLOCAMENTO | PRAZO | BLOCO_TRABALHO`)
- `start`, `end`, `title`, `status`

### `SchedulingBatch`
- `id`, `tenantId`, `status` (`PENDING_CONFIRMATION | CONFIRMED | CANCELLED`), `createdBy`, `createdAt`

### `SchedulingBatchItem`
- `id`, `tenantId`, `batchId`, `periciaId`, `data`, `hora`, `resultado`

### 4.4 Laudo e conhecimento
### `PreLaudo`
- `id`, `tenantId`, `periciaId` (1:1), `conteudo`, `schemaVersion`, `updatedAt`

### `LaudoTemplate` / `LaudoSection` / `LaudoField`
- templates versionados para padronização de laudos

### `PhysicalManeuver`
- catálogo clínico reutilizável com versionamento

### `KnowledgeItem`
- base de conhecimento indexável por tags e especialidade

### 4.5 Financeiro
### `Recebimento` (fonte primária)
- `id`, `tenantId`, `periciaId`, `batchId` (opcional)
- `valorBruto`, `valorLiquido`, `dataRecebimento`, `origem`, `createdAt`

### `PericiaFinanceiro` (projeção/materializado)
- `periciaId` (PK/FK)
- `valorPrevisto`, `valorRecebido`, `saldoAberto`, `status`, `atualizadoEm`

**Regra:** qualquer alteração em `Recebimento` ou honorários previstos deve recalcular `PericiaFinanceiro`.

### 4.6 Comunicação
### `EmailConfig`
- credenciais por usuário/tenant (armazenar segredo criptografado)

### `EmailMessage`
- headers, corpo, anexos, vínculo opcional com `Pericia`

---

## 5) Auditoria e segurança

### `LogStatus`
- `id`, `tenantId`, `periciaId`
- `statusAnterior`, `statusNovo`, `motivo`, `userId`, `createdAt`

### `ActivityLog`
- `id`, `tenantId`, `entityType`, `entityId`, `action`, `payloadResumo`, `userId`, `createdAt`

### `Lock`
- `id`, `tenantId`, `entityType`, `entityId`, `lockedBy`, `lockedAt`, `expiresAt`

**Regras RBAC:**
- `ADMIN`: acesso completo.
- `ASSISTANT`: sem fechamento de laudo, sem alteração de integrações e sem ações administrativas críticas.

---

## 6) Integridade e regras de negócio
- `dataEnvioLaudo` não pode ser anterior a `dataRealizacao`.
- `pagamentoStatus = SIM` exige `valorRecebido > 0`.
- `isUrgent = true` deve priorizar ordenação em listas operacionais.
- exclusão lógica preferencial (`deletedAt`) para entidades transacionais.

---

## 7) Índices recomendados
### `Pericia`
- (`tenantId`, `statusId`, `dataAgendamento`)
- (`tenantId`, `cidadeId`, `statusId`)
- (`tenantId`, `pagamentoStatus`)
- (`tenantId`, `processoCNJ_digits`) UNIQUE

### `Recebimento`
- (`tenantId`, `periciaId`, `dataRecebimento`)
- (`tenantId`, `batchId`)

### `AgendaEvent`
- (`tenantId`, `start`)
- (`tenantId`, `periciaId`, `start`)

### `LogStatus`
- (`tenantId`, `periciaId`, `createdAt` DESC)

---

## 8) Estratégia de evolução
- Migrações idempotentes registradas em `MigrationLog`.
- Versionamento explícito para entidades de template/conteúdo clínico (`schemaVersion`).
- Backfill assíncrono para projeções derivadas após mudanças estruturais.

---

## 9) Checklist de implementação
- [x] Modelo centrado em `Pericia`.
- [x] Multi-tenant com `tenantId` obrigatório.
- [x] Fonte primária separada de projeções.
- [x] Logs de auditoria para mudança de status e ações críticas.
- [x] Índices para consultas quentes (agenda, cobrança, CNJ).
- [x] Diretrizes de RBAC e lock concorrente.
