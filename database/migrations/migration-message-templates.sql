CREATE TABLE IF NOT EXISTS "MessageTemplate" (
  "id" UUID PRIMARY KEY,
  "tenantId" UUID NOT NULL,
  "channel" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "placeholdersUsed" JSONB,
  "variablesMapping" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdBy" UUID,
  "updatedBy" UUID,
  CONSTRAINT "MessageTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MessageTemplate_tenantId_channel_createdAt_idx"
  ON "MessageTemplate"("tenantId", "channel", "createdAt");
