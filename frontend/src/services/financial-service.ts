import { apiClient } from '@/lib/api-client';
import type {
  ApiListResponse,
  Despesa,
  FinancialAnalytics,
  FinancialItem,
  Recebimento,
  UnmatchedPayment,
  UnmatchedPaymentOrigin,
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

  analytics: async (): Promise<FinancialAnalytics> => {
    const { data } = await apiClient.get<FinancialAnalytics>('/financial/analytics');
    return data;
  },
};
