import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthTokens, LoginResponse } from '@/types/api';

type AuthState = {
  user: LoginResponse['user'] | null;
  tokens: AuthTokens | null;
  setSession: (payload: LoginResponse) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      setSession: (payload) => {
        if (typeof window !== 'undefined') {
          const token = payload.tokens.accessToken;
          localStorage.setItem('auth-token', token);
        }

        set({ user: payload.user, tokens: payload.tokens });
      },
      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-token');
        }

        set({ user: null, tokens: null });
      },
    }),
    { name: 'gp-auth-store' },
  ),
);
