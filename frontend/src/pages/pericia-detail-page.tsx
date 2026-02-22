import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { StatusBadge } from '@/components/domain/status-badge';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { Tabs } from '@/components/ui/tabs';
import { usePericiaDetailQuery } from '@/hooks/use-pericias';

const tabs = ['Dados', 'Docs', 'Financeiro', 'Laudo', 'Timeline'];

export const PericiaDetailPage = () => {
  const { id = '' } = useParams();
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const { data, isLoading, isError } = usePericiaDetailQuery(id);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Erro ao carregar perícia" />;
  if (!data) return <EmptyState title="Perícia não encontrada" />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Detalhe da Perícia</h1>
      <Tabs activeTab={activeTab} onChange={setActiveTab} tabs={tabs} />
      <Card>
        <p>CNJ: {data.processoCNJ}</p>
        <p>Autor: {data.autorNome}</p>
        <p>Cidade: {data.cidade}</p>
        <StatusBadge status={data.status} />
        <p className="mt-3 text-sm text-muted-foreground">Aba atual: {activeTab}</p>
      </Card>
    </div>
  );
};
