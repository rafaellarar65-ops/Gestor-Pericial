import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmailTemplateDto, CreateLawyerDto, GenerateHubEmailDto, SendEmailDto } from './dto/communications.dto';

@Injectable()
export class CommunicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService = new RequestContextService(),
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
}
