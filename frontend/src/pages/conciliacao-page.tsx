import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { Tabs } from '@/components/ui/tabs';
import { apiClient } from '@/lib/api-client';
import { financialService } from '@/services/financial-service';
import { periciaService } from '@/services/pericia-service';
import type { Pericia, UnmatchedPayment } from '@/types/api';
import { formatCurrency } from '@/lib/formatters';

const displayDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('pt-BR') : '-');

const ConciliacaoPage = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('Individual');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [importFile, setImportFile] = useState<File | null>(null);

  const unmatchedQuery = useQuery({
    queryKey: ['financial-unmatched-payments'],
    queryFn: () => financialService.listUnmatchedPayments(),
  });

  const selectedItem = useMemo(
    () => unmatchedQuery.data?.find((item) => item.id === selectedId) ?? unmatchedQuery.data?.[0],
    [unmatchedQuery.data, selectedId],
  );

  const suggestionsQuery = useQuery({
    queryKey: ['conciliacao-suggestions', selectedItem?.id, selectedItem?.cnj],
    enabled: Boolean(selectedItem),
    queryFn: async () => {
      if (!selectedItem) return [] as Pericia[];
      const response = await periciaService.list(1, { limit: 10, search: selectedItem.cnj ?? selectedItem.description ?? '' });
      return response.items;
    },
  });

  const refreshUnmatched = async () => {
    await queryClient.invalidateQueries({ queryKey: ['financial-unmatched-payments'] });
  };

  const linkMutation = useMutation({
    mutationFn: ({ id, periciaId }: { id: string; periciaId: string }) =>
      financialService.linkUnmatchedPayment(id, { periciaId, note: 'Vinculado pela conciliação' }),
    onSuccess: async () => {
      toast.success('Item vinculado com sucesso.');
      await refreshUnmatched();
    },
    onError: () => toast.error('Falha ao vincular item.'),
  });

  const caldoMutation = useMutation({
    mutationFn: (item: UnmatchedPayment) =>
      financialService.updateUnmatchedPayment(item.id, {
        notes: `${item.notes ? `${item.notes}\n` : ''}[CALDO] Tratado na conciliação individual.`,
      }),
    onSuccess: async () => {
      toast.success('Item marcado com ação Caldo.');
      await refreshUnmatched();
    },
    onError: () => toast.error('Falha ao executar ação Caldo.'),
  });

  const ignoreMutation = useMutation({
    mutationFn: (id: string) => financialService.discardUnmatchedPayment(id, 'Ignorado na conciliação'),
    onSuccess: async () => {
      toast.success('Item ignorado.');
      await refreshUnmatched();
    },
    onError: () => toast.error('Falha ao ignorar item.'),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await apiClient.post<{ imported: number; origin: string }>('/financial/unmatched/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: async ({ imported, origin }) => {
      const label = origin === 'OFX_IMPORT' ? 'OFX' : 'CSV';
      toast.success(`${imported} itens importados para conciliação (${label}).`);
      setImportFile(null);
      await refreshUnmatched();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Falha ao importar arquivo.';
      toast.error(message);
    },
  });

  const selectedBatchItems = useMemo(
    () => (unmatchedQuery.data ?? []).filter((item) => selectedBatchIds.includes(item.id)),
    [selectedBatchIds, unmatchedQuery.data],
  );

  const autoMatchByCnj = () => {
    const candidates = (unmatchedQuery.data ?? []).filter((item) => item.cnj && selectedBatchIds.includes(item.id));
    if (!candidates.length) {
      toast.message('Nenhum item selecionado com CNJ para auto-match.');
      return;
    }
    toast.success(`${candidates.length} item(ns) pronto(s) para auto-match por CNJ.`);
  };

  const conciliarSelecionados = async () => {
    if (!selectedBatchItems.length) {
      toast.message('Selecione ao menos um item para conciliar.');
      return;
    }

    let linked = 0;
    for (const item of selectedBatchItems) {
      if (!item.cnj) continue;
      const pericias = await periciaService.list(1, { limit: 1, search: item.cnj });
      const candidate = pericias.items[0];
      if (!candidate) continue;
      await financialService.linkUnmatchedPayment(item.id, { periciaId: candidate.id, note: 'Conciliação em lote por CNJ' });
      linked += 1;
    }

    toast.success(`${linked} item(ns) conciliado(s) em lote.`);
    setSelectedBatchIds([]);
    await refreshUnmatched();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Conciliação</h1>
        <p className="text-sm text-muted-foreground">Concilie pagamentos não vinculados de forma individual ou em lote.</p>
      </div>

      <Card className="space-y-3 p-4">
        <h2 className="text-base font-medium">Importar extrato CSV/OFX</h2>
        <input type="file" accept=".csv,.ofx,application/ofx" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} />
        {!importFile ? <EmptyState title="Selecione um arquivo CSV ou OFX para importar." /> : null}
        <div>
          <Button disabled={!importFile || uploadMutation.isPending} onClick={() => importFile && uploadMutation.mutate(importFile)}>
            {uploadMutation.isPending ? 'Importando...' : 'Importar arquivo'}
          </Button>
        </div>
        {uploadMutation.isPending ? <LoadingState /> : null}
        {uploadMutation.isError ? <ErrorState message="Falha no upload do arquivo." /> : null}
      </Card>

      <Tabs tabs={['Individual', 'Em Lote']} activeTab={activeTab} onChange={setActiveTab} />

      {unmatchedQuery.isLoading ? <LoadingState /> : null}
      {unmatchedQuery.isError ? <ErrorState message="Falha ao carregar pagamentos não vinculados." /> : null}
      {!unmatchedQuery.isLoading && !unmatchedQuery.isError && (unmatchedQuery.data?.length ?? 0) === 0 ? (
        <EmptyState title="Não há pagamentos pendentes de conciliação." />
      ) : null}

      {activeTab === 'Individual' && unmatchedQuery.data && unmatchedQuery.data.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-2 p-4">
            <h3 className="text-sm font-medium">Pagamentos não vinculados</h3>
            <div className="space-y-2">
              {unmatchedQuery.data.map((item) => (
                <button
                  key={item.id}
                  className={`w-full rounded border p-3 text-left text-sm ${selectedItem?.id === item.id ? 'border-primary' : 'border-border'}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <p className="font-medium">{formatCurrency(item.amount)}</p>
                  <p className="text-xs text-muted-foreground">{item.cnj ?? 'Sem CNJ'} · {displayDate(item.receivedAt ?? item.transactionDate)}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card className="space-y-3 p-4">
            <h3 className="text-sm font-medium">Sugestões de match</h3>
            {!selectedItem ? <EmptyState title="Selecione um item para ver sugestões." /> : null}
            {suggestionsQuery.isLoading ? <LoadingState /> : null}
            {suggestionsQuery.isError ? <ErrorState message="Falha ao carregar sugestões." /> : null}
            {!suggestionsQuery.isLoading && !suggestionsQuery.isError && (suggestionsQuery.data?.length ?? 0) === 0 ? (
              <EmptyState title="Nenhuma sugestão encontrada para o item selecionado." />
            ) : null}
            <div className="space-y-2">
              {(suggestionsQuery.data ?? []).map((pericia) => (
                <div key={pericia.id} className="rounded border p-3 text-sm">
                  <p className="font-medium">{pericia.processoCNJ}</p>
                  <p className="text-xs text-muted-foreground">{pericia.autorNome} · {pericia.cidade}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => selectedItem && linkMutation.mutate({ id: selectedItem.id, periciaId: pericia.id })}>Vincular</Button>
                    <Button size="sm" variant="outline" onClick={() => selectedItem && caldoMutation.mutate(selectedItem)}>Caldo</Button>
                    <Button size="sm" variant="outline" onClick={() => selectedItem && ignoreMutation.mutate(selectedItem.id)}>Ignorar</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}

      {activeTab === 'Em Lote' && unmatchedQuery.data && unmatchedQuery.data.length > 0 ? (
        <Card className="space-y-4 p-4">
          <div className="space-y-2">
            {unmatchedQuery.data.map((item) => (
              <label key={item.id} className="flex items-center gap-2 rounded border p-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedBatchIds.includes(item.id)}
                  onChange={(e) =>
                    setSelectedBatchIds((prev) =>
                      e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id),
                    )
                  }
                />
                <span>{formatCurrency(item.amount)} · {item.cnj ?? 'Sem CNJ'} · {displayDate(item.receivedAt ?? item.transactionDate)}</span>
              </label>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={autoMatchByCnj}>Auto-match por CNJ</Button>
            <Button onClick={() => void conciliarSelecionados()}>Conciliar Selecionados</Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
};

export default ConciliacaoPage;