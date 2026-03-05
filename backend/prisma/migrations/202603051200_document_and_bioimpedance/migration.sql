-- Migration: Document model, DocumentCategory enum, and Bioimpedance model
-- PR #139: feat(prisma): add Document model and DocumentCategory enum
-- PR #129/#130: feat(bioimpedance): add bioimpedance model with AI analysis

-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('LAUDO', 'PERICIA', 'IDENTIDADE', 'MEDICO', 'JURIDICO', 'FINANCEIRO', 'IMAGEM', 'OUTROS');

-- CreateTable: Document (patient-scoped)
CREATE TABLE "Document" (
    "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId"      UUID NOT NULL,
    "periciaId"     UUID,
    "nome"          TEXT NOT NULL,
    "categoria"     "DocumentCategory" NOT NULL DEFAULT 'OUTROS',
    "storagePath"   TEXT,
    "mimeType"      TEXT,
    "fileSize"      INTEGER,
    "hashSha256"    TEXT,
    "metadata"      JSONB,
    "uploadedBy"    UUID,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    "createdBy"     UUID,
    "updatedBy"     UUID,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Bioimpedance
CREATE TABLE "Bioimpedance" (
    "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId"        UUID NOT NULL,
    "periciaId"       UUID NOT NULL,
    "peso"            DECIMAL(6,2),
    "altura"          DECIMAL(5,2),
    "imc"             DECIMAL(5,2),
    "gorduraCorporal" DECIMAL(5,2),
    "massaMagra"      DECIMAL(6,2),
    "aguaCorporal"    DECIMAL(5,2),
    "massaOssea"      DECIMAL(5,2),
    "taxaMetabolica"  INTEGER,
    "idadeCorporal"   INTEGER,
    "metadata"        JSONB,
    "aiAnalysis"      JSONB,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    "createdBy"       UUID,
    "updatedBy"       UUID,

    CONSTRAINT "Bioimpedance_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: Document → Tenant
ALTER TABLE "Document" ADD CONSTRAINT "Document_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Document → Pericia
ALTER TABLE "Document" ADD CONSTRAINT "Document_periciaId_fkey"
    FOREIGN KEY ("periciaId") REFERENCES "Pericia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: Bioimpedance → Tenant
ALTER TABLE "Bioimpedance" ADD CONSTRAINT "Bioimpedance_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Bioimpedance → Pericia
ALTER TABLE "Bioimpedance" ADD CONSTRAINT "Bioimpedance_periciaId_fkey"
    FOREIGN KEY ("periciaId") REFERENCES "Pericia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex: Document
CREATE INDEX "Document_tenantId_periciaId_idx" ON "Document"("tenantId", "periciaId");
CREATE INDEX "Document_tenantId_categoria_idx" ON "Document"("tenantId", "categoria");

-- CreateIndex: Bioimpedance
CREATE INDEX "Bioimpedance_tenantId_periciaId_idx" ON "Bioimpedance"("tenantId", "periciaId");
