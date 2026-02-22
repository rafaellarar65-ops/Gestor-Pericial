import { apiClient } from '@/lib/api-client';
import type { ApiListResponse, DashboardResponse, Pericia } from '@/types/api';

export const periciaService = {
  dashboard: async (): Promise<DashboardResponse> => {
    const { data } = await apiClient.get<DashboardResponse>('/pericias/dashboard');
    return data;
  },
  list: async (page: number): Promise<ApiListResponse<Pericia>> => {
    const { data } = await apiClient.get<ApiListResponse<Pericia>>('/pericias', {
      params: { page, pageSize: 10 },
    });
    return data;
  },
  detail: async (id: string): Promise<Pericia> => {
    const { data } = await apiClient.get<Pericia>(`/pericias/${id}`);
    return data;
  },
};
