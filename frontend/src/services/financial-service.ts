import { apiClient } from '@/lib/api-client';
import type {
  ApiListResponse,
  Despesa,
  FinancialAnalytics,
  FinancialItem,
  ImportBatch,
  Recebimento,
  RecebimentoListItem,
} from '@/types/api';

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

  analytics: async (): Promise<FinancialAnalytics> => {
    const { data } = await apiClient.get<FinancialAnalytics>('/financial/analytics');
    return data;
  },
};
