import { apiClient } from '@/lib/api-client';
import type { AgendaEvent, AgendaTask, WeeklyWorkload } from '@/types/api';

export type BatchSchedulePayload = {
  date: string;
  time: string;
  periciaIds: string[];
};

type BatchScheduleItemRequest = {
  periciaId: string;
  title?: string;
  type?: string;
  startAt: string;
};

type BatchScheduleMetadata = {
  cityNames?: string[];
  date?: string;
  startTime?: string;
  durationMinutes?: number;
  intervalMinutes?: number;
  location?: string;
  modalidade?: string;
  source?: string;
};

type BatchScheduleRequest = {
  items: BatchScheduleItemRequest[];
  metadata?: BatchScheduleMetadata;
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
    const startAt = new Date(`${payload.date}T${payload.time}`).toISOString();
    const requestPayload: BatchScheduleRequest = {
      items: payload.periciaIds.map((periciaId) => ({
        periciaId,
        title: 'Perícia agendada em lote',
        type: 'PERICIA',
        startAt,
      })),
    };

    await apiClient.post('/agenda/batch-scheduling', requestPayload);
  },

  scheduleLot: async (payload: { items: { periciaId: string; startAt: string }[]; metadata: BatchScheduleMetadata }): Promise<void> => {
    const requestPayload: BatchScheduleRequest = {
      items: payload.items.map((item) => ({
        periciaId: item.periciaId,
        startAt: item.startAt,
      })),
      metadata: payload.metadata,
    };

    await apiClient.post('/agenda/batch-scheduling', requestPayload);
  },

  listSchedulingBatches: async (): Promise<SchedulingBatchResponse[]> => {
    const { data } = await apiClient.get<SchedulingBatchResponse[]>('/agenda/batch-scheduling');
    return Array.isArray(data) ? data : [];
  },
};
