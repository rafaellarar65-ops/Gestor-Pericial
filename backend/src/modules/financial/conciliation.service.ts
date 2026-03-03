import { Injectable, NotFoundException } from '@nestjs/common';
import { PaymentMatchStatus, Prisma } from '@prisma/client';
import { RequestContextService } from '../../common/request-context.service';
import { PrismaService } from '../../prisma/prisma.service';

type RawUnmatchedData = {
  cnj?: string;
  description?: string;
  source?: string;
  vara?: string;
  [key: string]: unknown;
};

type MatchableTransaction = {
  id: string;
  amount?: Prisma.Decimal | null;
  rawData?: Prisma.JsonValue;
};

type MatchablePericia = {
  id: string;
  processoCNJ: string;
  honorariosPrevistosJG: Prisma.Decimal | null;
  honorariosPrevistosPartes: Prisma.Decimal | null;
  vara: {
    nome: string;
  } | null;
};

export type ConciliationSuggestion = {
  periciaId: string;
  score: number;
  components: {
    cnj: number;
    amount: number;
    vara: number;
  };
  matchedFields: {
    transactionCnj: string;
    periciaCnj: string;
    transactionVara: string;
    periciaVara: string;
  };
};

@Injectable()
export class ConciliationService {
  private static readonly THRESHOLD = 70;

  constructor(
    private readonly prisma: PrismaService,
    private readonly context: RequestContextService,
  ) {}

  normalizeCNJ(value?: string | null): string {
    return (value ?? '').replace(/\D/g, '');
  }

  normalizeDescription(value?: string | null): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  normalizeVara(value?: string | null): string {
    return this.normalizeDescription(value)
      .replace(/\bvara\b/g, '')
      .replace(/\bjuizado\b/g, '')
      .replace(/\bcivel\b/g, 'civel')
      .replace(/\s+/g, ' ')
      .trim();
  }

  textSimilarity(valueA?: string | null, valueB?: string | null): number {
    const a = this.normalizeDescription(valueA);
    const b = this.normalizeDescription(valueB);

    if (!a || !b) return 0;
    if (a === b) return 100;

    const distance = this.levenshteinDistance(a, b);
    const maxLength = Math.max(a.length, b.length);
    if (maxLength === 0) return 100;

    const similarity = (1 - distance / maxLength) * 100;
    return Math.max(0, Math.min(100, Math.round(similarity)));
  }

  findMatches(transaction: MatchableTransaction, pericias: MatchablePericia[]): ConciliationSuggestion[] {
    const raw = (transaction.rawData ?? {}) as RawUnmatchedData;
    const transactionCnj = this.normalizeCNJ(raw.cnj);
    const transactionDescription = this.normalizeDescription(raw.description);
    const transactionVara = this.normalizeVara(raw.vara ?? raw.source ?? raw.description);
    const transactionAmount = Number(transaction.amount ?? 0);

    const suggestions = pericias
      .map((pericia) => {
        const periciaCnj = this.normalizeCNJ(pericia.processoCNJ);
        const periciaVara = this.normalizeVara(pericia.vara?.nome);

        const cnjSimilarity = this.cnpjLikeSimilarity(transactionCnj, periciaCnj);

        const expectedAmount = Number(pericia.honorariosPrevistosJG ?? pericia.honorariosPrevistosPartes ?? 0);
        const amountSimilarity = this.amountSimilarity(transactionAmount, expectedAmount);

        const varaSimilarity = transactionVara && periciaVara
          ? this.textSimilarity(transactionVara, periciaVara)
          : this.textSimilarity(transactionDescription, periciaVara);

        const weightedCnj = Math.round((cnjSimilarity / 100) * 50);
        const weightedAmount = Math.round((amountSimilarity / 100) * 30);
        const weightedVara = Math.round((varaSimilarity / 100) * 20);
        const score = weightedCnj + weightedAmount + weightedVara;

        return {
          periciaId: pericia.id,
          score,
          components: {
            cnj: weightedCnj,
            amount: weightedAmount,
            vara: weightedVara,
          },
          matchedFields: {
            transactionCnj,
            periciaCnj,
            transactionVara,
            periciaVara,
          },
        } satisfies ConciliationSuggestion;
      })
      .filter((suggestion) => suggestion.score >= ConciliationService.THRESHOLD)
      .sort((a, b) => b.score - a.score);

    return suggestions;
  }

  async runForTransaction(transactionId: string) {
    const tenantId = this.context.get('tenantId') ?? '';

    const transaction = await this.prisma.unmatchedPayment.findFirst({
      where: { id: transactionId, tenantId },
      select: { id: true, amount: true, rawData: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transação não encontrada para conciliação.');
    }

    const pericias = await this.prisma.pericia.findMany({
      where: { tenantId },
      select: {
        id: true,
        processoCNJ: true,
        honorariosPrevistosJG: true,
        honorariosPrevistosPartes: true,
        vara: {
          select: { nome: true },
        },
      },
    });

    const suggestions = this.findMatches(transaction, pericias);
    await this.persistSuggestions(transactionId, transaction.rawData, suggestions);

    return {
      transactionId,
      threshold: ConciliationService.THRESHOLD,
      totalSuggestions: suggestions.length,
      suggestions,
    };
  }

  async runBatch(transactionIds?: string[]) {
    const tenantId = this.context.get('tenantId') ?? '';
    const filterIds = transactionIds?.length ? transactionIds : undefined;

    const [transactions, pericias] = await this.prisma.$transaction([
      this.prisma.unmatchedPayment.findMany({
        where: {
          tenantId,
          matchStatus: { in: [PaymentMatchStatus.UNMATCHED, PaymentMatchStatus.PARTIAL] },
          ...(filterIds ? { id: { in: filterIds } } : {}),
        },
        select: { id: true, amount: true, rawData: true },
      }),
      this.prisma.pericia.findMany({
        where: { tenantId },
        select: {
          id: true,
          processoCNJ: true,
          honorariosPrevistosJG: true,
          honorariosPrevistosPartes: true,
          vara: {
            select: { nome: true },
          },
        },
      }),
    ]);

    const persisted = await Promise.all(
      transactions.map(async (transaction) => {
        const suggestions = this.findMatches(transaction, pericias);
        await this.persistSuggestions(transaction.id, transaction.rawData, suggestions);
        return {
          transactionId: transaction.id,
          suggestionsCount: suggestions.length,
        };
      }),
    );

    return {
      threshold: ConciliationService.THRESHOLD,
      processed: transactions.length,
      persisted,
    };
  }

  async getSuggestions(transactionId: string) {
    const tenantId = this.context.get('tenantId') ?? '';
    const transaction = await this.prisma.unmatchedPayment.findFirst({
      where: { id: transactionId, tenantId },
      select: { id: true, rawData: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transação não encontrada.');
    }

    const raw = (transaction.rawData ?? {}) as RawUnmatchedData & {
      conciliation?: {
        threshold?: number;
        calculatedAt?: string;
        suggestions?: ConciliationSuggestion[];
      };
    };

    const saved = raw.conciliation;

    return {
      transactionId: transaction.id,
      threshold: saved?.threshold ?? ConciliationService.THRESHOLD,
      calculatedAt: saved?.calculatedAt ?? null,
      suggestions: (saved?.suggestions ?? []).sort((a, b) => b.score - a.score),
    };
  }

  private async persistSuggestions(transactionId: string, rawData: Prisma.JsonValue | null, suggestions: ConciliationSuggestion[]) {
    const baseRaw = ((rawData ?? {}) as RawUnmatchedData & { conciliation?: Record<string, unknown> });

    const nextRaw = {
      ...baseRaw,
      conciliation: {
        threshold: ConciliationService.THRESHOLD,
        calculatedAt: new Date().toISOString(),
        suggestions: [...suggestions].sort((a, b) => b.score - a.score),
      },
    };

    await this.prisma.unmatchedPayment.update({
      where: { id: transactionId },
      data: {
        rawData: nextRaw as Prisma.InputJsonValue,
      },
    });
  }

  private cnpjLikeSimilarity(cnjA: string, cnjB: string): number {
    if (!cnjA || !cnjB) return 0;
    if (cnjA === cnjB) return 100;
    if (cnjA.includes(cnjB) || cnjB.includes(cnjA)) return 95;
    return this.textSimilarity(cnjA, cnjB);
  }

  private amountSimilarity(amountA: number, amountB: number): number {
    if (!amountA || !amountB) return 0;

    const diff = Math.abs(amountA - amountB);
    const base = Math.max(amountA, amountB);
    if (!base) return 0;

    const similarity = (1 - diff / base) * 100;
    return Math.max(0, Math.min(100, Math.round(similarity)));
  }

  private levenshteinDistance(a: string, b: string): number {
    const rows = a.length + 1;
    const cols = b.length + 1;
    const matrix = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0));

    for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
    for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

    for (let i = 1; i < rows; i += 1) {
      for (let j = 1; j < cols; j += 1) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost,
        );
      }
    }

    return matrix[a.length][b.length];
  }
}
