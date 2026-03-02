import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, MessageCircle, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { useLawyers } from '@/hooks/use-lawyers';
import { useVaraCommunication, type VaraCommunicationType } from '@/hooks/use-vara-communication';
import { messageTemplatesService } from '@/services/lawyers-service';
import type { Lawyer, MessageTemplateChannel } from '@/types/api';

type CommunicationTab = 'varas' | 'advogados' | 'templates';

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

const tabItems: Array<{ id: CommunicationTab; label: string; icon: typeof Building2 }> = [
  { id: 'varas', label: 'Varas', icon: Building2 },
  { id: 'advogados', label: 'Advogados', icon: Users },
  { id: 'templates', label: 'Templates', icon: MessageCircle },
];

const communicationTypeLabels: Record<VaraCommunicationType, string> = {
  cobranca: 'Cobrança',
  esclarecimentos: 'Esclarecimentos',
  prazo: 'Prazo',
};

function TemplatesTabContent() {
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

function buildLawyerMessage(lawyer: Lawyer) {
  const oab = lawyer.oab ? `OAB ${lawyer.oab}${lawyer.ufOab ? `/${lawyer.ufOab}` : ''}` : 'OAB não informada';
  return `Olá ${lawyer.nome},\n\nGostaria de tratar sobre assunto/perícia em andamento.${oab ? `\nDados profissionais: ${oab}.` : ''}\n\nFico à disposição.`;
}

function AdvogadosTabContent() {
  const { data: lawyers = [], isLoading, isError } = useLawyers();

  function handleSendMessage(lawyer: Lawyer) {
    const subject = 'Contato sobre perícia';
    const body = buildLawyerMessage(lawyer);
    if (lawyer.email) {
      window.open(`mailto:${encodeURIComponent(lawyer.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
      return;
    }
    navigator.clipboard.writeText(body);
    toast.success('Mensagem copiada para área de transferência');
  }

  return (
    <Card className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Advogados</h1>
        <p className="text-sm text-muted-foreground">Use o template padrão para contato rápido com os advogados cadastrados.</p>
      </div>
      {isLoading && <LoadingState />}
      {isError && <ErrorState message="Erro ao carregar advogados" />}
      {!isLoading && !isError && lawyers.length === 0 && <EmptyState title="Nenhum advogado cadastrado" />}
      <div className="space-y-2">
        {lawyers.map((lawyer) => (
          <div key={lawyer.id} className="rounded border p-3 text-sm flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-medium">{lawyer.nome}</p>
              <p className="text-muted-foreground">{lawyer.oab ? `OAB ${lawyer.oab}${lawyer.ufOab ? `/${lawyer.ufOab}` : ''}` : 'OAB não informada'}</p>
              <p className="text-muted-foreground">{lawyer.email ?? 'Sem e-mail cadastrado'}</p>
            </div>
            <Button onClick={() => handleSendMessage(lawyer)}>Enviar Mensagem</Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function VaraTabContent() {
  const {
    cidades,
    varas,
    selectedCidadeId,
    setSelectedCidadeId,
    selectedVaraId,
    setSelectedVaraId,
    communicationType,
    setCommunicationType,
    minDays,
    setMinDays,
    pending,
    isLoading,
    isError,
    generatedTemplate,
  } = useVaraCommunication();

  function handleCopy() {
    navigator.clipboard.writeText(generatedTemplate);
    toast.success('Template copiado');
  }

  const mailtoLink = `mailto:?subject=${encodeURIComponent(`Comunicação - ${communicationTypeLabels[communicationType]}`)}&body=${encodeURIComponent(generatedTemplate)}`;

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="lg:col-span-4 space-y-3">
        <Card className="p-4 space-y-3">
          <h1 className="text-xl font-semibold">Varas / Judiciário</h1>
          <div className="space-y-1">
            <label className="text-sm font-medium">Cidade</label>
            <select className="h-10 w-full rounded-md border px-3 text-sm" value={selectedCidadeId} onChange={(e) => setSelectedCidadeId(e.target.value)}>
              <option value="">Selecione</option>
              {cidades.map((cidade) => (
                <option key={cidade.id} value={cidade.id}>{cidade.nome}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Vara</label>
            <select className="h-10 w-full rounded-md border px-3 text-sm" value={selectedVaraId} onChange={(e) => setSelectedVaraId(e.target.value)} disabled={!selectedCidadeId}>
              <option value="">Selecione</option>
              {varas.map((vara) => (
                <option key={vara.id} value={vara.id}>{vara.nome}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Tipo</label>
            <select className="h-10 w-full rounded-md border px-3 text-sm" value={communicationType} onChange={(e) => setCommunicationType(e.target.value as VaraCommunicationType)}>
              <option value="cobranca">Cobrança</option>
              <option value="esclarecimentos">Esclarecimentos</option>
              <option value="prazo">Prazo</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Dias mínimos</label>
            <Input type="number" min={0} value={minDays} onChange={(e) => setMinDays(Number(e.target.value) || 0)} />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleCopy} disabled={!generatedTemplate.trim()}>Copiar</Button>
            <Button variant="outline" asChild>
              <a href={mailtoLink}>Abrir Email</a>
            </Button>
          </div>
        </Card>
      </div>
      <div className="lg:col-span-8 space-y-3">
        <Card className="p-4">
          <h2 className="font-semibold mb-2">Processos pendentes ({pending.length})</h2>
          {isLoading && <LoadingState />}
          {isError && <ErrorState message="Erro ao carregar processos pendentes" />}
          {!isLoading && !isError && pending.length === 0 && <EmptyState title="Nenhum processo pendente com os filtros selecionados" />}
          <div className="space-y-2">
            {pending.map((item) => (
              <div key={item.id} className="rounded border p-2 text-sm">
                <p className="font-medium">{item.processoCNJ}</p>
                <p className="text-muted-foreground">{item.autorNome} {item.reuNome ? `x ${item.reuNome}` : ''}</p>
                <p className="text-muted-foreground">{item.daysPending} dias pendente</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="font-semibold">Template gerado</h2>
          <pre className="mt-2 whitespace-pre-wrap rounded bg-slate-50 p-3 text-sm">{generatedTemplate}</pre>
        </Card>
      </div>
    </div>
  );
}

export default function ComunicacaoPage() {
  const [activeTab, setActiveTab] = useState<CommunicationTab>('templates');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabItems.map((tab) => {
          const Icon = tab.icon;
          return (
            <Button key={tab.id} variant={activeTab === tab.id ? 'default' : 'outline'} onClick={() => setActiveTab(tab.id)}>
              <Icon className="mr-2 h-4 w-4" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {activeTab === 'varas' && <VaraTabContent />}
      {activeTab === 'advogados' && <AdvogadosTabContent />}
      {activeTab === 'templates' && <TemplatesTabContent />}
    </div>
  );
}
