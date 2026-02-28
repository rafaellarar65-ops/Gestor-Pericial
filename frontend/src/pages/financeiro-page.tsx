import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Calendar, DollarSign, FileText, Hash, Link2, Plus, Search, Tag, TrendingUp } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { financialService } from '@/services/financial-service';
import { periciaService } from '@/services/pericia-service';
import type { Pericia, Recebimento, UnmatchedPayment } from '@/types/api';

const FONTE_OPTIONS = [
  { value: 'TJ', label: 'Tribunal de Justiça (TJ)' },
  { value: 'PARTE_AUTORA', label: 'Parte Autora' },
  { value: 'PARTE_RE', label: 'Parte Ré' },
  { value: 'SEGURADORA', label: 'Seguradora' },
  { value: 'OUTRO', label: 'Outro' },
] as const;

type FontePagamento = (typeof FONTE_OPTIONS)[number]['value'];

const FONTE_BADGE_COLORS: Record<FontePagamento | string, string> = {
  TJ: 'bg-blue-100 text-blue-800 ring-blue-200',
  PARTE_AUTORA: 'bg-violet-100 text-violet-800 ring-violet-200',
  PARTE_RE: 'bg-orange-100 text-orange-800 ring-orange-200',
  SEGURADORA: 'bg-teal-100 text-teal-800 ring-teal-200',
  OUTRO: 'bg-gray-100 text-gray-700 ring-gray-200',
};

const FONTE_LABELS: Record<FontePagamento | string, string> = {
  TJ: 'TJ',
  PARTE_AUTORA: 'Parte Autora',
  PARTE_RE: 'Parte Ré',
  SEGURADORA: 'Seguradora',
  OUTRO: 'Outro',
};

function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === 'string' ? parseFloat(value) : (value ?? 0);
  if (Number.isNaN(num)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
  return d.toLocaleDateString('pt-BR');
}

type FormState = {
  periciaId: string;
  fontePagamento: string;
  dataRecebimento: string;
  valorBruto: string;
  valorLiquido: string;
  descricao: string;
};

const INITIAL_FORM: FormState = {
  periciaId: '',
  fontePagamento: 'TJ',
  dataRecebimento: '',
  valorBruto: '',
  valorLiquido: '',
  descricao: '',
};

export default function FinanceiroPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [selectedUnmatched, setSelectedUnmatched] = useState<UnmatchedPayment | null>(null);
  const [cnjQuery, setCnjQuery] = useState('');
  const [selectedPericiaId, setSelectedPericiaId] = useState('');

  const { data: recebimentos = [], isLoading, isError, error } = useQuery<Recebimento[]>({
    queryKey: ['recebimentos'],
    queryFn: financialService.listRecebimentos,
  });

  const { data: unmatchedList = [] } = useQuery<UnmatchedPayment[]>({
    queryKey: ['financial-unmatched'],
    queryFn: financialService.listUnmatched,
  });

  const periciasSearchQuery = useQuery({
    queryKey: ['pericias-search-cnj', cnjQuery],
    enabled: cnjQuery.trim().length >= 8,
    queryFn: async () => {
      const result = await periciaService.list(1, { limit: 10, search: cnjQuery.trim() });
      return result.items;
    },
  });

  const mutation = useMutation({
    mutationFn: financialService.createRecebimento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recebimentos'] });
      toast.success('Recebimento registrado com sucesso!');
      setDialogOpen(false);
      setForm(INITIAL_FORM);
    },
    onError: () => {
      toast.error('Erro ao registrar recebimento. Tente novamente.');
    },
  });

  const linkMutation = useMutation({
    mutationFn: ({ unmatchedId, periciaId }: { unmatchedId: string; periciaId: string }) =>
      financialService.linkUnmatched(unmatchedId, periciaId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['financial-unmatched'] });
      queryClient.invalidateQueries({ queryKey: ['recebimentos'] });
      toast.success('Pagamento vinculado com sucesso. Registro original preservado para auditoria.');
      setLinkDialogOpen(false);
      setSelectedUnmatched(null);
      setSelectedPericiaId('');
      setCnjQuery('');
    },
    onError: () => toast.error('Falha ao vincular pagamento não conciliado.'),
  });

  useEffect(() => {
    const returnCnj = searchParams.get('createdCnj');
    const createdPericiaId = searchParams.get('createdPericiaId');
    const unmatchedId = searchParams.get('linkUnmatched');
    if (!unmatchedId) return;

    const target = unmatchedList.find((item) => item.id === unmatchedId);
    if (!target) return;

    setSelectedUnmatched(target);
    setCnjQuery(returnCnj ?? extractCnjFromRawData(target.rawData));
    if (createdPericiaId) setSelectedPericiaId(createdPericiaId);
    setLinkDialogOpen(true);

    const next = new URLSearchParams(searchParams);
    next.delete('createdCnj');
    next.delete('createdPericiaId');
    setSearchParams(next, { replace: true });
  }, [searchParams, unmatchedList, setSearchParams]);

  const totalValor = recebimentos.reduce((sum, r) => {
    const v = typeof r.valorBruto === 'string' ? parseFloat(r.valorBruto) : r.valorBruto;
    return sum + (Number.isNaN(v) ? 0 : v);
  }, 0);

  const periciasEncontradas = useMemo(() => periciasSearchQuery.data ?? [], [periciasSearchQuery.data]);

  function openLinkDialog(item: UnmatchedPayment) {
    setSelectedUnmatched(item);
    setCnjQuery(extractCnjFromRawData(item.rawData));
    setSelectedPericiaId('');
    setLinkDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.periciaId || !form.dataRecebimento || !form.valorBruto) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }
    mutation.mutate({
      periciaId: form.periciaId,
      fontePagamento: form.fontePagamento,
      dataRecebimento: form.dataRecebimento,
      valorBruto: parseFloat(form.valorBruto),
      valorLiquido: form.valorLiquido ? parseFloat(form.valorLiquido) : undefined,
      descricao: form.descricao || undefined,
    });
  }

  function openCadastroProcesso() {
    if (!selectedUnmatched) return;
    const params = new URLSearchParams();
    params.set('cnj', cnjQuery);
    params.set('returnTo', `/financeiro?linkUnmatched=${selectedUnmatched.id}`);
    navigate(`/pericias/nova?${params.toString()}`);
  }

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message={error instanceof Error ? error.message : 'Erro ao carregar recebimentos'} />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-emerald-600 shadow-lg">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-wide text-white">GESTÃO DE RECEBIMENTOS</h1>
                <p className="text-sm text-emerald-100">Controle financeiro de honorários periciais</p>
              </div>
            </div>
            <Button className="flex items-center gap-2 bg-white font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Novo Recebimento
            </Button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur-sm ring-1 ring-white/20">
              <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-emerald-100">
                <Hash className="h-3.5 w-3.5" />
                Total de Registros
              </div>
              <p className="text-2xl font-bold text-white">{recebimentos.length}</p>
            </div>
            <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur-sm ring-1 ring-white/20">
              <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-emerald-100">
                <DollarSign className="h-3.5 w-3.5" />
                Total Recebido
              </div>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalValor)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-6 px-6 py-6">
        {recebimentos.length === 0 ? <EmptyState title="Nenhum recebimento registrado. Clique em 'Novo Recebimento' para começar." /> : (
          <div className="space-y-3">
            {recebimentos.map((rec) => {
              const badgeColor = FONTE_BADGE_COLORS[rec.fontePagamento] ?? FONTE_BADGE_COLORS.OUTRO;
              const label = FONTE_LABELS[rec.fontePagamento] ?? rec.fontePagamento;
              return (
                <div key={rec.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 transition-shadow hover:shadow-md">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${badgeColor}`}>
                        <Tag className="mr-1 h-3 w-3" />{label}
                      </span>
                      {rec.descricao && <span className="flex items-center gap-1 text-sm text-gray-600"><FileText className="h-3.5 w-3.5 text-gray-400" />{rec.descricao}</span>}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1 text-sm text-gray-500"><Calendar className="h-3.5 w-3.5" />{formatDate(rec.dataRecebimento)}</span>
                      <span className="text-base font-bold text-emerald-700">{formatCurrency(rec.valorBruto)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Pagamentos não conciliados</h2>
            <span className="text-sm text-gray-500">{unmatchedList.length} pendentes</span>
          </div>
          {unmatchedList.length === 0 ? <p className="text-sm text-gray-500">Nenhum pagamento não conciliado.</p> : (
            <div className="space-y-2">
              {unmatchedList.map((item) => (
                <div key={item.id} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{String(item.payerName ?? 'Pagador não identificado')}</p>
                    <p className="text-xs text-gray-500">{extractCnjFromRawData(item.rawData) || 'CNJ não identificado'} • {formatDate(item.transactionDate)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-emerald-700">{formatCurrency(item.amount)}</span>
                    <Button size="sm" onClick={() => openLinkDialog(item)} className="inline-flex items-center gap-1">
                      <Link2 className="h-4 w-4" /> Vincular
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setForm(INITIAL_FORM); }} title="Novo Recebimento">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input placeholder="ID da perícia" value={form.periciaId} onChange={(e) => setForm((prev) => ({ ...prev, periciaId: e.target.value }))} required />
          <select value={form.fontePagamento} onChange={(e) => setForm((prev) => ({ ...prev, fontePagamento: e.target.value }))} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm">
            {FONTE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <Input type="date" value={form.dataRecebimento} onChange={(e) => setForm((prev) => ({ ...prev, dataRecebimento: e.target.value }))} required />
          <Input type="number" min="0" step="0.01" placeholder="Valor bruto" value={form.valorBruto} onChange={(e) => setForm((prev) => ({ ...prev, valorBruto: e.target.value }))} required />
          <Input type="number" min="0" step="0.01" placeholder="Valor líquido (opcional)" value={form.valorLiquido} onChange={(e) => setForm((prev) => ({ ...prev, valorLiquido: e.target.value }))} />
          <Input type="text" placeholder="Descrição" value={form.descricao} onChange={(e) => setForm((prev) => ({ ...prev, descricao: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setForm(INITIAL_FORM); }}>Cancelar</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-emerald-600 text-white hover:bg-emerald-700">{mutation.isPending ? 'Salvando...' : 'Salvar Recebimento'}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={linkDialogOpen} onClose={() => setLinkDialogOpen(false)} title="Vincular pagamento não conciliado" className="max-w-2xl">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">CNJ</label>
            <div className="flex gap-2">
              <Input value={cnjQuery} onChange={(e) => setCnjQuery(e.target.value)} placeholder="0000000-00.0000.0.00.0000" />
              <Button type="button" variant="outline" className="inline-flex items-center gap-1"><Search className="h-4 w-4" />Buscar</Button>
            </div>
          </div>

          <div className="max-h-52 space-y-2 overflow-y-auto rounded-md border p-2">
            {periciasSearchQuery.isLoading ? <p className="text-sm text-gray-500">Buscando perícias...</p> : null}
            {periciasEncontradas.map((pericia: Pericia) => (
              <button key={pericia.id} type="button" onClick={() => setSelectedPericiaId(pericia.id)} className={`w-full rounded-md border px-3 py-2 text-left text-sm ${selectedPericiaId === pericia.id ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200'}`}>
                <p className="font-medium text-slate-800">{pericia.processoCNJ}</p>
                <p className="text-xs text-gray-500">{pericia.autorNome} • {pericia.cidade}</p>
              </button>
            ))}
            {!periciasSearchQuery.isLoading && periciasEncontradas.length === 0 ? <p className="text-sm text-gray-500">Nenhuma perícia encontrada para este CNJ.</p> : null}
          </div>

          <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span>Não encontrou? Cadastre o processo e retorne para este modal.</span>
            <Button type="button" variant="outline" onClick={openCadastroProcesso}>Cadastrar processo</Button>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancelar</Button>
            <Button
              type="button"
              disabled={!selectedUnmatched || !selectedPericiaId || linkMutation.isPending}
              onClick={() => selectedUnmatched && linkMutation.mutate({ unmatchedId: selectedUnmatched.id, periciaId: selectedPericiaId })}
            >
              {linkMutation.isPending ? 'Vinculando...' : 'Vincular pagamento'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function extractCnjFromRawData(rawData: Record<string, unknown>): string {
  const keys = ['cnj', 'processoCNJ', 'processo', 'referencia'];
  for (const key of keys) {
    const value = rawData[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}
