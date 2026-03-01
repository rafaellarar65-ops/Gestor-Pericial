import { useMutation } from '@tanstack/react-query';
import { authService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';
import type { LoginRequest } from '@/types/api';

export const useLogin = () => {
  const setSession = useAuthStore((state) => state.setSession);
  return useMutation({
    mutationFn: (payload: LoginRequest) => authService.login(payload),
    onSuccess: (data) => {
      setSession(data);
    },
  });
};
