import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TrendingUp, Plus, DollarSign, Hash, Calendar, Tag, FileText } from 'lucide-react';
import { toast } from 'sonner';

import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/state';
import { financialService } from '@/services/financial-service';
import type { Recebimento } from '@/types/api';

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

type FormState = {
  fontePagamento: string;
  dataRecebimento: string;
  valorBruto: string;
  valorLiquido: string;
  descricao: string;
};

const INITIAL_FORM: FormState = {
  fontePagamento: 'TJ',
  dataRecebimento: '',
  valorBruto: '',
  valorLiquido: '',
  descricao: '',
};

export default function FinanceiroPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const { data: recebimentos = [], isLoading, isError, error } = useQuery<Recebimento[]>({
    queryKey: ['recebimentos'],
    queryFn: financialService.listRecebimentos,
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

  const totalValor = recebimentos.reduce((sum, r) => {
    const v = typeof r.valorBruto === 'string' ? parseFloat(r.valorBruto) : r.valorBruto;
    return sum + (isNaN(v) ? 0 : v);
  }, 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.dataRecebimento || !form.valorBruto) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }
    mutation.mutate({
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
      {/* Header */}
      <div className="bg-emerald-600 shadow-lg">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-wide text-white">
                  GESTÃO DE RECEBIMENTOS
                </h1>
                <p className="text-sm text-emerald-100">Controle financeiro de honorários periciais</p>
              </div>
            </div>
            <Button
              className="flex items-center gap-2 bg-white text-emerald-700 hover:bg-emerald-50 font-semibold shadow-sm"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Novo Recebimento
            </Button>
          </div>

          {/* Summary Metrics */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur-sm ring-1 ring-white/20">
              <div className="flex items-center gap-2 text-emerald-100 text-xs font-medium uppercase tracking-wider mb-1">
                <Hash className="h-3.5 w-3.5" />
                Total de Registros
              </div>
              <p className="text-2xl font-bold text-white">{recebimentos.length}</p>
            </div>
            <div className="rounded-xl bg-white/15 px-4 py-3 backdrop-blur-sm ring-1 ring-white/20">
              <div className="flex items-center gap-2 text-emerald-100 text-xs font-medium uppercase tracking-wider mb-1">
                <DollarSign className="h-3.5 w-3.5" />
                Total Recebido
              </div>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalValor)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-6 py-6">
        {isLoading && <LoadingState />}
        {isError && (
          <ErrorState message={(error as Error)?.message ?? 'Erro ao carregar recebimentos.'} />
        )}

        {!isLoading && !isError && recebimentos.length === 0 && (
          <EmptyState title="Nenhum recebimento registrado. Clique em 'Novo Recebimento' para começar." />
        )}

        {!isLoading && !isError && recebimentos.length > 0 && (
          <div className="space-y-3">
            {recebimentos.map((rec) => {
              const badgeColor =
                FONTE_BADGE_COLORS[rec.fontePagamento] ?? FONTE_BADGE_COLORS['OUTRO'];
              const label = FONTE_LABELS[rec.fontePagamento] ?? rec.fontePagamento;

              return (
                <div
                  key={rec.id}
                  className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${badgeColor}`}
                      >
                        <Tag className="mr-1 h-3 w-3" />
                        {label}
                      </span>
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
      </div>

      {/* Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setForm(INITIAL_FORM);
        }}
        title="Novo Recebimento"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fonte de Pagamento */}
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

          {/* Data do Recebimento */}
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

          {/* Valor Bruto */}
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

          {/* Valor Líquido */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Valor Líquido (R$){' '}
              <span className="text-xs text-gray-400 font-normal">(opcional)</span>
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

          {/* Descrição */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Descrição{' '}
              <span className="text-xs text-gray-400 font-normal">(opcional)</span>
            </label>
            <Input
              type="text"
              placeholder="Ex: Honorários periciais - Processo nº 0001234-56.2024"
              value={form.descricao}
              onChange={(e) => handleChange('descricao', e.target.value)}
            />
          </div>

          {/* Actions */}
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
