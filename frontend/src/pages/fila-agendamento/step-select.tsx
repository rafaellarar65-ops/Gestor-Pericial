import { Check, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { PrepItem } from '@/hooks/use-schedule-lot';

type CityGroup = { city: string; items: PrepItem[] };

type Props = {
  cityGroups: CityGroup[];
  search: string;
  onSearchChange: (value: string) => void;
  selectedCities: Set<string>;
  onToggleCity: (city: string) => void;
  onNext: () => void;
};

export const StepSelect = ({ cityGroups, search, onSearchChange, selectedCities, onToggleCity, onNext }: Props) => (
  <Card className="space-y-4 p-4" data-testid="step-select">
    <div>
      <h2 className="text-lg font-semibold">Etapa 1: seleção (fila por cidade)</h2>
      <p className="text-sm text-muted-foreground">Selecione uma ou mais cidades para montar o lote.</p>
    </div>

    <Input placeholder="Buscar por cidade, autor ou CNJ..." value={search} onChange={(e) => onSearchChange(e.target.value)} />

    <div className="space-y-2">
      {cityGroups.map((group) => {
        const checked = selectedCities.has(group.city);
        return (
          <button
            key={group.city}
            type="button"
            className={`w-full rounded-lg border p-3 text-left ${checked ? 'border-blue-300 bg-blue-50' : ''}`}
            onClick={() => onToggleCity(group.city)}
          >
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 font-medium">
                <MapPin className="h-4 w-4" />
                {group.city}
              </div>
              {checked && <Check className="h-4 w-4 text-blue-600" />}
            </div>
            <p className="text-xs text-muted-foreground">{group.items.length} perícia(s)</p>
          </button>
        );
      })}
    </div>

    <div className="flex justify-end">
      <Button onClick={onNext} disabled={selectedCities.size === 0}>
        Continuar para etapa 2
      </Button>
    </div>
  </Card>
);
