-- Initial SQL migration for Pericias Manager Pro
-- PostgreSQL 15+ / Supabase compatible

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================
-- Enums
-- =========================
DO $$ BEGIN
  CREATE TYPE public."UserRole" AS ENUM ('ADMIN','ASSISTANT','REVIEWER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public."PericiaPaymentStatus" AS ENUM ('PENDENTE','PARCIAL','PAGO','ATRASADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public."FontePagamento" AS ENUM ('TJ','PARTE_AUTORA','PARTE_RE','SEGURADORA','OUTRO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public."AgendaEventType" AS ENUM ('PERICIA','PRAZO','LAUDO','DESLOCAMENTO','BLOCO_TRABALHO','OUTRO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public."AgendaTaskStatus" AS ENUM ('TODO','DOING','DONE','CANCELED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public."TeleSlotStatus" AS ENUM ('AVAILABLE','BOOKED','BLOCKED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public."CnjSyncStatus" AS ENUM ('PENDING','SUCCESS','ERROR','RETRY');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public."FinancialDirection" AS ENUM ('IN','OUT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public."PaymentMatchStatus" AS ENUM ('MATCHED','UNMATCHED','PARTIAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public."RuleTrigger" AS ENUM ('ON_STATUS_ENTER','ON_FIELD_SET','ON_FIN_EVENT_CREATED','CRON');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public."RuleAction" AS ENUM ('UPDATE_FIELD','CREATE_TASK','SEND_EMAIL','SEND_NOTIFICATION','WEBHOOK');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public."ExamStatus" AS ENUM ('NOT_STARTED','IN_PROGRESS','DONE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public."NotificationChannel" AS ENUM ('EMAIL','SMS','PUSH','WHATSAPP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =========================
-- Base tables
-- =========================
CREATE TABLE IF NOT EXISTS public."Tenant" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."User" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  "passwordHash" text,
  role public."UserRole" NOT NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "lastLoginAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."UserProfile" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  "userId" uuid NOT NULL UNIQUE REFERENCES public."User"(id) ON DELETE CASCADE,
  "fullName" text NOT NULL,
  cpf text,
  phone text,
  "avatarUrl" text,
  specialty text,
  preferences jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."Cidade" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  nome text NOT NULL,
  uf char(2) NOT NULL,
  "ibgeCode" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid,
  CONSTRAINT cidade_tenant_nome_uf_uk UNIQUE ("tenantId", nome, uf)
);

CREATE TABLE IF NOT EXISTS public."Tribunal" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  nome text NOT NULL,
  sigla text NOT NULL,
  esfera text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid,
  CONSTRAINT tribunal_tenant_sigla_uk UNIQUE ("tenantId", sigla)
);

CREATE TABLE IF NOT EXISTS public."Vara" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  "cidadeId" uuid NOT NULL REFERENCES public."Cidade"(id) ON DELETE RESTRICT,
  "tribunalId" uuid REFERENCES public."Tribunal"(id) ON DELETE SET NULL,
  nome text NOT NULL,
  codigo text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."TipoPericia" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid,
  CONSTRAINT tipo_pericia_tenant_codigo_uk UNIQUE ("tenantId", codigo)
);

CREATE TABLE IF NOT EXISTS public."Modalidade" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid,
  CONSTRAINT modalidade_tenant_codigo_uk UNIQUE ("tenantId", codigo)
);

CREATE TABLE IF NOT EXISTS public."Status" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  codigo text NOT NULL,
  nome text NOT NULL,
  cor text,
  ordem integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid,
  CONSTRAINT status_tenant_codigo_uk UNIQUE ("tenantId", codigo)
);

CREATE TABLE IF NOT EXISTS public."Local" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  "cidadeId" uuid REFERENCES public."Cidade"(id) ON DELETE SET NULL,
  nome text NOT NULL,
  endereco text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  observacoes text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."Pericia" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  "processoCNJ" text NOT NULL,
  "processoCNJDigits" text,
  "cidadeId" uuid REFERENCES public."Cidade"(id) ON DELETE SET NULL,
  "varaId" uuid REFERENCES public."Vara"(id) ON DELETE SET NULL,
  "tipoPericiaId" uuid REFERENCES public."TipoPericia"(id) ON DELETE SET NULL,
  "modalidadeId" uuid REFERENCES public."Modalidade"(id) ON DELETE SET NULL,
  "statusId" uuid REFERENCES public."Status"(id) ON DELETE SET NULL,
  "localId" uuid REFERENCES public."Local"(id) ON DELETE SET NULL,
  "juizNome" text,
  "autorNome" text,
  "reuNome" text,
  "periciadoNome" text,
  "periciadoCpf" text,
  "periciadoNascimento" timestamptz,
  observacoes text,
  "extraObservation" text,
  esclarecimentos jsonb,
  checklist jsonb,
  "anexosResumo" jsonb,
  "isUrgent" boolean NOT NULL DEFAULT false,
  agendada boolean NOT NULL DEFAULT false,
  "laudoEnviado" boolean NOT NULL DEFAULT false,
  finalizada boolean NOT NULL DEFAULT false,
  "pagamentoStatus" public."PericiaPaymentStatus" NOT NULL DEFAULT 'PENDENTE',
  "honorariosPrevistosJG" numeric(12,2),
  "honorariosPrevistosPartes" numeric(12,2),
  "valorRecebidoTotal" numeric(12,2),
  "dataNomeacao" timestamptz,
  "dataAgendamento" timestamptz,
  "horaAgendamento" text,
  "dataRealizacao" timestamptz,
  "dataEnvioLaudo" timestamptz,
  "origemImportacao" text,
  "dataUltimaMovimentacaoCnj" timestamptz,
  metadata jsonb,
  "deletedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid,
  CONSTRAINT pericia_tenant_processo_uk UNIQUE ("tenantId", "processoCNJ")
);

CREATE TABLE IF NOT EXISTS public."Lawyer" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  nome text NOT NULL,
  oab text,
  "ufOab" char(2),
  email text,
  telefone text,
  observacoes text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."LawyerOnPericia" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  "periciaId" uuid NOT NULL REFERENCES public."Pericia"(id) ON DELETE CASCADE,
  "lawyerId" uuid NOT NULL REFERENCES public."Lawyer"(id) ON DELETE CASCADE,
  "roleInCase" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid,
  CONSTRAINT lawyer_on_pericia_uk UNIQUE ("tenantId", "periciaId", "lawyerId")
);

CREATE TABLE IF NOT EXISTS public."CaseDocument" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  "periciaId" uuid NOT NULL REFERENCES public."Pericia"(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text,
  categoria text,
  "storagePath" text,
  "mimeType" text,
  "fileSize" integer,
  "hashSha256" text,
  metadata jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."PreLaudo" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  "periciaId" uuid NOT NULL UNIQUE REFERENCES public."Pericia"(id) ON DELETE CASCADE,
  sections jsonb,
  "aiAnalysis" jsonb,
  "laudoV2" jsonb,
  "laudoRealtime" jsonb,
  "templateName" text,
  version integer NOT NULL DEFAULT 1,
  "lockedByUserId" uuid REFERENCES public."User"(id) ON DELETE SET NULL,
  "lockedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."ExamPlan" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  "periciaId" uuid NOT NULL REFERENCES public."Pericia"(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  "orderIndex" integer NOT NULL DEFAULT 0,
  payload jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."ExamPerformed" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  "periciaId" uuid NOT NULL REFERENCES public."Pericia"(id) ON DELETE CASCADE,
  "examPlanId" uuid REFERENCES public."ExamPlan"(id) ON DELETE SET NULL,
  status public."ExamStatus" NOT NULL DEFAULT 'NOT_STARTED',
  findings jsonb,
  transcript jsonb,
  "startedAt" timestamptz,
  "finishedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."PhysicalManeuver" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  summary text,
  procedure jsonb,
  evidence jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."KnowledgeItem" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  title text NOT NULL,
  category text,
  content jsonb,
  source text,
  tags text[] NOT NULL DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."AgendaEvent" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  "periciaId" uuid REFERENCES public."Pericia"(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  type public."AgendaEventType" NOT NULL,
  "startAt" timestamptz NOT NULL,
  "endAt" timestamptz,
  "allDay" boolean NOT NULL DEFAULT false,
  location text,
  metadata jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."AgendaTask" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  "periciaId" uuid REFERENCES public."Pericia"(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  "dueAt" timestamptz,
  status public."AgendaTaskStatus" NOT NULL DEFAULT 'TODO',
  priority integer NOT NULL DEFAULT 3,
  "completedAt" timestamptz,
  metadata jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."ImportBatch" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  "referenceMonth" integer,
  "referenceYear" integer,
  "sourceFileName" text,
  "sourceHash" text,
  "importedAt" timestamptz NOT NULL DEFAULT now(),
  "totalRecords" integer NOT NULL DEFAULT 0,
  "matchedRecords" integer NOT NULL DEFAULT 0,
  "unmatchedRecords" integer NOT NULL DEFAULT 0,
  status text,
  metadata jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."Payer" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  nome text NOT NULL,
  documento text,
  tipo text,
  email text,
  phone text,
  metadata jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."Recebimento" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  "periciaId" uuid NOT NULL REFERENCES public."Pericia"(id) ON DELETE RESTRICT,
  "importBatchId" uuid REFERENCES public."ImportBatch"(id) ON DELETE SET NULL,
  "payerId" uuid REFERENCES public."Payer"(id) ON DELETE SET NULL,
  "fontePagamento" public."FontePagamento" NOT NULL,
  "dataRecebimento" timestamptz NOT NULL,
  "valorBruto" numeric(12,2) NOT NULL,
  "valorLiquido" numeric(12,2),
  tarifa numeric(12,2),
  desconto numeric(12,2),
  descricao text,
  metadata jsonb,
  "deletedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."UnmatchedPayment" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  "importBatchId" uuid REFERENCES public."ImportBatch"(id) ON DELETE SET NULL,
  "rawData" jsonb NOT NULL,
  amount numeric(12,2),
  "transactionDate" timestamptz,
  "payerName" text,
  "matchStatus" public."PaymentMatchStatus" NOT NULL DEFAULT 'UNMATCHED',
  notes text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."Despesa" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  "periciaId" uuid REFERENCES public."Pericia"(id) ON DELETE SET NULL,
  categoria text NOT NULL,
  descricao text NOT NULL,
  valor numeric(12,2) NOT NULL,
  "dataCompetencia" timestamptz NOT NULL,
  "comprovantePath" text,
  metadata jsonb,
  "deletedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."BankTransaction" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  "periciaId" uuid REFERENCES public."Pericia"(id) ON DELETE SET NULL,
  "externalId" text,
  direction public."FinancialDirection" NOT NULL,
  "transactionDate" timestamptz NOT NULL,
  amount numeric(12,2) NOT NULL,
  description text,
  document text,
  "rawPayload" jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."CashLedgerItem" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  direction public."FinancialDirection" NOT NULL,
  amount numeric(12,2) NOT NULL,
  "occurredAt" timestamptz NOT NULL,
  "referenceType" text,
  "referenceId" text,
  note text,
  metadata jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."PaymentProfile" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  "legalName" text NOT NULL,
  document text,
  "pixKey" text,
  "bankName" text,
  branch text,
  "accountNumber" text,
  "accountType" text,
  metadata jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."SmartRule" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  trigger public."RuleTrigger" NOT NULL,
  "conditionJson" jsonb NOT NULL,
  "actionJson" jsonb NOT NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."AutomationRule" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  name text NOT NULL,
  trigger public."RuleTrigger" NOT NULL,
  action public."RuleAction" NOT NULL,
  "conditionJson" jsonb,
  "configJson" jsonb NOT NULL,
  "isActive" boolean NOT NULL DEFAULT true,
  "lastRunAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."LogStatus" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  "periciaId" uuid NOT NULL REFERENCES public."Pericia"(id) ON DELETE CASCADE,
  "statusAnterior" text,
  "statusNovo" text NOT NULL,
  motivo text,
  metadata jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."ActivityLog" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  "entityType" text NOT NULL,
  "entityId" text NOT NULL,
  action text NOT NULL,
  "payloadJson" jsonb,
  "ipAddress" text,
  "userAgent" text,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."DailyUsage" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  "usageDate" timestamptz NOT NULL,
  "metricKey" text NOT NULL,
  "metricValue" integer NOT NULL,
  context jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid,
  CONSTRAINT daily_usage_uk UNIQUE ("tenantId", "usageDate", "metricKey")
);

CREATE TABLE IF NOT EXISTS public."EmailConfig" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  provider text NOT NULL,
  "fromEmail" text NOT NULL,
  "fromName" text,
  "smtpHost" text,
  "smtpPort" integer,
  secure boolean NOT NULL DEFAULT true,
  "encryptedCreds" text,
  active boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."EmailTemplate" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  key text NOT NULL,
  subject text NOT NULL,
  "bodyHtml" text NOT NULL,
  "bodyText" text,
  variables jsonb,
  active boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid,
  CONSTRAINT email_template_tenant_key_uk UNIQUE ("tenantId", key)
);

CREATE TABLE IF NOT EXISTS public."IntegrationSettings" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  provider text NOT NULL,
  config jsonb NOT NULL,
  "encryptedKeys" text,
  active boolean NOT NULL DEFAULT true,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid,
  CONSTRAINT integration_settings_tenant_provider_uk UNIQUE ("tenantId", provider)
);

CREATE TABLE IF NOT EXISTS public."NotificationConfig" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  channel public."NotificationChannel" NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  config jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid,
  CONSTRAINT notification_config_tenant_channel_uk UNIQUE ("tenantId", channel)
);

CREATE TABLE IF NOT EXISTS public."TeleSlot" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  "periciaId" uuid REFERENCES public."Pericia"(id) ON DELETE SET NULL,
  "startAt" timestamptz NOT NULL,
  "endAt" timestamptz NOT NULL,
  status public."TeleSlotStatus" NOT NULL DEFAULT 'AVAILABLE',
  "meetingUrl" text,
  "accessCode" text,
  platform text,
  metadata jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."SchedulingBatch" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  "cidadeId" uuid REFERENCES public."Cidade"(id) ON DELETE SET NULL,
  "dateRef" timestamptz NOT NULL,
  "criteriaJson" jsonb,
  "resultJson" jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

CREATE TABLE IF NOT EXISTS public."CnjSync" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenantId" uuid NOT NULL REFERENCES public."Tenant"(id) ON DELETE CASCADE,
  "periciaId" uuid REFERENCES public."Pericia"(id) ON DELETE SET NULL,
  status public."CnjSyncStatus" NOT NULL DEFAULT 'PENDING',
  "lastSyncAt" timestamptz,
  "nextSyncAt" timestamptz,
  retries integer NOT NULL DEFAULT 0,
  message text,
  payload jsonb,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now(),
  "createdBy" uuid,
  "updatedBy" uuid
);

-- =========================
-- Core indexes required by spec
-- =========================
CREATE INDEX IF NOT EXISTS idx_user_tenant_role ON public."User" ("tenantId", role);
CREATE INDEX IF NOT EXISTS idx_user_profile_tenant_full_name ON public."UserProfile" ("tenantId", "fullName");
CREATE INDEX IF NOT EXISTS idx_cidade_tenant_nome ON public."Cidade" ("tenantId", nome);
CREATE INDEX IF NOT EXISTS idx_vara_tenant_cidade ON public."Vara" ("tenantId", "cidadeId");
CREATE INDEX IF NOT EXISTS idx_status_tenant_ordem ON public."Status" ("tenantId", ordem);
CREATE INDEX IF NOT EXISTS idx_local_tenant_cidade ON public."Local" ("tenantId", "cidadeId");
CREATE INDEX IF NOT EXISTS idx_pericia_tenant_processo ON public."Pericia" ("tenantId", "processoCNJ");
CREATE INDEX IF NOT EXISTS idx_pericia_tenant_cidade ON public."Pericia" ("tenantId", "cidadeId");
CREATE INDEX IF NOT EXISTS idx_pericia_tenant_status ON public."Pericia" ("tenantId", "statusId");
CREATE INDEX IF NOT EXISTS idx_pericia_tenant_data_nomeacao ON public."Pericia" ("tenantId", "dataNomeacao");
CREATE INDEX IF NOT EXISTS idx_pericia_tenant_data_agendamento ON public."Pericia" ("tenantId", "dataAgendamento");
CREATE INDEX IF NOT EXISTS idx_lawyer_tenant_nome ON public."Lawyer" ("tenantId", nome);
CREATE INDEX IF NOT EXISTS idx_lawyer_on_pericia_tenant_lawyer ON public."LawyerOnPericia" ("tenantId", "lawyerId");
CREATE INDEX IF NOT EXISTS idx_case_document_tenant_pericia ON public."CaseDocument" ("tenantId", "periciaId");
CREATE INDEX IF NOT EXISTS idx_pre_laudo_tenant_pericia ON public."PreLaudo" ("tenantId", "periciaId");
CREATE INDEX IF NOT EXISTS idx_exam_plan_tenant_pericia ON public."ExamPlan" ("tenantId", "periciaId");
CREATE INDEX IF NOT EXISTS idx_exam_performed_tenant_pericia ON public."ExamPerformed" ("tenantId", "periciaId");
CREATE INDEX IF NOT EXISTS idx_physical_maneuver_tenant_name ON public."PhysicalManeuver" ("tenantId", name);
CREATE INDEX IF NOT EXISTS idx_knowledge_item_tenant_title ON public."KnowledgeItem" ("tenantId", title);
CREATE INDEX IF NOT EXISTS idx_agenda_event_tenant_start ON public."AgendaEvent" ("tenantId", "startAt");
CREATE INDEX IF NOT EXISTS idx_agenda_event_tenant_pericia_start ON public."AgendaEvent" ("tenantId", "periciaId", "startAt");
CREATE INDEX IF NOT EXISTS idx_agenda_task_tenant_due_status ON public."AgendaTask" ("tenantId", "dueAt", status);
CREATE INDEX IF NOT EXISTS idx_recebimento_tenant_pericia_data ON public."Recebimento" ("tenantId", "periciaId", "dataRecebimento");
CREATE INDEX IF NOT EXISTS idx_import_batch_tenant_imported ON public."ImportBatch" ("tenantId", "importedAt");
CREATE INDEX IF NOT EXISTS idx_unmatched_tenant_match_date ON public."UnmatchedPayment" ("tenantId", "matchStatus", "transactionDate");
CREATE INDEX IF NOT EXISTS idx_despesa_tenant_data ON public."Despesa" ("tenantId", "dataCompetencia");
CREATE INDEX IF NOT EXISTS idx_bank_tx_tenant_date_direction ON public."BankTransaction" ("tenantId", "transactionDate", direction);
CREATE INDEX IF NOT EXISTS idx_cash_ledger_tenant_occurred ON public."CashLedgerItem" ("tenantId", "occurredAt");
CREATE INDEX IF NOT EXISTS idx_payment_profile_tenant_name ON public."PaymentProfile" ("tenantId", "legalName");
CREATE INDEX IF NOT EXISTS idx_payer_tenant_nome ON public."Payer" ("tenantId", nome);
CREATE INDEX IF NOT EXISTS idx_smart_rule_tenant_trigger_active ON public."SmartRule" ("tenantId", trigger, "isActive");
CREATE INDEX IF NOT EXISTS idx_automation_rule_tenant_active_trigger ON public."AutomationRule" ("tenantId", "isActive", trigger);
CREATE INDEX IF NOT EXISTS idx_log_status_tenant_pericia_created ON public."LogStatus" ("tenantId", "periciaId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_activity_log_tenant_entity_created ON public."ActivityLog" ("tenantId", "entityType", "entityId", "createdAt");
CREATE INDEX IF NOT EXISTS idx_tele_slot_tenant_start_status ON public."TeleSlot" ("tenantId", "startAt", status);
CREATE INDEX IF NOT EXISTS idx_scheduling_batch_tenant_date ON public."SchedulingBatch" ("tenantId", "dateRef");
CREATE INDEX IF NOT EXISTS idx_cnj_sync_tenant_status_next ON public."CnjSync" ("tenantId", status, "nextSyncAt");

-- =========================
-- CHECK constraints for monetary fields (must be non-negative)
-- =========================
ALTER TABLE public."Pericia"
  ADD CONSTRAINT chk_pericia_honorarios_jg_positive
    CHECK ("honorariosPrevistosJG" IS NULL OR "honorariosPrevistosJG" >= 0),
  ADD CONSTRAINT chk_pericia_honorarios_partes_positive
    CHECK ("honorariosPrevistosPartes" IS NULL OR "honorariosPrevistosPartes" >= 0),
  ADD CONSTRAINT chk_pericia_valor_recebido_positive
    CHECK ("valorRecebidoTotal" IS NULL OR "valorRecebidoTotal" >= 0);

ALTER TABLE public."Recebimento"
  ADD CONSTRAINT chk_recebimento_valor_bruto_positive
    CHECK ("valorBruto" >= 0),
  ADD CONSTRAINT chk_recebimento_valor_liquido_positive
    CHECK ("valorLiquido" IS NULL OR "valorLiquido" >= 0),
  ADD CONSTRAINT chk_recebimento_tarifa_positive
    CHECK (tarifa IS NULL OR tarifa >= 0),
  ADD CONSTRAINT chk_recebimento_desconto_positive
    CHECK (desconto IS NULL OR desconto >= 0);

ALTER TABLE public."Despesa"
  ADD CONSTRAINT chk_despesa_valor_positive
    CHECK (valor >= 0);

ALTER TABLE public."BankTransaction"
  ADD CONSTRAINT chk_bank_tx_amount_positive
    CHECK (amount >= 0);

ALTER TABLE public."CashLedgerItem"
  ADD CONSTRAINT chk_cash_ledger_amount_positive
    CHECK (amount >= 0);

ALTER TABLE public."UnmatchedPayment"
  ADD CONSTRAINT chk_unmatched_amount_positive
    CHECK (amount IS NULL OR amount >= 0);
