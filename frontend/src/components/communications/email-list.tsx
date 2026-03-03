import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import type { EmailInboxFilterType, EmailListItem } from '@/services/email-inbox-service';

type EmailListProps = {
  items: EmailListItem[];
  selectedUid: string | null;
  onSelect: (uid: string) => void;
  isLoading: boolean;
  isError: boolean;
  filter: EmailInboxFilterType;
  onFilterChange: (filter: EmailInboxFilterType) => void;
  search: string;
  onSearchChange: (search: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
};

const filters: Array<{ value: EmailInboxFilterType; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'nao_confirmados', label: 'Não confirmados' },
  { value: 'pediram_reagendamento', label: 'Pediram reagendamento' },
  { value: 'falha_envio', label: 'Falha de envio' },
  { value: 'optin_pendente', label: 'Opt-in pendente' },
  { value: 'inbound_nao_vinculado', label: 'Inbound não vinculado' },
];

export function EmailList({
  items,
  selectedUid,
  onSelect,
  isLoading,
  isError,
  filter,
  onFilterChange,
  search,
  onSearchChange,
  page,
  totalPages,
  onPageChange,
}: EmailListProps) {
  return (
    <Card className="h-full p-3 space-y-3">
      <div className="space-y-2">
        <input
          className="h-9 w-full rounded-md border px-2 text-sm"
          placeholder="Buscar por assunto, remetente, conteúdo..."
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <Button key={item.value || 'all'} size="sm" variant={filter === item.value ? 'default' : 'outline'} onClick={() => onFilterChange(item.value)}>
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="min-h-[420px] overflow-auto rounded-md border">
        {isLoading && <LoadingState />}
        {isError && <ErrorState message="Falha ao listar emails." />}
        {!isLoading && !isError && items.length === 0 && <EmptyState title="Nenhum email encontrado" />}
        {!isLoading && !isError && items.length > 0 && (
          <ul className="divide-y">
            {items.map((item) => {
              const isSelected = selectedUid === item.uid;
              return (
                <li key={item.uid}>
                  <button
                    type="button"
                    className={`w-full p-3 text-left hover:bg-slate-50 ${isSelected ? 'bg-slate-100' : ''}`}
                    onClick={() => onSelect(item.uid)}
                  >
                    <p className="truncate text-sm font-medium">{item.subject ?? item.message ?? '(Sem assunto)'}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.from ?? item.to ?? 'Origem não identificada'}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.snippet ?? item.message ?? 'Sem prévia'}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Anterior
        </Button>
        <span className="text-xs text-muted-foreground">Página {page} de {Math.max(totalPages, 1)}</span>
        <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Próxima
        </Button>
      </div>
    </Card>
  );
}
