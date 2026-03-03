import { useMutation } from '@tanstack/react-query';
import { agendaService } from '@/services/agenda-service';

export const useBatchSchedule = () =>
  useMutation({
    mutationFn: agendaService.scheduleBatch,
  });
