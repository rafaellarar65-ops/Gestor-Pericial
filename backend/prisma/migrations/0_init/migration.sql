-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'ASSISTANT', 'REVIEWER');

-- CreateEnum
CREATE TYPE "PericiaPaymentStatus" AS ENUM ('PENDENTE', 'PARCIAL', 'PAGO', 'ATRASADO');

-- CreateEnum
CREATE TYPE "FontePagamento" AS ENUM ('TJ', 'PARTE_AUTORA', 'PARTE_RE', 'SEGURADORA', 'OUTRO');

-- CreateEnum
CREATE TYPE "AgendaEventType" AS ENUM ('PERICIA', 'PRAZO', 'LAUDO', 'DESLOCAMENTO', 'BLOCO_TRABALHO', 'OUTRO');

-- CreateEnum
CREATE TYPE "AgendaTaskStatus" AS ENUM ('TODO', 'DOING', 'DONE', 'CANCELED');

-- CreateEnum
CREATE TYPE "TeleSlotStatus" AS ENUM ('AVAILABLE', 'BOOKED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "CnjSyncStatus" AS ENUM ('PENDING', 'SUCCESS', 'ERROR', 'RETRY');

-- CreateEnum
CREATE TYPE "FinancialDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "PaymentMatchStatus" AS ENUM ('MATCHED', 'UNMATCHED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "RuleTrigger" AS ENUM ('ON_STATUS_ENTER', 'ON_FIELD_SET', 'ON_FIN_EVENT_CREATED', 'CRON');

-- CreateEnum
CREATE TYPE "RuleAction" AS ENUM ('UPDATE_FIELD', 'CREATE_TASK', 'SEND_EMAIL', 'SEND_NOTIFICATION', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'WHATSAPP');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "cpf" TEXT,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "specialty" TEXT,
    "preferences" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cidade" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "uf" CHAR(2) NOT NULL,
    "ibgeCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "Cidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tribunal" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "sigla" TEXT NOT NULL,
    "esfera" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "Tribunal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vara" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "cidadeId" UUID NOT NULL,
    "tribunalId" UUID,
    "nome" TEXT NOT NULL,
    "codigo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "Vara_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipoPericia" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "TipoPericia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Modalidade" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "Modalidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Status" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "Status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Local" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "cidadeId" UUID,
    "nome" TEXT NOT NULL,
    "endereco" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "Local_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pericia" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "processoCNJ" TEXT NOT NULL,
    "processoCNJDigits" TEXT,
    "cidadeId" UUID,
    "varaId" UUID,
    "tipoPericiaId" UUID,
    "modalidadeId" UUID,
    "statusId" UUID,
    "localId" UUID,
    "juizNome" TEXT,
    "autorNome" TEXT,
    "reuNome" TEXT,
    "periciadoNome" TEXT,
    "periciadoCpf" TEXT,
    "periciadoNascimento" TIMESTAMP(3),
    "observacoes" TEXT,
    "extraObservation" TEXT,
    "esclarecimentos" JSONB,
    "checklist" JSONB,
    "anexosResumo" JSONB,
    "isUrgent" BOOLEAN NOT NULL DEFAULT false,
    "agendada" BOOLEAN NOT NULL DEFAULT false,
    "laudoEnviado" BOOLEAN NOT NULL DEFAULT false,
    "finalizada" BOOLEAN NOT NULL DEFAULT false,
    "pagamentoStatus" "PericiaPaymentStatus" NOT NULL DEFAULT 'PENDENTE',
    "honorariosPrevistosJG" DECIMAL(12,2),
    "honorariosPrevistosPartes" DECIMAL(12,2),
    "valorRecebidoTotal" DECIMAL(12,2),
    "dataNomeacao" TIMESTAMP(3),
    "dataAgendamento" TIMESTAMP(3),
    "horaAgendamento" TEXT,
    "dataRealizacao" TIMESTAMP(3),
    "dataEnvioLaudo" TIMESTAMP(3),
    "origemImportacao" TEXT,
    "dataUltimaMovimentacaoCnj" TIMESTAMP(3),
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "Pericia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lawyer" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "oab" TEXT,
    "ufOab" CHAR(2),
    "email" TEXT,
    "telefone" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "Lawyer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LawyerOnPericia" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "periciaId" UUID NOT NULL,
    "lawyerId" UUID NOT NULL,
    "roleInCase" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "LawyerOnPericia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaseDocument" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "periciaId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT,
    "categoria" TEXT,
    "storagePath" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "hashSha256" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "CaseDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreLaudo" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "periciaId" UUID NOT NULL,
    "sections" JSONB,
    "aiAnalysis" JSONB,
    "laudoV2" JSONB,
    "laudoRealtime" JSONB,
    "templateName" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lockedByUserId" UUID,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "PreLaudo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamPlan" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "periciaId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "ExamPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamPerformed" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "periciaId" UUID NOT NULL,
    "examPlanId" UUID,
    "status" "ExamStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "findings" JSONB,
    "transcript" JSONB,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "ExamPerformed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhysicalManeuver" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "summary" TEXT,
    "procedure" JSONB,
    "evidence" JSONB,
    "tags" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "PhysicalManeuver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeItem" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "content" JSONB,
    "source" TEXT,
    "tags" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "KnowledgeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgendaEvent" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "periciaId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "AgendaEventType" NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "AgendaEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgendaTask" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "periciaId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" "AgendaTaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" INTEGER NOT NULL DEFAULT 3,
    "completedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "AgendaTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recebimento" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "periciaId" UUID NOT NULL,
    "importBatchId" UUID,
    "payerId" UUID,
    "fontePagamento" "FontePagamento" NOT NULL,
    "dataRecebimento" TIMESTAMP(3) NOT NULL,
    "valorBruto" DECIMAL(12,2) NOT NULL,
    "valorLiquido" DECIMAL(12,2),
    "tarifa" DECIMAL(12,2),
    "desconto" DECIMAL(12,2),
    "descricao" TEXT,
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "Recebimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "referenceMonth" INTEGER,
    "referenceYear" INTEGER,
    "sourceFileName" TEXT,
    "sourceHash" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "matchedRecords" INTEGER NOT NULL DEFAULT 0,
    "unmatchedRecords" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnmatchedPayment" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "importBatchId" UUID,
    "rawData" JSONB NOT NULL,
    "amount" DECIMAL(12,2),
    "transactionDate" TIMESTAMP(3),
    "payerName" TEXT,
    "matchStatus" "PaymentMatchStatus" NOT NULL DEFAULT 'UNMATCHED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "UnmatchedPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Despesa" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "periciaId" UUID,
    "categoria" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DECIMAL(12,2) NOT NULL,
    "dataCompetencia" TIMESTAMP(3) NOT NULL,
    "comprovantePath" TEXT,
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "Despesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "periciaId" UUID,
    "externalId" TEXT,
    "direction" "FinancialDirection" NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "document" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashLedgerItem" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "direction" "FinancialDirection" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "CashLedgerItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProfile" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "legalName" TEXT NOT NULL,
    "document" TEXT,
    "pixKey" TEXT,
    "bankName" TEXT,
    "branch" TEXT,
    "accountNumber" TEXT,
    "accountType" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "PaymentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payer" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "tipo" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "Payer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmartRule" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "trigger" "RuleTrigger" NOT NULL,
    "conditionJson" JSONB NOT NULL,
    "actionJson" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "SmartRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" "RuleTrigger" NOT NULL,
    "action" "RuleAction" NOT NULL,
    "conditionJson" JSONB,
    "configJson" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogStatus" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "periciaId" UUID NOT NULL,
    "statusAnterior" TEXT,
    "statusNovo" TEXT NOT NULL,
    "motivo" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "LogStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payloadJson" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyUsage" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "usageDate" TIMESTAMP(3) NOT NULL,
    "metricKey" TEXT NOT NULL,
    "metricValue" INTEGER NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "DailyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailConfig" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "fromName" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "secure" BOOLEAN NOT NULL DEFAULT true,
    "encryptedCreds" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "EmailConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "bodyText" TEXT,
    "variables" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationSettings" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "encryptedKeys" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "IntegrationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationConfig" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "NotificationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeleSlot" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "periciaId" UUID,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "TeleSlotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "meetingUrl" TEXT,
    "accessCode" TEXT,
    "platform" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "TeleSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchedulingBatch" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "cidadeId" UUID,
    "dateRef" TIMESTAMP(3) NOT NULL,
    "criteriaJson" JSONB,
    "resultJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "SchedulingBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CnjSync" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "periciaId" UUID,
    "status" "CnjSyncStatus" NOT NULL DEFAULT 'PENDING',
    "lastSyncAt" TIMESTAMP(3),
    "nextSyncAt" TIMESTAMP(3),
    "retries" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "CnjSync_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_tenantId_role_idx" ON "User"("tenantId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "UserProfile_tenantId_fullName_idx" ON "UserProfile"("tenantId", "fullName");

-- CreateIndex
CREATE INDEX "Cidade_tenantId_nome_idx" ON "Cidade"("tenantId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "Cidade_tenantId_nome_uf_key" ON "Cidade"("tenantId", "nome", "uf");

-- CreateIndex
CREATE UNIQUE INDEX "Tribunal_tenantId_sigla_key" ON "Tribunal"("tenantId", "sigla");

-- CreateIndex
CREATE INDEX "Vara_tenantId_cidadeId_idx" ON "Vara"("tenantId", "cidadeId");

-- CreateIndex
CREATE UNIQUE INDEX "TipoPericia_tenantId_codigo_key" ON "TipoPericia"("tenantId", "codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Modalidade_tenantId_codigo_key" ON "Modalidade"("tenantId", "codigo");

-- CreateIndex
CREATE INDEX "Status_tenantId_ordem_idx" ON "Status"("tenantId", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "Status_tenantId_codigo_key" ON "Status"("tenantId", "codigo");

-- CreateIndex
CREATE INDEX "Local_tenantId_cidadeId_idx" ON "Local"("tenantId", "cidadeId");

-- CreateIndex
CREATE INDEX "Pericia_tenantId_processoCNJ_idx" ON "Pericia"("tenantId", "processoCNJ");

-- CreateIndex
CREATE INDEX "Pericia_tenantId_cidadeId_idx" ON "Pericia"("tenantId", "cidadeId");

-- CreateIndex
CREATE INDEX "Pericia_tenantId_statusId_idx" ON "Pericia"("tenantId", "statusId");

-- CreateIndex
CREATE INDEX "Pericia_tenantId_dataNomeacao_idx" ON "Pericia"("tenantId", "dataNomeacao");

-- CreateIndex
CREATE INDEX "Pericia_tenantId_dataAgendamento_idx" ON "Pericia"("tenantId", "dataAgendamento");

-- CreateIndex
CREATE UNIQUE INDEX "Pericia_tenantId_processoCNJ_key" ON "Pericia"("tenantId", "processoCNJ");

-- CreateIndex
CREATE INDEX "Lawyer_tenantId_nome_idx" ON "Lawyer"("tenantId", "nome");

-- CreateIndex
CREATE INDEX "LawyerOnPericia_tenantId_lawyerId_idx" ON "LawyerOnPericia"("tenantId", "lawyerId");

-- CreateIndex
CREATE UNIQUE INDEX "LawyerOnPericia_tenantId_periciaId_lawyerId_key" ON "LawyerOnPericia"("tenantId", "periciaId", "lawyerId");

-- CreateIndex
CREATE INDEX "CaseDocument_tenantId_periciaId_idx" ON "CaseDocument"("tenantId", "periciaId");

-- CreateIndex
CREATE UNIQUE INDEX "PreLaudo_periciaId_key" ON "PreLaudo"("periciaId");

-- CreateIndex
CREATE INDEX "PreLaudo_tenantId_periciaId_idx" ON "PreLaudo"("tenantId", "periciaId");

-- CreateIndex
CREATE INDEX "ExamPlan_tenantId_periciaId_idx" ON "ExamPlan"("tenantId", "periciaId");

-- CreateIndex
CREATE INDEX "ExamPerformed_tenantId_periciaId_idx" ON "ExamPerformed"("tenantId", "periciaId");

-- CreateIndex
CREATE INDEX "PhysicalManeuver_tenantId_name_idx" ON "PhysicalManeuver"("tenantId", "name");

-- CreateIndex
CREATE INDEX "KnowledgeItem_tenantId_title_idx" ON "KnowledgeItem"("tenantId", "title");

-- CreateIndex
CREATE INDEX "AgendaEvent_tenantId_startAt_idx" ON "AgendaEvent"("tenantId", "startAt");

-- CreateIndex
CREATE INDEX "AgendaEvent_tenantId_periciaId_startAt_idx" ON "AgendaEvent"("tenantId", "periciaId", "startAt");

-- CreateIndex
CREATE INDEX "AgendaTask_tenantId_dueAt_status_idx" ON "AgendaTask"("tenantId", "dueAt", "status");

-- CreateIndex
CREATE INDEX "Recebimento_tenantId_periciaId_dataRecebimento_idx" ON "Recebimento"("tenantId", "periciaId", "dataRecebimento");

-- CreateIndex
CREATE INDEX "ImportBatch_tenantId_importedAt_idx" ON "ImportBatch"("tenantId", "importedAt");

-- CreateIndex
CREATE INDEX "UnmatchedPayment_tenantId_matchStatus_transactionDate_idx" ON "UnmatchedPayment"("tenantId", "matchStatus", "transactionDate");

-- CreateIndex
CREATE INDEX "Despesa_tenantId_dataCompetencia_idx" ON "Despesa"("tenantId", "dataCompetencia");

-- CreateIndex
CREATE INDEX "BankTransaction_tenantId_transactionDate_direction_idx" ON "BankTransaction"("tenantId", "transactionDate", "direction");

-- CreateIndex
CREATE INDEX "CashLedgerItem_tenantId_occurredAt_idx" ON "CashLedgerItem"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "PaymentProfile_tenantId_legalName_idx" ON "PaymentProfile"("tenantId", "legalName");

-- CreateIndex
CREATE INDEX "Payer_tenantId_nome_idx" ON "Payer"("tenantId", "nome");

-- CreateIndex
CREATE INDEX "SmartRule_tenantId_trigger_isActive_idx" ON "SmartRule"("tenantId", "trigger", "isActive");

-- CreateIndex
CREATE INDEX "AutomationRule_tenantId_isActive_trigger_idx" ON "AutomationRule"("tenantId", "isActive", "trigger");

-- CreateIndex
CREATE INDEX "LogStatus_tenantId_periciaId_createdAt_idx" ON "LogStatus"("tenantId", "periciaId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_tenantId_entityType_entityId_createdAt_idx" ON "ActivityLog"("tenantId", "entityType", "entityId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyUsage_tenantId_usageDate_metricKey_key" ON "DailyUsage"("tenantId", "usageDate", "metricKey");

-- CreateIndex
CREATE UNIQUE INDEX "EmailTemplate_tenantId_key_key" ON "EmailTemplate"("tenantId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationSettings_tenantId_provider_key" ON "IntegrationSettings"("tenantId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationConfig_tenantId_channel_key" ON "NotificationConfig"("tenantId", "channel");

-- CreateIndex
CREATE INDEX "TeleSlot_tenantId_startAt_status_idx" ON "TeleSlot"("tenantId", "startAt", "status");

-- CreateIndex
CREATE INDEX "SchedulingBatch_tenantId_dateRef_idx" ON "SchedulingBatch"("tenantId", "dateRef");

-- CreateIndex
CREATE INDEX "CnjSync_tenantId_status_nextSyncAt_idx" ON "CnjSync"("tenantId", "status", "nextSyncAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cidade" ADD CONSTRAINT "Cidade_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tribunal" ADD CONSTRAINT "Tribunal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vara" ADD CONSTRAINT "Vara_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vara" ADD CONSTRAINT "Vara_cidadeId_fkey" FOREIGN KEY ("cidadeId") REFERENCES "Cidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vara" ADD CONSTRAINT "Vara_tribunalId_fkey" FOREIGN KEY ("tribunalId") REFERENCES "Tribunal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TipoPericia" ADD CONSTRAINT "TipoPericia_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Modalidade" ADD CONSTRAINT "Modalidade_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Status" ADD CONSTRAINT "Status_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Local" ADD CONSTRAINT "Local_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Local" ADD CONSTRAINT "Local_cidadeId_fkey" FOREIGN KEY ("cidadeId") REFERENCES "Cidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pericia" ADD CONSTRAINT "Pericia_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pericia" ADD CONSTRAINT "Pericia_cidadeId_fkey" FOREIGN KEY ("cidadeId") REFERENCES "Cidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pericia" ADD CONSTRAINT "Pericia_varaId_fkey" FOREIGN KEY ("varaId") REFERENCES "Vara"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pericia" ADD CONSTRAINT "Pericia_tipoPericiaId_fkey" FOREIGN KEY ("tipoPericiaId") REFERENCES "TipoPericia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pericia" ADD CONSTRAINT "Pericia_modalidadeId_fkey" FOREIGN KEY ("modalidadeId") REFERENCES "Modalidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pericia" ADD CONSTRAINT "Pericia_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Status"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pericia" ADD CONSTRAINT "Pericia_localId_fkey" FOREIGN KEY ("localId") REFERENCES "Local"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lawyer" ADD CONSTRAINT "Lawyer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawyerOnPericia" ADD CONSTRAINT "LawyerOnPericia_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawyerOnPericia" ADD CONSTRAINT "LawyerOnPericia_periciaId_fkey" FOREIGN KEY ("periciaId") REFERENCES "Pericia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawyerOnPericia" ADD CONSTRAINT "LawyerOnPericia_lawyerId_fkey" FOREIGN KEY ("lawyerId") REFERENCES "Lawyer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDocument" ADD CONSTRAINT "CaseDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaseDocument" ADD CONSTRAINT "CaseDocument_periciaId_fkey" FOREIGN KEY ("periciaId") REFERENCES "Pericia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreLaudo" ADD CONSTRAINT "PreLaudo_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreLaudo" ADD CONSTRAINT "PreLaudo_periciaId_fkey" FOREIGN KEY ("periciaId") REFERENCES "Pericia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreLaudo" ADD CONSTRAINT "PreLaudo_lockedByUserId_fkey" FOREIGN KEY ("lockedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamPlan" ADD CONSTRAINT "ExamPlan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamPlan" ADD CONSTRAINT "ExamPlan_periciaId_fkey" FOREIGN KEY ("periciaId") REFERENCES "Pericia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamPerformed" ADD CONSTRAINT "ExamPerformed_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamPerformed" ADD CONSTRAINT "ExamPerformed_periciaId_fkey" FOREIGN KEY ("periciaId") REFERENCES "Pericia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamPerformed" ADD CONSTRAINT "ExamPerformed_examPlanId_fkey" FOREIGN KEY ("examPlanId") REFERENCES "ExamPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PhysicalManeuver" ADD CONSTRAINT "PhysicalManeuver_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeItem" ADD CONSTRAINT "KnowledgeItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaEvent" ADD CONSTRAINT "AgendaEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaEvent" ADD CONSTRAINT "AgendaEvent_periciaId_fkey" FOREIGN KEY ("periciaId") REFERENCES "Pericia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaTask" ADD CONSTRAINT "AgendaTask_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgendaTask" ADD CONSTRAINT "AgendaTask_periciaId_fkey" FOREIGN KEY ("periciaId") REFERENCES "Pericia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recebimento" ADD CONSTRAINT "Recebimento_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recebimento" ADD CONSTRAINT "Recebimento_periciaId_fkey" FOREIGN KEY ("periciaId") REFERENCES "Pericia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recebimento" ADD CONSTRAINT "Recebimento_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recebimento" ADD CONSTRAINT "Recebimento_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "Payer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportBatch" ADD CONSTRAINT "ImportBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnmatchedPayment" ADD CONSTRAINT "UnmatchedPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnmatchedPayment" ADD CONSTRAINT "UnmatchedPayment_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Despesa" ADD CONSTRAINT "Despesa_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Despesa" ADD CONSTRAINT "Despesa_periciaId_fkey" FOREIGN KEY ("periciaId") REFERENCES "Pericia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_periciaId_fkey" FOREIGN KEY ("periciaId") REFERENCES "Pericia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashLedgerItem" ADD CONSTRAINT "CashLedgerItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentProfile" ADD CONSTRAINT "PaymentProfile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payer" ADD CONSTRAINT "Payer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmartRule" ADD CONSTRAINT "SmartRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogStatus" ADD CONSTRAINT "LogStatus_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogStatus" ADD CONSTRAINT "LogStatus_periciaId_fkey" FOREIGN KEY ("periciaId") REFERENCES "Pericia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyUsage" ADD CONSTRAINT "DailyUsage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailConfig" ADD CONSTRAINT "EmailConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegrationSettings" ADD CONSTRAINT "IntegrationSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationConfig" ADD CONSTRAINT "NotificationConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeleSlot" ADD CONSTRAINT "TeleSlot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeleSlot" ADD CONSTRAINT "TeleSlot_periciaId_fkey" FOREIGN KEY ("periciaId") REFERENCES "Pericia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulingBatch" ADD CONSTRAINT "SchedulingBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchedulingBatch" ADD CONSTRAINT "SchedulingBatch_cidadeId_fkey" FOREIGN KEY ("cidadeId") REFERENCES "Cidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CnjSync" ADD CONSTRAINT "CnjSync_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CnjSync" ADD CONSTRAINT "CnjSync_periciaId_fkey" FOREIGN KEY ("periciaId") REFERENCES "Pericia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

