import { NotFoundException } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';

describe('KnowledgeService', () => {
  const prisma = {
    knowledgeItem: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  } as any;

  const context = { get: jest.fn().mockReturnValue('t-1') };

  let service: KnowledgeService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new KnowledgeService(prisma, context as any);
  });

  it('creates knowledge item (happy path)', async () => {
    prisma.knowledgeItem.create.mockResolvedValue({ id: 'k-1' });
    const result = await service.create({ title: 'Artigo' } as any);
    expect(result.id).toBe('k-1');
  });

  it('throws NotFoundException for missing item (edge case)', async () => {
    prisma.knowledgeItem.findFirst.mockResolvedValue(null);
    await expect(service.findOne('404')).rejects.toThrow(NotFoundException);
  });
});
