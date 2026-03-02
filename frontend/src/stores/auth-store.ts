import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthTokens, LoginResponse } from '@/types/api';

type AuthState = {
  user: LoginResponse['user'] | null;
  tokens: AuthTokens | null;
  setSession: (payload: LoginResponse) => void;
  logout: () => void;
};

const persistAuthToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth-token', token);
  }
};

const clearAuthToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth-token');
  }
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      setSession: (payload) => {
        persistAuthToken(payload.tokens.accessToken);
        set({ user: payload.user, tokens: payload.tokens });
      },
      logout: () => {
        clearAuthToken();
        set({ user: null, tokens: null });
      },
    }),
    { name: 'gp-auth-store' },
  ),
);
