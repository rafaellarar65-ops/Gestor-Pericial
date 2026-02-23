import { apiClient } from '@/lib/api-client';
import type { LoginRequest, LoginResponse } from '@/types/api';

type LoginApiResponse =
  | {
      user: LoginResponse['user'];
      accessToken: string;
      refreshToken: string;
    }
  | {
      user: LoginResponse['user'];
      tokens: {
        accessToken: string;
        refreshToken: string;
      };
    };

const mapLoginResponse = (data: LoginApiResponse): LoginResponse => {
  if ('tokens' in data) {
    return { user: data.user, tokens: data.tokens };
  }

  return {
    user: data.user,
    tokens: {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    },
  };
};

export const authService = {
  login: async (payload: LoginRequest): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginApiResponse>('/auth/login', payload);
    return mapLoginResponse(data);
  },
};
