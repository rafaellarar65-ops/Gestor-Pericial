import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { emailImapService } from '@/services/lawyers-service';

export default function InboxEmailPage() {
  const queryClient = useQueryClient();
  const [selectedUid, setSelectedUid] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ['email-imap-inbox'],
    queryFn: () => emailImapService.listInbox(),
  });

  const { data: selected, isLoading: isLoadingPreview } = useQuery({
    queryKey: ['email-imap-inbox', selectedUid],
    enabled: selectedUid !== null,
    queryFn: async () => {
      const uid = selectedUid as number;
      await emailImapService.markRead(uid);
      return emailImapService.getByUid(uid);
    },
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUid || !selected) return { sent: false };
      return emailImapService.reply(selectedUid, {
        from: selected.to || 'noreply@example.com',
        to: selected.from,
        text: replyText,
      });
    },
    onSuccess: () => {
      toast.success('Reply enviado com sucesso');
      setReplyText('');
      queryClient.invalidateQueries({ queryKey: ['email-imap-inbox'] });
    },
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Inbox de Email</h1>
        <p className="text-sm text-muted-foreground">Selecione um email para visualizar o conteúdo e responder.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-0 overflow-hidden">
          {isLoading && <LoadingState />}
          {isError && <ErrorState message="Erro ao carregar inbox" />}
          {!isLoading && !isError && items.length === 0 && <div className="p-4"><EmptyState title="Nenhum email encontrado" /></div>}
          {!isLoading && !isError && items.length > 0 && (
            <ul>
              {items.map((item) => (
                <li key={item.uid}>
                  <button
                    className={`w-full border-b p-3 text-left ${selectedUid === item.uid ? 'bg-muted' : ''}`}
                    onClick={() => setSelectedUid(item.uid)}
                    type="button"
                  >
                    <p className="font-medium">{item.subject}</p>
                    <p className="text-xs text-muted-foreground">{item.from}</p>
                    <p className="text-xs truncate">{item.snippet}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4 space-y-3">
          {!selectedUid && <EmptyState title="Selecione um email para preview" />}
          {selectedUid && isLoadingPreview && <LoadingState />}
          {selectedUid && selected && (
            <>
              <h2 className="font-semibold">{selected.subject}</h2>
              <p className="text-xs text-muted-foreground">De: {selected.from}</p>
              <p className="text-sm whitespace-pre-wrap">{selected.text || selected.html || 'Sem conteúdo'}</p>
              <div className="space-y-2">
                <label className="block text-sm font-medium" htmlFor="reply-text">Responder</label>
                <textarea
                  id="reply-text"
                  className="min-h-24 w-full rounded-md border p-2 text-sm"
                  onChange={(event) => setReplyText(event.target.value)}
                  placeholder="Digite sua resposta"
                  value={replyText}
                />
                <Button disabled={!replyText || replyMutation.isPending} onClick={() => replyMutation.mutate()} type="button">
                  Reply
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
