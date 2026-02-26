import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/stores/auth-store';
import type { ApiError, AuthTokens } from '@/types/api';

const resolveApiUrl = (): string => {
  const fromEnv = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_BACKEND_URL;
  if (fromEnv) return fromEnv;

  if (
    typeof __API_URL__ === 'string' &&
    __API_URL__.trim() &&
    !__API_URL__.includes('localhost') &&
    !__API_URL__.includes('127.0.0.1')
  ) {
    return __API_URL__;
  }

  if (typeof window !== 'undefined') {
    const { origin, hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }

    return `${origin}/api`;
  }

  return 'http://localhost:3000';
};

const API_URL = resolveApiUrl();
const DEFAULT_TENANT_ID = import.meta.env.VITE_TENANT_ID ?? '11111111-1111-1111-1111-111111111111';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

let refreshPromise: Promise<string> | null = null;

const applyTokens = (tokens: AuthTokens | null): void => {
  if (tokens?.accessToken) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${tokens.accessToken}`;
    return;
  }

  delete apiClient.defaults.headers.common.Authorization;
};

apiClient.interceptors.request.use((config) => {
  const { tokens, user } = useAuthStore.getState();
  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  if (!config.headers['x-tenant-id']) {
    config.headers['x-tenant-id'] = user?.tenantId ?? DEFAULT_TENANT_ID;
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
    const requestUrl = original.url ?? '';
    const isRefreshRequest = requestUrl.includes('/auth/refresh');

    if (status === 401 && !isRefreshRequest && !original.headers['x-retried']) {
      original.headers['x-retried'] = '1';
      const { tokens, logout, setSession, user } = useAuthStore.getState();

      if (tokens?.refreshToken && user) {
        try {
          refreshPromise ??= axios
            .post<{ accessToken: string }>(`${API_URL}/auth/refresh`, {
              refreshToken: tokens.refreshToken,
            })
            .then((refresh) => refresh.data.accessToken)
            .finally(() => {
              refreshPromise = null;
            });

          const accessToken = await refreshPromise;
          const nextTokens = { ...tokens, accessToken };
          setSession({ user, tokens: nextTokens });
          applyTokens(nextTokens);

          return apiClient(original);
        } catch (refreshError) {
          const refreshStatus = axios.isAxiosError(refreshError) ? refreshError.response?.status : undefined;

          if (refreshStatus === 401 || refreshStatus === 403) {
            logout();
          }
        }
      }
    }

    const message = error.response?.data?.message ?? 'Erro inesperado na API';
    return Promise.reject({ message, statusCode: status } satisfies ApiError);
  },
);
