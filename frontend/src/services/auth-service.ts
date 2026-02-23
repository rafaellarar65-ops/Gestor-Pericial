import { apiClient } from '@/lib/api-client';
import type { LoginRequest, LoginResponse, UserRole } from '@/types/api';

type BackendLoginResponse = {
  user: { id: string; email: string; role: string; tenantId: string; fullName?: string };
  accessToken: string;
  refreshToken: string;
};

const normalizeRole = (value?: string): UserRole => (value?.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'ASSISTANT');

export const authService = {
  login: async (payload: LoginRequest): Promise<LoginResponse> => {
    const { data } = await apiClient.post<BackendLoginResponse>('/auth/login', {
      tenantId: payload.tenantId,
      email: payload.email,
      password: payload.password,
    });

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        role: normalizeRole(data.user.role),
        tenantId: data.user.tenantId,
        fullName: data.user.fullName,
      },
      tokens: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      },
    };
  },
};
