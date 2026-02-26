import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Prisma } from '@prisma/client';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AutocompleteDto, GenerateReportDto, ReprocessPericiaDto } from './dto/pericia-inteligente.dto';

interface GeminiCandidate {
  content?: {
    parts?: Array<{ text?: string }>;
  };
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

@Injectable()
export class PericiaInteligenteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
  ) {}

  async extractInitialFromPdf(periciaId: string, file: Express.Multer.File) {
    const pericia = await this.assertPericia(periciaId);
    const pdfBase64 = file.buffer.toString('base64');

    const prompt = `Você é um perito médico judicial sênior. Leia o PDF do processo e responda SOMENTE JSON válido com o formato:
{
  "dadosProcesso": {
    "nomePericiado": "",
    "vara": "",
    "dataNomeacao": "",
    "resumoCaso": "",
    "quesitosPrincipais": []
  },
  "manobrasFisicasIniciais": []
}`;

    const aiJson = await this.callGeminiJson([
      { text: prompt },
      { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } },
    ]);

    const extracted = aiJson as Record<string, unknown>;
    const manobras = Array.isArray(extracted.manobrasFisicasIniciais)
      ? (extracted.manobrasFisicasIniciais as string[])
      : [];

    const aiAnalysisPayload: Prisma.InputJsonValue = {
      ...(extracted as Prisma.InputJsonObject),
      extractedAt: new Date().toISOString(),
      sourceFileName: file.originalname,
    };

    const sectionsPayload: Prisma.InputJsonValue = {
      exameFisico: '',
      discussao: '',
      manobrasIniciais: manobras,
    };

    await this.prisma.preLaudo.upsert({
      where: { periciaId },
      update: {
        aiAnalysis: aiAnalysisPayload,
        sections: sectionsPayload,
        initialProcessJson: aiAnalysisPayload,
        initialManeuvers: manobras,
      },
      create: {
        tenantId: pericia.tenantId,
        periciaId,
        aiAnalysis: aiAnalysisPayload,
        sections: sectionsPayload,
        initialProcessJson: aiAnalysisPayload,
        initialManeuvers: manobras,
      },
    });

    return extracted;
  }

  async reprocessDiscussion(periciaId: string, dto: ReprocessPericiaDto) {
    const preLaudo = await this.prisma.preLaudo.findUnique({ where: { periciaId } });
    if (!preLaudo) throw new NotFoundException('Pré-laudo não encontrado para reprocessamento.');

    const prompt = `Atue como um perito sênior. Analise o histórico do processo, os achados do exame físico descritos e as imagens anexadas. Elabore uma Discussão Técnica correlacionando os achados com literatura científica aplicável. Responda JSON: {"discussaoTecnica":"..."}`;

    const parts: Array<Record<string, unknown>> = [
      {
        text: `${prompt}\n\nHistórico JSON:\n${JSON.stringify(preLaudo.initialProcessJson ?? preLaudo.aiAnalysis ?? {}, null, 2)}\n\nExame físico:\n${dto.exameFisicoTexto}`,
      },
    ];

    for (const image of dto.imagensBase64 ?? []) {
      const parsed = this.parseDataUrl(image);
      parts.push({ inlineData: { mimeType: parsed.mimeType, data: parsed.base64 } });
    }

    const aiJson = await this.callGeminiJson(parts);
    const discussao = typeof aiJson.discussaoTecnica === 'string' ? aiJson.discussaoTecnica : '';

    await this.prisma.preLaudo.update({
      where: { periciaId },
      data: {
        exameFisicoTexto: dto.exameFisicoTexto,
        discussaoTecnicaTexto: discussao,
      },
    });

    return { discussaoTecnica: discussao };
  }


  async autocomplete(periciaId: string, dto: AutocompleteDto) {
    const preLaudo = await this.prisma.preLaudo.findUnique({ where: { periciaId } });
    if (!preLaudo) throw new NotFoundException('Pré-laudo não encontrado para autocomplete.');

    const context = {
      processo: preLaudo.initialProcessJson ?? preLaudo.aiAnalysis ?? {},
      campo: dto.campo,
      textoAtual: dto.textoAtual,
      contextoCliente: dto.contexto ?? {},
    };

    const prompt = `Continue o texto de ${dto.campo} com linguagem técnica, médica e forense. Não invente dados; mantenha coerência com o contexto.`;
    const result = await this.callGeminiText(`${prompt}\n\nContexto: ${JSON.stringify(context)}`);

    return { completion: result };
  }

  async saveDocxTemplate(periciaId: string, file: Express.Multer.File) {
    await this.assertPericia(periciaId);
    if (!file.originalname.toLowerCase().endsWith('.docx')) {
      throw new BadRequestException('Template deve ser .docx');
    }

    const tenantId = this.mustTenantId();
    const dir = join(process.cwd(), 'storage', 'templates', tenantId);
    await mkdir(dir, { recursive: true });

    const fileName = `${periciaId}-${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
    const path = join(dir, fileName);
    await writeFile(path, file.buffer);

    await this.prisma.preLaudo.upsert({
      where: { periciaId },
      update: { templateDocxPath: path, templateName: file.originalname },
      create: {
        tenantId,
        periciaId,
        templateDocxPath: path,
        templateName: file.originalname,
      },
    });

    return { templateDocxPath: path, templateName: file.originalname };
  }

  async saveTemplatePath(periciaId: string, templateDocxPath: string, templateName?: string) {
    const pericia = await this.assertPericia(periciaId);

    await this.prisma.preLaudo.upsert({
      where: { periciaId },
      update: { templateDocxPath, templateName },
      create: {
        tenantId: pericia.tenantId,
        periciaId,
        templateDocxPath,
        templateName,
      },
    });

    return { ok: true };
  }

  async generateReport(periciaId: string, dto: GenerateReportDto) {
    const preLaudo = await this.prisma.preLaudo.findUnique({ where: { periciaId } });
    if (!preLaudo?.templateDocxPath) {
      throw new BadRequestException('Template DOCX não configurado para esta perícia.');
    }

    const templateBinary = await readFile(preLaudo.templateDocxPath);
    const filledDocxBase64 = templateBinary.toString('base64');

    const reportPayload = {
      nome_periciado: dto.nomePericiado ?? '',
      exame_fisico: dto.exameFisico ?? preLaudo.exameFisicoTexto ?? '',
      discussao: dto.discussao ?? preLaudo.discussaoTecnicaTexto ?? '',
    };

    const dir = join(process.cwd(), 'storage', 'reports');
    await mkdir(dir, { recursive: true });
    const pdfPath = join(dir, `${periciaId}-${randomUUID()}.pdf`);

    await writeFile(
      pdfPath,
      Buffer.from(
        `Placeholder PDF bytes. Integre docxtemplater + libreoffice/Gotenberg em produção.\nPayload: ${JSON.stringify(reportPayload)}`,
      ),
    );

    await this.prisma.preLaudo.update({
      where: { periciaId },
      data: { lastGeneratedPdfPath: pdfPath },
    });

    return {
      templateDocxBase64: filledDocxBase64,
      pdfPath,
      reportPayload,
      message: 'DOCX carregado e PDF placeholder gerado. Substituir por docxtemplater/libreoffice-convert em produção.',
    };
  }

  private async assertPericia(periciaId: string) {
    const tenantId = this.mustTenantId();
    const pericia = await this.prisma.pericia.findFirst({ where: { id: periciaId, tenantId } });
    if (!pericia) throw new NotFoundException('Perícia não encontrada.');
    return pericia;
  }

  private mustTenantId() {
    const tenantId = this.context.get('tenantId');
    if (!tenantId) throw new BadRequestException('Tenant não encontrado no contexto da requisição.');
    return tenantId;
  }

  private parseDataUrl(value: string): { mimeType: string; base64: string } {
    if (value.startsWith('data:')) {
      const [meta, base64] = value.split(',', 2);
      const mimeType = meta.split(';')[0].replace('data:', '') || 'image/jpeg';
      return { mimeType, base64 };
    }

    return { mimeType: 'image/jpeg', base64: value };
  }

  private async callGeminiText(prompt: string) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new InternalServerErrorException('GEMINI_API_KEY não configurada no backend.');

    const model = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
    });

    if (!response.ok) throw new InternalServerErrorException(`Falha no Gemini: ${await response.text()}`);

    const data = (await response.json()) as GeminiResponse;
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  }

  private async callGeminiJson(parts: Array<Record<string, unknown>>) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException('GEMINI_API_KEY não configurada no backend.');
    }

    const model = process.env.GEMINI_MODEL ?? 'gemini-1.5-flash';
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      throw new InternalServerErrorException(`Falha no Gemini: ${detail}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new InternalServerErrorException('Gemini não retornou conteúdo textual.');

    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new InternalServerErrorException('Resposta da IA não está em JSON válido.');
    }
  }
}
