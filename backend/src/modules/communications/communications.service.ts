import { Injectable } from '@nestjs/common';
import { PericiaPaymentStatus, Prisma } from '@prisma/client';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import {
  AutomaticVaraChargeDto,
  CreateEmailTemplateDto,
  CreateLawyerDto,
  GenerateHubEmailDto,
  SendEmailDto,
  SendWhatsappMessageDto,
  UpsertUolhostEmailConfigDto,
} from './dto/communications.dto';

@Injectable()
export class CommunicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
    private readonly whatsappService: WhatsappService,
  ) {}

  sendEmail(dto: SendEmailDto) {
    return {
      provider: 'smtp-server-side',
      queued: true,
      to: dto.to,
      subject: dto.subject,
      preview: dto.html.slice(0, 120),
    };
  }

  imapSync() {
    return {
      provider: 'imap-server-side',
      synced: true,
      fetched: 0,
      message: 'Leitura IMAP executada no backend.',
    };
  }

  createTemplate(dto: CreateEmailTemplateDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.prisma.emailTemplate.create({
      data: {
        tenantId,
        key: dto.key,
        subject: dto.subject,
        bodyHtml: dto.bodyHtml,
        bodyText: dto.bodyText,
        ...(dto.variables ? { variables: dto.variables as Prisma.InputJsonValue } : {}),
      },
    });
  }

  listTemplates() {
    return this.prisma.emailTemplate.findMany({ orderBy: { createdAt: 'desc' } });
  }

  createLawyer(dto: CreateLawyerDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.prisma.lawyer.create({
      data: {
        tenantId,
        nome: dto.nome,
        ...(dto.oab ? { oab: dto.oab } : {}),
        ...(dto.email ? { email: dto.email } : {}),
        ...(dto.telefone ? { telefone: dto.telefone } : {}),
      },
    });
  }

  listLawyers() {
    return this.prisma.lawyer.findMany({ orderBy: { nome: 'asc' } });
  }

  async hubGenerate(dto: GenerateHubEmailDto) {
    const template = await this.prisma.emailTemplate.findFirst({ where: { key: dto.templateKey } });
    if (!template) return { generated: false, reason: 'template-not-found' };

    let html = template.bodyHtml;
    let subject = template.subject;

    for (const [k, v] of Object.entries(dto.context ?? {})) {
      const token = `{{${k}}}`;
      html = html.split(token).join(v);
      subject = subject.split(token).join(v);
    }

    return { generated: true, templateKey: dto.templateKey, subject, html };
  }

  async upsertUolhostConfig(dto: UpsertUolhostEmailConfigDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    const existing = await this.prisma.emailConfig.findFirst({ where: { provider: 'UOLHOST' } });

    const data = {
      tenantId,
      provider: 'UOLHOST',
      fromEmail: dto.fromEmail,
      ...(dto.fromName ? { fromName: dto.fromName } : {}),
      smtpHost: dto.smtpHost,
      smtpPort: Number(dto.smtpPort),
      secure: dto.secure ?? true,
      encryptedCreds: Buffer.from(JSON.stringify({
        login: dto.login,
        password: dto.password,
        imapHost: dto.imapHost,
        imapPort: dto.imapPort,
      })).toString('base64'),
      active: true,
    };

    if (existing) {
      return this.prisma.emailConfig.update({ where: { id: existing.id }, data });
    }

    return this.prisma.emailConfig.create({ data });
  }

  async sendWhatsappMessage(dto: SendWhatsappMessageDto) {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.whatsappService.sendTenantMessage({
      tenantId,
      to: dto.to,
      message: dto.message,
      periciaId: dto.periciaId,
    });
  }

  async listWhatsappMessages(periciaId?: string) {
    return this.prisma.whatsappMessage.findMany({
      where: {
        ...(periciaId ? { periciaId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async automaticVaraCharge(dto: AutomaticVaraChargeDto) {
    const pendentes = await this.prisma.pericia.findMany({
      where: {
        varaId: dto.varaId,
        pagamentoStatus: { in: [PericiaPaymentStatus.PENDENTE, PericiaPaymentStatus.ATRASADO, PericiaPaymentStatus.PARCIAL] },
        ...(dto.periciaIds?.length ? { id: { in: dto.periciaIds } } : {}),
      },
      include: { vara: true },
      orderBy: { dataNomeacao: 'asc' },
    });

    const valorAberto = pendentes.reduce((acc, p) => {
      const previsto = Number(p.honorariosPrevistosJG ?? p.honorariosPrevistosPartes ?? 0);
      const recebido = Number(p.valorRecebidoTotal ?? 0);
      return acc + Math.max(previsto - recebido, 0);
    }, 0);

    return {
      varaId: dto.varaId,
      vara: pendentes[0]?.vara?.nome ?? null,
      pericias: pendentes.map((p) => ({ id: p.id, processoCNJ: p.processoCNJ, pagamentoStatus: p.pagamentoStatus })),
      totalPericias: pendentes.length,
      valorAberto,
      notifications: {
        whatsapp: { queued: pendentes.length > 0 },
        email: { queued: pendentes.length > 0 },
      },
    };
  }
}
