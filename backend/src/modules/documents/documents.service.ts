import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CategorizeDocumentDto, LinkPericiaDocumentDto, SignedUrlDto, UploadDocumentDto } from './dto/documents.dto';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  upload(dto: UploadDocumentDto) {
    return this.prisma.caseDocument.create({
      data: {
        periciaId: dto.periciaId,
        nome: dto.nome,
        tipo: dto.tipo,
        categoria: dto.categoria,
        storagePath: dto.storagePath ?? `documents/${randomUUID()}-${dto.nome}`,
        mimeType: dto.mimeType,
        fileSize: dto.fileSize,
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
    return this.prisma.caseDocument.update({
      where: { id: dto.documentId },
      data: { categoria: dto.categoria },
    });
  }

  async linkPericia(dto: LinkPericiaDocumentDto) {
    await this.ensureExists(dto.documentId);
    return this.prisma.caseDocument.update({
      where: { id: dto.documentId },
      data: { periciaId: dto.periciaId },
    });
  }

  private async ensureExists(id: string) {
    const doc = await this.prisma.caseDocument.findFirst({ where: { id } });
    if (!doc) throw new NotFoundException('Documento não encontrado.');
    return doc;
  }
}
