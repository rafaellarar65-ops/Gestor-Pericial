import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateManeuversDto, MediaUploadDto, ProtocolDto, SearchManeuversDto, UpdateManeuversDto } from './dto/maneuvers.dto';

@Injectable()
export class ManeuversService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
  ) {}

  create(dto: CreateManeuversDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.prisma.physicalManeuver.create({
      data: {
        tenantId,
        name: dto.name,
        ...(dto.category ? { category: dto.category } : {}),
        ...(dto.summary ? { summary: dto.summary } : {}),
        ...(dto.procedure ? { procedure: dto.procedure as Prisma.JsonValue } : {}),
        tags: dto.tags ?? [],
        active: dto.active ?? true,
      },
    });
  }

  findAll(query?: SearchManeuversDto) {
    return this.prisma.physicalManeuver.findMany({
      where: {
        ...(query?.category ? { category: query.category } : {}),
        ...(query?.tags?.length ? { tags: { hasSome: query.tags } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, dto: UpdateManeuversDto) {
    await this.findOne(id);
    return this.prisma.physicalManeuver.update({ where: { id }, data: dto });
  }

  async findOne(id: string) {
    const item = await this.prisma.physicalManeuver.findFirst({ where: { id } });
    if (!item) throw new NotFoundException('Manobra não encontrada.');
    return item;
  }

  async mediaUpload(dto: MediaUploadDto) {
    const current = await this.findOne(dto.maneuverId);
    const evidence = Array.isArray(current.evidence) ? current.evidence : [];
    return this.prisma.physicalManeuver.update({
      where: { id: dto.maneuverId },
      data: { evidence: [...evidence, { mediaUrl: dto.mediaUrl, uploadedAt: new Date().toISOString() }] as Prisma.JsonValue },
    });
  }

  async protocols(dto: ProtocolDto) {
    await this.findOne(dto.maneuverId);
    return this.prisma.physicalManeuver.update({ where: { id: dto.maneuverId }, data: { procedure: dto.protocol as Prisma.JsonValue } });
  }
}
