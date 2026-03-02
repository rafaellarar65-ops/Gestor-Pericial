import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle2, Circle, Clock, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/state';
import { agendaService } from '@/services/agenda-service';
import type { AgendaTask } from '@/types/api';

const STATUS_CONFIG = {
  TODO: { label: 'A Fazer', color: 'text-slate-500', Icon: Circle },
  DOING: { label: 'Em Andamento', color: 'text-blue-500', Icon: Clock },
  DONE: { label: 'Concluída', color: 'text-emerald-500', Icon: CheckCircle2 },
  CANCELED: { label: 'Cancelada', color: 'text-red-400', Icon: AlertTriangle },
} as const;

const PRIORITY_MAP = {
  1: { label: 'Baixa', badge: 'bg-slate-100 text-slate-600', border: 'border-l-4 border-green-500' },
  2: { label: 'Média', badge: 'bg-blue-100 text-blue-700', border: 'border-l-4 border-yellow-500' },
  3: { label: 'Alta', badge: 'bg-orange-100 text-orange-700', border: 'border-l-4 border-red-500' },
  4: { label: 'Urgente', badge: 'bg-red-100 text-red-700', border: 'border-l-4 border-red-500' },
} as const;

function formatDueDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return `Atrasado (${d.toLocaleDateString('pt-BR')})`;
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  return d.toLocaleDateString('pt-BR');
}

type FormState = { title: string; dueAt: string; priority: string; description: string; periciaId: string };
const EMPTY_FORM: FormState = { title: '', dueAt: '', priority: '2', description: '', periciaId: '' };
type FilterStatus = 'TODOS' | AgendaTask['status'];

const TarefasPage = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [filter, setFilter] = useState<FilterStatus>('TODOS');

  const { data: tasks = [], isLoading, isError } = useQuery<AgendaTask[]>({
    queryKey: ['agenda-tasks'],
    queryFn: agendaService.listTasks,
  });

  const createMutation = useMutation({
    mutationFn: agendaService.createTask,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['agenda-tasks'] });
      toast.success('Tarefa criada!');
      setOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: () => toast.error('Erro ao criar tarefa.'),
  });

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Informe o título.'); return; }
    createMutation.mutate({
      title: form.title,
      status: 'TODO',
      dueAt: form.dueAt || undefined,
      priority: Number(form.priority),
      description: form.description || undefined,
      periciaId: form.periciaId || undefined,
    });
  }

  const filtered = filter === 'TODOS' ? tasks : tasks.filter((t) => t.status === filter);
  const counts = tasks.reduce<Record<string, number>>((acc, t) => { acc[t.status] = (acc[t.status] ?? 0) + 1; return acc; }, {});

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Erro ao carregar tarefas." />;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tarefas Operacionais</h1>
          <p className="text-sm text-muted-foreground">Pendências e atividades da operação diária.</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Nova Tarefa
        </Button>
      </header>

      <div className="flex flex-wrap gap-2">
        {(['TODOS', 'TODO', 'DOING', 'DONE', 'CANCELED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${filter === s ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            {s === 'TODOS' ? 'Todas' : STATUS_CONFIG[s].label}
            {s !== 'TODOS' && counts[s] ? ` (${counts[s]})` : ''}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={filter === 'TODOS' ? 'Nenhuma tarefa. Crie a primeira.' : 'Nenhuma tarefa neste status.'} />
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => {
            const cfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.TODO;
            const Icon = cfg.Icon;
            const prio = PRIORITY_MAP[(task.priority ?? 2) as keyof typeof PRIORITY_MAP] ?? PRIORITY_MAP[2];
            const due = formatDueDate(task.dueAt);
            const overdue = due.startsWith('Atrasado');
            return (
              <Card key={task.id} className={`flex items-start gap-3 p-4 ${prio.border}`}>
                <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${cfg.color}`} />
                <div className="min-w-0 flex-1">
                  <p className={`font-medium ${task.status === 'DONE' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                  {task.description && <p className="mt-0.5 text-sm text-muted-foreground">{task.description}</p>}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                    <span className={`rounded-full px-2 py-0.5 font-semibold ${prio.badge}`}>{prio.label}</span>
                    {due && <span className={overdue ? 'font-semibold text-red-600' : 'text-slate-500'}>Prazo: {due}</span>}
                    {task.periciaId && (
                      <Link className="font-medium text-blue-600 hover:underline" to={`/pericias/${task.periciaId}`}>
                        Ver perícia
                      </Link>
                    )}
                  </div>
                </div>
                <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onClose={() => { setOpen(false); setForm(EMPTY_FORM); }} title="Nova Tarefa">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Título <span className="text-red-500">*</span></label>
            <Input placeholder="Descreva a tarefa" value={form.title} onChange={set('title')} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium">Prioridade</label>
              <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.priority} onChange={set('priority')}>
                <option value="1">Baixa</option>
                <option value="2">Média</option>
                <option value="3">Alta</option>
                <option value="4">Urgente</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Prazo</label>
              <Input type="date" value={form.dueAt} onChange={set('dueAt')} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Descrição</label>
            <textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Detalhes adicionais..." value={form.description} onChange={set('description')} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">ID da Perícia <span className="text-xs text-muted-foreground">(opcional)</span></label>
            <Input placeholder="Vincular a uma perícia" value={form.periciaId} onChange={set('periciaId')} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => { setOpen(false); setForm(EMPTY_FORM); }}>Cancelar</Button>
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? 'Salvando...' : 'Criar Tarefa'}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

export default TarefasPage;
