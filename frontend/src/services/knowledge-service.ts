import { apiClient } from '@/lib/api-client';
import type { KnowledgeItem, PhysicalManeuver } from '@/types/api';

export const knowledgeService = {
  list: async (): Promise<KnowledgeItem[]> => {
    const { data } = await apiClient.get<KnowledgeItem[]>('/knowledge');
    return Array.isArray(data) ? data : [];
  },

  create: async (payload: {
    title: string;
    category?: string;
    content?: string;
    source?: string;
    tags?: string[];
  }): Promise<KnowledgeItem> => {
    const { data } = await apiClient.post<KnowledgeItem>('/knowledge', payload);
    return data;
  },
};

export const maneuversService = {
  list: async (): Promise<PhysicalManeuver[]> => {
    const { data } = await apiClient.get<PhysicalManeuver[]>('/maneuvers');
    return Array.isArray(data) ? data : [];
  },

  create: async (payload: {
    name: string;
    category?: string;
    summary?: string;
    procedure?: string;
    tags?: string[];
  }): Promise<PhysicalManeuver> => {
    const { data } = await apiClient.post<PhysicalManeuver>('/maneuvers', payload);
    return data;
  },
};
