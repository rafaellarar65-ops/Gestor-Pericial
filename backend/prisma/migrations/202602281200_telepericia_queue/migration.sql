-- AlterTable
ALTER TABLE "Pericia"
ADD COLUMN "urgentCheckedAt" TIMESTAMP(3),
ADD COLUMN "telepericiaStatusChangedAt" TIMESTAMP(3),
ADD COLUMN "whatsappStatus" TEXT,
ADD COLUMN "telepericiaConfirmedAt" TIMESTAMP(3),
ADD COLUMN "telepericiaLastAttemptAt" TIMESTAMP(3);
