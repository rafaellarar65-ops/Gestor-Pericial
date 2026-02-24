import { apiClient } from '@/lib/api-client';
import type { ConfigItem } from '@/types/api';

export const configService = {
  list: async (resource: string): Promise<ConfigItem[]> => {
    const { data } = await apiClient.get<ConfigItem[]>(`/config/${resource}`);
    return Array.isArray(data) ? data : [];
  },

  create: async (resource: string, payload: Record<string, unknown>): Promise<ConfigItem> => {
    const { data } = await apiClient.post<ConfigItem>(`/config/${resource}`, payload);
    return data;
  },

  update: async (resource: string, id: string, payload: Record<string, unknown>): Promise<ConfigItem> => {
    const { data } = await apiClient.patch<ConfigItem>(`/config/${resource}/${id}`, payload);
    return data;
  },

  remove: async (resource: string, id: string): Promise<void> => {
    await apiClient.delete(`/config/${resource}/${id}`);
  },
};
