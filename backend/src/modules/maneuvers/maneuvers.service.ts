import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateManeuversDto, MediaUploadDto, ProtocolDto, SearchManeuversDto, UpdateManeuversDto } from './dto/maneuvers.dto';

@Injectable()
export class ManeuversService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateManeuversDto) {
    return this.prisma.physicalManeuver.create({
      data: {
        name: dto.name,
        category: dto.category,
        summary: dto.summary,
        procedure: dto.procedure,
        tags: dto.tags ?? [],
        active: dto.active ?? true,
      },
    });
  }

  findAll(query?: SearchManeuversDto) {
    return this.prisma.physicalManeuver.findMany({
      where: {
        category: query?.category,
        tags: query?.tags?.length ? { hasSome: query.tags } : undefined,
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
      data: { evidence: [...evidence, { mediaUrl: dto.mediaUrl, uploadedAt: new Date().toISOString() }] },
    });
  }

  async protocols(dto: ProtocolDto) {
    await this.findOne(dto.maneuverId);
    return this.prisma.physicalManeuver.update({ where: { id: dto.maneuverId }, data: { procedure: dto.protocol } });
  }
}
