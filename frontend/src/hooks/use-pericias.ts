import { useQuery } from '@tanstack/react-query';
import { periciaService } from '@/services/pericia-service';

export const useDashboardQuery = () =>
  useQuery({ queryKey: ['dashboard'], queryFn: () => periciaService.dashboard() });

export const usePericiasQuery = (page: number) =>
  useQuery({ queryKey: ['pericias', page], queryFn: () => periciaService.list(page) });

export const usePericiaDetailQuery = (id: string) =>
  useQuery({ queryKey: ['pericia-detail', id], queryFn: () => periciaService.detail(id), enabled: Boolean(id) });
