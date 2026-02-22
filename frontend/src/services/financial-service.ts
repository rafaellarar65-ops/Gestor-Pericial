import { apiClient } from '@/lib/api-client';
import type { ApiListResponse, FinancialItem } from '@/types/api';

export const financialService = {
  list: async (): Promise<ApiListResponse<FinancialItem>> => {
    const { data } = await apiClient.get<ApiListResponse<FinancialItem>>('/financial');
    return data;
  },
};
