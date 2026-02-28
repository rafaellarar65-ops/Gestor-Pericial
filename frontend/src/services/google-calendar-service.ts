import { apiClient } from '@/lib/api-client';
import type { GoogleCalendarIntegration, SyncAuditLog } from '@/types/api';

export const googleCalendarService = {
  connectOAuth: async () => {
    const { data } = await apiClient.post<{ authUrl: string }>('/integrations/google/oauth/connect', {});
    return data;
  },

  oauthCallback: async (code: string) => {
    const { data } = await apiClient.post<GoogleCalendarIntegration>('/integrations/google/oauth/callback', { code });
    return data;
  },

  getStatus: async () => {
    const { data } = await apiClient.get<GoogleCalendarIntegration | null>('/integrations/google/status');
    return data;
  },

  listCalendars: async () => {
    const { data } = await apiClient.get<{ items: { id: string; summary: string }[] }>('/integrations/google/calendars');
    return data.items;
  },

  selectCalendar: async (calendarId: string, calendarName?: string) => {
    const { data } = await apiClient.patch<GoogleCalendarIntegration>('/integrations/google/calendar', { calendarId, calendarName });
    return data;
  },

  updateSyncSettings: async (payload: {
    syncEvents?: boolean;
    syncTasks?: boolean;
    mode?: 'MIRROR' | 'TWO_WAY';
    active?: boolean;
  }) => {
    const { data } = await apiClient.patch<GoogleCalendarIntegration>('/integrations/google/sync-settings', payload);
    return data;
  },

  sync: async (direction: 'push' | 'pull') => {
    const { data } = await apiClient.post<{ synced: number; conflicts: number; direction: 'push' | 'pull' }>('/integrations/google/sync', {
      direction,
    });
    return data;
  },

  listSyncAudit: async (status?: 'CONFLICT' | 'ERROR') => {
    const { data } = await apiClient.get<SyncAuditLog[]>('/integrations/google/sync-audit', { params: status ? { status } : {} });
    return Array.isArray(data) ? data : [];
  },

  resolveConflict: async (logId: string, resolution: 'LOCAL' | 'EXTERNAL') => {
    const { data } = await apiClient.patch<SyncAuditLog>(`/integrations/google/sync-audit/${logId}/resolve`, { resolution });
    return data;
  },
};
