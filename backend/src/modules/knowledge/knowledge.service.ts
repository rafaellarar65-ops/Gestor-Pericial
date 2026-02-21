import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CategorizeKnowledgeDto, CreateKnowledgeDto, SearchKnowledgeDto, UpdateKnowledgeDto } from './dto/knowledge.dto';

@Injectable()
export class KnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateKnowledgeDto) {
    return this.prisma.knowledgeItem.create({
      data: {
        title: dto.title,
        category: dto.category,
        content: dto.content,
        source: dto.source,
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
    return this.prisma.knowledgeItem.update({ where: { id }, data: dto });
  }

  async findOne(id: string) {
    const item = await this.prisma.knowledgeItem.findFirst({ where: { id } });
    if (!item) throw new NotFoundException('Knowledge item não encontrado.');
    return item;
  }

  searchFulltext(query: SearchKnowledgeDto) {
    return this.prisma.knowledgeItem.findMany({
      where: {
        category: query.category,
        OR: query.q
          ? [
              { title: { contains: query.q, mode: 'insensitive' } },
              { source: { contains: query.q, mode: 'insensitive' } },
            ]
          : undefined,
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
