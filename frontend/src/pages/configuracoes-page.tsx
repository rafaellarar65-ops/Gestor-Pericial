import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Building2, Scale, Tag, LayoutGrid, Settings, SlidersHorizontal, Save, Users, ListChecks, PlugZap } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/state';
import { configService, getResourceEndpoint } from '@/services/config-service';
import type { ConfigItem, DashboardSystemSettings, IntegrationSettings, UserRole } from '@/types/api';

type Resource = 'cidades' | 'varas' | 'status' | 'tipos-pericia' | 'modalidades' | 'sistema' | 'usuarios' | 'regras' | 'integracoes';

type FieldMeta = { key: string; label: string; required?: boolean; type?: 'text' | 'select' | 'checkbox'; options?: Array<{ label: string; value: string }> };

type ResourceMeta = {
  label: string;
  icon: React.ReactNode;
  fields?: FieldMeta[];
};

const RESOURCE_CONFIG: Record<Resource, ResourceMeta> = {
  cidades: {
    label: 'Cidades',
    icon: <Building2 className="h-4 w-4" />,
    fields: [
      { key: 'nome', label: 'Nome', required: true },
      { key: 'uf', label: 'UF (ex: SP)' },
    ],
  },
  varas: {
    label: 'Varas',
    icon: <Scale className="h-4 w-4" />,
    fields: [
      { key: 'nome', label: 'Nome', required: true },
      { key: 'cidadeId', label: 'ID da Cidade' },
    ],
  },
  status: {
    label: 'Status de Perícia',
    icon: <Tag className="h-4 w-4" />,
    fields: [
      { key: 'nome', label: 'Nome', required: true },
      { key: 'codigo', label: 'Código' },
      { key: 'cor', label: 'Cor (hex)' },
    ],
  },
  'tipos-pericia': {
    label: 'Tipos de Perícia',
    icon: <LayoutGrid className="h-4 w-4" />,
    fields: [
      { key: 'nome', label: 'Nome', required: true },
      { key: 'sigla', label: 'Sigla' },
    ],
  },
  modalidades: {
    label: 'Modalidades',
    icon: <Settings className="h-4 w-4" />,
    fields: [{ key: 'nome', label: 'Nome', required: true }],
  },
  usuarios: {
    label: 'Usuários',
    icon: <Users className="h-4 w-4" />,
    fields: [
      { key: 'nome', label: 'Nome', required: true },
      { key: 'email', label: 'E-mail', required: true },
      {
        key: 'role',
        label: 'Perfil',
        required: true,
        type: 'select',
        options: [
          { label: 'ADMIN', value: 'ADMIN' },
          { label: 'ASSISTANT', value: 'ASSISTANT' },
        ],
      },
      { key: 'ativo', label: 'Ativo', type: 'checkbox' },
    ],
  },
  regras: {
    label: 'Regras',
    icon: <ListChecks className="h-4 w-4" />,
    fields: [
      { key: 'nome', label: 'Nome', required: true },
      { key: 'descricao', label: 'Descrição' },
      { key: 'campoAlvo', label: 'Campo alvo', required: true },
      { key: 'operador', label: 'Operador', required: true },
      { key: 'valor', label: 'Valor', required: true },
      { key: 'acao', label: 'Ação', required: true },
    ],
  },
  integracoes: {
    label: 'Integrações',
    icon: <PlugZap className="h-4 w-4" />,
  },
  sistema: {
    label: 'Configurações do Sistema',
    icon: <SlidersHorizontal className="h-4 w-4" />,
  },
};

const parseList = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const asText = (list: string[]) => list.join(', ');

const Page = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Resource>('cidades');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ConfigItem | null>(null);
  const [form, setForm] = useState<Record<string, string | boolean>>({});

  const cfg = RESOURCE_CONFIG[activeTab];
  const isSystemTab = activeTab === 'sistema';
  const isIntegrationsTab = activeTab === 'integracoes';
  const resourceQueryKey = ['config', activeTab, getResourceEndpoint(activeTab)];

  const { data: items = [], isLoading, isError } = useQuery<ConfigItem[]>({
    queryKey: resourceQueryKey,
    queryFn: () => configService.list(activeTab),
    enabled: !isSystemTab && !isIntegrationsTab,
  });

  const { data: dashboardSettings, isLoading: isLoadingSystem } = useQuery({
    queryKey: ['system-dashboard-settings'],
    queryFn: () => configService.getDashboardSettings(),
    enabled: isSystemTab,
  });

  const { data: integrations, isLoading: isLoadingIntegrations } = useQuery({
    queryKey: ['config', 'integracoes', getResourceEndpoint('integracoes')],
    queryFn: () => configService.getIntegrations(),
    enabled: isIntegrationsTab,
  });

  const [systemForm, setSystemForm] = useState<Record<string, string>>({});
  const [integrationsForm, setIntegrationsForm] = useState<Record<string, string>>({});

  const fillSystemForm = (settings: DashboardSystemSettings) => {
    setSystemForm({
      nomeacoesAvaliar: asText(settings.nomeacoesGroups.avaliar),
      nomeacoesAceite: asText(settings.nomeacoesGroups.aceiteHonorarios),
      nomeacoesMajorar: asText(settings.nomeacoesGroups.majorarHonorarios),
      nomeacoesObservacao: asText(settings.nomeacoesGroups.observacaoExtra),
      dashboardAvaliarCodigos: asText(settings.dashboard.avaliarStatusCodigos),
      dashboardAvaliarTermos: asText(settings.dashboard.avaliarStatusNomeTermos),
      dashboardLaudoCodigos: asText(settings.dashboard.enviarLaudoStatusCodigos),
      dashboardLaudoTermos: asText(settings.dashboard.enviarLaudoStatusNomeTermos),
      filaAgendamentoBloqueios: asText(settings.filas.agendamentoBloqueiaTermosStatus),
      filaLaudoUrgencia: asText(settings.filas.laudosUrgenciaTermosStatus),
    });
  };

  const fillIntegrationsForm = (settings: IntegrationSettings) => {
    setIntegrationsForm({
      smtp: settings.smtp ?? '',
      whatsappApi: settings.whatsappApi ?? '',
      googleCalendarLink: settings.googleCalendarLink ?? '',
    });
  };

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => configService.create(activeTab, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resourceQueryKey });
      toast.success('Item criado!');
      closeDialog();
    },
    onError: () => toast.error('Erro ao criar item.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => configService.update(activeTab, id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resourceQueryKey });
      toast.success('Item atualizado!');
      closeDialog();
    },
    onError: () => toast.error('Erro ao atualizar.'),
  });

  const updateSystemMutation = useMutation({
    mutationFn: (payload: DashboardSystemSettings) => configService.updateDashboardSettings(payload),
    onSuccess: (saved) => {
      fillSystemForm(saved);
      void queryClient.invalidateQueries({ queryKey: ['system-dashboard-settings'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Configurações do sistema atualizadas.');
    },
    onError: () => toast.error('Erro ao salvar configurações do sistema.'),
  });

  const updateIntegrationsMutation = useMutation({
    mutationFn: (payload: IntegrationSettings) => configService.updateIntegrations(payload),
    onSuccess: (saved) => {
      fillIntegrationsForm(saved);
      void queryClient.invalidateQueries({ queryKey: ['config', 'integracoes', getResourceEndpoint('integracoes')] });
      toast.success('Integrações atualizadas.');
    },
    onError: () => toast.error('Erro ao salvar integrações.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => configService.remove(activeTab, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: resourceQueryKey });
      toast.success('Item removido!');
    },
    onError: () => toast.error('Erro ao remover.'),
  });

  function openCreate() {
    if (!cfg.fields) return;
    setEditing(null);
    setForm(Object.fromEntries(cfg.fields.map((f) => [f.key, f.type === 'checkbox' ? false : ''])));
    setDialogOpen(true);
  }

  function openEdit(item: ConfigItem) {
    if (!cfg.fields) return;
    setEditing(item);
    setForm(
      Object.fromEntries(
        cfg.fields.map((f) => {
          const value = (item as Record<string, unknown>)[f.key];
          if (f.type === 'checkbox') return [f.key, Boolean(value)];
          return [f.key, (value as string) ?? ''];
        }),
      ),
    );
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
    setForm({});
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) {
      if (typeof v === 'boolean') {
        payload[k] = v;
        continue;
      }
      if (v) payload[k] = v;
    }
    if (editing) updateMutation.mutate({ id: editing.id, payload });
    else createMutation.mutate(payload);
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (isSystemTab && dashboardSettings && Object.keys(systemForm).length === 0) {
      fillSystemForm(dashboardSettings);
    }
  }, [isSystemTab, dashboardSettings, systemForm]);

  useEffect(() => {
    if (isIntegrationsTab && integrations && Object.keys(integrationsForm).length === 0) {
      fillIntegrationsForm(integrations);
    }
  }, [isIntegrationsTab, integrations, integrationsForm]);

  const submitSystemSettings = () => {
    const payload: DashboardSystemSettings = {
      nomeacoesGroups: {
        avaliar: parseList(systemForm.nomeacoesAvaliar ?? ''),
        aceiteHonorarios: parseList(systemForm.nomeacoesAceite ?? ''),
        majorarHonorarios: parseList(systemForm.nomeacoesMajorar ?? ''),
        observacaoExtra: parseList(systemForm.nomeacoesObservacao ?? ''),
      },
      dashboard: {
        avaliarStatusCodigos: parseList(systemForm.dashboardAvaliarCodigos ?? ''),
        avaliarStatusNomeTermos: parseList(systemForm.dashboardAvaliarTermos ?? ''),
        enviarLaudoStatusCodigos: parseList(systemForm.dashboardLaudoCodigos ?? ''),
        enviarLaudoStatusNomeTermos: parseList(systemForm.dashboardLaudoTermos ?? ''),
      },
      filas: {
        agendamentoBloqueiaTermosStatus: parseList(systemForm.filaAgendamentoBloqueios ?? ''),
        laudosUrgenciaTermosStatus: parseList(systemForm.filaLaudoUrgencia ?? ''),
      },
    };
    updateSystemMutation.mutate(payload);
  };

  const submitIntegrationsSettings = () => {
    updateIntegrationsMutation.mutate({
      smtp: integrationsForm.smtp ?? '',
      whatsappApi: integrationsForm.whatsappApi ?? '',
      googleCalendarLink: integrationsForm.googleCalendarLink ?? '',
    });
  };

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie catálogos e regras de apresentação das filas/dashboards.</p>
      </header>

      <div className="flex flex-wrap gap-1 rounded-lg border bg-slate-50 p-1">
        {(Object.keys(RESOURCE_CONFIG) as Resource[]).map((res) => {
          const c = RESOURCE_CONFIG[res];
          return (
            <button
              key={res}
              onClick={() => setActiveTab(res)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === res ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {c.icon} {c.label}
            </button>
          );
        })}
      </div>

      {isSystemTab ? (
        <div className="space-y-4">
          {isLoadingSystem ? <LoadingState /> : null}
          <Card className="space-y-3 p-4">
            <h2 className="text-base font-semibold">Central de Nomeações</h2>
            <p className="text-xs text-muted-foreground">Status/códigos usados para distribuir cartões por faixa.</p>
            {[
              ['nomeacoesAvaliar', 'Novas nomeações - Avaliar'],
              ['nomeacoesAceite', 'Novas nomeações - Aguardando aceite de honorários'],
              ['nomeacoesMajorar', 'Novas nomeações - Majorar honorários'],
              ['nomeacoesObservacao', 'Novas nomeações - Com observação extra'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium">{label}</label>
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  rows={2}
                  value={systemForm[key] ?? ''}
                  onChange={(e) => setSystemForm((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </div>
            ))}
          </Card>

          <Card className="space-y-3 p-4">
            <h2 className="text-base font-semibold">Dashboard (KPIs)</h2>
            <p className="text-xs text-muted-foreground">Regras usadas para computar contagens dos cartões do dashboard.</p>
            {[
              ['dashboardAvaliarCodigos', 'Códigos para KPI Novas Nomeações'],
              ['dashboardAvaliarTermos', 'Termos no nome para KPI Novas Nomeações'],
              ['dashboardLaudoCodigos', 'Códigos para KPI Enviar Laudos'],
              ['dashboardLaudoTermos', 'Termos no nome para KPI Enviar Laudos'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium">{label}</label>
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  rows={2}
                  value={systemForm[key] ?? ''}
                  onChange={(e) => setSystemForm((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </div>
            ))}
          </Card>

          <Card className="space-y-3 p-4">
            <h2 className="text-base font-semibold">Filas e Listagens</h2>
            <p className="text-xs text-muted-foreground">Filtros de frontend para fila de agendamento e laudos pendentes.</p>
            {[
              ['filaAgendamentoBloqueios', 'Termos de status para excluir da fila de agendamento'],
              ['filaLaudoUrgencia', 'Termos para marcar laudo como urgente'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium">{label}</label>
                <textarea
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  rows={2}
                  value={systemForm[key] ?? ''}
                  onChange={(e) => setSystemForm((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </div>
            ))}
          </Card>

          <div className="flex justify-end">
            <Button onClick={submitSystemSettings} disabled={updateSystemMutation.isPending}>
              <Save className="mr-1 h-4 w-4" />
              {updateSystemMutation.isPending ? 'Salvando...' : 'Salvar configurações do sistema'}
            </Button>
          </div>
        </div>
      ) : isIntegrationsTab ? (
        <div className="space-y-4">
          {isLoadingIntegrations ? <LoadingState /> : null}
          <Card className="space-y-3 p-4">
            <h2 className="text-base font-semibold">Integrações</h2>
            <p className="text-xs text-muted-foreground">Configure os provedores integrados da plataforma.</p>
            {[
              ['smtp', 'SMTP'],
              ['whatsappApi', 'WhatsApp API'],
              ['googleCalendarLink', 'Link do Google Calendar'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="mb-1 block text-sm font-medium">{label}</label>
                <Input value={integrationsForm[key] ?? ''} onChange={(e) => setIntegrationsForm((prev) => ({ ...prev, [key]: e.target.value }))} />
              </div>
            ))}
          </Card>
          <div className="flex justify-end">
            <Button onClick={submitIntegrationsSettings} disabled={updateIntegrationsMutation.isPending}>
              <Save className="mr-1 h-4 w-4" />
              {updateIntegrationsMutation.isPending ? 'Salvando...' : 'Salvar integrações'}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? 'registro' : 'registros'} em <strong>{cfg.label}</strong>
            </p>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" /> Novo
            </Button>
          </div>

          {isLoading && <LoadingState />}
          {isError && <ErrorState message={`Erro ao carregar ${cfg.label}.`} />}

          {!isLoading && !isError && items.length === 0 && <EmptyState title={`Nenhum registro em ${cfg.label}. Clique em Novo para adicionar.`} />}

          {!isLoading && !isError && items.length > 0 && (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50">
                      {cfg.fields?.map((f) => (
                        <th key={f.key} className="px-3 py-2 text-left font-semibold">
                          {f.label}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-right font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b hover:bg-slate-50">
                        {cfg.fields?.map((f) => (
                          <td key={f.key} className="px-3 py-2">
                            {f.key === 'ativo'
                              ? (item as Record<string, unknown>)[f.key]
                                ? 'Ativo'
                                : 'Inativo'
                              : String((item as Record<string, unknown>)[f.key] ?? '—')}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              disabled={deleteMutation.isPending}
                              onClick={() => {
                                if (window.confirm('Remover este item?')) deleteMutation.mutate(item.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <Dialog open={dialogOpen} onClose={closeDialog} title={editing ? `Editar ${cfg.label}` : `Novo em ${cfg.label}`}>
            <form onSubmit={onSubmit} className="space-y-4">
              {cfg.fields?.map((f) => (
                <div key={f.key}>
                  <label className="mb-1 block text-sm font-medium">
                    {f.label} {f.required && <span className="text-red-500">*</span>}
                  </label>
                  {f.type === 'select' ? (
                    <select
                      className="h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={(form[f.key] as UserRole | '') ?? ''}
                      onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value as UserRole }))}
                      required={f.required}
                    >
                      <option value="">Selecione</option>
                      {f.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : f.type === 'checkbox' ? (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(form[f.key])}
                        onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.checked }))}
                      />
                      Usuário ativo
                    </label>
                  ) : (
                    <Input value={String(form[f.key] ?? '')} onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))} required={f.required} />
                  )}
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </Dialog>
        </>
      )}
    </div>
  );
};

export default Page;
