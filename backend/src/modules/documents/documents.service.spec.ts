import { NotFoundException } from '@nestjs/common';
import { DocumentsService } from './documents.service';

describe('DocumentsService', () => {
  const prisma = {
    caseDocument: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  } as any;

  const context = { get: jest.fn().mockReturnValue('t-1') };

  let service: DocumentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DocumentsService(prisma, context as any);
  });

  it('uploads document metadata (happy path)', async () => {
    prisma.caseDocument.create.mockResolvedValue({ id: 'doc-1' });

    const result = await service.upload({ periciaId: 'a6f7f363-fd5b-4c4d-8171-c6d65144f8d3', nome: 'arquivo.pdf' });

    expect(result.id).toBe('doc-1');
  });

  it('throws NotFoundException when generating signed url for missing document (edge case)', async () => {
    prisma.caseDocument.findFirst.mockResolvedValue(null);
    await expect(service.downloadSignedUrl({ documentId: 'a6f7f363-fd5b-4c4d-8171-c6d65144f8d3', expiresInSeconds: 300 })).rejects.toThrow(NotFoundException);
  });
});
