import { UserRoundSearch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type SingleTabState = {
  processNumber: string;
  protocolCode: string;
  notes: string;
};

type TabSingleProps = {
  state: SingleTabState;
  onChange: (nextState: SingleTabState) => void;
};

export const TabSingle = ({ state, onChange }: TabSingleProps) => {
  return (
    <Card className="space-y-4 p-4" id="single">
      <div className="flex items-center gap-2 text-sm font-medium">
        <UserRoundSearch className="h-4 w-4" />
        Importação unitária
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="single-process-number">
            Nº do processo
          </label>
          <Input
            id="single-process-number"
            placeholder="0001234-56.2026.8.26.0001"
            value={state.processNumber}
            onChange={(event) => onChange({ ...state, processNumber: event.target.value })}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="single-protocol-code">
            Código do protocolo
          </label>
          <Input
            id="single-protocol-code"
            placeholder="PROTOC-2026-0001"
            value={state.protocolCode}
            onChange={(event) => onChange({ ...state, protocolCode: event.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="single-notes">
          Observações
        </label>
        <textarea
          id="single-notes"
          className="min-h-[110px] w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Detalhes adicionais para conferência manual"
          value={state.notes}
          onChange={(event) => onChange({ ...state, notes: event.target.value })}
        />
      </div>

      <Button type="button">Salvar importação unitária</Button>
    </Card>
  );
};
