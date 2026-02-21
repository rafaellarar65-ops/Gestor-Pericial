import { NotFoundException } from '@nestjs/common';
import { ManeuversService } from './maneuvers.service';

describe('ManeuversService', () => {
  const prisma = {
    physicalManeuver: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  } as any;

  let service: ManeuversService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ManeuversService(prisma);
  });

  it('creates physical maneuver (happy path)', async () => {
    prisma.physicalManeuver.create.mockResolvedValue({ id: 'm-1' });
    const result = await service.create({ name: 'Lasègue' } as any);
    expect(result.id).toBe('m-1');
  });

  it('throws NotFoundException for missing maneuver (edge case)', async () => {
    prisma.physicalManeuver.findFirst.mockResolvedValue(null);
    await expect(service.findOne('404')).rejects.toThrow(NotFoundException);
  });
});
