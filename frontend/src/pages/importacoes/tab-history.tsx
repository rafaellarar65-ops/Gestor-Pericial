import { Clock3, FileSpreadsheet } from 'lucide-react';
import { Card } from '@/components/ui/card';

type HistoryItem = {
  id: string;
  description: string;
  importedAt: string;
  status: 'CONCLUIDO' | 'EM_ANALISE';
};

type HistoryTabState = {
  searchTerm: string;
  items: HistoryItem[];
};

type TabHistoryProps = {
  state: HistoryTabState;
  onChange: (nextState: HistoryTabState) => void;
};

export const TabHistory = ({ state, onChange }: TabHistoryProps) => {
  const filteredItems = state.items.filter((item) => {
    return item.description.toLowerCase().includes(state.searchTerm.toLowerCase());
  });

  return (
    <Card className="space-y-4 p-4" id="history">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Clock3 className="h-4 w-4" />
        Histórico de importações
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="history-search">
          Buscar no histórico
        </label>
        <input
          id="history-search"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Filtrar por descrição"
          value={state.searchTerm}
          onChange={(event) => onChange({ ...state, searchTerm: event.target.value })}
        />
      </div>

      {filteredItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum registro encontrado.</p>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <div className="rounded-md border p-3" key={item.id}>
              <p className="flex items-center gap-2 text-sm font-medium">
                <FileSpreadsheet className="h-4 w-4" />
                {item.description}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(item.importedAt).toLocaleString('pt-BR')} • {item.status}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
