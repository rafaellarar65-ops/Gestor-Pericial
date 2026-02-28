-- CreateTable
CREATE TABLE "WhatsappMessage" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "periciaId" UUID,
    "provider" TEXT NOT NULL DEFAULT 'whatsapp-cloud-api',
    "eventType" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT,
    "waMessageId" TEXT,
    "fromPhone" TEXT,
    "toPhone" TEXT,
    "messageBody" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "payloadJson" JSONB,
    "providerResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" UUID,
    "updatedBy" UUID,

    CONSTRAINT "WhatsappMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsappMessage_tenantId_periciaId_createdAt_idx" ON "WhatsappMessage"("tenantId", "periciaId", "createdAt");

-- CreateIndex
CREATE INDEX "WhatsappMessage_tenantId_waMessageId_idx" ON "WhatsappMessage"("tenantId", "waMessageId");

-- CreateIndex
CREATE INDEX "WhatsappMessage_tenantId_status_createdAt_idx" ON "WhatsappMessage"("tenantId", "status", "createdAt");

-- AddForeignKey
ALTER TABLE "WhatsappMessage" ADD CONSTRAINT "WhatsappMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappMessage" ADD CONSTRAINT "WhatsappMessage_periciaId_fkey" FOREIGN KEY ("periciaId") REFERENCES "Pericia"("id") ON DELETE SET NULL ON UPDATE CASCADE;
