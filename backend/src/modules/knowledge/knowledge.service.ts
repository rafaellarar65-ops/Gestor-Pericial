import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CategorizeKnowledgeDto, CreateKnowledgeDto, SearchKnowledgeDto, UpdateKnowledgeDto } from './dto/knowledge.dto';

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService = new RequestContextService(),
  ) {}

  create(dto: CreateKnowledgeDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.prisma.knowledgeItem.create({
      data: {
        tenantId,
        title: dto.title,
        ...(dto.category ? { category: dto.category } : {}),
        ...(dto.content ? { content: dto.content as Prisma.InputJsonValue } : {}),
        tags: dto.tags ?? [],
        active: dto.active ?? true,
      },
    });
  }

  findAll() {
    return this.prisma.knowledgeItem.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async update(id: string, dto: UpdateKnowledgeDto) {
    await this.findOne(id);
    return this.prisma.knowledgeItem.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title } : {}),
        ...(dto.category ? { category: dto.category } : {}),
        ...(dto.content ? { content: dto.content as Prisma.InputJsonValue } : {}),
        ...(dto.tags ? { tags: dto.tags } : {}),
        ...(typeof dto.active === 'boolean' ? { active: dto.active } : {}),
      },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.knowledgeItem.findFirst({ where: { id } });
    if (!item) throw new NotFoundException('Knowledge item não encontrado.');
    return item;
  }

  searchFulltext(query: SearchKnowledgeDto) {
    return this.prisma.knowledgeItem.findMany({
      where: {
        ...(query.category ? { category: query.category } : {}),
        ...(query.q
          ? {
              OR: [
                { title: { contains: query.q, mode: 'insensitive' } },
                { source: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async categorize(dto: CategorizeKnowledgeDto) {
    await this.findOne(dto.itemId);
    return this.prisma.knowledgeItem.update({ where: { id: dto.itemId }, data: { category: dto.category } });
  }
}
