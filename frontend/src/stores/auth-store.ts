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
      setSession: (payload) => set({ user: payload.user, tokens: payload.tokens }),
      logout: () => set({ user: null, tokens: null }),
    }),
    { name: 'gp-auth-store' },
  ),
);
