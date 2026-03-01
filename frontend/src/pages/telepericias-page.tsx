import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { periciaService } from '@/services/pericia-service';
import type { TelepericiaQueueItem, TelepericiaQueueResponse } from '@/types/api';

const toDateTime = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('pt-BR');
};

const resolvePhone = (item: TelepericiaQueueItem) => {
  const digits = (item.processoCNJ || '').replace(/\D/g, '');
  return digits.slice(-11) || '5500000000000';
};

const buildTemplateMessage = (item: TelepericiaQueueItem) =>
  `Olá ${item.periciadoNome ?? 'paciente'}, confirmando sua teleperícia do processo ${item.processoCNJ}.`;

const Page = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useQuery<TelepericiaQueueResponse>({
    queryKey: ['telepericia', 'queue'],
    queryFn: () => periciaService.telepericiaQueue(),
  });

  const urgentMutation = useMutation({
    mutationFn: ({ id, isUrgent }: { id: string; isUrgent: boolean }) => periciaService.updateUrgent(id, isUrgent),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['telepericia', 'queue'] });
      toast.success('Prioridade atualizada.');
    },
    onError: () => toast.error('Falha ao atualizar prioridade.'),
  });

  const attemptMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status?: string }) => periciaService.registerTelepericiaAttempt(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['telepericia', 'queue'] });
      toast.success('Tentativa registrada.');
    },
    onError: () => toast.error('Falha ao registrar tentativa.'),
  });

  const rows = useMemo(() => data?.items ?? [], [data]);

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Erro ao carregar fila operacional de teleperícia." />;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Fila operacional de teleperícia</h1>
          <p className="text-sm text-muted-foreground">Prioridade, status WhatsApp e confirmações em um único painel.</p>
        </div>
      </header>

      {rows.length === 0 ? (
        <EmptyState title="Sem perícias em modalidade teleperícia na fila." />
      ) : (
        <Card className="overflow-auto p-0">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-muted/40 text-left">
              <tr>
                <th className="px-3 py-2">Prioridade</th>
                <th className="px-3 py-2">Perícia</th>
                <th className="px-3 py-2">Horário</th>
                <th className="px-3 py-2">Status WhatsApp</th>
                <th className="px-3 py-2">Confirmação</th>
                <th className="px-3 py-2">Ações rápidas</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const phone = resolvePhone(item);
                const message = buildTemplateMessage(item);
                const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
                return (
                  <tr className="border-t" key={item.id}>
                    <td className="px-3 py-2">
                      <Button
                        disabled={urgentMutation.isPending}
                        onClick={() => urgentMutation.mutate({ id: item.id, isUrgent: !item.isUrgent })}
                        size="sm"
                        variant={item.isUrgent ? 'default' : 'outline'}
                      >
                        {item.isUrgent ? 'URGENTE' : 'Normal'}
                      </Button>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{item.processoCNJ}</div>
                      <div className="text-xs text-muted-foreground">{item.periciadoNome ?? item.autorNome ?? 'Sem nome'}</div>
                    </td>
                    <td className="px-3 py-2">{toDateTime(item.dataAgendamento)}</td>
                    <td className="px-3 py-2">{item.whatsappStatus ?? 'PENDENTE'}</td>
                    <td className="px-3 py-2">{toDateTime(item.telepericiaConfirmedAt)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => window.location.assign(`/pericias/${item.id}`)} size="sm" variant="outline">
                          Detalhe
                        </Button>
                        <Button onClick={() => window.open(waLink, '_blank', 'noopener,noreferrer')} size="sm" variant="outline">
                          wa.me
                        </Button>
                        <Button
                          onClick={() => {
                            void navigator.clipboard.writeText(message);
                            toast.success('Mensagem copiada.');
                          }}
                          size="sm"
                          variant="outline"
                        >
                          Copiar msg
                        </Button>
                        <Button
                          disabled={attemptMutation.isPending}
                          onClick={() => attemptMutation.mutate({ id: item.id })}
                          size="sm"
                          variant="outline"
                        >
                          Registrar tentativa
                        </Button>
                        <Button
                          disabled={attemptMutation.isPending}
                          onClick={() => attemptMutation.mutate({ id: item.id, status: 'ENVIADA' })}
                          size="sm"
                        >
                          Enviar template agora
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

export default Page;
