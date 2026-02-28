import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequestContextService } from '../../common/request-context.service';
import { ConfigResource, CreateConfigDomainDto, UpdateConfigDomainDto } from './dto/config.dto';

@Injectable()
export class ConfigDomainService {
  private static readonly DASHBOARD_SETTINGS_PROVIDER = 'dashboard_queue_rules';

  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
  ) {}

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

  async getDashboardSettings() {
    const tenantId = this.context.get('tenantId') ?? '';
    const row = await this.prisma.integrationSettings.findUnique({
      where: {
        tenantId_provider: {
          tenantId,
          provider: ConfigDomainService.DASHBOARD_SETTINGS_PROVIDER,
        },
      },
    });

    return {
      provider: ConfigDomainService.DASHBOARD_SETTINGS_PROVIDER,
      config: this.mergeDashboardSettings(row?.config),
    };
  }

  async updateDashboardSettings(payload: Record<string, unknown>) {
    const tenantId = this.context.get('tenantId') ?? '';
    const config = this.mergeDashboardSettings(payload);

    const saved = await this.prisma.integrationSettings.upsert({
      where: {
        tenantId_provider: {
          tenantId,
          provider: ConfigDomainService.DASHBOARD_SETTINGS_PROVIDER,
        },
      },
      create: {
        tenantId,
        provider: ConfigDomainService.DASHBOARD_SETTINGS_PROVIDER,
        config,
        active: true,
      },
      update: {
        config,
        active: true,
      },
    });

    return { provider: saved.provider, config };
  }

  private mergeDashboardSettings(config: unknown) {
    const safe = typeof config === 'object' && config !== null ? (config as Record<string, unknown>) : {};
    const asStringArray = (value: unknown, fallback: string[]) =>
      Array.isArray(value)
        ? value.map((item) => String(item).trim()).filter(Boolean)
        : fallback;

    return {
      nomeacoesGroups: {
        avaliar: asStringArray(safe.nomeacoesGroups && (safe.nomeacoesGroups as Record<string, unknown>).avaliar, ['NOVA_NOMEACAO', 'AVALIAR']),
        aceiteHonorarios: asStringArray(
          safe.nomeacoesGroups && (safe.nomeacoesGroups as Record<string, unknown>).aceiteHonorarios,
          ['AGUARDANDO_ACEITE', 'ACEITE_HONORARIOS'],
        ),
        majorarHonorarios: asStringArray(
          safe.nomeacoesGroups && (safe.nomeacoesGroups as Record<string, unknown>).majorarHonorarios,
          ['A_MAJORAR', 'MAJORAR_HONORARIOS'],
        ),
        observacaoExtra: asStringArray(
          safe.nomeacoesGroups && (safe.nomeacoesGroups as Record<string, unknown>).observacaoExtra,
          ['OBSERVACAO_EXTRA', 'COM_OBSERVACAO'],
        ),
      },
      dashboard: {
        avaliarStatusCodigos: asStringArray(
          safe.dashboard && (safe.dashboard as Record<string, unknown>).avaliarStatusCodigos,
          ['AVALIAR', 'ST_AVALIAR', 'NOMEADA', 'ACEITA', 'NOVA_NOMEACAO'],
        ),
        avaliarStatusNomeTermos: asStringArray(
          safe.dashboard && (safe.dashboard as Record<string, unknown>).avaliarStatusNomeTermos,
          ['avaliar'],
        ),
        enviarLaudoStatusCodigos: asStringArray(
          safe.dashboard && (safe.dashboard as Record<string, unknown>).enviarLaudoStatusCodigos,
          ['ENVIAR_LAUDO', 'EM_LAUDO'],
        ),
        enviarLaudoStatusNomeTermos: asStringArray(
          safe.dashboard && (safe.dashboard as Record<string, unknown>).enviarLaudoStatusNomeTermos,
          ['enviar laudo', 'em laudo'],
        ),
      },
      filas: {
        agendamentoBloqueiaTermosStatus: asStringArray(
          safe.filas && (safe.filas as Record<string, unknown>).agendamentoBloqueiaTermosStatus,
          ['FINALIZ', 'LAUDO', 'ESCLAR', 'ARQUIV'],
        ),
        laudosUrgenciaTermosStatus: asStringArray(
          safe.filas && (safe.filas as Record<string, unknown>).laudosUrgenciaTermosStatus,
          ['URGENTE'],
        ),
      },
    };
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
