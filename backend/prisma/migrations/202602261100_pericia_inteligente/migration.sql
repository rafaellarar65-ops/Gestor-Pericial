-- Campos do módulo de edição de laudo inteligente
ALTER TABLE "PreLaudo"
  ADD COLUMN IF NOT EXISTS "templateDocxPath" TEXT,
  ADD COLUMN IF NOT EXISTS "lastGeneratedPdfPath" TEXT,
  ADD COLUMN IF NOT EXISTS "initialProcessJson" JSONB,
  ADD COLUMN IF NOT EXISTS "initialManeuvers" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "exameFisicoTexto" TEXT,
  ADD COLUMN IF NOT EXISTS "discussaoTecnicaTexto" TEXT;
