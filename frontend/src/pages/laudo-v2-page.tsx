import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FileText, AlertCircle, CheckCircle2, Clock, Search, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/state';
import { apiClient } from '@/lib/api-client';

type PreLaudo = {
  id: string;
  periciaId?: string;
  processoCNJ?: string;
  autorNome?: string;
  status?: string;
  examStatus?: string;
  updatedAt?: string;
  createdAt?: string;
};

type ExamStatus = 'todos' | 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';

const EXAM_CONFIG = {
  NOT_STARTED: { label: 'Não iniciado', color: 'bg-slate-100 text-slate-600', Icon: Clock },
  IN_PROGRESS: { label: 'Em elaboração', color: 'bg-blue-100 text-blue-700', Icon: AlertCircle },
  DONE: { label: 'Concluído', color: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle2 },
} as const;

const Page = () => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<ExamStatus>('todos');

  const { data = [], isLoading, isError } = useQuery<PreLaudo[]>({
    queryKey: ['pre-laudos'],
    queryFn: async () => {
      const { data } = await apiClient.get<PreLaudo[] | { items?: PreLaudo[] }>('/laudo/pre-laudos');
      return Array.isArray(data) ? data : (data.items ?? []);
    },
  });

  const filtered = data.filter((item) => {
    const matchSearch =
      !search ||
      [item.processoCNJ, item.autorNome, item.periciaId].some(
        (v) => v?.toLowerCase().includes(search.toLowerCase()),
      );
    const matchStatus =
      filterStatus === 'todos' || (item.examStatus ?? 'NOT_STARTED') === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = data.reduce<Record<string, number>>((acc, item) => {
    const s = item.examStatus ?? 'NOT_STARTED';
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {});

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Erro ao carregar pré-laudos." />;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Editor de Laudos V2</h1>
          <p className="text-sm text-muted-foreground">Central de elaboração e revisão de laudos periciais.</p>
        </div>
      </header>

      {/* Summary cards */}
      <div className="grid gap-3 md:grid-cols-3">
        {(['NOT_STARTED', 'IN_PROGRESS', 'DONE'] as const).map((s) => {
          const cfg = EXAM_CONFIG[s];
          const Icon = cfg.Icon;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? 'todos' : s)}
              className={`rounded-lg border p-4 text-left transition-colors ${filterStatus === s ? 'ring-2 ring-offset-1 ring-blue-400' : 'hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5 text-slate-500" />
                <p className="text-sm font-medium text-slate-700">{cfg.label}</p>
              </div>
              <p className="mt-1 text-3xl font-bold text-slate-800">{counts[s] ?? 0}</p>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
        <Input
          placeholder="Buscar por CNJ, autor ou ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Nenhum pré-laudo encontrado." />
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const examStatus = (item.examStatus ?? 'NOT_STARTED') as keyof typeof EXAM_CONFIG;
            const cfg = EXAM_CONFIG[examStatus] ?? EXAM_CONFIG.NOT_STARTED;
            const Icon = cfg.Icon;
            const updatedDate = item.updatedAt ?? item.createdAt;
            return (
              <Card key={item.id} className="flex items-center gap-3 p-4">
                <FileText className="h-5 w-5 flex-shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800">
                    {item.processoCNJ ?? item.periciaId ?? item.id}
                  </p>
                  {item.autorNome && (
                    <p className="text-sm text-muted-foreground">{item.autorNome}</p>
                  )}
                  {updatedDate && (
                    <p className="text-xs text-slate-400">
                      Atualizado: {new Date(updatedDate).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${cfg.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                  {cfg.label}
                </span>
                {item.periciaId && (
                  <Link to={`/pericias/${item.periciaId}`}>
                    <Button size="sm" variant="outline">
                      <Eye className="mr-1 h-3.5 w-3.5" /> Ver
                    </Button>
                  </Link>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Page;
