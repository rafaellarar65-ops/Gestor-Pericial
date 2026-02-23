import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

type DomainItem = Record<string, string | number | undefined>;

type DomainResponse =
  | { items?: DomainItem[]; data?: DomainItem[] }
  | DomainItem[];

export const useDomainData = (key: string, endpoint: string) =>
  useQuery({
    queryKey: ['domain', key],
    queryFn: async (): Promise<DomainItem[]> => {
      try {
        const { data } = await apiClient.get<DomainResponse>(endpoint);
        if (Array.isArray(data)) return data;
        return data.items ?? data.data ?? [];
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) return [];
        throw err;
      }
    },
  });
