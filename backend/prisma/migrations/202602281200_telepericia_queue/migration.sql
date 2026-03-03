-- AlterTable
ALTER TABLE "Pericia"
ADD COLUMN IF NOT EXISTS "urgentCheckedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "telepericiaStatusChangedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "whatsappStatus" TEXT,
ADD COLUMN IF NOT EXISTS "telepericiaConfirmedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "telepericiaLastAttemptAt" TIMESTAMP(3);
