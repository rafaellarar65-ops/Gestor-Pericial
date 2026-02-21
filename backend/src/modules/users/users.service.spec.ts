import { NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const prisma = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    userProfile: {
      update: jest.fn(),
    },
    activityLog: {
      findMany: jest.fn(),
    },
    dailyUsage: {
      findMany: jest.fn(),
    },
  } as any;

  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(prisma);
  });

  it('creates user with profile (happy path)', async () => {
    prisma.user.create.mockResolvedValue({ id: 'u-1', email: 'user@x.com' });

    const result = await service.create({
      tenantId: 't-1',
      email: 'user@x.com',
      password: 'Senha@1234',
      role: UserRole.ASSISTANT,
      fullName: 'User Name',
    });

    expect(result.id).toBe('u-1');
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it('throws NotFoundException when user does not exist (edge case)', async () => {
    prisma.user.findFirst.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
  });
});
