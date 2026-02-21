-- Advanced index strategy for Pericias Manager Pro
-- PostgreSQL 15+ / Supabase

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =========================================
-- PERICIA (workload principal)
-- =========================================
CREATE INDEX IF NOT EXISTS idx_pericia_tenant_status_agendamento
  ON public."Pericia" ("tenantId", "statusId", "dataAgendamento" DESC)
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_pericia_tenant_cidade_status_nomeacao
  ON public."Pericia" ("tenantId", "cidadeId", "statusId", "dataNomeacao" DESC)
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_pericia_tenant_pagamento_status
  ON public."Pericia" ("tenantId", "pagamentoStatus", "dataNomeacao" DESC)
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_pericia_tenant_urgent_open
  ON public."Pericia" ("tenantId", "isUrgent", "statusId", "dataAgendamento")
  WHERE "deletedAt" IS NULL
    AND "isUrgent" = true
    AND finalizada = false;

CREATE INDEX IF NOT EXISTS idx_pericia_tenant_realizacao
  ON public."Pericia" ("tenantId", "dataRealizacao" DESC)
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_pericia_tenant_processo_digits
  ON public."Pericia" ("tenantId", "processoCNJDigits");

CREATE INDEX IF NOT EXISTS idx_pericia_processo_trgm
  ON public."Pericia" USING GIN ("processoCNJ" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_pericia_autor_trgm
  ON public."Pericia" USING GIN ("autorNome" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_pericia_reu_trgm
  ON public."Pericia" USING GIN ("reuNome" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_pericia_periciado_trgm
  ON public."Pericia" USING GIN ("periciadoNome" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_pericia_esclarecimentos_gin
  ON public."Pericia" USING GIN (esclarecimentos jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_pericia_checklist_gin
  ON public."Pericia" USING GIN (checklist jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_pericia_metadata_gin
  ON public."Pericia" USING GIN (metadata jsonb_path_ops);

-- =========================================
-- PRE-LAUDO / DOCUMENTOS CLÍNICOS
-- =========================================
CREATE INDEX IF NOT EXISTS idx_prelaudo_tenant_updated
  ON public."PreLaudo" ("tenantId", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS idx_prelaudo_sections_gin
  ON public."PreLaudo" USING GIN (sections jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_prelaudo_ai_analysis_gin
  ON public."PreLaudo" USING GIN ("aiAnalysis" jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_prelaudo_laudo_v2_gin
  ON public."PreLaudo" USING GIN ("laudoV2" jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_exam_performed_findings_gin
  ON public."ExamPerformed" USING GIN (findings jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_exam_performed_tenant_status
  ON public."ExamPerformed" ("tenantId", status, "startedAt" DESC);

-- =========================================
-- AGENDA
-- =========================================
CREATE INDEX IF NOT EXISTS idx_agenda_event_tenant_window
  ON public."AgendaEvent" ("tenantId", "startAt", "endAt");

CREATE INDEX IF NOT EXISTS idx_agenda_event_tenant_type_start
  ON public."AgendaEvent" ("tenantId", type, "startAt");

CREATE INDEX IF NOT EXISTS idx_agenda_task_tenant_status_due
  ON public."AgendaTask" ("tenantId", status, "dueAt")
  WHERE "completedAt" IS NULL;

-- =========================================
-- FINANCEIRO
-- =========================================
CREATE INDEX IF NOT EXISTS idx_recebimento_tenant_data
  ON public."Recebimento" ("tenantId", "dataRecebimento" DESC)
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_recebimento_tenant_pericia_fonte
  ON public."Recebimento" ("tenantId", "periciaId", "fontePagamento", "dataRecebimento" DESC)
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_recebimento_tenant_valor
  ON public."Recebimento" ("tenantId", "valorBruto", "valorLiquido")
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_despesa_tenant_competencia_categoria
  ON public."Despesa" ("tenantId", "dataCompetencia" DESC, categoria)
  WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS idx_unmatched_tenant_status_date
  ON public."UnmatchedPayment" ("tenantId", "matchStatus", "transactionDate" DESC);

CREATE INDEX IF NOT EXISTS idx_bank_tx_tenant_direction_date
  ON public."BankTransaction" ("tenantId", direction, "transactionDate" DESC);

-- =========================================
-- AUDITORIA / AUTOMAÇÃO
-- =========================================
CREATE INDEX IF NOT EXISTS idx_log_status_tenant_created
  ON public."LogStatus" ("tenantId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_tenant_action_created
  ON public."ActivityLog" ("tenantId", action, "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_payload_gin
  ON public."ActivityLog" USING GIN ("payloadJson" jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_smart_rule_tenant_active_trigger
  ON public."SmartRule" ("tenantId", "isActive", trigger);

CREATE INDEX IF NOT EXISTS idx_automation_rule_tenant_active_trigger
  ON public."AutomationRule" ("tenantId", "isActive", trigger, "lastRunAt" DESC);

-- =========================================
-- COMUNICAÇÃO / CONFIG
-- =========================================
CREATE INDEX IF NOT EXISTS idx_email_template_subject_trgm
  ON public."EmailTemplate" USING GIN (subject gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_notification_config_tenant_enabled
  ON public."NotificationConfig" ("tenantId", enabled);

-- =========================================
-- CNJ / TELEPERÍCIA
-- =========================================
CREATE INDEX IF NOT EXISTS idx_cnj_sync_tenant_status_next
  ON public."CnjSync" ("tenantId", status, "nextSyncAt");

CREATE INDEX IF NOT EXISTS idx_cnj_sync_payload_gin
  ON public."CnjSync" USING GIN (payload jsonb_path_ops);

CREATE INDEX IF NOT EXISTS idx_tele_slot_tenant_status_start
  ON public."TeleSlot" ("tenantId", status, "startAt");
