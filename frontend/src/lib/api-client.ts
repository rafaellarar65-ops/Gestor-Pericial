import axios, { AxiosError } from 'axios';
import { useAuthStore } from '@/stores/auth-store';
import type { ApiError, AuthTokens } from '@/types/api';

const ensureAbsoluteUrl = (url: string): string => {
  const normalized = url.trim();
  if (!normalized) return normalized;

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  if (/^(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(normalized)) {
    return `http://${normalized}`;
  }

  if (normalized.startsWith('/')) {
    return normalized;
  }

  return `https://${normalized}`;
};

const ensureApiPrefix = (url: string): string => {
  const normalized = ensureAbsoluteUrl(url).replace(/\/+$/, '');
  if (!normalized) return '/api';

  if (normalized === '/api' || normalized.endsWith('/api')) {
    return normalized;
  }

  return `${normalized}/api`;
};

const resolveApiUrl = (): string => {
  // In development/preview environment, use relative /api path to leverage proxy
  if (typeof window !== 'undefined') {
    const { origin, hostname } = window.location;
    // For Emergent preview environment, use relative path to go through proxy
    if (hostname.includes('emergentagent.com') || hostname.includes('emergentcf.cloud')) {
      return '/api';
    }
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return '/api';
    }
    return `${origin}/api`;
  }

  const fromEnv = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_BACKEND_URL;
  if (fromEnv) return ensureApiPrefix(fromEnv);

  if (
    typeof __API_URL__ === 'string' &&
    __API_URL__.trim() &&
    !__API_URL__.includes('localhost') &&
    !__API_URL__.includes('127.0.0.1')
  ) {
    return ensureApiPrefix(__API_URL__);
  }

  return '/api';
};

export const API_URL = resolveApiUrl();
const DEFAULT_TENANT_ID = import.meta.env.VITE_TENANT_ID ?? '11111111-1111-1111-1111-111111111111';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
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
