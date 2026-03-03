import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { ChangeRoleDto, CreateUsersDto, ListUsageDto, UpdateUsersDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUsersDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
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
  }

  findAll() {
    return this.prisma.user.findMany({ include: { profile: true }, orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({ where: { id }, include: { profile: true } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  async update(id: string, dto: UpdateUsersDto) {
    await this.findOne(id);

    return this.prisma.userProfile.update({
      where: { userId: id },
      data: {
        fullName: dto.fullName,
        phone: dto.phone,
        specialty: dto.specialty,
      },
    });
  }

  async changeRole(id: string, dto: ChangeRoleDto) {
    await this.findOne(id);

    return this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
      select: { id: true, email: true, role: true, updatedAt: true },
    });
  }

  activityLog(userId: string) {
    return this.prisma.activityLog.findMany({
      where: { createdBy: userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  dailyUsage(query: ListUsageDto) {
    return this.prisma.dailyUsage.findMany({
      orderBy: { usageDate: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });
  }
}
