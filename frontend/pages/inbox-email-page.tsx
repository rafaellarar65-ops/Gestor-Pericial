import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { communicationInboxService, messageTemplatesService } from '@/services/lawyers-service';

type FilterType = 'nao_confirmados' | 'pediram_reagendamento' | 'falha_envio' | 'optin_pendente' | 'inbound_nao_vinculado' | '';

const filters: Array<{ value: FilterType; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'nao_confirmados', label: 'Não confirmados' },
  { value: 'pediram_reagendamento', label: 'Pediram reagendamento' },
  { value: 'falha_envio', label: 'Falha de envio' },
  { value: 'optin_pendente', label: 'Opt-in pendente' },
  { value: 'inbound_nao_vinculado', label: 'Inbound não vinculado' },
];

export default function InboxEmailPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [periciaId, setPericiaId] = useState('');

  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ['communication-inbox', filter],
    queryFn: () => communicationInboxService.list(filter || undefined),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['message-templates-all'],
    queryFn: () => messageTemplatesService.list(),
  });

  const resendMutation = useMutation({
    mutationFn: () => communicationInboxService.resendTemplate({ messageIds: selectedIds, templateId }),
    onSuccess: () => {
      toast.success('Template reenviado em massa');
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['communication-inbox'] });
    },
  });

  const optInMutation = useMutation({
    mutationFn: () => communicationInboxService.grantOptIn({ messageIds: selectedIds }),
    onSuccess: () => {
      toast.success('Opt-in concedido manualmente');
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['communication-inbox'] });
    },
  });

  const linkMutation = useMutation({
    mutationFn: () => communicationInboxService.linkInbound({ messageIds: selectedIds, periciaId }),
    onSuccess: () => {
      toast.success('Inbound vinculado à perícia');
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: ['communication-inbox'] });
    },
  });

  const selectedCount = selectedIds.length;
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Central de Comunicação (Inbox)</h1>
        <p className="text-sm text-muted-foreground">Monitore conversas e execute ações em massa.</p>
      </header>

      <Card className="p-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <Button key={f.value || 'all'} size="sm" variant={filter === f.value ? 'default' : 'outline'} onClick={() => setFilter(f.value)}>
              {f.label}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="p-3 space-y-3">
        <h2 className="font-semibold">Ações em massa ({selectedCount} selecionado(s))</h2>
        <div className="grid gap-2 lg:grid-cols-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Reenviar template</p>
            <select className="h-9 w-full rounded-md border px-2 text-sm" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              <option value="">Selecione...</option>
              {templates.map((tpl) => (
                <option value={tpl.id} key={tpl.id}>{tpl.name}</option>
              ))}
            </select>
            <Button size="sm" disabled={!templateId || !selectedCount || resendMutation.isPending} onClick={() => resendMutation.mutate()}>
              Reenviar template
            </Button>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Conceder opt-in manual</p>
            <Button size="sm" variant="outline" disabled={!selectedCount || optInMutation.isPending} onClick={() => optInMutation.mutate()}>
              Conceder opt-in
            </Button>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Vincular inbound à perícia</p>
            <Input placeholder="periciaId" value={periciaId} onChange={(e) => setPericiaId(e.target.value)} />
            <Button size="sm" variant="outline" disabled={!selectedCount || !periciaId || linkMutation.isPending} onClick={() => linkMutation.mutate()}>
              Vincular inbound
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {isLoading && <LoadingState />}
        {isError && <ErrorState message="Erro ao carregar inbox" />}
        {!isLoading && !isError && items.length === 0 && <div className="p-4"><EmptyState title="Nenhum item encontrado para o filtro" /></div>}
        {!isLoading && !isError && items.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="p-2" />
                <th className="p-2">Destino</th>
                <th className="p-2">Mensagem</th>
                <th className="p-2">Status</th>
                <th className="p-2">Tags</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={selectedSet.has(item.id)}
                      onChange={(e) => setSelectedIds((prev) => e.target.checked ? [...prev, item.id] : prev.filter((id) => id !== item.id))}
                    />
                  </td>
                  <td className="p-2">{item.to || '—'}</td>
                  <td className="p-2 max-w-md truncate">{item.message}</td>
                  <td className="p-2">{item.status || '—'}</td>
                  <td className="p-2">{item.tags?.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
