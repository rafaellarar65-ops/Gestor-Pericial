import { NotFoundException } from '@nestjs/common';
import { PericiasService } from './pericias.service';

describe('PericiasService', () => {
  const prisma = {
    pericia: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    logStatus: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any;

  let service: PericiasService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PericiasService(prisma);
  });

  it('creates a pericia (happy path)', async () => {
    prisma.pericia.create.mockResolvedValue({ id: 'p-1', processoCNJ: '123' });

    const result = await service.create({ processoCNJ: '123' } as any);

    expect(result.id).toBe('p-1');
    expect(prisma.pericia.create).toHaveBeenCalled();
  });

  it('throws NotFoundException when pericia does not exist (edge case)', async () => {
    prisma.pericia.findFirst.mockResolvedValue(null);
    await expect(service.findOne('404')).rejects.toThrow(NotFoundException);
  });
});
