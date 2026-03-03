import { apiClient } from '@/lib/api-client';
import type { ConfigItem, DashboardSystemSettings, IntegrationSettings } from '@/types/api';


const RESOURCE_ENDPOINTS: Record<string, string> = {
  usuarios: '/users',
  regras: '/config/smart-rules',
  integracoes: '/config/integrations',
};

export const getResourceEndpoint = (resource: string) => RESOURCE_ENDPOINTS[resource] ?? `/config/${resource}`;

export const configService = {
  list: async (resource: string): Promise<ConfigItem[]> => {
    const { data } = await apiClient.get<ConfigItem[]>(getResourceEndpoint(resource));
    return Array.isArray(data) ? data : [];
  },

  create: async (resource: string, payload: Record<string, unknown>): Promise<ConfigItem> => {
    const { data } = await apiClient.post<ConfigItem>(getResourceEndpoint(resource), payload);
    return data;
  },

  update: async (resource: string, id: string, payload: Record<string, unknown>): Promise<ConfigItem> => {
    const { data } = await apiClient.patch<ConfigItem>(`${getResourceEndpoint(resource)}/${id}`, payload);
    return data;
  },

  remove: async (resource: string, id: string): Promise<void> => {
    await apiClient.delete(`${getResourceEndpoint(resource)}/${id}`);
  },

  getDashboardSettings: async (): Promise<DashboardSystemSettings> => {
    const { data } = await apiClient.get<{ config: DashboardSystemSettings }>('/config/system/dashboard');
    return data.config;
  },

  updateDashboardSettings: async (config: DashboardSystemSettings): Promise<DashboardSystemSettings> => {
    const { data } = await apiClient.patch<{ config: DashboardSystemSettings }>('/config/system/dashboard', config);
    return data.config;
  },

  getIntegrations: async (): Promise<IntegrationSettings> => {
    const { data } = await apiClient.get<IntegrationSettings>(getResourceEndpoint('integracoes'));
    return data;
  },

  updateIntegrations: async (payload: IntegrationSettings): Promise<IntegrationSettings> => {
    const { data } = await apiClient.patch<IntegrationSettings>(getResourceEndpoint('integracoes'), payload);
    return data;
  },

};
