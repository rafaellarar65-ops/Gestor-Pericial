import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CategorizeDocumentDto, LinkPericiaDocumentDto, SignedUrlDto, UploadDocumentDto } from './dto/documents.dto';

@Injectable()
export class DocumentsService {
  list(periciaId?: string) {
    return this.prisma.caseDocument.findMany({
      where: periciaId ? { periciaId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
  ) {}

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

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + dto.expiresInSeconds * 1000).toISOString();
    return {
      documentId: document.id,
      signedUrl: `https://supabase.fake.local/storage/v1/object/sign/${document.storagePath}?token=${token}`,
      expiresAt,
    };
  }

  async categorize(dto: CategorizeDocumentDto) {
    await this.ensureExists(dto.documentId);
    return this.prisma.caseDocument.update({ where: { id: dto.documentId }, data: { categoria: dto.categoria } });
  }

  async linkPericia(dto: LinkPericiaDocumentDto) {
    await this.ensureExists(dto.documentId);
    return this.prisma.caseDocument.update({ where: { id: dto.documentId }, data: { periciaId: dto.periciaId } });
  }

  private async ensureExists(id: string) {
    const doc = await this.prisma.caseDocument.findFirst({ where: { id } });
    if (!doc) throw new NotFoundException('Documento não encontrado.');
    return doc;
  }
}
