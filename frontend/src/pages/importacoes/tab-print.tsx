import { Printer } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type PrintTabState = {
  printerName: string;
  copies: string;
  includeSummary: boolean;
};

type TabPrintProps = {
  state: PrintTabState;
  onChange: (nextState: PrintTabState) => void;
};

export const TabPrint = ({ state, onChange }: TabPrintProps) => {
  return (
    <Card className="space-y-4 p-4" id="print">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Printer className="h-4 w-4" />
        Impressão de lote
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="print-printer-name">
          Impressora de destino
        </label>
        <Input
          id="print-printer-name"
          placeholder="Ex.: Laser Jurídico - Sala 2"
          value={state.printerName}
          onChange={(event) => onChange({ ...state, printerName: event.target.value })}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="print-copies">
          Quantidade de cópias
        </label>
        <Input
          id="print-copies"
          type="number"
          min={1}
          value={state.copies}
          onChange={(event) => onChange({ ...state, copies: event.target.value })}
        />
      </div>

      <label className="flex items-center gap-2 text-sm" htmlFor="print-summary">
        <input
          id="print-summary"
          type="checkbox"
          checked={state.includeSummary}
          onChange={(event) => onChange({ ...state, includeSummary: event.target.checked })}
        />
        Incluir folha de resumo no final da impressão
      </label>
    </Card>
  );
};
