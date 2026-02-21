import { NotFoundException } from '@nestjs/common';
import { ConfigDomainService } from './config.service';

describe('ConfigDomainService', () => {
  const delegate = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const prisma = {
    cidade: delegate,
    vara: delegate,
    tipoPericia: delegate,
    modalidade: delegate,
    status: delegate,
    local: delegate,
    tribunal: delegate,
  } as any;

  let service: ConfigDomainService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ConfigDomainService(prisma);
  });

  it('creates config item for cidades (happy path)', async () => {
    delegate.create.mockResolvedValue({ id: 'c-1', nome: 'Belo Horizonte' });

    const result = await service.create('cidades', { nome: 'Belo Horizonte', codigo: '3106200' } as any);

    expect(result.id).toBe('c-1');
    expect(delegate.create).toHaveBeenCalled();
  });

  it('throws NotFoundException on missing config item (edge case)', async () => {
    delegate.findFirst.mockResolvedValue(null);
    await expect(service.findOne('status', '404')).rejects.toThrow(NotFoundException);
  });
});
