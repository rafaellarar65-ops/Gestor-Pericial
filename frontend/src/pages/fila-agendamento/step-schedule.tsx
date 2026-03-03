import { WandSparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { ScheduleParams } from '@/hooks/use-schedule-lot';

type Props = {
  params: ScheduleParams;
  totalItems: number;
  hasSuggestions?: boolean;
  isSuggesting?: boolean;
  onParamsChange: (patch: Partial<ScheduleParams>) => void;
  onSuggest: () => void;
  onApplySuggestions: () => void;
  onBack: () => void;
  onNext: () => void;
};

export const StepSchedule = ({
  params,
  totalItems,
  hasSuggestions,
  isSuggesting,
  onParamsChange,
  onSuggest,
  onApplySuggestions,
  onBack,
  onNext,
}: Props) => (
  <Card className="space-y-4 p-4" data-testid="step-schedule">
    <h2 className="text-lg font-semibold">Etapa 2: data/horário/parâmetros</h2>
    <div className="grid gap-3 md:grid-cols-2">
      <label className="text-sm">Data<Input type="date" value={params.date} onChange={(e) => onParamsChange({ date: e.target.value })} /></label>
      <label className="text-sm">Horário inicial<Input type="time" value={params.startTime} onChange={(e) => onParamsChange({ startTime: e.target.value })} /></label>
      <label className="text-sm">Duração (min)<Input type="number" value={params.durationMinutes} onChange={(e) => onParamsChange({ durationMinutes: Number(e.target.value) || 0 })} /></label>
      <label className="text-sm">Intervalo (min)<Input type="number" value={params.intervalMinutes} onChange={(e) => onParamsChange({ intervalMinutes: Number(e.target.value) || 0 })} /></label>
      <label className="text-sm">Local<Input value={params.location} onChange={(e) => onParamsChange({ location: e.target.value })} /></label>
      <label className="text-sm">Modalidade<Input value={params.modalidade} onChange={(e) => onParamsChange({ modalidade: e.target.value })} /></label>
    </div>
    <p className="text-sm text-muted-foreground">Itens selecionados: {totalItems}</p>
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="secondary" onClick={onSuggest} disabled={!params.date || !params.startTime || totalItems === 0 || isSuggesting}>
        <WandSparkles className="mr-2 h-4 w-4" />
        {isSuggesting ? 'Sugerindo agenda...' : 'Sugerir agenda'}
      </Button>
      <Button type="button" variant="outline" onClick={onApplySuggestions} disabled={!hasSuggestions}>
        Aplicar sugestões
      </Button>
    </div>
    <div className="flex justify-between">
      <Button type="button" variant="outline" onClick={onBack}>Voltar</Button>
      <Button type="button" onClick={onNext} disabled={!params.date || !params.startTime || totalItems === 0}>Continuar para etapa 3</Button>
    </div>
  </Card>
);
