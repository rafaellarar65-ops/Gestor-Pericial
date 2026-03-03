import { apiClient } from '@/lib/api-client';
import type {
  ApiListResponse,
  ConciliationStats,
  CsvImportSource,
  Despesa,
  FinancialAnalytics,
  FinancialImportBatch,
  FinancialImportResult,
  FinancialItem,
  RevenueForecast,
  Recebimento,
  UnmatchedPayment,
  UnmatchedPaymentOrigin,
  UnmatchedPaymentSplitPayload,
  UnmatchedPaymentSplitResult,
} from '@/types/api';



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

export type FinancialAiPrintResponse = {
  global: {
    totalBruto?: number | string;
    totalLiquido?: number | string;
    totalImpostos?: number | string;
    dataPagamento?: string;
    detectedSource?: string;
  };
  items: Array<{
    cnj?: string;
    bruto?: number | string;
    desconto?: number | string;
    liquido?: number | string;
    data?: string;
    status?: string;
    periciaId?: string;
  }>;
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

  listRecebimentos: async (search?: string): Promise<RecebimentoListItem[]> => {
    const { data } = await apiClient.get<RecebimentoListItem[]>('/financial/recebimentos', {
      params: search ? { search } : undefined,
    });
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

  updateRecebimento: async (
    id: string,
    payload: { dataRecebimento: string; origem: string; valorLiquido?: number; descricao?: string },
  ): Promise<Recebimento> => {
    const { data } = await apiClient.patch<Recebimento>(`/financial/recebimentos/${id}`, payload);
    return data;
  },

  bulkDeleteRecebimentos: async (ids: string[]): Promise<{ deleted: number }> => {
    const { data } = await apiClient.post<{ deleted: number }>('/financial/recebimentos/bulk-delete', { ids });
    return data;
  },

  listImportBatches: async (): Promise<ImportBatch[]> => {
    const { data } = await apiClient.get<ImportBatch[]>('/financial/import-batches');
    return Array.isArray(data) ? data : [];
  },

  revertImportBatch: async (id: string): Promise<{ reverted: boolean; deletedRecebimentos?: number }> => {
    const { data } = await apiClient.post<{ reverted: boolean; deletedRecebimentos?: number }>(`/financial/import-batches/${id}/revert`);
    return data;
  },

  deleteImportBatch: async (id: string): Promise<{ deletedBatchId: string; deletedRecebimentos: number }> => {
    const { data } = await apiClient.delete<{ deletedBatchId: string; deletedRecebimentos: number }>(`/financial/import-batches/${id}`);
    return data;
  },

  clearAllFinancialData: async (): Promise<{
    deletedRecebimentos: number;
    deletedUnmatchedPayments: number;
    deletedImportBatches: number;
  }> => {
    const { data } = await apiClient.post('/financial/clear-all-financial-data');
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

  listUnmatchedPayments: async (): Promise<UnmatchedPayment[]> => {
    const { data } = await apiClient.get<UnmatchedPayment[]>('/financial/unmatched');
    return Array.isArray(data) ? data : [];
  },

  linkUnmatchedPayment: async (id: string, payload: { periciaId?: string; note?: string }): Promise<UnmatchedPayment> => {
    const { data } = await apiClient.post<UnmatchedPayment>(`/financial/unmatched/${id}/link`, payload);
    return data;
  },

  updateUnmatchedPayment: async (
    id: string,
    payload: {
      amount?: number;
      receivedAt?: string;
      payerName?: string;
      cnj?: string;
      description?: string;
      source?: string;
      origin?: UnmatchedPaymentOrigin;
      notes?: string;
    },
  ): Promise<UnmatchedPayment> => {
    const { data } = await apiClient.patch<UnmatchedPayment>(`/financial/unmatched/${id}`, payload);
    return data;
  },

  deleteUnmatchedPayment: async (id: string, reason?: string): Promise<{ deleted: boolean; id: string }> => {
    const { data } = await apiClient.delete<{ deleted: boolean; id: string }>(`/financial/unmatched/${id}`, { data: { reason } });
    return data;
  },

  discardUnmatchedPayment: async (id: string, note?: string): Promise<UnmatchedPayment> => {
    const { data } = await apiClient.post<UnmatchedPayment>(`/financial/unmatched/${id}/discard`, { note });
    return data;
  },


  conciliationStats: async (): Promise<ConciliationStats> => {
    const { data } = await apiClient.get<ConciliationStats>('/financial/conciliation/stats');
    return data;
  },

  analytics: async (): Promise<FinancialAnalytics> => {
    const { data } = await apiClient.get<FinancialAnalytics>('/financial/analytics');
    return data;
  },

  revenueForecast: async (): Promise<RevenueForecast> => {
    const { data } = await apiClient.get<RevenueForecast>('/financial/revenue-forecast');
    return data;
  },

  importCsv: async (payload: {
    csvContent: string;
    sourceType: CsvImportSource;
    sourceLabel?: string;
  }): Promise<FinancialImportResult> => {
    const { data } = await apiClient.post<FinancialImportResult>('/financial/import-csv', payload);
    return data;
  },

  listImportBatches: async (): Promise<FinancialImportBatch[]> => {
    const { data } = await apiClient.get<FinancialImportBatch[]>('/financial/import-batches');
    return Array.isArray(data) ? data : [];
  },

  listUnmatchedPaymentsV2: async (): Promise<UnmatchedPayment[]> => {
    const { data } = await apiClient.get<UnmatchedPayment[]>('/financial/unmatched-payments');
    return Array.isArray(data) ? data : [];
  },

  linkUnmatchedPaymentV2: async (id: string, payload: { periciaId: string }): Promise<{ linked: boolean; recebimentoId: string }> => {
    const { data } = await apiClient.post<{ linked: boolean; recebimentoId: string }>(`/financial/unmatched-payments/${id}/link`, payload);
    return data;
  },

};
