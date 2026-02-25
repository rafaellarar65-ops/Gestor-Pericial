import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { periciaService } from '@/services/pericia-service';

export const useDashboardQuery = () =>
  useQuery({ queryKey: ['dashboard'], queryFn: () => periciaService.dashboard() });

export const usePericiasQuery = (page: number, filters?: { limit?: number; search?: string }) =>
  useQuery({ queryKey: ['pericias', page, filters], queryFn: () => periciaService.list(page, filters) });

export const usePericiaDetailQuery = (id: string) =>
  useQuery({ queryKey: ['pericia-detail', id], queryFn: () => periciaService.detail(id), enabled: Boolean(id) });

export const usePericiaTimelineQuery = (id: string) =>
  useQuery({ queryKey: ['pericia-timeline', id], queryFn: () => periciaService.timeline(id), enabled: Boolean(id) });

export const usePericiaDocumentsQuery = (id: string) =>
  useQuery({ queryKey: ['pericia-documents', id], queryFn: () => periciaService.documents(id), enabled: Boolean(id) });

export const usePericiaRecebimentosQuery = (id: string) =>
  useQuery({ queryKey: ['pericia-recebimentos', id], queryFn: () => periciaService.recebimentos(id), enabled: Boolean(id) });

export const usePericiaCnjQuery = (id: string, cnj?: string, enabled = false) =>
  useQuery({
    queryKey: ['pericia-cnj', id, cnj],
    queryFn: () => periciaService.cnjByCnj({ cnj: cnj ?? '', periciaId: id }),
    enabled: Boolean(id && cnj && enabled),
  });

export const useCityOverviewQuery = (cidadeId: string) =>
  useQuery({ queryKey: ['city-overview', cidadeId], queryFn: () => periciaService.cityOverview(cidadeId), enabled: Boolean(cidadeId) });

export const useCityOverviewListQuery = () =>
  useQuery({ queryKey: ['city-overview-list'], queryFn: () => periciaService.cityOverviewList() });

export const useUpdatePericiaDatesMutation = (id: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      dataNomeacao?: string;
      dataAgendamento?: string;
      dataRealizacao?: string;
      dataEnvioLaudo?: string;
    }) => periciaService.updateDates(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pericia-detail', id] });
      void queryClient.invalidateQueries({ queryKey: ['pericia-timeline', id] });
    },
  });
};
