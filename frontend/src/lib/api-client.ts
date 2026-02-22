import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/stores/auth-store';
import type { ApiError, AuthTokens } from '@/types/api';

const API_URL = import.meta.env.VITE_API_URL ?? (typeof __API_URL__ === 'string' ? __API_URL__ : 'http://localhost:3000');

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

const applyTokens = (tokens: AuthTokens | null): void => {
  if (tokens?.accessToken) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${tokens.accessToken}`;
    return;
  }

  delete apiClient.defaults.headers.common.Authorization;
};

apiClient.interceptors.request.use((config) => {
  const { tokens } = useAuthStore.getState();
  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const original = error.config;
    if (!original) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    if (status === 401 && !original.headers['x-retried']) {
      original.headers['x-retried'] = '1';
      const { tokens, logout, setSession, user } = useAuthStore.getState();
      if (tokens?.refreshToken && user) {
        try {
          const refresh = await axios.post<{ accessToken: string }>(`${API_URL}/auth/refresh`, {
            refreshToken: tokens.refreshToken,
          });
          const nextTokens = { ...tokens, accessToken: refresh.data.accessToken };
          setSession({ user, tokens: nextTokens });
          applyTokens(nextTokens);
          return apiClient(original);
        } catch {
          logout();
        }
      }
    }

    const message = error.response?.data?.message ?? 'Erro inesperado na API';
    return Promise.reject({ message, statusCode: status } satisfies ApiError);
  },
);
