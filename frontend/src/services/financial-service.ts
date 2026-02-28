import { apiClient } from '@/lib/api-client';
import type { ApiListResponse, Despesa, FinancialAnalytics, FinancialItem, Recebimento } from '@/types/api';



type FinancialImportSource = 'AI_PRINT' | 'MANUAL_CSV' | 'INDIVIDUAL';

type ImportRecebimentoItemPayload = {
  processoCNJ: string;
  fontePagamento: string;
  dataRecebimento: string;
  valorBruto: number;
  valorLiquido?: number;
  imposto?: number;
  descricao?: string;
};

type ImportBatchResult = {
  batchId: string;
  source: FinancialImportSource;
  itemsLinked: number;
  itemsUnmatched: number;
  gross: number;
  net: number;
  tax: number;
  count: number;
};

type RecebimentoRaw = {
  id: string;
  fontePagamento: string;
  valorBruto: string | number;
  valorLiquido?: string | number;
  descricao?: string;
  dataRecebimento?: string;
  periciaId?: string;
  createdAt?: string;
};

export const financialService = {
  list: async (): Promise<ApiListResponse<FinancialItem>> => {
    const { data } = await apiClient.get<RecebimentoRaw[] | ApiListResponse<FinancialItem>>('/financial/recebimentos');
    if (Array.isArray(data)) {
      const items: FinancialItem[] = data.map((r) => ({
        id: r.id,
        referencia: r.descricao ?? r.fontePagamento,
        valor: Number(r.valorBruto),
        status: 'A_RECEBER' as const,
      }));
      return { items, total: items.length, page: 1, pageSize: items.length };
    }
    return data;
  },

  listRecebimentos: async (): Promise<Recebimento[]> => {
    const { data } = await apiClient.get<Recebimento[]>('/financial/recebimentos');
    return Array.isArray(data) ? data : [];
  },

  createRecebimento: async (payload: {
    periciaId?: string;
    fontePagamento: string;
    dataRecebimento: string;
    valorBruto: number;
    valorLiquido?: number;
    descricao?: string;
  }): Promise<Recebimento> => {
    const { data } = await apiClient.post<Recebimento>('/financial/recebimentos', payload);
    return data;
  },

  listDespesas: async (): Promise<Despesa[]> => {
    const { data } = await apiClient.get<Despesa[]>('/financial/despesas');
    return Array.isArray(data) ? data : [];
  },

  createDespesa: async (payload: {
    categoria: string;
    descricao: string;
    valor: number;
    dataCompetencia: string;
    periciaId?: string;
  }): Promise<Despesa> => {
    const { data } = await apiClient.post<Despesa>('/financial/despesas', payload);
    return data;
  },



  importBatch: async (source: FinancialImportSource, payload: { rows: ImportRecebimentoItemPayload[]; sourceFileName?: string }): Promise<ImportBatchResult> => {
    const pathBySource: Record<FinancialImportSource, string> = {
      AI_PRINT: '/financial/import-batch/ai-print',
      MANUAL_CSV: '/financial/import-batch/manual-csv',
      INDIVIDUAL: '/financial/import-batch/individual',
    };
    const { data } = await apiClient.post<ImportBatchResult>(pathBySource[source], payload);
    return data;
  },

  analytics: async (): Promise<FinancialAnalytics> => {
    const { data } = await apiClient.get<FinancialAnalytics>('/financial/analytics');
    return data;
  },
};
