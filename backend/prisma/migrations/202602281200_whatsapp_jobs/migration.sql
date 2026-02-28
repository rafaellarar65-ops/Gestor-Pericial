-- Create WhatsApp enum types (tables created in 202602281620_whatsapp_telepericia)
DO $$
BEGIN
  CREATE TYPE "WhatsAppJobType" AS ENUM ('APPOINTMENT_REMINDER', 'REPORT_READY', 'CUSTOM');
EXCEPTION
  WHEN duplicate_object THEN null;
END
$$;

DO $$
BEGIN
  CREATE TYPE "WhatsAppJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SENT', 'FAILED', 'CANCELED');
EXCEPTION
  WHEN duplicate_object THEN null;
END
$$;

DO $$
BEGIN
  CREATE TYPE "TelepericiaSlotType" AS ENUM ('SEQUENTIAL', 'CUSTOM');
EXCEPTION
  WHEN duplicate_object THEN null;
END
$$;
