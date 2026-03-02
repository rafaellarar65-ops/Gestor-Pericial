import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type NotificationType = 'NOMEACAO_NOVA' | 'LAUDO_PENDENTE' | 'PRAZO_ESCLARECIMENTO' | 'RECEBIMENTO' | 'PERICIAS_HOJE';

export type NotificationItem = {
  id: string;
  tipo: NotificationType;
  titulo: string;
  subtexto: string;
  link: string;
  criadaEm: string;
  lida: boolean;
};

const QUERY_KEY = ['notificacoes-nao-lidas'];

export const useNotifications = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<NotificationItem[]>('/notificacoes', { params: { nao_lidas: true } });
      return data;
    },
    refetchInterval: 60000,
  });

  const marcarComoLida = useMutation({
    mutationFn: async (id: string) => apiClient.patch(`/notificacoes/${id}/ler`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const marcarTodasLidas = useMutation({
    mutationFn: async () => apiClient.patch('/notificacoes/ler-todas'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const notificacoes = query.data ?? [];

  return {
    notificacoes,
    totalNaoLidas: notificacoes.length,
    isLoading: query.isLoading,
    marcarComoLida: (id: string) => marcarComoLida.mutateAsync(id),
    marcarTodasLidas: () => marcarTodasLidas.mutateAsync(),
  };
};
