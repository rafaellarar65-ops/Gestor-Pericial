import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import type { EmailListItem } from '@/services/email-inbox-service';

type EmailPreviewProps = {
  email: EmailListItem | null;
  isLoading: boolean;
  isError: boolean;
};

export function EmailPreview({ email, isLoading, isError }: EmailPreviewProps) {
  return (
    <Card className="h-full p-4 space-y-3">
      {isLoading && <LoadingState />}
      {isError && <ErrorState message="Falha ao carregar email selecionado." />}
      {!isLoading && !isError && !email && <EmptyState title="Selecione um email para visualizar o conteúdo." />}
      {!isLoading && !isError && email && (
        <>
          <header className="space-y-1 border-b pb-3">
            <h2 className="text-lg font-semibold">{email.subject ?? email.message ?? 'Sem assunto'}</h2>
            <p className="text-sm text-muted-foreground">De: {email.from ?? '—'} • Para: {email.to ?? '—'}</p>
            <p className="text-xs text-muted-foreground">Status: {email.status ?? (email.isRead ? 'Lido' : 'Não lido')}</p>
          </header>
          <article className="max-h-[480px] overflow-auto whitespace-pre-wrap text-sm leading-relaxed">
            {email.body ?? email.message ?? 'Sem conteúdo disponível.'}
          </article>
        </>
      )}
    </Card>
  );
}
