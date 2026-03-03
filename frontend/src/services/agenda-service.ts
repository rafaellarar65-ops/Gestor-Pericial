import { apiClient } from '@/lib/api-client';
import type { AgendaEvent, AgendaTask, WeeklyWorkload } from '@/types/api';

export type BatchSchedulePayload = {
  date: string;
  time: string;
  periciaIds: string[];
};

export type SuggestScheduleItem = {
  periciaId: string;
  cidade?: string;
  modalidade?: string;
  estimatedDurationMinutes?: number;
};

export type SuggestSchedulePayload = {
  date: string;
  startTime: string;
  defaultDurationMinutes?: number;
  intervalMinutes?: number;
  modalidadeDurationMinutes?: Record<string, number>;
  items: SuggestScheduleItem[];
};

export type SuggestScheduleResponse = {
  date: string;
  groupedByCity: string[];
  suggestions: Array<{
    periciaId: string;
    cidade: string;
    modalidade: string;
    estimatedDurationMinutes: number;
    startAt: string;
    endAt: string;
  }>;
};

type BatchScheduleItemRequest = {
  periciaId: string;
  dataAgendamento?: string;
  horaAgendamento?: string;
  title?: string;
};

type BatchScheduleMetadata = {
  cityNames?: string[];
  date?: string;
  data?: string;
  startTime?: string;
  hora?: string;
  durationMinutes?: number;
  intervalMinutes?: number;
  location?: string;
  modalidade?: string;
  source?: string;
};

type BatchScheduleRequest = {
  items: BatchScheduleItemRequest[];
  parametros?: BatchScheduleMetadata & { statusId?: string };
  flags?: {
    atualizarStatus?: boolean;
    criarEventos?: boolean;
    criarTarefas48h?: boolean;
  };
};

type SchedulingBatchItem = {
  periciaId: string;
  scheduledAt: string;
};

type SchedulingBatchResponse = {
  id: string;
  createdAt: string;
  cityNames: string[];
  date: string;
  startTime: string;
  durationMinutes: number;
  intervalMinutes: number;
  location?: string;
  modalidade?: string;
  source: 'CSV' | 'WORD';
  status: string;
  items: SchedulingBatchItem[];
};

export const agendaService = {
  listEvents: async (): Promise<AgendaEvent[]> => {
    const { data } = await apiClient.get<AgendaEvent[]>('/agenda/events');
    return Array.isArray(data) ? data : [];
  },

  createEvent: async (payload: {
    title: string;
    type: string;
    startAt: string;
    endAt?: string;
    description?: string;
    location?: string;
    periciaId?: string;
  }): Promise<AgendaEvent> => {
    const { data } = await apiClient.post<AgendaEvent>('/agenda/events', payload);
    return data;
  },


  updateEvent: async (
    eventId: string,
    payload: {
      title?: string;
      type?: string;
      startAt?: string;
      endAt?: string;
      description?: string;
      location?: string;
      status?: string;
    },
  ): Promise<AgendaEvent> => {
    const { data } = await apiClient.patch<AgendaEvent>(`/agenda/events/${eventId}`, payload);
    return data;
  },

  listTasks: async (): Promise<AgendaTask[]> => {
    const { data } = await apiClient.get<AgendaTask[]>('/agenda/tasks');
    return Array.isArray(data) ? data : [];
  },

  createTask: async (payload: {
    title: string;
    status?: string;
    dueAt?: string;
    priority?: number;
    description?: string;
    periciaId?: string;
  }): Promise<AgendaTask> => {
    const { data } = await apiClient.post<AgendaTask>('/agenda/tasks', payload);
    return data;
  },

  weeklyWorkload: async (startDate?: string): Promise<WeeklyWorkload> => {
    const { data } = await apiClient.get<WeeklyWorkload>('/agenda/weekly-workload', { params: { startDate } });
    return data;
  },

  exportWeeklyPdf: async (mode: 'compacto' | 'detalhado', startDate?: string) => {
    const { data } = await apiClient.post<{ fileName: string; contentBase64: string; mimeType: string }>('/agenda/export-weekly-pdf', {
      mode,
      startDate,
    });
    return data;
  },

  suggestLaudoBlocks: async (payload: {
    startDate?: string;
    avg_minutes_per_laudo: number;
    backlog: number;
    preferred_windows: string[];
    min_buffer_minutes: number;
  }) => {
    const { data } = await apiClient.post('/agenda/ai/suggest-laudo-blocks', payload);
    return data as {
      suggestions: Array<{ title: string; startAt: string; endAt: string; conflict: boolean; aiSuggested: boolean }>;
      assumptions: Record<string, number>;
    };
  },

  applyLaudoBlocks: async (items: Array<{ title: string; startAt: string; endAt: string }>) => {
    const { data } = await apiClient.post('/agenda/ai/apply-laudo-blocks', { items });
    return data as { created: number };
  },

  scheduleBatch: async (payload: BatchSchedulePayload): Promise<void> => {
    const requestPayload: BatchScheduleRequest = {
      items: payload.periciaIds.map((periciaId) => ({
        periciaId,
        dataAgendamento: payload.date,
        horaAgendamento: payload.time,
        title: 'Perícia agendada em lote',
      })),
      flags: {
        atualizarStatus: false,
        criarEventos: true,
        criarTarefas48h: true,
      },
    };

    await apiClient.post('/pericias/batch-schedule', requestPayload);
  },

  scheduleLot: async (payload: { items: { periciaId: string; startAt: string }[]; metadata: BatchScheduleMetadata }): Promise<void> => {
    const requestPayload: BatchScheduleRequest = {
      items: payload.items.map((item) => {
        const scheduledAt = new Date(item.startAt);
        return {
          periciaId: item.periciaId,
          dataAgendamento: scheduledAt.toISOString().slice(0, 10),
          horaAgendamento: scheduledAt.toISOString().slice(11, 16),
          title: 'Perícia agendada em lote',
        };
      }),
      parametros: {
        ...payload.metadata,
        data: payload.metadata.date,
        hora: payload.metadata.startTime,
      },
      flags: {
        atualizarStatus: false,
        criarEventos: true,
        criarTarefas48h: true,
      },
    };

    await apiClient.post('/pericias/batch-schedule', requestPayload);
  },

  listSchedulingBatches: async (): Promise<SchedulingBatchResponse[]> => {
    const { data } = await apiClient.get<SchedulingBatchResponse[]>('/agenda/batch-scheduling');
    return Array.isArray(data) ? data : [];
  },

  suggestBatchScheduling: async (payload: SuggestSchedulePayload): Promise<SuggestScheduleResponse> => {
    const { data } = await apiClient.post<SuggestScheduleResponse>('/agenda/batch-scheduling/suggest', payload);
    return data;
  },

  exportBatchPdf: async (batchId: string, includeRoute = false) => {
    const { data } = await apiClient.get<{ fileName: string; contentBase64: string; mimeType: string }>(`/agenda/batch-scheduling/${batchId}/export-pdf`, {
      params: { includeRoute },
    });
    return data;
  },
};
