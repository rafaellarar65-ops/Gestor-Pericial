import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const prisma = {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  } as any;

  const jwtService = {
    signAsync: jest.fn(),
    verify: jest.fn(),
  } as unknown as JwtService;

  const context = { get: jest.fn().mockReturnValue('t-1') };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(prisma, jwtService);
    (jwtService.signAsync as jest.Mock)
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');
  });

  it('registers a user and returns token pair (happy path)', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'u-1',
      tenantId: 't-1',
      email: 'x@y.com',
      role: UserRole.ASSISTANT,
      profile: { fullName: 'User Name' },
    });

    const result = await service.register({
      tenantId: 't-1',
      email: 'x@y.com',
      password: 'Senha@123',
      role: UserRole.ASSISTANT,
      fullName: 'User Name',
    });

    expect(result).toHaveProperty('accessToken', 'access-token');
    expect(result).toHaveProperty('refreshToken', 'refresh-token');
  });

  it('throws UnauthorizedException for invalid refresh token (edge case)', async () => {
    (jwtService.verify as jest.Mock).mockReturnValue({ sub: 'u-404', email: 'x@y.com', role: UserRole.ADMIN, tenantId: 't-1' });

    await expect(service.refresh({ refreshToken: 'invalid' })).rejects.toThrow(UnauthorizedException);
  });
});
