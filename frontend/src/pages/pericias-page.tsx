import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, CheckSquare, Filter, Plus, RotateCw, Trash2, Upload, X } from 'lucide-react';
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { DomainPageTemplate } from '@/components/domain/domain-page-template';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { usePericiasQuery } from '@/hooks/use-pericias';
import { apiClient } from '@/lib/api-client';
import type { AppShellOutletContext } from '@/layouts/app-shell-context';
import { configService } from '@/services/config-service';
import type { ConfigItem } from '@/types/api';
import { toast } from 'sonner';

const toMoney = (value?: number | string) => Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const asId = (value: unknown) => {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (value && typeof value === 'object') {
    const objectValue = value as { id?: string | number };
    if (objectValue.id !== undefined) return String(objectValue.id);
  }
  return '';
};

const statusLabel = (status: unknown) => {
  if (typeof status === 'string') return status;
  if (status && typeof status === 'object') {
    const value = status as { nome?: string; codigo?: string };
    return value.nome ?? value.codigo ?? 'Sem status';
  }
  return 'Sem status';
};

const cityLabel = (cidade: unknown) => {
  if (typeof cidade === 'string') return cidade;
  if (cidade && typeof cidade === 'object') {
    const value = cidade as { nome?: string };
    return value.nome ?? '—';
  }
  return '—';
};

const authorLabel = (item: Record<string, unknown>) => String(item.autorNome ?? item.periciadoNome ?? 'Sem autor');

const parseNumber = (value: string) => {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export const PericiasPage = () => {
  const { setHeaderConfig, clearHeaderConfig } = useOutletContext<AppShellOutletContext>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page] = useState(1);

  const [showFilters, setShowFilters] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchStatusDialogOpen, setBatchStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [statusId, setStatusId] = useState(searchParams.get('statusId') ?? '');
  const [cidadeId, setCidadeId] = useState(searchParams.get('cidadeId') ?? '');
  const [varaId, setVaraId] = useState(searchParams.get('varaId') ?? '');
  const [tipoPericiaId, setTipoPericiaId] = useState(searchParams.get('tipoPericiaId') ?? '');
  const [valorMin, setValorMin] = useState(searchParams.get('valorMin') ?? '');
  const [valorMax, setValorMax] = useState(searchParams.get('valorMax') ?? '');
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') ?? '');
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') ?? '');
  const [batchStatusId, setBatchStatusId] = useState('');

  useEffect(() => {
    setHeaderConfig({
      primaryActions: (
        <Button className="gap-2" onClick={() => navigate('/pericias/nova')} size="sm" type="button">
          <Plus size={14} /> Nova perícia
        </Button>
      ),
    });

    return clearHeaderConfig;
  }, [setHeaderConfig, clearHeaderConfig, navigate]);

  const { data: statusOptions = [] } = useQuery<ConfigItem[]>({
    queryKey: ['config', 'status'],
    queryFn: () => configService.list('status'),
  });

  const { data: cidadesOptions = [] } = useQuery<ConfigItem[]>({
    queryKey: ['config', 'cidades'],
    queryFn: () => configService.list('cidades'),
  });

  const { data: varasOptions = [] } = useQuery<ConfigItem[]>({
    queryKey: ['config', 'varas'],
    queryFn: () => configService.list('varas'),
  });

  const { data: tiposPericiaOptions = [] } = useQuery<ConfigItem[]>({
    queryKey: ['config', 'tipos-pericia'],
    queryFn: () => configService.list('tipos-pericia'),
  });

  const backendFilters = useMemo(
    () => ({
      limit: 100,
      search: search.trim().length ? search.trim() : undefined,
      statusId: statusId || undefined,
      cidadeId: cidadeId || undefined,
      varaId: varaId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      valorMin: parseNumber(valorMin),
      valorMax: parseNumber(valorMax),
    }),
    [search, statusId, cidadeId, varaId, dateFrom, dateTo, valorMin, valorMax],
  );

  const { data, isLoading, isError, isFetching, refetch } = usePericiasQuery(page, backendFilters);

  const syncQueryString = (values: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(values).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    setSearchParams(params, { replace: true });
  };

  const filteredVaras = useMemo(() => {
    if (!cidadeId) return varasOptions;
    return varasOptions.filter((item) => !item.cidadeId || item.cidadeId === cidadeId);
  }, [varasOptions, cidadeId]);

  const rows = useMemo(() => {
    const source = (data?.items ?? []) as Array<Record<string, unknown>>;
    if (!tipoPericiaId) return source;
    return source.filter((item) => asId(item.tipoPericia) === tipoPericiaId || asId(item.tipoPericiaId) === tipoPericiaId);
  }, [data?.items, tipoPericiaId]);

  const allVisibleSelected = rows.length > 0 && rows.every((row) => selectedIds.has(String(row.id ?? '')));

  const toggleAllVisible = (checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        rows.forEach((row) => next.add(String(row.id ?? '')));
      } else {
        rows.forEach((row) => next.delete(String(row.id ?? '')));
      }
      return next;
    });
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const clearFilters = () => {
    setSearch('');
    setStatusId('');
    setCidadeId('');
    setVaraId('');
    setTipoPericiaId('');
    setValorMin('');
    setValorMax('');
    setDateFrom('');
    setDateTo('');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const runBatchStatus = async () => {
    if (!batchStatusId) {
      toast.error('Selecione um status para continuar.');
      return;
    }
    if (selectedIds.size === 0) {
      toast.error('Selecione ao menos uma perícia.');
      return;
    }

    try {
      await apiClient.patch('/pericias/batch-status', { ids: Array.from(selectedIds), statusId: batchStatusId });
      toast.success('Status atualizado em lote.');
      setBatchStatusDialogOpen(false);
      setBatchStatusId('');
      clearSelection();
      await queryClient.invalidateQueries({ queryKey: ['pericias'] });
    } catch {
      toast.error('Erro ao atualizar status em lote.');
    }
  };

  const runBatchDelete = async () => {
    if (selectedIds.size === 0) {
      toast.error('Selecione ao menos uma perícia.');
      return;
    }

    try {
      await apiClient.delete('/pericias/batch', { data: { ids: Array.from(selectedIds) } });
      toast.success('Perícias excluídas.');
      setDeleteDialogOpen(false);
      clearSelection();
      await queryClient.invalidateQueries({ queryKey: ['pericias'] });
    } catch {
      toast.error('Erro ao excluir perícias em lote.');
    }
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Erro ao carregar perícias" />;

  return (
    <DomainPageTemplate
      title="Listagem de Perícias"
      description="Gestão centralizada de casos com filtros avançados e ações em lote."
      headerActions={
        <>
          <Button onClick={() => refetch()} size="sm" type="button" variant="outline"><RotateCw size={14} /></Button>
          <Button className="gap-2 text-purple-700" size="sm" type="button" variant="outline"><Bot size={14} /> IA</Button>
          <Button className="gap-2" size="sm" type="button" variant="outline"><Upload size={14} /> Importar</Button>
          <Button className="gap-2" onClick={() => navigate('/pericias/nova')} size="sm" type="button"><Plus size={14} /> Nova</Button>
        </>
      }
    >
      {selectedIds.size > 0 && (
        <Card className="sticky top-2 z-10 mb-4 flex flex-wrap items-center gap-2 border-primary/30 bg-primary/5 p-3">
          <span className="text-sm font-semibold">{selectedIds.size} selecionados</span>
          <span className="text-muted-foreground">|</span>
          <Button className="gap-1" onClick={() => setBatchStatusDialogOpen(true)} size="sm" type="button" variant="outline">
            <CheckSquare size={14} /> Alterar Status
          </Button>
          <Button size="sm" type="button" variant="outline">Agendar em Lote</Button>
          <Button className="gap-1" onClick={() => setDeleteDialogOpen(true)} size="sm" type="button" variant="destructive">
            <Trash2 size={14} /> Excluir
          </Button>
          <Button className="gap-1" onClick={clearSelection} size="sm" type="button" variant="ghost">
            <X size={14} /> Limpar Seleção
          </Button>
        </Card>
      )}

      <Card className="mb-4">
        <button className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-700" onClick={() => setShowFilters((current) => !current)} type="button">
          <Filter size={15} /> Filtros e Busca
        </button>

        {showFilters && (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-xs font-semibold uppercase text-slate-500">
              Busca (CNJ, autor, réu)
              <Input
                className="mt-1"
                onBlur={() => syncQueryString({ q: search })}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Digite CNJ, autor ou réu"
                value={search}
              />
            </label>

            <label className="text-xs font-semibold uppercase text-slate-500">
              Status
              <select
                className="mt-1 h-10 w-full rounded-md border px-3 py-2 text-sm"
                onChange={(event) => {
                  const next = event.target.value;
                  setStatusId(next);
                  syncQueryString({ statusId: next });
                }}
                value={statusId}
              >
                <option value="">Todos</option>
                {statusOptions.map((status) => (
                  <option key={status.id} value={status.id}>{status.nome}</option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold uppercase text-slate-500">
              Cidade
              <select
                className="mt-1 h-10 w-full rounded-md border px-3 py-2 text-sm"
                onChange={(event) => {
                  const next = event.target.value;
                  setCidadeId(next);
                  setVaraId('');
                  syncQueryString({ cidadeId: next, varaId: '' });
                }}
                value={cidadeId}
              >
                <option value="">Todas</option>
                {cidadesOptions.map((cidade) => (
                  <option key={cidade.id} value={cidade.id}>{cidade.nome}</option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold uppercase text-slate-500">
              Vara
              <select
                className="mt-1 h-10 w-full rounded-md border px-3 py-2 text-sm"
                onChange={(event) => {
                  const next = event.target.value;
                  setVaraId(next);
                  syncQueryString({ varaId: next });
                }}
                value={varaId}
              >
                <option value="">Todas</option>
                {filteredVaras.map((vara) => (
                  <option key={vara.id} value={vara.id}>{vara.nome}</option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold uppercase text-slate-500">
              Tipo de Perícia
              <select
                className="mt-1 h-10 w-full rounded-md border px-3 py-2 text-sm"
                onChange={(event) => {
                  const next = event.target.value;
                  setTipoPericiaId(next);
                  syncQueryString({ tipoPericiaId: next });
                }}
                value={tipoPericiaId}
              >
                <option value="">Todos</option>
                {tiposPericiaOptions.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>{tipo.nome}</option>
                ))}
              </select>
            </label>

            <label className="text-xs font-semibold uppercase text-slate-500">
              Valor Mínimo
              <Input
                className="mt-1"
                min={0}
                onBlur={() => syncQueryString({ valorMin })}
                onChange={(event) => setValorMin(event.target.value)}
                step="0.01"
                type="number"
                value={valorMin}
              />
            </label>

            <label className="text-xs font-semibold uppercase text-slate-500">
              Valor Máximo
              <Input
                className="mt-1"
                min={0}
                onBlur={() => syncQueryString({ valorMax })}
                onChange={(event) => setValorMax(event.target.value)}
                step="0.01"
                type="number"
                value={valorMax}
              />
            </label>

            <label className="text-xs font-semibold uppercase text-slate-500">
              Data Início
              <Input
                className="mt-1"
                onChange={(event) => {
                  const next = event.target.value;
                  setDateFrom(next);
                  syncQueryString({ dateFrom: next });
                }}
                type="date"
                value={dateFrom}
              />
            </label>

            <label className="text-xs font-semibold uppercase text-slate-500">
              Data Fim
              <Input
                className="mt-1"
                onChange={(event) => {
                  const next = event.target.value;
                  setDateTo(next);
                  syncQueryString({ dateTo: next });
                }}
                type="date"
                value={dateTo}
              />
            </label>

            <div className="flex items-end">
              <Button className="w-full" onClick={clearFilters} type="button" variant="outline">Limpar Filtros</Button>
            </div>
          </div>
        )}
      </Card>

      <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="grid grid-cols-[40px_2fr_2fr_1fr_1fr_1fr] gap-2 border-b bg-muted/50 px-4 py-3 text-xs font-semibold uppercase text-muted-foreground">
          <span className="flex items-center">
            <input checked={allVisibleSelected} onChange={(event) => toggleAllVisible(event.target.checked)} type="checkbox" />
          </span>
          <span>CNJ / Data</span><span>Partes</span><span>Local</span><span>Status</span><span className="text-right">Valor</span>
        </div>
        {isFetching && <div className="border-b px-4 py-2 text-xs text-muted-foreground">Atualizando...</div>}
        {rows.length === 0 && <EmptyState title="Use os filtros acima para encontrar processos" />}
        {rows.map((row) => {
          const rowData = row as Record<string, unknown>;
          const status = statusLabel(rowData.status);
          const rowId = String(rowData.id ?? '');

          return (
            <div className="grid grid-cols-[40px_2fr_2fr_1fr_1fr_1fr] gap-2 border-b px-4 py-3 text-sm" key={rowId}>
              <div className="flex items-center"><input checked={selectedIds.has(rowId)} onChange={(event) => toggleOne(rowId, event.target.checked)} type="checkbox" /></div>
              <div><Link className="font-semibold text-foreground underline" to={`/pericias/${rowData.id}`}>{String(rowData.processoCNJ ?? '—')}</Link><p className="text-xs text-muted-foreground">{rowData.dataNomeacao ? new Date(String(rowData.dataNomeacao)).toLocaleDateString('pt-BR') : '—'}</p></div>
              <div><p className="font-semibold text-foreground">{authorLabel(rowData)}</p><p className="truncate text-xs text-muted-foreground">{String(rowData.reuNome ?? '—')}</p></div>
              <div className="text-foreground">{cityLabel(rowData.cidade)}</div>
              <div><span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-foreground">{status}</span></div>
              <div className="text-right font-semibold text-foreground">{toMoney(rowData.honorariosPrevistosJG as number | string)}</div>
            </div>
          );
        })}
      </section>

      <Dialog onClose={() => setBatchStatusDialogOpen(false)} open={batchStatusDialogOpen} title="Alterar Status em Lote">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Selecione o novo status para {selectedIds.size} perícias.</p>
          <select className="h-10 w-full rounded-md border px-3 py-2 text-sm" onChange={(event) => setBatchStatusId(event.target.value)} value={batchStatusId}>
            <option value="">Selecione um status</option>
            {statusOptions.map((status) => (
              <option key={status.id} value={status.id}>{status.nome}</option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setBatchStatusDialogOpen(false)} type="button" variant="outline">Cancelar</Button>
            <Button onClick={() => void runBatchStatus()} type="button">Aplicar</Button>
          </div>
        </div>
      </Dialog>

      <Dialog onClose={() => setDeleteDialogOpen(false)} open={deleteDialogOpen} title="Excluir perícias selecionadas">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita. Deseja excluir {selectedIds.size} perícias selecionadas?</p>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setDeleteDialogOpen(false)} type="button" variant="outline">Cancelar</Button>
            <Button onClick={() => void runBatchDelete()} type="button" variant="destructive">Excluir</Button>
          </div>
        </div>
      </Dialog>
    </DomainPageTemplate>
  );
};

export default PericiasPage;
