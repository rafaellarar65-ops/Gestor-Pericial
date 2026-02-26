import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Building2, Scale, Tag, LayoutGrid, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/state';
import { configService } from '@/services/config-service';
import type { ConfigItem } from '@/types/api';

type Resource = 'cidades' | 'varas' | 'status' | 'tipos-pericia' | 'modalidades';

const RESOURCE_CONFIG: Record<Resource, { label: string; icon: React.ReactNode; fields: { key: string; label: string; required?: boolean }[] }> = {
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
    fields: [
      { key: 'nome', label: 'Nome', required: true },
    ],
  },
};

const Page = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Resource>('cidades');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ConfigItem | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const cfg = RESOURCE_CONFIG[activeTab];

  const { data: items = [], isLoading, isError } = useQuery<ConfigItem[]>({
    queryKey: ['config', activeTab],
    queryFn: () => configService.list(activeTab),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => configService.create(activeTab, payload),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['config', activeTab] }); toast.success('Item criado!'); closeDialog(); },
    onError: () => toast.error('Erro ao criar item.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) => configService.update(activeTab, id, payload),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['config', activeTab] }); toast.success('Item atualizado!'); closeDialog(); },
    onError: () => toast.error('Erro ao atualizar.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => configService.remove(activeTab, id),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['config', activeTab] }); toast.success('Item removido!'); },
    onError: () => toast.error('Erro ao remover.'),
  });

  function openCreate() {
    setEditing(null);
    setForm(Object.fromEntries(cfg.fields.map((f) => [f.key, ''])));
    setDialogOpen(true);
  }

  function openEdit(item: ConfigItem) {
    setEditing(item);
    setForm(Object.fromEntries(cfg.fields.map((f) => [f.key, (item as Record<string, unknown>)[f.key] as string ?? ''])));
    setDialogOpen(true);
  }

  function closeDialog() { setDialogOpen(false); setEditing(null); setForm({}); }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) { if (v) payload[k] = v; }
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Gerencie as tabelas de apoio do sistema.</p>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border bg-slate-50 p-1">
        {(Object.keys(RESOURCE_CONFIG) as Resource[]).map((res) => {
          const c = RESOURCE_CONFIG[res];
          return (
            <button
              key={res}
              onClick={() => setActiveTab(res)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${activeTab === res ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {c.icon} {c.label}
            </button>
          );
        })}
      </div>

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

      {!isLoading && !isError && items.length === 0 && (
        <EmptyState title={`Nenhum registro em ${cfg.label}. Clique em Novo para adicionar.`} />
      )}

      {!isLoading && !isError && items.length > 0 && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  {cfg.fields.map((f) => (
                    <th key={f.key} className="px-3 py-2 text-left font-semibold">{f.label}</th>
                  ))}
                  <th className="px-3 py-2 text-right font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b hover:bg-slate-50">
                    {cfg.fields.map((f) => (
                      <td key={f.key} className="px-3 py-2">
                        {(item as Record<string, unknown>)[f.key] as string ?? '—'}
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
                          onClick={() => { if (window.confirm('Remover este item?')) deleteMutation.mutate(item.id); }}
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
          {cfg.fields.map((f) => (
            <div key={f.key}>
              <label className="mb-1 block text-sm font-medium">
                {f.label} {f.required && <span className="text-red-500">*</span>}
              </label>
              <Input
                value={form[f.key] ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                required={f.required}
              />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default Page;
