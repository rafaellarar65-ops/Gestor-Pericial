import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState } from '@/components/ui/state';
import type { EmailListItem } from '@/services/email-inbox-service';

type EmailActionsProps = {
  email: EmailListItem | null;
  replyBody: string;
  onReplyBodyChange: (value: string) => void;
  onReply: () => void;
  onMarkAsRead: () => void;
  isReplying: boolean;
  isMarkingRead: boolean;
  hasReplyError: boolean;
  hasMarkReadError: boolean;
};

export function EmailActions({
  email,
  replyBody,
  onReplyBodyChange,
  onReply,
  onMarkAsRead,
  isReplying,
  isMarkingRead,
  hasReplyError,
  hasMarkReadError,
}: EmailActionsProps) {
  const hasAttachments = useMemo(() => Boolean(email?.attachments.length), [email?.attachments.length]);

  if (!email) {
    return (
      <Card className="h-full p-4">
        <EmptyState title="Selecione um email para habilitar ações." />
      </Card>
    );
  }

  return (
    <Card className="h-full p-4 space-y-4">
      <h2 className="font-semibold">Ações</h2>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Responder</h3>
        <textarea
          className="min-h-[180px] w-full rounded-md border p-2 text-sm"
          placeholder="Digite sua resposta..."
          value={replyBody}
          onChange={(event) => onReplyBodyChange(event.target.value)}
        />
        {hasReplyError && <ErrorState message="Falha ao enviar reply." />}
        <Button disabled={!replyBody.trim() || isReplying} onClick={onReply}>
          {isReplying ? 'Enviando...' : 'Enviar reply'}
        </Button>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Status</h3>
        {hasMarkReadError && <ErrorState message="Falha ao marcar como lido." />}
        <Button variant="outline" disabled={isMarkingRead || email.isRead} onClick={onMarkAsRead}>
          {email.isRead ? 'Já marcado como lido' : isMarkingRead ? 'Atualizando...' : 'Marcar como lido'}
        </Button>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Anexos</h3>
        {!hasAttachments && <p className="text-sm text-muted-foreground">Nenhum anexo encontrado.</p>}
        {hasAttachments && (
          <ul className="space-y-1 text-sm">
            {email.attachments.map((attachment) => (
              <li key={attachment.id} className="rounded-md border p-2">
                <p className="font-medium">{attachment.name}</p>
                <p className="text-xs text-muted-foreground">{attachment.mimeType ?? 'Tipo desconhecido'} {attachment.size ? `• ${attachment.size} bytes` : ''}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Card>
  );
}
