import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Mail, RefreshCw, Send, Inbox, Star, Paperclip, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/state';
import { apiClient } from '@/lib/api-client';

type EmailMessage = {
  id: string;
  subject?: string;
  from?: string;
  to?: string;
  date?: string;
  preview?: string;
  body?: string;
  read?: boolean;
  hasAttachments?: boolean;
  starred?: boolean;
};

const Page = () => {
  const [selected, setSelected] = useState<EmailMessage | null>(null);
  const [search, setSearch] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');

  const { data: messages = [], isLoading, isError, refetch } = useQuery<EmailMessage[]>({
    queryKey: ['inbox-emails'],
    queryFn: async () => {
      try {
        const { data } = await apiClient.post<{ messages?: EmailMessage[] } | EmailMessage[]>(
          '/communications/imap-sync',
          {},
        );
        if (Array.isArray(data)) return data;
        return data.messages ?? [];
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const syncMutation = useMutation({
    mutationFn: () => apiClient.post('/communications/imap-sync', {}),
    onSuccess: () => { void refetch(); toast.success('Caixa de entrada sincronizada!'); },
    onError: () => toast.error('Erro ao sincronizar. Verifique a configuração IMAP.'),
  });

  const sendMutation = useMutation({
    mutationFn: (payload: { to: string; subject: string; body: string }) =>
      apiClient.post('/communications/email-send', {
        to: payload.to,
        subject: payload.subject,
        bodyHtml: payload.body,
        bodyText: payload.body,
      }),
    onSuccess: () => {
      toast.success('E-mail enviado com sucesso!');
      setShowCompose(false);
      setComposeTo(''); setComposeSubject(''); setComposeBody('');
    },
    onError: () => toast.error('Erro ao enviar e-mail.'),
  });

  const filtered = messages.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (m.subject ?? '').toLowerCase().includes(q) ||
      (m.from ?? '').toLowerCase().includes(q) ||
      (m.preview ?? '').toLowerCase().includes(q)
    );
  });

  function formatDate(dateStr?: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('pt-BR');
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Inbox de E-mail</h1>
          <p className="text-sm text-muted-foreground">Caixa de entrada integrada via IMAP.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
            <RefreshCw className={`mr-1 h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
          <Button onClick={() => setShowCompose(true)}>
            <Send className="mr-1 h-4 w-4" /> Novo E-mail
          </Button>
        </div>
      </header>

      {/* Search */}
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <Input placeholder="Buscar por assunto, remetente…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState message="Erro ao carregar e-mails." />}

      {!isLoading && !isError && (
        <div className="grid gap-4 lg:grid-cols-5">
          {/* Message list */}
          <div className="space-y-1 lg:col-span-2">
            {filtered.length === 0 ? (
              <EmptyState title="Nenhuma mensagem. Clique em Sincronizar para atualizar." />
            ) : (
              filtered.map((msg) => (
                <Card
                  key={msg.id}
                  onClick={() => setSelected(msg)}
                  className={`cursor-pointer p-3 transition-colors hover:bg-slate-50 ${selected?.id === msg.id ? 'ring-2 ring-blue-400' : ''} ${!msg.read ? 'border-l-4 border-l-blue-500' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`truncate text-sm ${!msg.read ? 'font-semibold' : 'text-slate-700'}`}>
                      {msg.from ?? 'Remetente desconhecido'}
                    </p>
                    <span className="flex-shrink-0 text-xs text-muted-foreground">{formatDate(msg.date)}</span>
                  </div>
                  <p className={`truncate text-sm ${!msg.read ? 'font-medium' : 'text-muted-foreground'}`}>
                    {msg.subject ?? '(sem assunto)'}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1">
                    {msg.hasAttachments && <Paperclip className="h-3 w-3 text-slate-400" />}
                    {msg.starred && <Star className="h-3 w-3 text-amber-400" />}
                    <p className="truncate text-xs text-muted-foreground">{msg.preview ?? ''}</p>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Message detail */}
          <div className="lg:col-span-3">
            {selected ? (
              <Card className="p-4 space-y-3">
                <h2 className="text-lg font-semibold">{selected.subject ?? '(sem assunto)'}</h2>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p><strong>De:</strong> {selected.from ?? '—'}</p>
                  <p><strong>Para:</strong> {selected.to ?? '—'}</p>
                  <p><strong>Data:</strong> {selected.date ? new Date(selected.date).toLocaleString('pt-BR') : '—'}</p>
                </div>
                <div className="rounded-md border bg-slate-50 p-3 text-sm whitespace-pre-wrap">
                  {selected.body ?? selected.preview ?? '(mensagem sem conteúdo)'}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { setComposeTo(selected.from ?? ''); setComposeSubject(`Re: ${selected.subject ?? ''}`); setShowCompose(true); }}>
                    <Send className="mr-1 h-3.5 w-3.5" /> Responder
                  </Button>
                </div>
              </Card>
            ) : (
              <Card className="flex h-48 items-center justify-center text-center p-4">
                <div>
                  <Inbox className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  <p className="text-sm text-muted-foreground">Selecione uma mensagem para visualizar</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Compose modal */}
      {showCompose && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between rounded-t-xl bg-slate-900 px-4 py-3 text-white">
              <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> Novo E-mail</div>
              <button onClick={() => setShowCompose(false)} type="button" className="text-white/70 hover:text-white">×</button>
            </div>
            <div className="space-y-3 p-4">
              <Input placeholder="Para:" value={composeTo} onChange={(e) => setComposeTo(e.target.value)} />
              <Input placeholder="Assunto:" value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} />
              <textarea
                className="min-h-36 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Mensagem..."
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCompose(false)}>Cancelar</Button>
                <Button
                  disabled={sendMutation.isPending || !composeTo || !composeSubject}
                  onClick={() => sendMutation.mutate({ to: composeTo, subject: composeSubject, body: composeBody })}
                >
                  <Send className="mr-1 h-3.5 w-3.5" />
                  {sendMutation.isPending ? 'Enviando...' : 'Enviar'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Page;
