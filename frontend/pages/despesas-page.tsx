import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Receipt,
  Plus,
  DollarSign,
  Calendar,
  Tag,
  FolderOpen,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/state';
import { financialService } from '@/services/financial-service';
import type { Despesa } from '@/types/api';

const CATEGORIA_OPTIONS = [
  { value: 'ESCRITORIO', label: 'Escritório' },
  { value: 'DESLOCAMENTO', label: 'Deslocamento' },
  { value: 'EQUIPAMENTO', label: 'Equipamento' },
  { value: 'PESSOAL', label: 'Pessoal' },
  { value: 'IMPOSTO', label: 'Imposto' },
  { value: 'OUTROS', label: 'Outros' },
] as const;

type Categoria = (typeof CATEGORIA_OPTIONS)[number]['value'];

const CATEGORIA_STYLES: Record<Categoria | string, { badge: string; icon: string }> = {
  ESCRITORIO: {
    badge: 'bg-blue-100 text-blue-800 ring-blue-200',
    icon: 'text-blue-600',
  },
  DESLOCAMENTO: {
    badge: 'bg-amber-100 text-amber-800 ring-amber-200',
    icon: 'text-amber-600',
  },
  EQUIPAMENTO: {
    badge: 'bg-purple-100 text-purple-800 ring-purple-200',
    icon: 'text-purple-600',
  },
  PESSOAL: {
    badge: 'bg-green-100 text-green-800 ring-green-200',
    icon: 'text-green-600',
  },
  IMPOSTO: {
    badge: 'bg-red-100 text-red-800 ring-red-200',
    icon: 'text-red-600',
  },
  OUTROS: {
    badge: 'bg-gray-100 text-gray-700 ring-gray-200',
    icon: 'text-gray-500',
  },
};

const CATEGORIA_LABELS: Record<Categoria | string, string> = {
  ESCRITORIO: 'Escritório',
  DESLOCAMENTO: 'Deslocamento',
  EQUIPAMENTO: 'Equipamento',
  PESSOAL: 'Pessoal',
  IMPOSTO: 'Imposto',
  OUTROS: 'Outros',
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

function toNumber(v: number | string): number {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return isNaN(n) ? 0 : n;
}

type FormState = {
  categoria: string;
  descricao: string;
  valor: string;
  dataCompetencia: string;
  periciaId: string;
};

const INITIAL_FORM: FormState = {
  categoria: 'ESCRITORIO',
  descricao: '',
  valor: '',
  dataCompetencia: '',
  periciaId: '',
};

export default function DespesasPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const { data: despesas = [], isLoading, isError, error } = useQuery<Despesa[]>({
    queryKey: ['despesas'],
    queryFn: financialService.listDespesas,
  });

  const mutation = useMutation({
    mutationFn: financialService.createDespesa,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['despesas'] });
      toast.success('Despesa registrada com sucesso!');
      setDialogOpen(false);
      setForm(INITIAL_FORM);
    },
    onError: () => {
      toast.error('Erro ao registrar despesa. Tente novamente.');
    },
  });

  const totalGeral = despesas.reduce((sum, d) => sum + toNumber(d.valor), 0);

  // Group by categoria
  const grouped = despesas.reduce<Record<string, Despesa[]>>((acc, d) => {
    const cat = d.categoria ?? 'OUTROS';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(d);
    return acc;
  }, {});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.descricao || !form.valor || !form.dataCompetencia) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    mutation.mutate({
      categoria: form.categoria,
      descricao: form.descricao,
      valor: parseFloat(form.valor),
      dataCompetencia: form.dataCompetencia,
      periciaId: form.periciaId || undefined,
    });
  }

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-red-600 shadow-lg">
        <div className="mx-auto max-w-5xl px-6 py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Receipt className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-wide text-white">
                  GESTÃO DE DESPESAS
                </h1>
                <p className="text-sm text-red-100">Controle de custos e despesas operacionais</p>
              </div>
            </div>
            <Button
              className="flex items-center gap-2 bg-white text-red-700 hover:bg-red-50 font-semibold shadow-sm"
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Nova Despesa
            </Button>
          </div>

          {/* Total Summary */}
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-white/15 px-4 py-3 backdrop-blur-sm ring-1 ring-white/20 w-fit">
            <DollarSign className="h-5 w-5 text-red-100" />
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-red-100">
                Total de Despesas
              </p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalGeral)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-6 py-6">
        {isLoading && <LoadingState />}
        {isError && (
          <ErrorState message={(error as Error)?.message ?? 'Erro ao carregar despesas.'} />
        )}

        {!isLoading && !isError && despesas.length === 0 && (
          <EmptyState title="Nenhuma despesa registrada. Clique em 'Nova Despesa' para começar." />
        )}

        {!isLoading && !isError && despesas.length > 0 && (
          <div className="space-y-6">
            {Object.entries(grouped).map(([cat, items]) => {
              const styles = CATEGORIA_STYLES[cat] ?? CATEGORIA_STYLES['OUTROS'];
              const label = CATEGORIA_LABELS[cat] ?? cat;
              const totalCat = items.reduce((s, d) => s + toNumber(d.valor), 0);

              return (
                <div key={cat} className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-100">
                  {/* Group Header */}
                  <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FolderOpen className={`h-4 w-4 ${styles.icon}`} />
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${styles.badge}`}
                      >
                        <Tag className="mr-1 h-3 w-3" />
                        {label}
                      </span>
                      <span className="text-xs text-gray-500">
                        {items.length} {items.length === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-red-600">
                      {formatCurrency(totalCat)}
                    </span>
                  </div>

                  {/* Items */}
                  <div className="divide-y divide-gray-50">
                    {items.map((despesa) => (
                      <div
                        key={despesa.id}
                        className="flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-gray-800">
                            {despesa.descricao}
                          </span>
                          {despesa.periciaId && (
                            <span className="text-xs text-gray-400">
                              Perícia: {despesa.periciaId}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(despesa.dataCompetencia)}
                          </span>
                          <span className="text-sm font-bold text-red-600">
                            {formatCurrency(despesa.valor)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
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
        title="Nova Despesa"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Categoria */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Categoria <span className="text-red-500">*</span>
            </label>
            <select
              value={form.categoria}
              onChange={(e) => handleChange('categoria', e.target.value)}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              {CATEGORIA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Descrição */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Descrição <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="Ex: Aluguel do escritório - Fevereiro/2025"
              value={form.descricao}
              onChange={(e) => handleChange('descricao', e.target.value)}
              required
            />
          </div>

          {/* Valor */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Valor (R$) <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={form.valor}
              onChange={(e) => handleChange('valor', e.target.value)}
              required
            />
          </div>

          {/* Data de Competência */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Data de Competência <span className="text-red-500">*</span>
            </label>
            <Input
              type="date"
              value={form.dataCompetencia}
              onChange={(e) => handleChange('dataCompetencia', e.target.value)}
              required
            />
          </div>

          {/* Perícia ID */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              ID da Perícia{' '}
              <span className="text-xs text-gray-400 font-normal">(opcional)</span>
            </label>
            <Input
              type="text"
              placeholder="Vincular a uma perícia específica"
              value={form.periciaId}
              onChange={(e) => handleChange('periciaId', e.target.value)}
            />
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-700 ring-1 ring-amber-200">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            <span>
              Certifique-se de que a despesa está corretamente categorizada para manter a
              acurácia dos relatórios financeiros.
            </span>
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
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {mutation.isPending ? 'Salvando...' : 'Salvar Despesa'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
