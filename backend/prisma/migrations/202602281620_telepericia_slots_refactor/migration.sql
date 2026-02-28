-- Teleperícia slot refactor: TeleSlot -> telepericia_slots + telepericia_slot_items
CREATE TYPE "TelepericiaSlotType" AS ENUM ('SEQUENTIAL', 'CUSTOM');

CREATE TEMP TABLE "_tele_slot_pericia_backup" AS
SELECT "id" AS "slotId", "tenantId", "periciaId", "createdAt", "updatedAt", "createdBy", "updatedBy"
FROM "TeleSlot"
WHERE "periciaId" IS NOT NULL;

ALTER TABLE "TeleSlot" RENAME TO "telepericia_slots";
ALTER TABLE "telepericia_slots" RENAME COLUMN "startAt" TO "date";
ALTER TABLE "telepericia_slots" RENAME COLUMN "meetingUrl" TO "metadata";
ALTER TABLE "telepericia_slots" DROP COLUMN "endAt";
ALTER TABLE "telepericia_slots" DROP COLUMN "periciaId";
ALTER TABLE "telepericia_slots" DROP COLUMN "accessCode";
ALTER TABLE "telepericia_slots" DROP COLUMN "platform";
ALTER TABLE "telepericia_slots" DROP COLUMN "status";

ALTER TABLE "telepericia_slots"
  ALTER COLUMN "metadata" TYPE JSONB USING CASE WHEN "metadata" IS NULL THEN NULL ELSE jsonb_build_object('legacyMeetingUrl', "metadata") END;

ALTER TABLE "telepericia_slots"
  ADD COLUMN "start_time" VARCHAR(5) NOT NULL DEFAULT '08:00',
  ADD COLUMN "duration_minutes" INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN "slot_type" "TelepericiaSlotType" NOT NULL DEFAULT 'SEQUENTIAL',
  ADD COLUMN "appointment_duration_minutes" INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN "gap_minutes" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "capacity" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

ALTER TABLE "telepericia_slots"
  ALTER COLUMN "date" TYPE DATE USING "date"::date;

DROP INDEX IF EXISTS "TeleSlot_tenantId_startAt_status_idx";
CREATE INDEX "telepericia_slots_tenantId_date_idx" ON "telepericia_slots"("tenantId", "date");

CREATE TABLE "telepericia_slot_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenantId" UUID NOT NULL,
  "slotId" UUID NOT NULL,
  "periciaId" UUID NOT NULL,
  "order_index" INTEGER NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdBy" UUID,
  "updatedBy" UUID,
  CONSTRAINT "telepericia_slot_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "telepericia_slot_items_slotId_periciaId_key" ON "telepericia_slot_items"("slotId", "periciaId");
CREATE UNIQUE INDEX "telepericia_slot_items_slotId_order_index_key" ON "telepericia_slot_items"("slotId", "order_index");
CREATE INDEX "telepericia_slot_items_tenantId_slotId_idx" ON "telepericia_slot_items"("tenantId", "slotId");

ALTER TABLE "telepericia_slot_items"
  ADD CONSTRAINT "telepericia_slot_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "telepericia_slot_items_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "telepericia_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "telepericia_slot_items_periciaId_fkey" FOREIGN KEY ("periciaId") REFERENCES "Pericia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "telepericia_slot_items" ("tenantId", "slotId", "periciaId", "order_index", "createdAt", "updatedAt", "createdBy", "updatedBy")
SELECT "tenantId", "slotId", "periciaId", 0, "createdAt", "updatedAt", "createdBy", "updatedBy"
FROM "_tele_slot_pericia_backup";

DROP TABLE "_tele_slot_pericia_backup";
DROP TYPE IF EXISTS "TeleSlotStatus";
