import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentCategory } from '@prisma/client';
import { randomUUID } from 'crypto';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CategorizeDocumentDto,
  CreateDocumentDto,
  LinkPericiaDocumentDto,
  SignedUrlDto,
  UploadDocumentDto,
} from './dto/documents.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
  ) {}

  // ── Legacy CaseDocument endpoints (pericia-scoped) ──────────────────────

  list(periciaId?: string) {
    return this.prisma.caseDocument.findMany({
      where: periciaId ? { periciaId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  upload(dto: UploadDocumentDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.prisma.caseDocument.create({
      data: {
        tenantId,
        periciaId: dto.periciaId,
        nome: dto.nome,
        ...(dto.tipo ? { tipo: dto.tipo } : {}),
        ...(dto.categoria ? { categoria: dto.categoria } : {}),
        storagePath: dto.storagePath ?? `documents/${randomUUID()}-${dto.nome}`,
        ...(dto.mimeType ? { mimeType: dto.mimeType } : {}),
        ...(dto.fileSize ? { fileSize: dto.fileSize } : {}),
      },
    });
  }

  async downloadSignedUrl(dto: SignedUrlDto) {
    const document = await this.prisma.caseDocument.findFirst({ where: { id: dto.documentId } });
    if (!document) throw new NotFoundException('Documento não encontrado.');
    return this.buildSignedUrl(document.id, document.storagePath, dto.expiresInSeconds);
  }

  async categorize(dto: CategorizeDocumentDto) {
    await this.ensureCaseDocumentExists(dto.documentId);
    return this.prisma.caseDocument.update({ where: { id: dto.documentId }, data: { categoria: dto.categoria } });
  }

  async linkPericia(dto: LinkPericiaDocumentDto) {
    await this.ensureCaseDocumentExists(dto.documentId);
    return this.prisma.caseDocument.update({ where: { id: dto.documentId }, data: { periciaId: dto.periciaId } });
  }

  // ── Patient-scoped Document endpoints (PR #137) ─────────────────────────

  listDocuments(periciaId?: string, categoria?: DocumentCategory) {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.prisma.document.findMany({
      where: {
        tenantId,
        ...(periciaId ? { periciaId } : {}),
        ...(categoria ? { categoria } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  createDocument(dto: CreateDocumentDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    const uploadedBy = this.context.get('userId') as string | undefined;
    return this.prisma.document.create({
      data: {
        tenantId,
        nome: dto.nome,
        categoria: dto.categoria ?? DocumentCategory.OUTROS,
        ...(dto.periciaId ? { periciaId: dto.periciaId } : {}),
        storagePath: dto.storagePath ?? `patient-docs/${tenantId}/${randomUUID()}-${dto.nome}`,
        ...(dto.mimeType ? { mimeType: dto.mimeType } : {}),
        ...(dto.fileSize ? { fileSize: dto.fileSize } : {}),
        ...(dto.metadata ? { metadata: dto.metadata } : {}),
        ...(uploadedBy ? { uploadedBy } : {}),
      },
    });
  }

  async getDocumentSignedUrl(documentId: string, expiresInSeconds = 3600) {
    const doc = await this.prisma.document.findFirst({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Documento não encontrado.');
    await this.prisma.document.update({ where: { id: documentId }, data: { downloadCount: { increment: 1 } } });
    return this.buildSignedUrl(doc.id, doc.storagePath, expiresInSeconds);
  }

  async deleteDocument(documentId: string) {
    const doc = await this.prisma.document.findFirst({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Documento não encontrado.');
    await this.prisma.document.delete({ where: { id: documentId } });
    return { deleted: true, id: documentId };
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  private buildSignedUrl(id: string, storagePath: string | null, expiresInSeconds: number) {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();
    const path = storagePath ?? `documents/${id}`;
    const baseUrl = process.env.STORAGE_URL ?? 'https://storage.example.local';
    return {
      documentId: id,
      signedUrl: `${baseUrl}/v1/object/sign/${path}?token=${token}`,
      expiresAt,
    };
  }

  private async ensureCaseDocumentExists(id: string) {
    const doc = await this.prisma.caseDocument.findFirst({ where: { id } });
    if (!doc) throw new NotFoundException('Documento não encontrado.');
    return doc;
  }
}
