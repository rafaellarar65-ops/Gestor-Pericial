import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, CheckSquare, Square, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/state';
import { periciaService } from '@/services/pericia-service';
import { agendaService } from '@/services/agenda-service';
import type { Pericia } from '@/types/api';

const FilaAgendamentoPage = () => {
  const queryClient = useQueryClient();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['pericias-agendar'],
    queryFn: () => periciaService.list(1, { limit: 100, search: '' }),
  });

  const mutation = useMutation({
    mutationFn: () =>
      agendaService.scheduleBatch({ date, time, periciaIds: Array.from(selected) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pericias-agendar'] });
      void queryClient.invalidateQueries({ queryKey: ['pericias'] });
      toast.success(`${selected.size} perícia(s) agendada(s) com sucesso!`);
      setSelected(new Set());
      setDate('');
      setTime('');
    },
    onError: () => toast.error('Erro ao agendar. Verifique a data e hora.'),
  });

  const pericias: Pericia[] = useMemo(() => {
    const items = data?.items ?? [];
    // Show pericias that need scheduling (not yet scheduled or in early stages)
    const pending = items.filter((p) => {
      const s = (typeof p.status === 'string' ? p.status : (p.status as { codigo?: string; nome?: string })?.codigo ?? '').toUpperCase();
      return !s.includes('FINALIZ') && !s.includes('LAUDO') && !s.includes('ESCLAR');
    });
    if (!search.trim()) return pending;
    const q = search.toLowerCase();
    return pending.filter(
      (p) => p.processoCNJ.toLowerCase().includes(q) || (p.autorNome ?? '').toLowerCase().includes(q) || (typeof p.cidade === 'string' ? p.cidade : (p.cidade as { nome?: string })?.nome ?? '').toLowerCase().includes(q),
    );
  }, [data, search]);

  const allSelected = pericias.length > 0 && pericias.every((p) => selected.has(p.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pericias.map((p) => p.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onSchedule() {
    if (!date) { toast.error('Selecione a data.'); return; }
    if (!time) { toast.error('Selecione o horário.'); return; }
    if (selected.size === 0) { toast.error('Selecione ao menos uma perícia.'); return; }
    mutation.mutate();
  }

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Erro ao carregar fila de agendamento." />;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Fila de Agendamento</h1>
          <p className="text-sm text-muted-foreground">Selecione as perícias e aplique data/hora em lote.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarClock className="h-4 w-4" />
          {pericias.length} perícia(s) na fila
        </div>
      </header>

      {/* Scheduling controls */}
      <Card className="p-4">
        <p className="mb-3 text-sm font-semibold">Definir data e horário para os selecionados</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Calendar className="h-3 w-3" /> Data
            </label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Clock className="h-3 w-3" /> Horário
            </label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-32" />
          </div>
          <Button
            disabled={mutation.isPending || selected.size === 0 || !date || !time}
            onClick={onSchedule}
            className="self-end"
          >
            {mutation.isPending ? 'Agendando...' : `Agendar ${selected.size > 0 ? `(${selected.size})` : ''}`}
          </Button>
        </div>
      </Card>

      {/* Search */}
      <Input
        placeholder="Buscar por CNJ, autor ou cidade…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {pericias.length === 0 ? (
        <EmptyState title="Nenhuma perícia aguardando agendamento." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="w-10 px-3 py-2">
                    <button onClick={toggleAll} type="button">
                      {allSelected ? (
                        <CheckSquare className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">Processo CNJ</th>
                  <th className="px-3 py-2 text-left font-semibold">Autor</th>
                  <th className="px-3 py-2 text-left font-semibold">Cidade</th>
                  <th className="px-3 py-2 text-left font-semibold">Status</th>
                  <th className="px-3 py-2 text-left font-semibold">Agendamento atual</th>
                </tr>
              </thead>
              <tbody>
                {pericias.map((p) => {
                  const isChecked = selected.has(p.id);
                  const cidade = typeof p.cidade === 'string' ? p.cidade : (p.cidade as { nome?: string })?.nome ?? '—';
                  const statusLabel = typeof p.status === 'string' ? p.status : (p.status as { nome?: string })?.nome ?? '—';
                  return (
                    <tr
                      key={p.id}
                      className={`border-b cursor-pointer transition-colors ${isChecked ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                      onClick={() => toggleOne(p.id)}
                    >
                      <td className="px-3 py-2">
                        {isChecked ? (
                          <CheckSquare className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-400" />
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{p.processoCNJ}</td>
                      <td className="px-3 py-2">{p.autorNome ?? '—'}</td>
                      <td className="px-3 py-2">{cidade}</td>
                      <td className="px-3 py-2">
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {p.dataAgendamento ? new Date(p.dataAgendamento).toLocaleDateString('pt-BR') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default FilaAgendamentoPage;
