import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { EmailActions } from '@/components/communications/email-actions';
import { EmailConfig } from '@/components/communications/email-config';
import { EmailList } from '@/components/communications/email-list';
import { EmailPreview } from '@/components/communications/email-preview';
import {
  emailInboxService,
  type EmailConfigPayload,
  type EmailInboxFilterType,
} from '@/services/email-inbox-service';

const PAGE_SIZE = 20;

const defaultConfig: EmailConfigPayload = {
  fromEmail: '',
  fromName: '',
  smtpHost: '',
  smtpPort: '587',
  login: '',
  password: '',
  imapHost: '',
  imapPort: '993',
  secure: true,
};

export default function InboxEmailPage() {
  const queryClient = useQueryClient();

  const [config, setConfig] = useState<EmailConfigPayload>(defaultConfig);
  const [filter, setFilter] = useState<EmailInboxFilterType>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [manualSelectedUid, setManualSelectedUid] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const inboxQuery = useQuery({
    queryKey: ['email-inbox', { filter, search, page, limit: PAGE_SIZE }],
    queryFn: () => emailInboxService.listInbox({
      filter: filter || undefined,
      search: search || undefined,
      page,
      limit: PAGE_SIZE,
    }),
  });

  const listItems = useMemo(() => inboxQuery.data?.items ?? [], [inboxQuery.data?.items]);

  const selectedUid = useMemo(() => {
    if (!listItems.length) return null;
    if (manualSelectedUid && listItems.some((item) => item.uid === manualSelectedUid)) return manualSelectedUid;
    return listItems[0]?.uid ?? null;
  }, [listItems, manualSelectedUid]);

  const selectedFromList = useMemo(
    () => listItems.find((item) => item.uid === selectedUid) ?? null,
    [listItems, selectedUid],
  );

  const selectedEmailQuery = useQuery({
    queryKey: ['email-inbox-item', selectedUid],
    queryFn: () => emailInboxService.getEmailByUid(selectedUid ?? ''),
    enabled: Boolean(selectedUid),
    initialData: selectedFromList,
  });

  const saveConfigMutation = useMutation({
    mutationFn: emailInboxService.saveConfig,
    onSuccess: () => {
      toast.success('Configuração de email salva com sucesso.');
    },
    onError: () => {
      toast.error('Não foi possível salvar a configuração de email.');
    },
  });

  const replyMutation = useMutation({
    mutationFn: () => {
      if (!selectedEmailQuery.data?.uid || !selectedEmailQuery.data.to) {
        throw new Error('Email inválido para reply.');
      }

      return emailInboxService.sendReply({
        uid: selectedEmailQuery.data.uid,
        to: selectedEmailQuery.data.to,
        subject: `Re: ${selectedEmailQuery.data.subject ?? 'Mensagem'}`,
        body: replyBody,
      });
    },
    onSuccess: () => {
      toast.success('Reply enviado com sucesso.');
      setReplyBody('');
      queryClient.invalidateQueries({ queryKey: ['email-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['email-inbox-item'] });
    },
    onError: () => {
      toast.error('Falha ao enviar reply.');
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: () => {
      if (!selectedEmailQuery.data?.uid) {
        throw new Error('Email inválido para atualizar status.');
      }
      return emailInboxService.markAsRead(selectedEmailQuery.data.uid);
    },
    onSuccess: () => {
      toast.success('Email marcado como lido.');
      queryClient.invalidateQueries({ queryKey: ['email-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['email-inbox-item'] });
    },
    onError: () => {
      toast.error('Falha ao marcar email como lido.');
    },
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Central de Comunicação (Inbox)</h1>
        <p className="text-sm text-muted-foreground">Visualize emails, revise conteúdo e execute ações no painel lateral.</p>
      </header>

      <EmailConfig
        value={config}
        onChange={setConfig}
        onSave={() => saveConfigMutation.mutate(config)}
        isSaving={saveConfigMutation.isPending}
        saveError={saveConfigMutation.isError}
      />

      <section className="grid gap-4 xl:grid-cols-[1.05fr_1.2fr_0.9fr]">
        <EmailList
          items={listItems}
          selectedUid={selectedUid}
          onSelect={setManualSelectedUid}
          isLoading={inboxQuery.isLoading}
          isError={inboxQuery.isError}
          filter={filter}
          onFilterChange={(nextFilter) => {
            setFilter(nextFilter);
            setPage(1);
          }}
          search={searchInput}
          onSearchChange={setSearchInput}
          page={page}
          totalPages={inboxQuery.data?.pagination.totalPages ?? 1}
          onPageChange={setPage}
        />

        <EmailPreview
          email={selectedEmailQuery.data ?? null}
          isLoading={selectedEmailQuery.isLoading}
          isError={selectedEmailQuery.isError}
        />

        <EmailActions
          email={selectedEmailQuery.data ?? null}
          replyBody={replyBody}
          onReplyBodyChange={setReplyBody}
          onReply={() => replyMutation.mutate()}
          onMarkAsRead={() => markAsReadMutation.mutate()}
          isReplying={replyMutation.isPending}
          isMarkingRead={markAsReadMutation.isPending}
          hasReplyError={replyMutation.isError}
          hasMarkReadError={markAsReadMutation.isError}
        />
      </section>
    </div>
  );
}
