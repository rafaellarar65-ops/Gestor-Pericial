-- Inbox cache/sync model

CREATE TABLE IF NOT EXISTS "EmailInboxMessage" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "uid" INTEGER NOT NULL,
  "messageId" TEXT NOT NULL,
  "from" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "flags" JSONB,
  "snippet" TEXT,
  "hasAttachments" BOOLEAN NOT NULL DEFAULT false,
  "htmlBody" TEXT,
  "textBody" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdBy" UUID,
  "updatedBy" UUID,
  CONSTRAINT "EmailInboxMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "EmailInboxAttachment" (
  "id" UUID NOT NULL,
  "tenantId" UUID NOT NULL,
  "messageId" UUID NOT NULL,
  "filename" TEXT NOT NULL,
  "contentType" TEXT,
  "size" INTEGER,
  "storageKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailInboxAttachment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailInboxMessage_tenantId_uid_key" ON "EmailInboxMessage"("tenantId", "uid");
CREATE INDEX IF NOT EXISTS "EmailInboxMessage_tenantId_date_idx" ON "EmailInboxMessage"("tenantId", "date");
CREATE INDEX IF NOT EXISTS "EmailInboxMessage_tenantId_uid_idx" ON "EmailInboxMessage"("tenantId", "uid");
CREATE INDEX IF NOT EXISTS "EmailInboxMessage_tenantId_from_idx" ON "EmailInboxMessage"("tenantId", "from");
CREATE INDEX IF NOT EXISTS "EmailInboxMessage_tenantId_subject_idx" ON "EmailInboxMessage"("tenantId", "subject");
CREATE INDEX IF NOT EXISTS "EmailInboxAttachment_tenantId_messageId_idx" ON "EmailInboxAttachment"("tenantId", "messageId");

DO $$ BEGIN
  ALTER TABLE "EmailInboxMessage"
    ADD CONSTRAINT "EmailInboxMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmailInboxAttachment"
    ADD CONSTRAINT "EmailInboxAttachment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "EmailInboxAttachment"
    ADD CONSTRAINT "EmailInboxAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "EmailInboxMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
