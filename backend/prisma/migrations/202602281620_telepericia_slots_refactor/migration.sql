-- Drop legacy TeleSlot table (replaced by TelepericiaSlot in next migration)
DROP TABLE IF EXISTS "TeleSlot" CASCADE;
DROP TYPE IF EXISTS "TeleSlotStatus";
