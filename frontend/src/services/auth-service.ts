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
    const body: Record<string, string> = { email: payload.email, password: payload.password };
    // Only send tenantId if explicitly provided (not the default placeholder)
    if (payload.tenantId && payload.tenantId !== '11111111-1111-1111-1111-111111111111') {
      body.tenantId = payload.tenantId;
    }
    const { data } = await apiClient.post<BackendLoginResponse>('/auth/login', body);

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
