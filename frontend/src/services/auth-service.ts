import { apiClient } from '@/lib/api-client';
import type { LoginRequest, LoginResponse } from '@/types/api';

type LoginApiResponse = {
  user: LoginResponse['user'];
  accessToken: string;
  refreshToken: string;
};

export const authService = {
  login: async (payload: LoginRequest): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginApiResponse>('/auth/login', payload);

    return {
      user: data.user,
      tokens: {
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      },
    };
  },
};
