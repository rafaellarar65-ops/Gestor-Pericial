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
  NomeacoesResponse,
  FilaAgendamentoCityResponse,
  TelepericiaQueueResponse,
} from '@/types/api';

export const periciaService = {
  dashboard: async (): Promise<DashboardResponse> => {
    const { data } = await apiClient.get<DashboardResponse>('/pericias/dashboard');
    return data;
  },


  nomeacoes: async (): Promise<NomeacoesResponse> => {
    const { data } = await apiClient.get<NomeacoesResponse>('/nomeacoes');
    return data;
  },

  filaAgendamentoPorCidade: async (): Promise<FilaAgendamentoCityResponse> => {
    const { data } = await apiClient.get<FilaAgendamentoCityResponse>('/fila-agendamento-cidades');
    return data;
  },

  list: async (page: number, filters?: {
    limit?: number;
    search?: string;
    statusId?: string;
    cidadeId?: string;
    dateFrom?: string;
    dateTo?: string;
    varaId?: string;
    valorMin?: number;
    valorMax?: number;
  }): Promise<ApiListResponse<Pericia>> => {
    const { data } = await apiClient.get<{ items: Pericia[]; pagination: { total: number; page: number; limit: number } }>('/pericias', {
      params: {
        page,
        limit: filters?.limit ?? 25,
        ...(filters?.search ? { search: filters.search } : {}),
        ...(filters?.statusId ? { statusId: filters.statusId } : {}),
        ...(filters?.cidadeId ? { cidadeId: filters.cidadeId } : {}),
        ...(filters?.dateFrom ? { dateFrom: filters.dateFrom } : {}),
        ...(filters?.dateTo ? { dateTo: filters.dateTo } : {}),
        ...(filters?.varaId ? { varaId: filters.varaId } : {}),
        ...(filters?.valorMin !== undefined ? { valorMin: filters.valorMin } : {}),
        ...(filters?.valorMax !== undefined ? { valorMax: filters.valorMax } : {}),
      },
    });

    return {
      items: data.items,
      total: data.pagination.total,
      page: data.pagination.page,
      pageSize: data.pagination.limit,
    };
  },


  create: async (payload: {
    processoCNJ: string;
    cidadeId?: string;
    varaId?: string;
    tipoPericiaId?: string;
    modalidadeId?: string;
    statusId?: string;
    juizNome?: string;
    autorNome?: string;
    reuNome?: string;
    observacoes?: string;
    honorariosPrevistosJG?: number;
    honorariosPrevistosPartes?: number;
    dataNomeacao?: string;
  }): Promise<PericiaDetail> => {
    const { data } = await apiClient.post<PericiaDetail>('/pericias', payload);
    return data;
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


  telepericiaQueue: async (): Promise<TelepericiaQueueResponse> => {
    const { data } = await apiClient.get<TelepericiaQueueResponse>('/pericias/telepericia/queue');
    return data;
  },

  updateUrgent: async (id: string, isUrgent: boolean): Promise<PericiaDetail> => {
    const { data } = await apiClient.patch<PericiaDetail>(`/pericias/${id}/urgent`, { isUrgent });
    return data;
  },

  registerTelepericiaAttempt: async (id: string, whatsappStatus?: string): Promise<PericiaDetail> => {
    const { data } = await apiClient.patch<PericiaDetail>(`/pericias/${id}/telepericia-attempt`, {
      ...(whatsappStatus ? { whatsappStatus } : {}),
    });
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
