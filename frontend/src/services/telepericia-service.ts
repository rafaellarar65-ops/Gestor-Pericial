import { apiClient } from '@/lib/api-client';
import type { TeleSlot } from '@/types/api';

export const telepericiaService = {
  listSlots: async (): Promise<TeleSlot[]> => {
    const { data } = await apiClient.get<TeleSlot[]>('/telepericia/slots');
    return Array.isArray(data) ? data : [];
  },

  createSlot: async (payload: {
    startAt: string;
    endAt: string;
    platform?: string;
    status?: string;
  }): Promise<TeleSlot> => {
    const { data } = await apiClient.post<TeleSlot>('/telepericia/slots', payload);
    return data;
  },

  bookSlot: async (payload: {
    slotId: string;
    periciaId: string;
    meetingUrl?: string;
  }): Promise<TeleSlot> => {
    const { data } = await apiClient.post<TeleSlot>('/telepericia/booking', payload);
    return data;
  },
};
