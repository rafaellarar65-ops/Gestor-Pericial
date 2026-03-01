import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp,
  Plus,
  DollarSign,
  Hash,
  Calendar,
  Tag,
  FileText,
  Search,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  FolderUp,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/state';
import { Tabs } from '@/components/ui/tabs';
import { financialService } from '@/services/financial-service';
import type { FinancialAnalytics, Recebimento } from '@/types/api';

const FONTE_OPTIONS = [
  { value: 'TJ', label: 'Tribunal de Justiça (TJ)' },
  { value: 'PARTE_AUTORA', label: 'Parte Autora' },
  { value: 'PARTE_RE', label: 'Parte Ré' },
  { value: 'SEGURADORA', label: 'Seguradora' },
  { value: 'OUTRO', label: 'Outro' },
] as const;

const PERIOD_OPTIONS = [
  { value: 'ALL', label: 'Todo período' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: '365', label: 'Últimos 12 meses' },
] as const;

const TAB_IDS = ['Recebimentos', 'Análise', 'Importar'] as const;
type TabId = (typeof TAB_IDS)[number];
type PeriodFilter = (typeof PERIOD_OPTIONS)[number]['value'];

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

function formatCurrency(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`);
  return d.toLocaleDateString('pt-BR');
}

function toAmount(value: number | string | undefined | null): number {
  if (value === undefined || value === null) return 0;
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  return Number.isFinite(parsed) ? parsed : 0;
}

function passesPeriod(date: string, period: PeriodFilter): boolean {
  if (period === 'ALL') return true;
  const days = Number(period);
  if (!days || !date) return true;
  const recordDate = new Date(date.includes('T') ? date : `${date}T12:00:00`);
  if (Number.isNaN(recordDate.getTime())) return false;
  const threshold = new Date();
  threshold.setHours(0, 0, 0, 0);
  threshold.setDate(threshold.getDate() - days);
  return recordDate >= threshold;
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('Recebimentos');
  const [busca, setBusca] = useState('');
  const [fonteFiltro, setFonteFiltro] = useState<'ALL' | FontePagamento>('ALL');
  const [periodoFiltro, setPeriodoFiltro] = useState<PeriodFilter>('ALL');
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const { data: recebimentos = [], isLoading, isError, error } = useQuery<Recebimento[]>({
    queryKey: ['recebimentos'],
    queryFn: financialService.listRecebimentos,
  });

  const { data: analytics } = useQuery<FinancialAnalytics>({
    queryKey: ['financial-analytics'],
    queryFn: financialService.analytics,
  });

  const mutation = useMutation({
    mutationFn: financialService.createRecebimento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recebimentos'] });
      queryClient.invalidateQueries({ queryKey: ['financial-analytics'] });
      toast.success('Recebimento registrado com sucesso!');
      setDialogOpen(false);
      setForm(INITIAL_FORM);
    },
    onError: () => {
      toast.error('Erro ao registrar recebimento. Tente novamente.');
    },
  });

  const totalValor = useMemo(
    () => recebimentos.reduce((sum, r) => sum + toAmount(r.valorBruto), 0),
    [recebimentos],
  );

  const recebimentosFiltrados = useMemo(() => {
    const term = busca.trim().toLowerCase();

    return recebimentos.filter((rec) => {
      if (fonteFiltro !== 'ALL' && rec.fontePagamento !== fonteFiltro) return false;
      if (!passesPeriod(rec.dataRecebimento, periodoFiltro)) return false;

      if (!term) return true;

      const label = (FONTE_LABELS[rec.fontePagamento] ?? rec.fontePagamento ?? '').toLowerCase();
      const descricao = (rec.descricao ?? '').toLowerCase();
      const periciaId = (rec.periciaId ?? '').toLowerCase();
      const data = formatDate(rec.dataRecebimento).toLowerCase();

      return (
        label.includes(term) ||
        descricao.includes(term) ||
        periciaId.includes(term) ||
        data.includes(term)
      );
    });
  }, [recebimentos, busca, fonteFiltro, periodoFiltro]);

  const totalBruto = useMemo(
    () => recebimentos.reduce((sum, rec) => sum + toAmount(rec.valorBruto), 0),
    [recebimentos],
  );

  const totalLiquido = useMemo(
    () => recebimentos.reduce((sum, rec) => sum + (rec.valorLiquido ? toAmount(rec.valorLiquido) : toAmount(rec.valorBruto)), 0),
    [recebimentos],
  );

  const ticketMedio = recebimentos.length > 0 ? totalBruto / recebimentos.length : 0;

  const monthlySeries = useMemo(() => {
    const map = new Map<string, number>();

    recebimentos.forEach((rec) => {
      if (!rec.dataRecebimento) return;
      const date = new Date(rec.dataRecebimento.includes('T') ? rec.dataRecebimento : `${rec.dataRecebimento}T12:00:00`);
      if (Number.isNaN(date.getTime())) return;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) ?? 0) + toAmount(rec.valorBruto));
    });

    const entries = Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, total]) => {
        const [year, m] = month.split('-');
        const label = new Date(Number(year), Number(m) - 1, 1).toLocaleDateString('pt-BR', {
          month: 'short',
        });
        return { month: label.replace('.', ''), total };
      });

    const maxValue = Math.max(...entries.map((item) => item.total), 1);
    return entries.map((item) => ({
      ...item,
      percent: Math.max((item.total / maxValue) * 100, 8),
    }));
  }, [recebimentos]);

  const breakdownByFonte = useMemo(() => {
    const grouped = recebimentos.reduce<Record<string, number>>((acc, rec) => {
      const fonte = rec.fontePagamento || 'OUTRO';
      acc[fonte] = (acc[fonte] ?? 0) + toAmount(rec.valorBruto);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([fonte, total]) => ({
        fonte,
        label: FONTE_LABELS[fonte] ?? fonte,
        total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [recebimentos]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.dataRecebimento || !form.valorBruto) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }
    mutation.mutate({
      periciaId: form.periciaId.trim() || undefined,
      fontePagamento: form.fontePagamento,
      dataRecebimento: form.dataRecebimento,
      valorBruto: parseFloat(form.valorBruto),
      valorLiquido: form.valorLiquido ? parseFloat(form.valorLiquido) : undefined,
      descricao: form.descricao || undefined,
    });
  }

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-emerald-600 shadow-lg">
        <div className="mx-auto max-w-6xl px-6 py-6">
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
            <Button
              className="flex items-center gap-2 bg-white font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Novo Recebimento
            </Button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur-sm ring-1 ring-white/20">
              <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-emerald-100">
                <Hash className="h-3.5 w-3.5" />
                Total Registros
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

      <div className="mx-auto max-w-6xl space-y-5 px-6 py-6">
        <Tabs tabs={[...TAB_IDS]} activeTab={activeTab} onChange={(tab) => setActiveTab(tab as TabId)} />

        {isLoading && <LoadingState />}
        {isError && (
          <ErrorState message={(error as Error)?.message ?? 'Erro ao carregar recebimentos.'} />
        )}

        {!isLoading && !isError && activeTab === 'Recebimentos' && (
          <>
            <div className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-3">
              <div className="relative md:col-span-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por descrição, data, fonte ou perícia"
                  className="pl-9"
                />
              </div>

              <select
                value={fonteFiltro}
                onChange={(e) => setFonteFiltro(e.target.value as 'ALL' | FontePagamento)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ALL">Todas as fontes</option>
                {FONTE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select
                value={periodoFiltro}
                onChange={(e) => setPeriodoFiltro(e.target.value as PeriodFilter)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {PERIOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {recebimentosFiltrados.length === 0 ? (
              <EmptyState title="Nenhum recebimento encontrado para os filtros selecionados." />
            ) : (
              <div className="space-y-3">
                {recebimentosFiltrados.map((rec) => {
                  const badgeColor =
                    FONTE_BADGE_COLORS[rec.fontePagamento] ?? FONTE_BADGE_COLORS.OUTRO;
                  const label = FONTE_LABELS[rec.fontePagamento] ?? rec.fontePagamento;

                  return (
                    <div
                      key={rec.id}
                      className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 transition-shadow hover:shadow-md"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${badgeColor}`}
                          >
                            <Tag className="mr-1 h-3 w-3" />
                            {label}
                          </span>
                          {rec.periciaId && (
                            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                              Perícia #{rec.periciaId}
                            </span>
                          )}
                          {rec.descricao && (
                            <span className="flex items-center gap-1 text-sm text-gray-600">
                              <FileText className="h-3.5 w-3.5 text-gray-400" />
                              {rec.descricao}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(rec.dataRecebimento)}
                          </span>
                          <span className="text-base font-bold text-emerald-700">
                            {formatCurrency(rec.valorBruto)}
                          </span>
                        </div>
                      </div>
                      {rec.valorLiquido !== undefined && rec.valorLiquido !== null && (
                        <div className="mt-1 text-right text-xs text-gray-400">
                          Líquido: {formatCurrency(rec.valorLiquido)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {!isLoading && !isError && activeTab === 'Análise' && (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Bruto</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(totalBruto)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Líquido</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(totalLiquido)}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Nº Recebimentos</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{recebimentos.length}</p>
              </div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Ticket Médio</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(ticketMedio)}</p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm xl:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <BarChart3 className="h-4 w-4 text-emerald-600" />
                    Recebimentos por mês
                  </h3>
                </div>
                {monthlySeries.length === 0 ? (
                  <p className="text-sm text-gray-500">Sem dados para exibir gráfico mensal.</p>
                ) : (
                  <div className="grid h-52 grid-cols-6 items-end gap-3">
                    {monthlySeries.map((item) => (
                      <div key={item.month} className="flex flex-col items-center gap-2">
                        <div className="flex h-44 w-full items-end rounded-md bg-gray-100 px-1">
                          <div
                            className="w-full rounded-sm bg-emerald-500 transition-all"
                            style={{ height: `${item.percent}%` }}
                            title={`${item.month}: ${formatCurrency(item.total)}`}
                          />
                        </div>
                        <span className="text-xs font-medium uppercase text-gray-500">{item.month}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700">
                  <Wallet className="h-4 w-4 text-emerald-600" />
                  Breakdown por fonte
                </h3>
                <div className="space-y-3">
                  {breakdownByFonte.length === 0 && (
                    <p className="text-sm text-gray-500">Sem recebimentos para consolidar.</p>
                  )}
                  {breakdownByFonte.map((item) => {
                    const badgeColor = FONTE_BADGE_COLORS[item.fonte] ?? FONTE_BADGE_COLORS.OUTRO;
                    return (
                      <div key={item.fonte} className="flex items-center justify-between rounded-lg border border-gray-100 p-2.5">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${badgeColor}`}>
                          {item.label}
                        </span>
                        <span className="text-sm font-bold text-gray-800">{formatCurrency(item.total)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Recebido (analytics)</p>
                <p className="mt-1 text-xl font-bold text-emerald-900">
                  {formatCurrency(analytics?.totals?.recebido ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-rose-700">Despesas (analytics)</p>
                <p className="mt-1 text-xl font-bold text-rose-900">
                  {formatCurrency(analytics?.totals?.despesas ?? 0)}
                </p>
              </div>
              <div className="rounded-xl border border-sky-100 bg-sky-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-sky-700">Resultado (analytics)</p>
                <p className="mt-1 text-xl font-bold text-sky-900">
                  {formatCurrency(analytics?.totals?.resultado ?? 0)}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500">Saúde Financeira</p>
              <div className="mt-2 flex items-center gap-3">
                <span className="text-2xl font-bold text-gray-900">{analytics?.financialScore ?? 0}</span>
                {(analytics?.totals?.resultado ?? 0) >= 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    Resultado positivo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700">
                    <ArrowDownRight className="h-3.5 w-3.5" />
                    Resultado pressionado
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {!isLoading && !isError && activeTab === 'Importar' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Importar recebimentos</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Acesse a central de importações para processar arquivos e conciliar recebimentos.
                </p>
              </div>
              <Link
                to="/importacoes"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
              >
                <FolderUp className="h-4 w-4" />
                Ir para Importações
              </Link>
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setForm(INITIAL_FORM);
        }}
        title="Novo Recebimento"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Perícia ID <span className="text-xs font-normal text-gray-400">(opcional)</span>
            </label>
            <Input
              type="text"
              placeholder="Ex: 12ab34cd"
              value={form.periciaId}
              onChange={(e) => handleChange('periciaId', e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Fonte de Pagamento <span className="text-red-500">*</span>
            </label>
            <select
              value={form.fontePagamento}
              onChange={(e) => handleChange('fontePagamento', e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {FONTE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Data do Recebimento <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={form.dataRecebimento}
              onChange={(e) => handleChange('dataRecebimento', e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Valor Bruto (R$) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={form.valorBruto}
              onChange={(e) => handleChange('valorBruto', e.target.value)}
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Valor Líquido (R$) <span className="text-xs font-normal text-gray-400">(opcional)</span>
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={form.valorLiquido}
              onChange={(e) => handleChange('valorLiquido', e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Descrição <span className="text-xs font-normal text-gray-400">(opcional)</span>
            </label>
            <Input
              type="text"
              placeholder="Ex: Honorários periciais - Processo nº 0001234-56.2024"
              value={form.descricao}
              onChange={(e) => handleChange('descricao', e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                setForm(INITIAL_FORM);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {mutation.isPending ? 'Salvando...' : 'Salvar Recebimento'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
