import { useQuery } from '@tanstack/react-query';
import { communicationHubService } from '@/services/communication-hub-service';
import type { Lawyer } from '@/types/api';

export function useLawyers() {
  return useQuery<Lawyer[]>({
    queryKey: ['communications', 'lawyers'],
    queryFn: communicationHubService.listLawyers,
  });
}
