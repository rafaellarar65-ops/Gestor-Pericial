-- CreateEnum
CREATE TYPE "WhatsAppJobType" AS ENUM ('REMINDER_48H', 'REMINDER_24H', 'REMINDER_2H', 'POST');

-- CreateEnum
CREATE TYPE "WhatsAppJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SENT', 'RETRYING', 'FAILED', 'CANCELED');

-- CreateTable
CREATE TABLE "WhatsAppJob" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "periciaId" UUID NOT NULL,
    "jobType" "WhatsAppJobType" NOT NULL,
    "status" "WhatsAppJobStatus" NOT NULL DEFAULT 'QUEUED',
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "nextAttemptAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 4,
    "idempotencyKey" TEXT NOT NULL,
    "phone" TEXT,
    "payload" JSONB,
    "lastError" JSONB,
    "providerRef" TEXT,
    "sentAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "WhatsAppJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppJob_tenantId_idempotencyKey_key" ON "WhatsAppJob"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "WhatsAppJob_tenantId_status_scheduledFor_idx" ON "WhatsAppJob"("tenantId", "status", "scheduledFor");

-- CreateIndex
CREATE INDEX "WhatsAppJob_tenantId_periciaId_jobType_idx" ON "WhatsAppJob"("tenantId", "periciaId", "jobType");

-- AddForeignKey
ALTER TABLE "WhatsAppJob" ADD CONSTRAINT "WhatsAppJob_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppJob" ADD CONSTRAINT "WhatsAppJob_periciaId_fkey" FOREIGN KEY ("periciaId") REFERENCES "Pericia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
