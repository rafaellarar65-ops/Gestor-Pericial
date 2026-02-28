-- Campos de priorização/fila da teleperícia
ALTER TABLE "Pericia"
  ADD COLUMN IF NOT EXISTS "urgentCheckedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "telepericiaStatusChangedAt" TIMESTAMP(3);

-- Domínio de WhatsApp
CREATE TABLE IF NOT EXISTS "WhatsappAccount" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "wabaId" TEXT NOT NULL,
  "phoneNumberId" TEXT NOT NULL,
  "accessTokenEnc" TEXT NOT NULL,
  "webhookVerifyTokenEnc" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdBy" UUID,
  "updatedBy" UUID,
  CONSTRAINT "WhatsappAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WhatsappContact" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "phoneE164" TEXT NOT NULL,
  "consentStatus" TEXT,
  "consentSource" TEXT,
  "consentAt" TIMESTAMP(3),
  "lastInboundAt" TIMESTAMP(3),
  "phoneInvalid" BOOLEAN NOT NULL DEFAULT false,
  "flags" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdBy" UUID,
  "updatedBy" UUID,
  CONSTRAINT "WhatsappContact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WhatsappTemplate" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "category" TEXT,
  "metaTemplateName" TEXT,
  "variablesSchema" JSONB,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdBy" UUID,
  "updatedBy" UUID,
  CONSTRAINT "WhatsappTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WhatsappMessage" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "contactId" UUID,
  "periciaId" UUID,
  "appointmentId" TEXT,
  "direction" TEXT NOT NULL,
  "messageType" TEXT NOT NULL,
  "templateId" UUID,
  "payloadJson" JSONB,
  "providerMessageId" TEXT,
  "status" TEXT NOT NULL,
  "erro" TEXT,
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdBy" UUID,
  "updatedBy" UUID,
  CONSTRAINT "WhatsappMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "whatsapp_jobs" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "periciaId" UUID,
  "appointmentId" TEXT,
  "jobType" "WhatsAppJobType" NOT NULL,
  "scheduledFor" TIMESTAMP(3),
  "status" "WhatsAppJobStatus" NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "idempotency_key" TEXT NOT NULL,
  "payloadJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdBy" UUID,
  "updatedBy" UUID,
  CONSTRAINT "whatsapp_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WhatsappUnlinkedInbound" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "contactId" UUID,
  "periciaId" UUID,
  "fromPhone" TEXT NOT NULL,
  "text" TEXT,
  "providerMessageId" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdBy" UUID,
  "updatedBy" UUID,
  CONSTRAINT "WhatsappUnlinkedInbound_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MessageTemplate" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "title" TEXT,
  "channel" "NotificationChannel" NOT NULL,
  "body" TEXT NOT NULL,
  "placeholders" JSONB,
  "metaMappings" JSONB,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdBy" UUID,
  "updatedBy" UUID,
  CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- Tele-fila e composição de slots
CREATE TABLE IF NOT EXISTS "TelepericiaSlot" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "capacity" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdBy" UUID,
  "updatedBy" UUID,
  CONSTRAINT "TelepericiaSlot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "TelepericiaSlotItem" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "slotId" UUID NOT NULL,
  "periciaId" UUID,
  "appointmentId" TEXT,
  "orderIndex" INTEGER NOT NULL,
  "startsAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdBy" UUID,
  "updatedBy" UUID,
  CONSTRAINT "TelepericiaSlotItem_pkey" PRIMARY KEY ("id")
);

-- Uniques e índices críticos
CREATE UNIQUE INDEX IF NOT EXISTS "WhatsappAccount_tenantId_wabaId_phoneNumberId_key" ON "WhatsappAccount"("tenantId", "wabaId", "phoneNumberId");
CREATE UNIQUE INDEX IF NOT EXISTS "WhatsappContact_tenantId_phoneE164_key" ON "WhatsappContact"("tenantId", "phoneE164");
CREATE UNIQUE INDEX IF NOT EXISTS "WhatsappTemplate_tenantId_name_language_key" ON "WhatsappTemplate"("tenantId", "name", "language");
CREATE UNIQUE INDEX IF NOT EXISTS "MessageTemplate_tenantId_name_channel_key" ON "MessageTemplate"("tenantId", "name", "channel");
CREATE UNIQUE INDEX IF NOT EXISTS "whatsapp_jobs_idempotency_key_key" ON "whatsapp_jobs"("idempotency_key");
CREATE UNIQUE INDEX IF NOT EXISTS "TelepericiaSlotItem_slotId_periciaId_key" ON "TelepericiaSlotItem"("slotId", "periciaId");
CREATE UNIQUE INDEX IF NOT EXISTS "TelepericiaSlotItem_slotId_appointmentId_key" ON "TelepericiaSlotItem"("slotId", "appointmentId");

CREATE INDEX IF NOT EXISTS "WhatsappMessage_providerMessageId_idx" ON "WhatsappMessage"("providerMessageId");
CREATE INDEX IF NOT EXISTS "WhatsappAccount_tenantId_status_idx" ON "WhatsappAccount"("tenantId", "status");
CREATE INDEX IF NOT EXISTS "WhatsappContact_tenantId_consentStatus_idx" ON "WhatsappContact"("tenantId", "consentStatus");
CREATE INDEX IF NOT EXISTS "WhatsappMessage_tenantId_contactId_createdAt_idx" ON "WhatsappMessage"("tenantId", "contactId", "createdAt");
CREATE INDEX IF NOT EXISTS "whatsapp_jobs_tenantId_status_scheduledFor_idx" ON "whatsapp_jobs"("tenantId", "status", "scheduledFor");
CREATE INDEX IF NOT EXISTS "WhatsappUnlinkedInbound_tenantId_fromPhone_receivedAt_idx" ON "WhatsappUnlinkedInbound"("tenantId", "fromPhone", "receivedAt");
CREATE INDEX IF NOT EXISTS "WhatsappUnlinkedInbound_providerMessageId_idx" ON "WhatsappUnlinkedInbound"("providerMessageId");
CREATE INDEX IF NOT EXISTS "MessageTemplate_tenantId_channel_active_idx" ON "MessageTemplate"("tenantId", "channel", "active");
CREATE INDEX IF NOT EXISTS "TelepericiaSlot_tenantId_startsAt_status_idx" ON "TelepericiaSlot"("tenantId", "startsAt", "status");
CREATE INDEX IF NOT EXISTS "TelepericiaSlotItem_tenantId_slotId_orderIndex_idx" ON "TelepericiaSlotItem"("tenantId", "slotId", "orderIndex");
CREATE INDEX IF NOT EXISTS "Pericia_tele_queue_order_idx" ON "Pericia"("tenantId", "isUrgent", "urgentCheckedAt", "telepericiaStatusChangedAt", "dataAgendamento", "createdAt");

-- Chaves estrangeiras
ALTER TABLE "WhatsappAccount"
  ADD CONSTRAINT "WhatsappAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WhatsappContact"
  ADD CONSTRAINT "WhatsappContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WhatsappTemplate"
  ADD CONSTRAINT "WhatsappTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WhatsappMessage"
  ADD CONSTRAINT "WhatsappMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "WhatsappMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "WhatsappContact"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "WhatsappMessage_periciaId_fkey" FOREIGN KEY ("periciaId") REFERENCES "Pericia"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "WhatsappMessage_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WhatsappTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "whatsapp_jobs"
  ADD CONSTRAINT "whatsapp_jobs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "whatsapp_jobs_periciaId_fkey" FOREIGN KEY ("periciaId") REFERENCES "Pericia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WhatsappUnlinkedInbound"
  ADD CONSTRAINT "WhatsappUnlinkedInbound_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "WhatsappUnlinkedInbound_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "WhatsappContact"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "WhatsappUnlinkedInbound_periciaId_fkey" FOREIGN KEY ("periciaId") REFERENCES "Pericia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MessageTemplate"
  ADD CONSTRAINT "MessageTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TelepericiaSlot"
  ADD CONSTRAINT "TelepericiaSlot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TelepericiaSlotItem"
  ADD CONSTRAINT "TelepericiaSlotItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "TelepericiaSlotItem_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "TelepericiaSlot"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "TelepericiaSlotItem_periciaId_fkey" FOREIGN KEY ("periciaId") REFERENCES "Pericia"("id") ON DELETE SET NULL ON UPDATE CASCADE;
