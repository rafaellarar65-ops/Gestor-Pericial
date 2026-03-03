import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto, MfaTotpDto, RefreshTokenDto, RegisterDto } from './dto/auth.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly refreshTokenStore = new Map<string, string>();
  private readonly mfaSecretStore = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({ where: { email: dto.email, tenantId: dto.tenantId } });
    if (existing) {
      throw new BadRequestException('Email já cadastrado para este tenant.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        tenantId: dto.tenantId,
        email: dto.email,
        passwordHash,
        role: dto.role,
        profile: {
          create: {
            tenantId: dto.tenantId,
            fullName: dto.fullName,
          },
        },
      },
      include: { profile: true },
    });

    return {
      user: this.mapUser(user.id, user.email, user.role, user.tenantId, user.profile?.fullName),
      ...(await this.issueTokens(user.id, user.email, user.role, user.tenantId)),
    };
  }

  async login(dto: LoginDto) {
    const loginWhere: Prisma.UserWhereInput = {
      email: dto.email,
      isActive: true,
      ...(dto.tenantId ? { tenantId: dto.tenantId } : {}),
    };

    let user: Prisma.UserGetPayload<{ include: { profile: true } }> | null;
    try {
      user = await this.prisma.user.findFirst({
        where: loginWhere,
        include: { profile: true },
      });
    } catch {
      throw new InternalServerErrorException('Serviço de autenticação temporariamente indisponível. Verifique a conexão com o banco de dados.');
    }

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return {
      user: this.mapUser(user.id, user.email, user.role, user.tenantId, user.profile?.fullName),
      ...(await this.issueTokens(user.id, user.email, user.role, user.tenantId)),
    };
  }

  async refresh(dto: RefreshTokenDto): Promise<TokenPair> {
    let payload: { sub: string; email: string; role: UserRole; tenantId: string };
    try {
      payload = this.jwtService.verify<{ sub: string; email: string; role: UserRole; tenantId: string }>(dto.refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }

    return this.issueTokens(payload.sub, payload.email, payload.role, payload.tenantId);
  }

  logout(userId: string) {
    this.refreshTokenStore.delete(userId);
    return { success: true };
  }

  mfaTotp(dto: MfaTotpDto) {
    if (!dto.code) {
      const secret = randomBytes(20).toString('hex');
      this.mfaSecretStore.set(dto.userId, secret);
      return { userId: dto.userId, secret, status: 'PENDING_CONFIRMATION' };
    }

    const secret = this.mfaSecretStore.get(dto.userId);
    if (!secret || dto.code.length !== 6) {
      throw new BadRequestException('Código TOTP inválido.');
    }

    return { userId: dto.userId, mfaEnabled: true };
  }

  private async issueTokens(userId: string, email: string, role: UserRole, tenantId: string): Promise<TokenPair> {
    const basePayload = { sub: userId, email, role, tenantId };

    const accessToken = await this.jwtService.signAsync(basePayload, {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    });

    const refreshToken = await this.jwtService.signAsync(basePayload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    });

    this.refreshTokenStore.set(userId, await bcrypt.hash(refreshToken, 10));
    return { accessToken, refreshToken };
  }

  private mapUser(id: string, email: string, role: UserRole, tenantId: string, fullName?: string) {
    return { id, email, role, tenantId, fullName };
  }
}
