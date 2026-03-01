import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Plus, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/state';
import { knowledgeService } from '@/services/knowledge-service';
import type { KnowledgeItem } from '@/types/api';

const CATEGORIES = [
  { value: 'JURISPRUDENCIA', label: 'Jurisprudência' },
  { value: 'PROCEDIMENTO', label: 'Procedimento' },
  { value: 'LEGISLACAO', label: 'Legislação' },
  { value: 'TECNICO', label: 'Técnico' },
  { value: 'OUTRO', label: 'Outro' },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  JURISPRUDENCIA: 'bg-blue-100 text-blue-800',
  PROCEDIMENTO: 'bg-green-100 text-green-800',
  LEGISLACAO: 'bg-yellow-100 text-yellow-800',
  TECNICO: 'bg-purple-100 text-purple-800',
  OUTRO: 'bg-gray-100 text-gray-800',
};

type FormData = {
  title: string;
  category: string;
  content: string;
  source: string;
  tags: string;
};

const INITIAL_FORM: FormData = {
  title: '',
  category: 'OUTRO',
  content: '',
  source: '',
  tags: '',
};

export default function BaseConhecimentoPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const { data: items = [], isLoading, isError, error } = useQuery<KnowledgeItem[]>({
    queryKey: ['knowledge'],
    queryFn: knowledgeService.list,
  });

  const createMutation = useMutation({
    mutationFn: knowledgeService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge'] });
      toast.success('Item adicionado à base de conhecimento!');
      setDialogOpen(false);
      setForm(INITIAL_FORM);
    },
    onError: () => {
      toast.error('Erro ao salvar item. Tente novamente.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('O título é obrigatório.');
      return;
    }
    if (!form.content.trim()) {
      toast.error('O conteúdo é obrigatório.');
      return;
    }
    const tagsArray = form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    createMutation.mutate({
      title: form.title.trim(),
      category: form.category,
      content: form.content.trim(),
      source: form.source.trim() || undefined,
      tags: tagsArray.length > 0 ? tagsArray : undefined,
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

  const filtered = items.filter((item) => {
    const matchesCategory = activeCategory === 'ALL' || item.category === activeCategory;
    const matchesSearch =
      search.trim() === '' ||
      item.title.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const categoryLabel = (cat?: string) =>
    CATEGORIES.find((c) => c.value === cat)?.label ?? cat ?? 'Outro';

  const truncate = (text: string, max: number) =>
    text.length <= max ? text : text.slice(0, max) + '...';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-purple-700 px-6 py-5 shadow-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <BookOpen className="text-purple-200" size={28} />
            <div>
              <h1 className="text-xl font-bold tracking-wide text-white">
                BASE DE CONHECIMENTO
              </h1>
              <p className="text-sm text-purple-200">
                Jurisprudências, procedimentos e referências técnicas
              </p>
            </div>
            <span className="ml-2 rounded-full bg-purple-500 px-3 py-0.5 text-sm font-semibold text-white">
              {items.length}
            </span>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="flex items-center gap-2 bg-white text-purple-700 hover:bg-purple-50"
          >
            <Plus size={16} />
            Novo Conhecimento
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Search + filter */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título..."
              className="w-full rounded-md border border-gray-300 bg-white py-2 pl-9 pr-4 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Category filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory('ALL')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              activeCategory === 'ALL'
                ? 'bg-purple-700 text-white'
                : 'bg-white text-gray-600 shadow-sm hover:bg-purple-50'
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
                  ? 'bg-purple-700 text-white'
                  : 'bg-white text-gray-600 shadow-sm hover:bg-purple-50'
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
          <ErrorState message={(error as Error)?.message ?? 'Erro ao carregar base de conhecimento'} />
        ) : filtered.length === 0 ? (
          <EmptyState title="Nenhum item encontrado com os filtros aplicados." />
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((item) => {
              const isExpanded = expandedIds.has(item.id);
              const colorClass =
                CATEGORY_COLORS[item.category ?? 'OUTRO'] ?? CATEGORY_COLORS['OUTRO'];
              const hasLongContent = (item.content?.length ?? 0) > 200;
              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="p-5">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <h3 className="font-bold text-gray-900">{item.title}</h3>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${colorClass}`}
                      >
                        {categoryLabel(item.category)}
                      </span>
                    </div>

                    {item.content && (
                      <p className="mb-3 text-sm leading-relaxed text-gray-600">
                        {isExpanded ? item.content : truncate(item.content, 200)}
                      </p>
                    )}

                    {hasLongContent && (
                      <button
                        onClick={() => toggleExpand(item.id)}
                        className="mb-3 flex items-center gap-1 text-xs font-medium text-purple-700 hover:underline"
                      >
                        {isExpanded ? (
                          <>
                            Mostrar menos <ChevronUp size={14} />
                          </>
                        ) : (
                          <>
                            Ler mais <ChevronDown size={14} />
                          </>
                        )}
                      </button>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      {item.source && (
                        <span className="text-xs text-gray-400">Fonte: {item.source}</span>
                      )}
                      {item.tags && item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
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
        title="Novo Item de Conhecimento"
        className="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Título <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ex: Súmula 377 TST — Perícias médicas"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Categoria</label>
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Conteúdo <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="Descreva o conteúdo, precedente ou procedimento..."
              rows={5}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Fonte <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <Input
              value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
              placeholder="Ex: STJ, Diário Oficial, CFM"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tags{' '}
              <span className="text-gray-400 font-normal">(separadas por vírgula)</span>
            </label>
            <Input
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="Ex: coluna, lombar, nexo causal"
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
              className="bg-purple-700 hover:bg-purple-800"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Salvando...' : 'Salvar Item'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
