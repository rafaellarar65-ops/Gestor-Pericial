import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { useScheduleLot, type ScheduleParams, type PrepItem } from '@/hooks/use-schedule-lot';
import { StepConfirm } from '@/pages/fila-agendamento/step-confirm';
import { StepReview } from '@/pages/fila-agendamento/step-review';
import { StepSchedule } from '@/pages/fila-agendamento/step-schedule';
import { StepSelect } from '@/pages/fila-agendamento/step-select';
import { agendaService } from '@/services/agenda-service';
import { periciaService } from '@/services/pericia-service';
import { configService } from '@/services/config-service';
import type { Pericia } from '@/types/api';

const toCityName = (cidade: Pericia['cidade']) =>
  typeof cidade === 'string' ? cidade : (cidade as { nome?: string })?.nome ?? 'Sem cidade';

const toStatusText = (status: Pericia['status']) =>
  typeof status === 'string'
    ? status
    : (status as { codigo?: string; nome?: string })?.codigo ?? (status as { nome?: string })?.nome ?? '';

const isPendingScheduling = (p: Pericia, blockedStatusTerms: string[]) => {
  const s = toStatusText(p.status).toUpperCase();
  if (p.dataAgendamento) return false;
  if (blockedStatusTerms.some((term) => s.includes(term.toUpperCase()))) return false;
  return true;
};

const FilaAgendamentoPage = () => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedCities, setSelectedCities] = useState<Set<string>>(new Set());
  const [prepList, setPrepList] = useState<PrepItem[]>([]);
  const [params, setParams] = useState<ScheduleParams>({
    date: '',
    startTime: '08:00',
    durationMinutes: 30,
    intervalMinutes: 0,
    location: '',
    modalidade: 'Presencial',
    source: 'CSV',
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['pericias-agendar'],
    queryFn: () => periciaService.list(1, { limit: 100, search: '' }),
  });

  const { data: history = [] } = useQuery({
    queryKey: ['scheduling-batches-history'],
    queryFn: () => agendaService.listSchedulingBatches(),
  });

  const { data: dashboardSettings } = useQuery({
    queryKey: ['system-dashboard-settings'],
    queryFn: () => configService.getDashboardSettings(),
  });

  const pendingPericias = useMemo(() => {
    const items = (data?.items ?? []) as Pericia[];
    const blockedTerms = dashboardSettings?.filas.agendamentoBloqueiaTermosStatus ?? ['FINALIZ', 'LAUDO', 'ESCLAR', 'ARQUIV'];
    return items.filter((p) => isPendingScheduling(p, blockedTerms));
  }, [data, dashboardSettings]);

  const cityGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const byCity = new Map<string, PrepItem[]>();

    pendingPericias.forEach((p) => {
      const city = toCityName(p.cidade);
      const row: PrepItem = { id: p.id, processoCNJ: p.processoCNJ, autorNome: p.autorNome, cidade: city };
      if (!q || city.toLowerCase().includes(q) || (p.autorNome ?? '').toLowerCase().includes(q) || p.processoCNJ.toLowerCase().includes(q)) {
        byCity.set(city, [...(byCity.get(city) ?? []), row]);
      }
    });

    return Array.from(byCity.entries())
      .map(([city, items]) => ({ city, items }))
      .sort((a, b) => b.items.length - a.items.length);
  }, [pendingPericias, search]);

  const selectedCityItems = useMemo(
    () => cityGroups.filter((group) => selectedCities.has(group.city)).flatMap((group) => group.items),
    [cityGroups, selectedCities],
  );

  const confirmedPericiaIds = useMemo(() => new Set(history.flatMap((lot) => lot.items.map((item) => item.periciaId))), [history]);

  const { draftLot, conflicts, isValid } = useScheduleLot(prepList, params, confirmedPericiaIds);

  const confirmLotMutation = useMutation({
    mutationFn: async () => {
      if (!draftLot) return;

      await agendaService.scheduleLot({
        items: draftLot.items.map((item) => ({ periciaId: item.periciaId, startAt: item.scheduledAt })),
        metadata: {
          cityNames: draftLot.cityNames,
          date: draftLot.date,
          startTime: draftLot.startTime,
          durationMinutes: draftLot.durationMinutes,
          intervalMinutes: draftLot.intervalMinutes,
          location: draftLot.location,
          modalidade: draftLot.modalidade,
          source: draftLot.source,
        },
      });

      await Promise.all(
        draftLot.items.map((item) =>
          periciaService.updateDates(item.periciaId, {
            dataAgendamento: item.scheduledAt,
          }),
        ),
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pericias-agendar'] });
      void queryClient.invalidateQueries({ queryKey: ['pericias'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['scheduling-batches-history'] });
      setStep(1);
      setSelectedCities(new Set());
      setPrepList([]);
      toast.success('Lote confirmado e persistido no backend.');
    },
    onError: () => {
      toast.error('Não foi possível persistir o lote.');
    },
  });

  const toggleCity = (city: string) => {
    setSelectedCities((prev) => {
      const next = new Set(prev);
      if (next.has(city)) next.delete(city);
      else next.add(city);
      return next;
    });
  };

  const goToStep2 = () => {
    if (selectedCityItems.length === 0) return;
    setPrepList(selectedCityItems);
    setStep(2);
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Erro ao carregar central de agendamento." />;

  return (
    <div className="space-y-4">
      <header className="rounded-xl border bg-white p-4 shadow-sm">
        <h1 className="text-2xl font-semibold">Central de Agendamento (Wizard 4 etapas)</h1>
        <p className="text-sm text-muted-foreground">Seleção, parâmetros, revisão e confirmação com persistência no backend.</p>
      </header>

      {step === 1 && (
        <StepSelect
          cityGroups={cityGroups}
          search={search}
          onSearchChange={setSearch}
          selectedCities={selectedCities}
          onToggleCity={toggleCity}
          onNext={goToStep2}
        />
      )}

      {step === 2 && (
        <StepSchedule
          params={params}
          totalItems={prepList.length}
          onParamsChange={(patch) => setParams((prev) => ({ ...prev, ...patch }))}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}

      {step === 3 && <StepReview draftLot={draftLot} conflicts={conflicts} onBack={() => setStep(2)} onNext={() => setStep(4)} />}

      {step === 4 && (
        <StepConfirm
          draftLot={draftLot}
          isSubmitting={confirmLotMutation.isPending}
          onBack={() => setStep(3)}
          onConfirm={() => {
            if (isValid) confirmLotMutation.mutate();
          }}
        />
      )}

      <Card className="space-y-3 p-4">
        <h2 className="text-xl font-semibold">Histórico de Lotes (backend)</h2>
        {history.length === 0 ? (
          <EmptyState title="Nenhum lote persistido no backend até o momento." />
        ) : (
          <div className="space-y-2">
            {history.map((lot) => (
              <article key={lot.id} className="rounded border p-3 text-sm">
                <p className="font-medium">
                  Lote #{lot.id.slice(0, 8)} • {new Date(lot.createdAt).toLocaleString('pt-BR')}
                </p>
                <p>Cidades: {lot.cityNames.join(', ') || '—'}</p>
                <p>Itens: {lot.items.length}</p>
              </article>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default FilaAgendamentoPage;
