import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigResource, CreateConfigDomainDto, UpdateConfigDomainDto } from './dto/config.dto';

@Injectable()
export class ConfigDomainService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(resource: ConfigResource) {
    return this.getDelegate(resource).findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(resource: ConfigResource, id: string) {
    const record = await this.getDelegate(resource).findFirst({ where: { id } });
    if (!record) throw new NotFoundException(`Item não encontrado em ${resource}.`);
    return record;
  }

  create(resource: ConfigResource, dto: CreateConfigDomainDto) {
    const delegate = this.getDelegate(resource);

    switch (resource) {
      case 'cidades':
        return delegate.create({ data: { nome: dto.nome, uf: dto.uf ?? 'MG', ibgeCode: dto.codigo } });
      case 'varas':
        return delegate.create({ data: { nome: dto.nome, codigo: dto.codigo, cidadeId: dto.cidadeId, tribunalId: dto.tribunalId } });
      case 'tipos-pericia':
        return delegate.create({ data: { nome: dto.nome, codigo: dto.codigo, ativo: dto.ativo ?? true } });
      case 'modalidades':
        return delegate.create({ data: { nome: dto.nome, codigo: dto.codigo, ativo: dto.ativo ?? true } });
      case 'status':
        return delegate.create({ data: { nome: dto.nome, codigo: dto.codigo, cor: dto.cor, ativo: dto.ativo ?? true } });
      case 'locais':
        return delegate.create({ data: { nome: dto.nome, endereco: dto.endereco, cidadeId: dto.cidadeId } });
      case 'tribunais':
        return delegate.create({ data: { nome: dto.nome, sigla: dto.codigo, esfera: dto.uf } });
      default:
        return delegate.create({ data: dto });
    }
  }

  async update(resource: ConfigResource, id: string, dto: UpdateConfigDomainDto) {
    await this.findOne(resource, id);

    const delegate = this.getDelegate(resource);
    if (resource === 'tribunais') {
      return delegate.update({ where: { id }, data: { nome: dto.nome, sigla: dto.codigo, esfera: dto.cor } });
    }

    if (resource === 'cidades') {
      return delegate.update({ where: { id }, data: { nome: dto.nome, ibgeCode: dto.codigo } });
    }

    return delegate.update({ where: { id }, data: dto });
  }

  async remove(resource: ConfigResource, id: string) {
    await this.findOne(resource, id);
    await this.getDelegate(resource).delete({ where: { id } });
    return { id, removed: true };
  }

  private getDelegate(resource: ConfigResource): any {
    const delegates = {
      cidades: this.prisma.cidade,
      varas: this.prisma.vara,
      'tipos-pericia': this.prisma.tipoPericia,
      modalidades: this.prisma.modalidade,
      status: this.prisma.status,
      locais: this.prisma.local,
      tribunais: this.prisma.tribunal,
    } as const;

    return delegates[resource];
  }
}
