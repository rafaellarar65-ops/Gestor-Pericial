import { apiClient } from '@/lib/api-client';
import { periciaService } from '@/services/pericia-service';
import type { Lawyer, Pericia } from '@/types/api';

export type VaraCommunicationType = 'cobranca' | 'esclarecimentos' | 'prazo';

export type PendingProcess = Pick<Pericia, 'id' | 'processoCNJ' | 'autorNome' | 'reuNome' | 'dataAgendamento'> & {
  daysPending: number;
};

export const communicationHubService = {
  listLawyers: async (): Promise<Lawyer[]> => {
    try {
      const { data } = await apiClient.get<Lawyer[]>('/lawyers');
      return Array.isArray(data) ? data : [];
    } catch {
      const { data } = await apiClient.get<Lawyer[]>('/communications/lawyers');
      return Array.isArray(data) ? data : [];
    }
  },

  listPendingByVara: async (filters: { varaId?: string; minDays: number }): Promise<PendingProcess[]> => {
    const response = await periciaService.list(1, { limit: 200, varaId: filters.varaId });
    const now = Date.now();

    return response.items
      .filter((item) => item.pagamentoStatus !== 'PAGO')
      .map((item) => {
        const baseDate = item.dataAgendamento ? new Date(item.dataAgendamento).getTime() : now;
        const daysPending = Math.max(0, Math.floor((now - baseDate) / (1000 * 60 * 60 * 24)));
        return {
          id: item.id,
          processoCNJ: item.processoCNJ,
          autorNome: item.autorNome,
          reuNome: item.reuNome,
          dataAgendamento: item.dataAgendamento,
          daysPending,
        };
      })
      .filter((item) => item.daysPending >= filters.minDays);
  },
};
