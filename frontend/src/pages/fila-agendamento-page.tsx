import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import { ErrorState, LoadingState } from '@/components/ui/state';
import { useScheduleLot, type PrepItem, type ScheduleParams } from '@/hooks/use-schedule-lot';
import { StepConfirm } from '@/pages/fila-agendamento/step-confirm';
import { StepReview } from '@/pages/fila-agendamento/step-review';
import { StepSchedule } from '@/pages/fila-agendamento/step-schedule';
import { StepSelect } from '@/pages/fila-agendamento/step-select';
import { agendaService } from '@/services/agenda-service';
import { periciaService } from '@/services/pericia-service';

const CONFIRMED_KEY = 'agendamento.confirmados';

const initialParams: ScheduleParams = {
  date: '',
  startTime: '',
  durationMinutes: 30,
  intervalMinutes: 10,
  location: '',
  modalidade: 'PRESENCIAL',
  source: 'CSV',
};

const FilaAgendamentoPage = () => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [search, setSearch] = useState('');
  const [selectedCities, setSelectedCities] = useState<Set<string>>(new Set());
  const [params, setParams] = useState<ScheduleParams>(initialParams);
  const [confirmedPericiaIds, setConfirmedPericiaIds] = useState<Set<string>>(() => {
    const raw = localStorage.getItem(CONFIRMED_KEY);
    if (!raw) return new Set<string>();
    const parsed = JSON.parse(raw) as string[];
    return new Set(parsed);
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['fila-agendamento-cidades'],
    queryFn: () => periciaService.filaAgendamentoPorCidade(),
  });

  const filteredCities = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cities = data?.cities ?? [];

    if (!q) return cities;

    return cities
      .map((cityGroup) => ({
        ...cityGroup,
        items: cityGroup.items.filter(
          (item) =>
            item.cidade.toLowerCase().includes(q) ||
            item.autorNome.toLowerCase().includes(q) ||
            item.processoCNJ.toLowerCase().includes(q),
        ),
      }))
      .filter((cityGroup) => cityGroup.items.length > 0);
  }, [data, search]);

  const selectedItems = useMemo<PrepItem[]>(() => {
    return filteredCities
      .filter((cityGroup) => selectedCities.has(cityGroup.cidade))
      .flatMap((cityGroup) =>
        cityGroup.items.map((item) => ({
          id: item.id,
          processoCNJ: item.processoCNJ,
          autorNome: item.autorNome,
          cidade: item.cidade,
        })),
      );
  }, [filteredCities, selectedCities]);

  const { draftLot, conflicts } = useScheduleLot(selectedItems, params, confirmedPericiaIds);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!draftLot) return;
      await agendaService.scheduleLot({
        items: draftLot.items.map((item) => ({
          periciaId: item.periciaId,
          startAt: item.scheduledAt,
        })),
        metadata: {
          source: draftLot.source,
          cityNames: draftLot.cityNames,
          date: draftLot.date,
          startTime: draftLot.startTime,
          durationMinutes: draftLot.durationMinutes,
          intervalMinutes: draftLot.intervalMinutes,
          location: draftLot.location,
          modalidade: draftLot.modalidade,
        },
      });
    },
    onSuccess: () => {
      if (!draftLot) return;

      const newIds = draftLot.items.map((item) => item.periciaId);
      setConfirmedPericiaIds((previous) => {
        const next = new Set(previous);
        newIds.forEach((id) => next.add(id));
        localStorage.setItem(CONFIRMED_KEY, JSON.stringify(Array.from(next)));
        return next;
      });

      toast.success('Lote confirmado com sucesso.');
      setCurrentStep(1);
      setSelectedCities(new Set());
      setParams(initialParams);
    },
    onError: () => {
      toast.error('Falha ao confirmar o lote. Tente novamente.');
    },
  });

  const toggleCity = (city: string) => {
    setSelectedCities((prev) => {
      const next = new Set(prev);
      if (next.has(city)) {
        next.delete(city);
      } else {
        next.add(city);
      }
      return next;
    });
  };

  const goNext = () => {
    setCurrentStep((prev) => (prev < 4 ? ((prev + 1) as 1 | 2 | 3 | 4) : prev));
  };

  const goBack = () => {
    setCurrentStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4) : prev));
  };

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Falha ao carregar a fila por cidade" />;

  return (
    <div className="space-y-4">
      <header className="rounded-xl border bg-white px-5 py-4 shadow-sm">
        <div className="flex items-start gap-3">
          <CalendarClock className="mt-1 text-blue-600" size={22} />
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Agendar em Lote (Wizard)</h1>
            <p className="text-sm text-slate-500">Etapa {currentStep} de 4: seleção, parâmetros, revisão e confirmação.</p>
          </div>
        </div>
      </header>

      {currentStep === 1 && (
        <StepSelect
          cityGroups={filteredCities.map((cityGroup) => ({ city: cityGroup.cidade, items: cityGroup.items }))}
          search={search}
          onSearchChange={setSearch}
          selectedCities={selectedCities}
          onToggleCity={toggleCity}
          onNext={goNext}
        />
      )}

      {currentStep === 2 && (
        <StepSchedule
          params={params}
          totalItems={selectedItems.length}
          onParamsChange={(patch) => setParams((prev) => ({ ...prev, ...patch }))}
          onBack={goBack}
          onNext={goNext}
        />
      )}

      {currentStep === 3 && <StepReview draftLot={draftLot} conflicts={conflicts} onBack={goBack} onNext={goNext} />}

      {currentStep === 4 && (
        <StepConfirm
          draftLot={draftLot}
          isSubmitting={submitMutation.isPending}
          onBack={goBack}
          onConfirm={() => submitMutation.mutate()}
        />
      )}
    </div>
  );
};

export default FilaAgendamentoPage;
