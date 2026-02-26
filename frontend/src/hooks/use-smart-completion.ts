import { useEffect, useMemo } from 'react';
import { useCompletion } from 'ai/react';
import { useAuthStore } from '@/stores/auth-store';

interface UseSmartCompletionProps {
  periciaId: string;
  campo: 'exameFisico' | 'discussao';
  textoAtual: string;
  contexto: Record<string, unknown>;
}

/**
 * Hook de autocomplete com debounce de 500ms.
 * A API devolve apenas continuação técnica para ser renderizada como ghost text.
 */
export const useSmartCompletion = ({ periciaId, campo, textoAtual, contexto }: UseSmartCompletionProps) => {
  const { tokens, user } = useAuthStore();

  const apiUrl = (import.meta.env.VITE_API_URL ?? __API_URL__) as string;

  const {
    completion,
    complete,
    stop,
    isLoading,
    error,
    setCompletion,
  } = useCompletion({
    api: `${apiUrl}/api/pericia/autocomplete/${periciaId}`,
    headers: {
      Authorization: tokens?.accessToken ? `Bearer ${tokens.accessToken}` : '',
      'x-tenant-id': user?.tenantId ?? '11111111-1111-1111-1111-111111111111',
    },
    body: { campo, contexto },
  });

  useEffect(() => {
    if (!textoAtual.trim()) {
      setCompletion('');
      return;
    }

    const timer = window.setTimeout(() => {
      void complete(textoAtual, { body: { campo, textoAtual, contexto } });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [campo, complete, contexto, setCompletion, textoAtual]);

  const ghostText = useMemo(() => {
    if (!completion) return '';
    if (!completion.startsWith(textoAtual)) return completion;
    return completion.slice(textoAtual.length);
  }, [completion, textoAtual]);

  return {
    ghostText,
    completion,
    isLoading,
    error,
    stop,
    acceptWithTab: () => completion,
  };
};
