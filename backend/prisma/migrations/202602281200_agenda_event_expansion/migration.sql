-- Expansão de AgendaEvent com novos tipos, status e sincronização externa
ALTER TYPE "AgendaEventType" ADD VALUE IF NOT EXISTS 'PERICIA_AGENDADA';
ALTER TYPE "AgendaEventType" ADD VALUE IF NOT EXISTS 'BLOQUEIO';
ALTER TYPE "AgendaEventType" ADD VALUE IF NOT EXISTS 'BLOCO_LAUDO';

DO $$
BEGIN
  CREATE TYPE "AgendaEventStatus" AS ENUM ('AGENDADA', 'REALIZADA', 'FALTOU', 'REMARCADA', 'CANCELADA');
EXCEPTION
  WHEN duplicate_object THEN null;
END
$$;

DO $$
BEGIN
  CREATE TYPE "AgendaEventSource" AS ENUM ('MANUAL', 'CNJ', 'GOOGLE_CALENDAR', 'IMPORTACAO', 'IA', 'OUTRO');
EXCEPTION
  WHEN duplicate_object THEN null;
END
$$;

DO $$
BEGIN
  CREATE TYPE "ExternalSyncStatus" AS ENUM ('PENDING', 'SYNCED', 'ERROR', 'CONFLICT', 'DISABLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END
$$;

ALTER TABLE "AgendaEvent"
  ADD COLUMN IF NOT EXISTS "cnjId" TEXT,
  ADD COLUMN IF NOT EXISTS "cityId" UUID,
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "status" "AgendaEventStatus" NOT NULL DEFAULT 'AGENDADA',
  ADD COLUMN IF NOT EXISTS "source" "AgendaEventSource" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS "aiSuggested" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "statusHistory" JSONB,
  ADD COLUMN IF NOT EXISTS "syncStatus" "ExternalSyncStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "syncErrorMessage" TEXT,
  ADD COLUMN IF NOT EXISTS "externalProvider" TEXT,
  ADD COLUMN IF NOT EXISTS "externalEventId" TEXT,
  ADD COLUMN IF NOT EXISTS "externalEtag" TEXT,
  ADD COLUMN IF NOT EXISTS "externalLastModifiedAt" TIMESTAMP(3);

DO $$
BEGIN
  ALTER TABLE "AgendaEvent"
    ADD CONSTRAINT "AgendaEvent_cityId_fkey"
    FOREIGN KEY ("cityId") REFERENCES "Cidade"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END
$$;

CREATE INDEX IF NOT EXISTS "AgendaEvent_tenantId_status_startAt_idx" ON "AgendaEvent"("tenantId", "status", "startAt");
CREATE INDEX IF NOT EXISTS "AgendaEvent_tenantId_syncStatus_idx" ON "AgendaEvent"("tenantId", "syncStatus");
CREATE INDEX IF NOT EXISTS "AgendaEvent_tenantId_externalProvider_externalEventId_idx" ON "AgendaEvent"("tenantId", "externalProvider", "externalEventId");
CREATE INDEX IF NOT EXISTS "AgendaEvent_cityId_idx" ON "AgendaEvent"("cityId");
