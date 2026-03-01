import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { BatchLot } from '@/hooks/use-schedule-lot';

type Props = {
  draftLot: BatchLot | null;
  isSubmitting: boolean;
  onBack: () => void;
  onConfirm: () => void;
};

export const StepConfirm = ({ draftLot, isSubmitting, onBack, onConfirm }: Props) => (
  <Card className="space-y-4 p-4" data-testid="step-confirm">
    <h2 className="text-lg font-semibold">Etapa 4: confirmação e persistência</h2>
    <div className="rounded border bg-slate-50 p-3 text-sm">
      <p><strong>Cidades:</strong> {draftLot?.cityNames.join(', ')}</p>
      <p><strong>Data:</strong> {draftLot?.date}</p>
      <p><strong>Horário inicial:</strong> {draftLot?.startTime}</p>
      <p><strong>Total de itens:</strong> {draftLot?.items.length ?? 0}</p>
    </div>
    <div className="flex justify-between">
      <Button type="button" variant="outline" onClick={onBack}>Voltar</Button>
      <Button type="button" onClick={onConfirm} disabled={!draftLot || isSubmitting}>
        {isSubmitting ? 'Persistindo...' : 'Confirmar e persistir lote'}
      </Button>
    </div>
  </Card>
);
