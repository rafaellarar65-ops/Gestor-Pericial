-- Atualiza workflow de conciliação e estrutura de UnmatchedPayment
ALTER TYPE "PaymentMatchStatus" RENAME TO "PaymentMatchStatus_old";
CREATE TYPE "PaymentMatchStatus" AS ENUM ('PENDING', 'LINKED', 'DISCARDED');
CREATE TYPE "UnmatchedPaymentOriginType" AS ENUM ('AI_PRINT', 'MANUAL_CSV', 'INDIVIDUAL');

ALTER TABLE "UnmatchedPayment"
  RENAME COLUMN "matchStatus" TO "status";

ALTER TABLE "UnmatchedPayment"
  ADD COLUMN "cnjRaw" TEXT,
  ADD COLUMN "cnjNormalized" TEXT,
  ADD COLUMN "source" TEXT,
  ADD COLUMN "originType" "UnmatchedPaymentOriginType" NOT NULL DEFAULT 'MANUAL_CSV',
  ADD COLUMN "grossValue" DECIMAL(12,2),
  ADD COLUMN "discountValue" DECIMAL(12,2),
  ADD COLUMN "netValue" DECIMAL(12,2),
  ADD COLUMN "receivedAt" TIMESTAMP(3),
  ADD COLUMN "description" TEXT,
  ADD COLUMN "linkedPericiaId" UUID,
  ADD COLUMN "linkedAt" TIMESTAMP(3),
  ADD COLUMN "linkedBy" UUID;

ALTER TABLE "UnmatchedPayment"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "PaymentMatchStatus"
  USING (
    CASE "status"::text
      WHEN 'MATCHED' THEN 'LINKED'
      WHEN 'UNMATCHED' THEN 'PENDING'
      ELSE 'PENDING'
    END
  )::"PaymentMatchStatus",
  ALTER COLUMN "status" SET DEFAULT 'PENDING';

ALTER TABLE "UnmatchedPayment"
  DROP COLUMN "amount",
  DROP COLUMN "transactionDate",
  DROP COLUMN "payerName";

DROP INDEX "UnmatchedPayment_tenantId_matchStatus_transactionDate_idx";
CREATE INDEX "UnmatchedPayment_tenantId_status_receivedAt_idx" ON "UnmatchedPayment"("tenantId", "status", "receivedAt");
CREATE INDEX "UnmatchedPayment_tenantId_cnjNormalized_idx" ON "UnmatchedPayment"("tenantId", "cnjNormalized");

ALTER TABLE "UnmatchedPayment"
  ADD CONSTRAINT "UnmatchedPayment_linkedPericiaId_fkey"
  FOREIGN KEY ("linkedPericiaId") REFERENCES "Pericia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP TYPE "PaymentMatchStatus_old";
