import { apiClient } from '@/lib/api-client';
import type { ApiListResponse, FinancialItem } from '@/types/api';

type RecebimentoRaw = {
  id: string;
  fontePagamento: string;
  valorBruto: string | number;
  descricao?: string;
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
};
