import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

type DomainItem = Record<string, string | number | undefined>;

type DomainResponse = {
  items?: DomainItem[];
  data?: DomainItem[];
};

export const useDomainData = (key: string, endpoint: string) =>
  useQuery({
    queryKey: ['domain', key],
    queryFn: async (): Promise<DomainItem[]> => {
      const { data } = await apiClient.get<DomainResponse>(endpoint);
      return data.items ?? data.data ?? [];
    },
  });
