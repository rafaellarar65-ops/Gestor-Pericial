import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { messageTemplatesService } from '@/services/lawyers-service';
import type { MessageTemplateChannel } from '@/types/api';

const channels: Array<{ value: MessageTemplateChannel; label: string }> = [
  { value: 'whatsapp_template', label: 'WhatsApp Template (Meta)' },
  { value: 'whatsapp_freeform', label: 'WhatsApp Livre' },
  { value: 'clipboard', label: 'Clipboard' },
  { value: 'wa_me_prefill', label: 'wa.me prefill' },
];

const placeholders = [
  'tenant.nome',
  'pericia.processoCNJ',
  'pericia.autorNome',
  'pericia.reuNome',
  'pericia.periciadoNome',
  'pericia.dataAgendamento',
  'pericia.horaAgendamento',
  'contact.nome',
  'contact.telefone',
  'contact.email',
];

export default function ComunicacaoPage() {
  const queryClient = useQueryClient();
  const [channel, setChannel] = useState<MessageTemplateChannel>('whatsapp_template');
  const [name, setName] = useState('');
  const [body, setBody] = useState('Olá {{contact.nome}}, sua perícia {{pericia.processoCNJ}} foi confirmada.');
  const [mapping, setMapping] = useState<Record<string, string>>({ '1': 'contact.nome' });

  const { data: templates = [], isLoading, isError } = useQuery({
    queryKey: ['message-templates', channel],
    queryFn: () => messageTemplatesService.list(channel),
  });

  const previewText = useMemo(() => {
    let current = body;
    if (channel === 'whatsapp_template') {
      Object.entries(mapping).forEach(([key, value]) => {
        current = current.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), `[${value}]`);
      });
      return current;
    }
    return current.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (_, token) => `[${token}]`);
  }, [body, channel, mapping]);

  const createMutation = useMutation({
    mutationFn: () =>
      messageTemplatesService.create({
        channel,
        name,
        body,
        placeholdersUsed: channel === 'whatsapp_template' ? Object.keys(mapping) : placeholders.filter((p) => body.includes(`{{${p}}}`)),
        variablesMapping: channel === 'whatsapp_template' ? mapping : {},
      }),
    onSuccess: () => {
      toast.success('Template salvo');
      queryClient.invalidateQueries({ queryKey: ['message-templates', channel] });
      setName('');
    },
    onError: () => toast.error('Falha ao salvar template'),
  });

  function insertPlaceholder(token: string) {
    setBody((prev) => `${prev}${prev.endsWith(' ') ? '' : ' '}{{${token}}}`);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="lg:col-span-3 space-y-3">
        <Card className="p-3 space-y-2">
          <h2 className="font-semibold">Canal</h2>
          {channels.map((c) => (
            <Button key={c.value} variant={channel === c.value ? 'default' : 'outline'} className="w-full justify-start" onClick={() => setChannel(c.value)}>
              {c.label}
            </Button>
          ))}
        </Card>
        <Card className="p-3 space-y-2">
          <h2 className="font-semibold">Placeholders</h2>
          {placeholders.map((token) => (
            <button key={token} className="text-left text-sm rounded border px-2 py-1 w-full hover:bg-slate-50" onClick={() => insertPlaceholder(token)} type="button">
              {`{{${token}}}`}
            </button>
          ))}
          <p className="text-xs text-muted-foreground">Clique para inserir no corpo.</p>
        </Card>
      </div>

      <div className="lg:col-span-5 space-y-3">
        <Card className="p-4 space-y-3">
          <h1 className="text-xl font-semibold">Templates</h1>
          <Input placeholder="Nome do template" value={name} onChange={(e) => setName(e.target.value)} />
          <textarea className="min-h-40 w-full rounded-md border px-3 py-2 text-sm" value={body} onChange={(e) => setBody(e.target.value)} />
          {channel === 'whatsapp_template' && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Mapeamento Meta ({"{{1..n}}"})</p>
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center gap-2">
                  <span className="text-sm w-14">{`{{${n}}}`}</span>
                  <Input value={mapping[String(n)] ?? ''} onChange={(e) => setMapping((prev) => ({ ...prev, [String(n)]: e.target.value }))} placeholder="ex: contact.nome" />
                </div>
              ))}
            </div>
          )}
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !name || !body}>
            {createMutation.isPending ? 'Salvando...' : 'Salvar template'}
          </Button>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold mb-2">Templates cadastrados ({templates.length})</h2>
          {isLoading && <LoadingState />}
          {isError && <ErrorState message="Erro ao carregar templates" />}
          {!isLoading && !isError && templates.length === 0 && <EmptyState title="Nenhum template neste canal" />}
          <div className="space-y-2">
            {templates.map((tpl) => (
              <div key={tpl.id} className="rounded border p-2 text-sm">
                <p className="font-medium">{tpl.name}</p>
                <p className="text-muted-foreground line-clamp-2">{tpl.body}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="lg:col-span-4">
        <Card className="p-4">
          <h2 className="font-semibold">Preview em tempo real</h2>
          <pre className="mt-2 whitespace-pre-wrap rounded bg-slate-50 p-3 text-sm">{previewText}</pre>
        </Card>
      </div>
    </div>
  );
}
