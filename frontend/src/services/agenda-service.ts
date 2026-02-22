import { apiClient } from '@/lib/api-client';

type BatchAgendaPayload = {
  periciaIds: string[];
  date: string;
  time: string;
};

export const agendaService = {
  scheduleBatch: async (payload: BatchAgendaPayload): Promise<{ success: boolean }> => {
    const { data } = await apiClient.post<{ success: boolean }>('/agenda/batch', payload);
    return data;
  },
};
