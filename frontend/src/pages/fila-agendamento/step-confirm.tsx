import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { BatchLot } from '@/hooks/use-schedule-lot';

type Props = {
  draftLot: BatchLot | null;
  isSubmitting: boolean;
  canDownload?: boolean;
  onBack: () => void;
  onConfirm: () => void;
  onDownloadPdf: (includeRoute: boolean) => void;
};

export const StepConfirm = ({ draftLot, isSubmitting, canDownload, onBack, onConfirm, onDownloadPdf }: Props) => (
  <Card className="space-y-4 p-4" data-testid="step-confirm">
    <h2 className="text-lg font-semibold">Etapa 4: confirmação e persistência</h2>
    <div className="rounded border bg-slate-50 p-3 text-sm">
      <p><strong>Cidades:</strong> {draftLot?.cityNames.join(', ')}</p>
      <p><strong>Data:</strong> {draftLot?.date}</p>
      <p><strong>Horário inicial:</strong> {draftLot?.startTime}</p>
      <p><strong>Total de itens:</strong> {draftLot?.items.length ?? 0}</p>
    </div>
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="secondary" onClick={() => onDownloadPdf(false)} disabled={!canDownload}>
        <Download className="mr-2 h-4 w-4" />
        Download PDF
      </Button>
      <Button type="button" variant="outline" onClick={() => onDownloadPdf(true)} disabled={!canDownload}>
        Download PDF com rota
      </Button>
    </div>
    <div className="flex justify-between">
      <Button type="button" variant="outline" onClick={onBack}>Voltar</Button>
      <Button type="button" onClick={onConfirm} disabled={!draftLot || isSubmitting}>
        {isSubmitting ? 'Persistindo...' : 'Confirmar e persistir lote'}
      </Button>
    </div>
  </Card>
);
