-- Create enums
CREATE TYPE "CalendarSyncType" AS ENUM ('EVENT', 'TASK');
CREATE TYPE "CalendarSyncDirection" AS ENUM ('PUSH', 'PULL');
CREATE TYPE "CalendarSyncStatus" AS ENUM ('PENDING', 'SYNCED', 'WARNING', 'CONFLICT', 'ERROR');
CREATE TYPE "CalendarSyncMode" AS ENUM ('MIRROR', 'TWO_WAY');

-- Alter agenda_event
ALTER TABLE "AgendaEvent"
  ADD COLUMN "externalId" TEXT,
  ADD COLUMN "externalCalendarId" TEXT,
  ADD COLUMN "externalLastModifiedAt" TIMESTAMP(3),
  ADD COLUMN "lastSyncAt" TIMESTAMP(3),
  ADD COLUMN "syncStatus" "CalendarSyncStatus" NOT NULL DEFAULT 'PENDING';

CREATE INDEX "AgendaEvent_tenantId_externalId_idx" ON "AgendaEvent"("tenantId", "externalId");

-- Alter agenda_task
ALTER TABLE "AgendaTask"
  ADD COLUMN "externalId" TEXT,
  ADD COLUMN "externalCalendarId" TEXT,
  ADD COLUMN "externalLastModifiedAt" TIMESTAMP(3),
  ADD COLUMN "lastSyncAt" TIMESTAMP(3),
  ADD COLUMN "syncStatus" "CalendarSyncStatus" NOT NULL DEFAULT 'PENDING';

CREATE INDEX "AgendaTask_tenantId_externalId_idx" ON "AgendaTask"("tenantId", "externalId");

-- Create table calendar_integrations
CREATE TABLE "CalendarIntegration" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'GOOGLE',
  "email" TEXT,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "tokenExpiresAt" TIMESTAMP(3),
  "selectedCalendarId" TEXT,
  "selectedCalendarName" TEXT,
  "syncEvents" BOOLEAN NOT NULL DEFAULT true,
  "syncTasks" BOOLEAN NOT NULL DEFAULT false,
  "mode" "CalendarSyncMode" NOT NULL DEFAULT 'MIRROR',
  "active" BOOLEAN NOT NULL DEFAULT false,
  "lastSyncAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdBy" UUID,
  "updatedBy" UUID,

  CONSTRAINT "CalendarIntegration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CalendarIntegration_tenantId_provider_key" ON "CalendarIntegration"("tenantId", "provider");
ALTER TABLE "CalendarIntegration" ADD CONSTRAINT "CalendarIntegration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create table sync_audit_log
CREATE TABLE "SyncAuditLog" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "integrationId" UUID,
  "syncType" "CalendarSyncType" NOT NULL,
  "direction" "CalendarSyncDirection" NOT NULL,
  "localEntity" TEXT NOT NULL,
  "localEntityId" UUID NOT NULL,
  "externalId" TEXT,
  "status" "CalendarSyncStatus" NOT NULL,
  "message" TEXT,
  "localUpdatedAt" TIMESTAMP(3),
  "externalUpdatedAt" TIMESTAMP(3),
  "syncedAt" TIMESTAMP(3),
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SyncAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SyncAuditLog_tenantId_createdAt_idx" ON "SyncAuditLog"("tenantId", "createdAt");
CREATE INDEX "SyncAuditLog_tenantId_syncType_status_idx" ON "SyncAuditLog"("tenantId", "syncType", "status");
ALTER TABLE "SyncAuditLog" ADD CONSTRAINT "SyncAuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SyncAuditLog" ADD CONSTRAINT "SyncAuditLog_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "CalendarIntegration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
