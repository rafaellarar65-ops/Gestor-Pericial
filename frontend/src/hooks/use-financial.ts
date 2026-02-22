import { useQuery } from '@tanstack/react-query';
import { financialService } from '@/services/financial-service';

export const useFinancialQuery = () =>
  useQuery({ queryKey: ['financial-list'], queryFn: () => financialService.list() });
