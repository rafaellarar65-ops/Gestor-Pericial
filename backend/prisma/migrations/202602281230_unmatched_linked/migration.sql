-- Add LINKED status to payment matching enum
ALTER TYPE "PaymentMatchStatus" ADD VALUE IF NOT EXISTS 'LINKED';

-- Preserve unmatched payment for audit trail while allowing explicit linkage metadata
ALTER TABLE "UnmatchedPayment"
  ADD COLUMN "linkedPericiaId" UUID,
  ADD COLUMN "linkedAt" TIMESTAMP(3),
  ADD COLUMN "linkedBy" UUID;
