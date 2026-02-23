import type { ApiError, LoginRequest, LoginResponse, UserRole } from '@/types/api';

type SupabaseLoginResponse = {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email?: string;
    app_metadata?: { role?: string };
    user_metadata?: { full_name?: string; name?: string; tenantId?: string };
  };
};

const DEFAULT_SUPABASE_URL = 'https://ybzinycruppgbetsanqs.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliemlueWNydXBwZ2JldHNhbnFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3NzYyNjcsImV4cCI6MjA4NzM1MjI2N30.tFOqoIcLYOOdHRyASBw-KMCdTshwSSNPcErXuKbDPS0';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? DEFAULT_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? DEFAULT_SUPABASE_ANON_KEY;

const normalizeRole = (value?: string): UserRole => (value?.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'ASSISTANT');

const parseSupabaseError = (payload: unknown): string => {
  if (!payload || typeof payload !== 'object') return 'Falha ao autenticar com Supabase.';

  const record = payload as Record<string, unknown>;
  const message = record.error_description ?? record.msg ?? record.message ?? record.error;
  return typeof message === 'string' && message.length > 0 ? message : 'Falha ao autenticar com Supabase.';
};

const loginWithSupabase = async (payload: LoginRequest): Promise<LoginResponse> => {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ email: payload.email, password: payload.password }),
  });

  const body = (await response.json().catch(() => null)) as SupabaseLoginResponse | Record<string, unknown> | null;

  if (!response.ok || !body || !('access_token' in body) || !('refresh_token' in body) || !('user' in body)) {
    throw {
      message: parseSupabaseError(body),
      statusCode: response.status,
    } satisfies ApiError;
  }

  const supabaseData = body as SupabaseLoginResponse;
  return {
    user: {
      id: supabaseData.user.id,
      email: supabaseData.user.email ?? payload.email,
      role: normalizeRole(supabaseData.user.app_metadata?.role),
      tenantId: supabaseData.user.user_metadata?.tenantId ?? 'supabase',
      fullName: supabaseData.user.user_metadata?.full_name ?? supabaseData.user.user_metadata?.name,
    },
    tokens: {
      accessToken: supabaseData.access_token,
      refreshToken: supabaseData.refresh_token,
    },
  };
};

export const authService = {
  login: async (payload: LoginRequest): Promise<LoginResponse> => loginWithSupabase(payload),
};
