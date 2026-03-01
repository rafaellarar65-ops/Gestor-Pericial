import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';

interface UseSmartCompletionProps {
  periciaId: string;
  campo: 'exameFisico' | 'discussao';
  textoAtual: string;
  contexto: Record<string, unknown>;
}

interface CompletionResponse {
  completion?: string;
  text?: string;
}

/**
 * Hook de autocomplete com debounce de 500ms.
 * A API devolve apenas continuação técnica para ser renderizada como ghost text.
 */
export const useSmartCompletion = ({ periciaId, campo, textoAtual, contexto }: UseSmartCompletionProps) => {
  const { tokens, user } = useAuthStore();

  const apiUrl = (import.meta.env.VITE_API_URL ?? __API_URL__) as string;
  const [completion, setCompletion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
  }, []);

  const complete = useCallback(
    async (prompt: string) => {
      stop();

      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${apiUrl}/api/pericia/autocomplete/${periciaId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: tokens?.accessToken ? `Bearer ${tokens.accessToken}` : '',
            'x-tenant-id': user?.tenantId ?? '11111111-1111-1111-1111-111111111111',
          },
          body: JSON.stringify({ campo, textoAtual: prompt, contexto }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Autocomplete request failed with status ${response.status}`);
        }

        const data = (await response.json()) as CompletionResponse;
        setCompletion(data.completion ?? data.text ?? '');
      } catch (requestError) {
        if ((requestError as Error).name !== 'AbortError') {
          setError(requestError as Error);
        }
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null;
          setIsLoading(false);
        }
      }
    },
    [apiUrl, campo, contexto, periciaId, stop, tokens?.accessToken, user?.tenantId],
  );

  useEffect(() => {
    if (!textoAtual.trim()) {
      stop();
      setCompletion('');
      return;
    }

    const timer = window.setTimeout(() => {
      void complete(textoAtual);
    }, 500);

    return () => window.clearTimeout(timer);
  }, [complete, stop, textoAtual]);

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
