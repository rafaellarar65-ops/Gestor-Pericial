import { Injectable, NotFoundException } from '@nestjs/common';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBioimpedanceDto } from './dto/bioimpedance.dto';

// AI field mappings for legacy bioimpedance data (PR #130)
const LEGACY_FIELD_MAP: Record<string, keyof CreateBioimpedanceDto> = {
  weight: 'peso',
  height: 'altura',
  body_fat: 'gorduraCorporal',
  fat_percent: 'gorduraCorporal',
  lean_mass: 'massaMagra',
  water_percent: 'aguaCorporal',
  bone_mass: 'massaOssea',
  bmr: 'taxaMetabolica',
  metabolic_age: 'idadeCorporal',
  bmi: 'imc',
};

function normalizeLegacyFields(metadata: Record<string, unknown>): Partial<CreateBioimpedanceDto> {
  const normalized: Partial<CreateBioimpedanceDto> = {};
  for (const [key, value] of Object.entries(metadata)) {
    const mapped = LEGACY_FIELD_MAP[key];
    if (mapped && value !== null && value !== undefined) {
      (normalized as Record<string, unknown>)[mapped] = Number(value);
    }
  }
  return normalized;
}

function calculateDerivedFields(dto: CreateBioimpedanceDto): Partial<CreateBioimpedanceDto> {
  const derived: Partial<CreateBioimpedanceDto> = {};
  if (dto.peso && dto.altura && !dto.imc) {
    derived.imc = Math.round((dto.peso / (dto.altura * dto.altura)) * 10) / 10;
  }
  return derived;
}

function buildAiAnalysis(dto: CreateBioimpedanceDto): Record<string, unknown> {
  const analysis: Record<string, unknown> = {};

  if (dto.imc ?? (dto.peso && dto.altura)) {
    const imc = dto.imc ?? dto.peso! / (dto.altura! * dto.altura!);
    if (imc < 18.5) analysis.classificacaoImc = 'Abaixo do peso';
    else if (imc < 25) analysis.classificacaoImc = 'Peso normal';
    else if (imc < 30) analysis.classificacaoImc = 'Sobrepeso';
    else analysis.classificacaoImc = 'Obesidade';
    analysis.imcCalculado = Math.round(imc * 10) / 10;
  }

  if (dto.gorduraCorporal !== undefined) {
    if (dto.gorduraCorporal < 10) analysis.classificacaoGordura = 'Atlético';
    else if (dto.gorduraCorporal < 20) analysis.classificacaoGordura = 'Boa forma';
    else if (dto.gorduraCorporal < 25) analysis.classificacaoGordura = 'Normal';
    else if (dto.gorduraCorporal < 30) analysis.classificacaoGordura = 'Acima do normal';
    else analysis.classificacaoGordura = 'Obesidade';
  }

  analysis.geradoEm = new Date().toISOString();
  return analysis;
}

@Injectable()
export class BioimpedanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
  ) {}

  listByPericia(periciaId: string) {
    const tenantId = this.context.get('tenantId') ?? '';
    return this.prisma.bioimpedance.findMany({
      where: { tenantId, periciaId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateBioimpedanceDto) {
    const tenantId = this.context.get('tenantId') ?? '';

    // Merge legacy fields from metadata (PR #130 compatibility)
    const legacyFields = dto.metadata ? normalizeLegacyFields(dto.metadata as Record<string, unknown>) : {};
    const merged: CreateBioimpedanceDto = { ...legacyFields, ...dto };

    // Calculate derived fields
    const derived = calculateDerivedFields(merged);
    const final = { ...merged, ...derived };

    // Build AI analysis metadata
    const aiAnalysis = buildAiAnalysis(final);

    return this.prisma.bioimpedance.create({
      data: {
        tenantId,
        periciaId: final.periciaId,
        ...(final.peso !== undefined ? { peso: final.peso } : {}),
        ...(final.altura !== undefined ? { altura: final.altura } : {}),
        ...(final.imc !== undefined ? { imc: final.imc } : {}),
        ...(final.gorduraCorporal !== undefined ? { gorduraCorporal: final.gorduraCorporal } : {}),
        ...(final.massaMagra !== undefined ? { massaMagra: final.massaMagra } : {}),
        ...(final.aguaCorporal !== undefined ? { aguaCorporal: final.aguaCorporal } : {}),
        ...(final.massaOssea !== undefined ? { massaOssea: final.massaOssea } : {}),
        ...(final.taxaMetabolica !== undefined ? { taxaMetabolica: Math.round(final.taxaMetabolica) } : {}),
        ...(final.idadeCorporal !== undefined ? { idadeCorporal: Math.round(final.idadeCorporal) } : {}),
        metadata: (final.metadata as object | undefined) ?? undefined,
        aiAnalysis,
      },
    });
  }

  async findOne(id: string) {
    const tenantId = this.context.get('tenantId') ?? '';
    const record = await this.prisma.bioimpedance.findFirst({ where: { id, tenantId } });
    if (!record) throw new NotFoundException('Registro de bioimpedância não encontrado.');
    return record;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.bioimpedance.delete({ where: { id } });
    return { deleted: true, id };
  }
}
