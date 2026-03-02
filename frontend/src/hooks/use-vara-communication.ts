import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { communicationHubService } from '@/services/communication-hub-service';
import { configService } from '@/services/config-service';
import type { ConfigItem } from '@/types/api';

export type VaraCommunicationType = 'cobranca' | 'esclarecimentos' | 'prazo';

const communicationOpening: Record<VaraCommunicationType, string> = {
  cobranca: 'Solicito atualização sobre pagamentos pendentes dos processos abaixo.',
  esclarecimentos: 'Solicito esclarecimentos referentes aos processos listados a seguir.',
  prazo: 'Solicito confirmação de prazo de tramitação dos processos abaixo.',
};

export function useVaraCommunication() {
  const [selectedCidadeId, setSelectedCidadeId] = useState('');
  const [selectedVaraId, setSelectedVaraId] = useState('');
  const [communicationType, setCommunicationType] = useState<VaraCommunicationType>('cobranca');
  const [minDays, setMinDays] = useState(30);

  const { data: cidades = [] } = useQuery<ConfigItem[]>({
    queryKey: ['config', 'cidades'],
    queryFn: () => configService.list('cidades'),
  });

  const { data: allVaras = [] } = useQuery<ConfigItem[]>({
    queryKey: ['config', 'varas'],
    queryFn: () => configService.list('varas'),
  });

  const varas = useMemo(() => {
    if (!selectedCidadeId) return [];
    return allVaras.filter((item) => !item.cidadeId || item.cidadeId === selectedCidadeId);
  }, [allVaras, selectedCidadeId]);

  const selectedCidadeName = cidades.find((item) => item.id === selectedCidadeId)?.nome ?? 'Não informada';
  const selectedVaraName = allVaras.find((item) => item.id === selectedVaraId)?.nome ?? 'Não informada';

  const pendingQuery = useQuery({
    queryKey: ['communications', 'vara-pending', selectedVaraId, minDays],
    queryFn: () => communicationHubService.listPendingByVara({ varaId: selectedVaraId || undefined, minDays }),
    enabled: Boolean(selectedVaraId),
  });

  const generatedTemplate = useMemo(() => {
    const pending = pendingQuery.data ?? [];
    if (!selectedVaraId) {
      return 'Selecione cidade e vara para gerar a comunicação.';
    }

    const lines = pending.length
      ? pending.map((item, index) => `${index + 1}. ${item.processoCNJ} - ${item.autorNome}${item.reuNome ? ` x ${item.reuNome}` : ''} (${item.daysPending} dias)`).join('\n')
      : 'Nenhum processo pendente encontrado para os filtros selecionados.';

    return [
      `Prezados,`,
      '',
      `Cidade: ${selectedCidadeName}`,
      `Vara: ${selectedVaraName}`,
      `Tipo: ${communicationType}`,
      `Dias mínimos: ${minDays}`,
      '',
      communicationOpening[communicationType],
      '',
      lines,
      '',
      'Atenciosamente,',
      'Equipe Pericial',
    ].join('\n');
  }, [communicationType, minDays, pendingQuery.data, selectedCidadeName, selectedVaraId, selectedVaraName]);

  return {
    cidades,
    varas,
    selectedCidadeId,
    setSelectedCidadeId: (cidadeId: string) => {
      setSelectedCidadeId(cidadeId);
      setSelectedVaraId('');
    },
    selectedVaraId,
    setSelectedVaraId,
    communicationType,
    setCommunicationType,
    minDays,
    setMinDays,
    pending: pendingQuery.data ?? [],
    isLoading: pendingQuery.isLoading,
    isError: pendingQuery.isError,
    generatedTemplate,
  };
}
