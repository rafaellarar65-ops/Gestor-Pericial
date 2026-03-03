import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Activity, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/state';
import { maneuversService } from '@/services/knowledge-service';
import type { PhysicalManeuver } from '@/types/api';

const CATEGORIES = [
  { value: 'COLUNA_CERVICAL', label: 'Coluna Cervical' },
  { value: 'COLUNA_LOMBAR', label: 'Coluna Lombar' },
  { value: 'MEMBROS_SUPERIORES', label: 'Membros Superiores' },
  { value: 'MEMBROS_INFERIORES', label: 'Membros Inferiores' },
  { value: 'TRONCO', label: 'Tronco' },
  { value: 'GERAL', label: 'Geral' },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  COLUNA_CERVICAL: 'bg-blue-100 text-blue-800',
  COLUNA_LOMBAR: 'bg-orange-100 text-orange-800',
  MEMBROS_SUPERIORES: 'bg-purple-100 text-purple-800',
  MEMBROS_INFERIORES: 'bg-green-100 text-green-800',
  TRONCO: 'bg-red-100 text-red-800',
  GERAL: 'bg-gray-100 text-gray-800',
};

type FormData = {
  name: string;
  category: string;
  summary: string;
  procedure: string;
};

const INITIAL_FORM: FormData = {
  name: '',
  category: 'GERAL',
  summary: '',
  procedure: '',
};

export default function ManobrasPag() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const { data: maneuvers = [], isLoading, isError, error } = useQuery<PhysicalManeuver[]>({
    queryKey: ['maneuvers'],
    queryFn: maneuversService.list,
  });

  const createMutation = useMutation({
    mutationFn: maneuversService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maneuvers'] });
      toast.success('Manobra criada com sucesso!');
      setDialogOpen(false);
      setForm(INITIAL_FORM);
    },
    onError: () => {
      toast.error('Erro ao criar manobra. Tente novamente.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('O nome da manobra é obrigatório.');
      return;
    }
    createMutation.mutate({
      name: form.name.trim(),
      category: form.category,
      summary: form.summary.trim() || undefined,
      procedure: form.procedure.trim() || undefined,
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopyToReport = async (maneuver: PhysicalManeuver) => {
    const fallback = 'Não informado';
    const content = [
      `MANOBRA: ${maneuver.name?.trim() || fallback}`,
      `PROCEDIMENTO: ${maneuver.procedure?.trim() || fallback}`,
      `ACHADO: ${maneuver.summary?.trim() || fallback}`,
      `EVIDÊNCIA: ${maneuver.evidence?.trim() || fallback}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(content);
      toast.success('Texto copiado para o laudo.');
    } catch {
      toast.error('Não foi possível copiar o texto.');
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = maneuvers.filter((maneuver) => {
    const matchesCategory = activeCategory === 'ALL' || maneuver.category === activeCategory;
    if (!matchesCategory) return false;
    if (!normalizedSearch) return true;

    const searchableFields = [
      maneuver.name,
      maneuver.summary,
      maneuver.procedure,
      ...(maneuver.tags ?? []),
    ];

    return searchableFields.some((field) => field?.toLowerCase().includes(normalizedSearch));
  });

  const categoryLabel = (cat?: string) =>
    CATEGORIES.find((c) => c.value === cat)?.label ?? cat ?? 'Geral';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-teal-700 px-6 py-5 shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="text-teal-200" size={28} />
            <div>
              <h1 className="text-xl font-bold tracking-wide text-white">
                BANCO DE MANOBRAS FÍSICAS
              </h1>
              <p className="text-sm text-teal-200">
                Repositório de manobras semiológicas para perícias
              </p>
            </div>
            <span className="ml-2 rounded-full bg-teal-500 px-3 py-0.5 text-sm font-semibold text-white">
              {maneuvers.length}
            </span>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-2 bg-white text-teal-700 hover:bg-teal-50"
          >
            <Plus size={16} />
            Nova Manobra
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-4">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, resumo, tags ou procedimento..."
          />
        </div>

        {/* Category filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory('ALL')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === 'ALL'
                ? 'bg-teal-700 text-white'
                : 'bg-white text-gray-600 shadow-sm hover:bg-teal-50'
            }`}
          >
            Todas
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCategory === cat.value
                  ? 'bg-teal-700 text-white'
                  : 'bg-white text-gray-600 shadow-sm hover:bg-teal-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState message={(error as Error)?.message ?? 'Erro ao carregar manobras'} />
        ) : filtered.length === 0 ? (
          <EmptyState title="Nenhuma manobra encontrada nesta categoria." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((maneuver) => {
              const isExpanded = expandedIds.has(maneuver.id);
              const colorClass =
                CATEGORY_COLORS[maneuver.category ?? 'GERAL'] ?? CATEGORY_COLORS['GERAL'];
              return (
                <div
                  key={maneuver.id}
                  className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex-1 p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="font-bold text-gray-900">{maneuver.name}</h3>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${colorClass}`}
                      >
                        {categoryLabel(maneuver.category)}
                      </span>
                    </div>
                    {maneuver.summary && (
                      <p className="text-sm leading-relaxed text-gray-600">{maneuver.summary}</p>
                    )}

                    <div className="mt-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyToReport(maneuver)}
                        className="w-full"
                      >
                        Copiar para Laudo
                      </Button>
                    </div>
                  </div>

                  {maneuver.procedure && (
                    <div className="border-t border-gray-100">
                      <button
                        onClick={() => toggleExpand(maneuver.id)}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-sm font-medium text-teal-700 hover:bg-teal-50"
                      >
                        Ver Procedimento
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      {isExpanded && (
                        <div className="border-t border-gray-100 bg-teal-50 px-4 py-3">
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                            {maneuver.procedure}
                          </p>
                        </div>
                      )}
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
        title="Nova Manobra Física"
        className="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nome <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex: Teste de Spurling"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Categoria</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Resumo</label>
            <textarea
              value={form.summary}
              onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
              placeholder="Descrição breve da manobra e sua finalidade clínica..."
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Procedimento</label>
            <textarea
              value={form.procedure}
              onChange={(e) => setForm((f) => ({ ...f, procedure: e.target.value }))}
              placeholder="Descreva o passo a passo do procedimento de execução..."
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDialogOpen(false);
                setForm(INITIAL_FORM);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              className="bg-teal-700 hover:bg-teal-800"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Salvando...' : 'Salvar Manobra'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
