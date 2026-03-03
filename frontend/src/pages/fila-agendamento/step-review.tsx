import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { BatchLot, LotItem } from '@/hooks/use-schedule-lot';

type Props = {
  draftLot: BatchLot | null;
  conflicts: LotItem[];
  onBack: () => void;
  onNext: () => void;
};

export const StepReview = ({ draftLot, conflicts, onBack, onNext }: Props) => (
  <Card className="space-y-4 p-4" data-testid="step-review">
    <h2 className="text-lg font-semibold">Etapa 3: revisão de itens e conflitos</h2>
    {conflicts.length > 0 && (
      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm">
        <p className="mb-2 inline-flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" />Conflitos encontrados</p>
        <ul className="list-inside list-disc">
          {conflicts.map((item) => <li key={item.id}>{item.processoCNJ} já consta em lote confirmado.</li>)}
        </ul>
      </div>
    )}
    <div className="max-h-72 overflow-auto rounded border">
      <table className="w-full text-sm">
        <thead><tr className="border-b bg-slate-50"><th className="p-2 text-left">CNJ</th><th className="p-2 text-left">Cidade</th><th className="p-2 text-left">Horário</th></tr></thead>
        <tbody>
          {draftLot?.items.map((item) => (
            <tr className="border-b" key={item.id}><td className="p-2 font-mono text-xs">{item.processoCNJ}</td><td className="p-2">{item.cidade}</td><td className="p-2">{new Date(item.scheduledAt).toLocaleString('pt-BR')}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="flex justify-between">
      <Button type="button" variant="outline" onClick={onBack}>Voltar</Button>
      <Button type="button" onClick={onNext} disabled={!draftLot || conflicts.length > 0}>Continuar para etapa 4</Button>
    </div>
  </Card>
);
