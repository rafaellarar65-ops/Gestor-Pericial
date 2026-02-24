import { apiClient } from '@/lib/api-client';
import type { AgendaEvent, AgendaTask } from '@/types/api';

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
};
