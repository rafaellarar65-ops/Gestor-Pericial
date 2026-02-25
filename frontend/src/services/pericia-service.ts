import { apiClient } from '@/lib/api-client';
import type {
  ApiListResponse,
  CaseDocument,
  CityOverview,
  CityOverviewList,
  DashboardResponse,
  Pericia,
  PericiaDetail,
  PericiaTimelineResponse,
  Recebimento,
} from '@/types/api';

export const periciaService = {
  dashboard: async (): Promise<DashboardResponse> => {
    const { data } = await apiClient.get<DashboardResponse>('/pericias/dashboard');
    return data;
  },

  list: async (page: number, filters?: { limit?: number; search?: string }): Promise<ApiListResponse<Pericia>> => {
    const { data } = await apiClient.get<{ items: Pericia[]; pagination: { total: number; page: number; limit: number } }>('/pericias', {
      params: {
        page,
        limit: filters?.limit ?? 25,
        ...(filters?.search ? { search: filters.search } : {}),
      },
    });

    return {
      items: data.items,
      total: data.pagination.total,
      page: data.pagination.page,
      pageSize: data.pagination.limit,
    };
  },

  detail: async (id: string): Promise<PericiaDetail> => {
    const { data } = await apiClient.get<PericiaDetail>(`/pericias/${id}`);
    return data;
  },

  timeline: async (id: string): Promise<PericiaTimelineResponse> => {
    const { data } = await apiClient.get<PericiaTimelineResponse>(`/pericias/${id}/timeline`);
    return data;
  },

  documents: async (id: string): Promise<CaseDocument[]> => {
    const { data } = await apiClient.get<CaseDocument[]>('/documents', { params: { periciaId: id } });
    return Array.isArray(data) ? data : [];
  },

  recebimentos: async (id: string): Promise<Recebimento[]> => {
    const { data } = await apiClient.get<Recebimento[]>('/financial/recebimentos', { params: { periciaId: id } });
    return Array.isArray(data) ? data : [];
  },

  updateDates: async (
    id: string,
    payload: {
      dataNomeacao?: string;
      dataAgendamento?: string;
      dataRealizacao?: string;
      dataEnvioLaudo?: string;
    },
  ): Promise<PericiaDetail> => {
    const { data } = await apiClient.patch<PericiaDetail>(`/pericias/${id}`, payload);
    return data;
  },

  cnjByCnj: async (payload: { cnj: string; periciaId?: string }) => {
    const { data } = await apiClient.post<Record<string, unknown>>('/integrations/datajud-cnj', payload);
    return data;
  },

  cityOverview: async (cidadeId: string): Promise<CityOverview> => {
    const { data } = await apiClient.get<CityOverview>(`/pericias/cidades/${cidadeId}/overview`);
    return data;
  },

  cityOverviewList: async (): Promise<CityOverviewList> => {
    const { data } = await apiClient.get<CityOverviewList>('/pericias/cidades-overview');
    return data;
  },
};
