import { Input } from '@/components/ui/input';

type FilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
};

export const FilterBar = ({ search, onSearchChange }: FilterBarProps) => (
  <div className="flex gap-2">
    <Input
      aria-label="Buscar perícia"
      placeholder="Buscar por CNJ, nome ou cidade"
      value={search}
      onChange={(event) => onSearchChange(event.target.value)}
    />
  </div>
);
