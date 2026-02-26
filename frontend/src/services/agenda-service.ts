import { apiClient } from '@/lib/api-client';
import type { AgendaEvent, AgendaTask } from '@/types/api';

export type BatchSchedulePayload = {
  date: string;
  time: string;
  periciaIds: string[];
};

type BatchScheduleItemRequest = {
  periciaId: string;
  title: string;
  type: 'PERICIA';
  startAt: string;
};

type BatchScheduleRequest = {
  items: BatchScheduleItemRequest[];
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
};
