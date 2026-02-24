import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Plus, Send, FileText, CheckCircle, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { templatesService } from '@/services/lawyers-service';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/state';
import type { EmailTemplate } from '@/types/api';

type ActiveTab = 'templates' | 'email';

type TemplateForm = {
  key: string;
  subject: string;
  bodyHtml: string;
};

type SendEmailForm = {
  to: string;
  subject: string;
  html: string;
};

const EMPTY_TEMPLATE_FORM: TemplateForm = { key: '', subject: '', bodyHtml: '' };
const EMPTY_SEND_FORM: SendEmailForm = { to: '', subject: '', html: '' };

export default function ComunicacaoPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ActiveTab>('templates');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [templateForm, setTemplateForm] = useState<TemplateForm>(EMPTY_TEMPLATE_FORM);
  const [sendForm, setSendForm] = useState<SendEmailForm>(EMPTY_SEND_FORM);

  const { data: templates = [], isLoading, isError, error } = useQuery<EmailTemplate[]>({
    queryKey: ['templates'],
    queryFn: templatesService.list,
  });

  const createTemplateMutation = useMutation({
    mutationFn: templatesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      toast.success('Template criado com sucesso!');
      setDialogOpen(false);
      setTemplateForm(EMPTY_TEMPLATE_FORM);
    },
    onError: () => {
      toast.error('Erro ao criar template. Tente novamente.');
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: templatesService.sendEmail,
    onSuccess: () => {
      toast.success('Email enviado!');
      setSendForm(EMPTY_SEND_FORM);
    },
    onError: () => {
      toast.error('Erro ao enviar email. Tente novamente.');
    },
  });

  function handleTemplateChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setTemplateForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSendChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setSendForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleTemplateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!templateForm.key.trim()) {
      toast.error('O campo Chave (key) é obrigatório.');
      return;
    }
    if (!templateForm.subject.trim()) {
      toast.error('O campo Assunto é obrigatório.');
      return;
    }
    if (!templateForm.bodyHtml.trim()) {
      toast.error('O campo Corpo HTML é obrigatório.');
      return;
    }
    createTemplateMutation.mutate({
      key: templateForm.key.trim(),
      subject: templateForm.subject.trim(),
      bodyHtml: templateForm.bodyHtml,
    });
  }

  function handleSendSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sendForm.to.trim()) {
      toast.error('O campo Destinatário é obrigatório.');
      return;
    }
    if (!sendForm.subject.trim()) {
      toast.error('O campo Assunto é obrigatório.');
      return;
    }
    if (!sendForm.html.trim()) {
      toast.error('O campo Corpo HTML é obrigatório.');
      return;
    }
    sendEmailMutation.mutate({
      to: sendForm.to.trim(),
      subject: sendForm.subject.trim(),
      html: sendForm.html,
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-600 px-6 py-5 shadow-lg">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500">
              <Mail size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-wide text-white">
                COMUNICAÇÃO E TEMPLATES
              </h1>
              <p className="text-sm text-blue-200">
                Gerenciamento de templates de e-mail e envio de mensagens
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-5 flex gap-1">
            <TabButton
              active={activeTab === 'templates'}
              onClick={() => setActiveTab('templates')}
              icon={<FileText size={15} />}
              label="Templates"
            />
            <TabButton
              active={activeTab === 'email'}
              onClick={() => setActiveTab('email')}
              icon={<Send size={15} />}
              label="Enviar Email"
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-7xl px-6 py-6">
        {activeTab === 'templates' && (
          <section>
            {/* Section header */}
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Templates de E-mail
                </h2>
                <p className="text-sm text-gray-500">
                  {templates.length} template{templates.length !== 1 ? 's' : ''} cadastrado{templates.length !== 1 ? 's' : ''}
                </p>
              </div>
              <Button
                variant="default"
                size="md"
                className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => {
                  setTemplateForm(EMPTY_TEMPLATE_FORM);
                  setDialogOpen(true);
                }}
              >
                <Plus size={16} />
                Novo Template
              </Button>
            </div>

            {isLoading && <LoadingState />}
            {isError && (
              <ErrorState
                message={
                  error instanceof Error
                    ? error.message
                    : 'Erro ao carregar templates.'
                }
              />
            )}
            {!isLoading && !isError && templates.length === 0 && (
              <EmptyState title="Nenhum template cadastrado ainda." />
            )}

            {!isLoading && !isError && templates.length > 0 && (
              <div className="space-y-3">
                {templates.map((tpl) => (
                  <TemplateCard key={tpl.id} template={tpl} />
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'email' && (
          <section>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-800">
                Enviar E-mail
              </h2>
              <p className="text-sm text-gray-500">
                Compose e envie um e-mail diretamente pelo sistema.
              </p>
            </div>

            <div className="max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <form onSubmit={handleSendSubmit} className="space-y-4">
                {/* To */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Destinatário <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="to"
                    type="email"
                    value={sendForm.to}
                    onChange={handleSendChange}
                    placeholder="destinatario@exemplo.com"
                    required
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Assunto <span className="text-red-500">*</span>
                  </label>
                  <Input
                    name="subject"
                    value={sendForm.subject}
                    onChange={handleSendChange}
                    placeholder="Assunto do e-mail"
                    required
                  />
                </div>

                {/* Body HTML */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Corpo HTML <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="html"
                    value={sendForm.html}
                    onChange={handleSendChange}
                    rows={10}
                    placeholder="<p>Conteúdo do e-mail em HTML...</p>"
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring resize-y"
                    required
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    variant="default"
                    size="md"
                    disabled={sendEmailMutation.isPending}
                    className="flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <Send size={15} />
                    {sendEmailMutation.isPending ? 'Enviando...' : 'Enviar E-mail'}
                  </Button>
                </div>
              </form>
            </div>
          </section>
        )}
      </div>

      {/* Dialog - New Template */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Criar Novo Template"
        className="max-w-xl"
      >
        <form onSubmit={handleTemplateSubmit} className="space-y-4">
          {/* Key */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Chave (key) <span className="text-red-500">*</span>
            </label>
            <Input
              name="key"
              value={templateForm.key}
              onChange={handleTemplateChange}
              placeholder="Ex: NOMEACAO_PERITO"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Identificador único do template, sem espaços.
            </p>
          </div>

          {/* Subject */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Assunto <span className="text-red-500">*</span>
            </label>
            <Input
              name="subject"
              value={templateForm.subject}
              onChange={handleTemplateChange}
              placeholder="Assunto padrão do e-mail"
              required
            />
          </div>

          {/* Body HTML */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Corpo HTML <span className="text-red-500">*</span>
            </label>
            <textarea
              name="bodyHtml"
              value={templateForm.bodyHtml}
              onChange={handleTemplateChange}
              rows={8}
              placeholder="<p>Corpo do e-mail em HTML. Use {{variavel}} para variáveis dinâmicas.</p>"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring resize-y"
              required
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="default"
              size="md"
              disabled={createTemplateMutation.isPending}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {createTemplateMutation.isPending ? 'Salvando...' : 'Criar Template'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 rounded-t-lg px-5 py-2.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-white text-blue-700'
          : 'text-blue-200 hover:bg-blue-500 hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function TemplateCard({ template }: { template: EmailTemplate }) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50">
        <FileText size={18} className="text-blue-600" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-3">
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-blue-700">
            {template.key}
          </span>
          {template.active !== false ? (
            <span className="flex items-center gap-1 text-xs font-medium text-green-600">
              <CheckCircle size={12} />
              Ativo
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs font-medium text-gray-400">
              <Circle size={12} />
              Inativo
            </span>
          )}
        </div>
        <p className="truncate font-medium text-gray-800">{template.subject}</p>
        {template.variables && template.variables.length > 0 && (
          <p className="mt-1 text-xs text-gray-400">
            Variáveis: {template.variables.join(', ')}
          </p>
        )}
      </div>
    </div>
  );
}
