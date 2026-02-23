import { apiClient } from '@/lib/api-client';
import type { LoginRequest, LoginResponse } from '@/types/api';

export const authService = {
  login: async (payload: LoginRequest): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', payload);
    return data;
  },
};
