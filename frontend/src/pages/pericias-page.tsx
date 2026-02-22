import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FilterBar } from '@/components/domain/filter-bar';
import { StatusBadge } from '@/components/domain/status-badge';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { usePericiasQuery } from '@/hooks/use-pericias';

export const PericiasPage = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const { data, isLoading, isError } = usePericiasQuery(page);

  const rows = useMemo(
    () =>
      (data?.items ?? [])
        .filter((item) =>
          `${item.processoCNJ} ${item.autorNome} ${item.cidade}`.toLowerCase().includes(search.toLowerCase()),
        )
        .map((item) => ({
          ...item,
          processoCNJ: item.processoCNJ,
          autorNome: item.autorNome,
          cidade: item.cidade,
          status: item.status,
        })),
    [data?.items, search],
  );

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Erro ao carregar perícias" />;
  if (!data || data.items.length === 0) return <EmptyState title="Sem perícias encontradas" />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Lista de Perícias</h1>
      <FilterBar onSearchChange={setSearch} search={search} />
      <div className="rounded border p-2">
        {rows.map((row) => (
          <div className="flex items-center justify-between border-b py-2" key={row.id}>
            <Link className="text-primary underline" to={`/pericias/${row.id}`}>
              {row.processoCNJ}
            </Link>
            <span>{row.autorNome}</span>
            <StatusBadge status={row.status} />
          </div>
        ))}
      </div>
      <DataTable
        columns={[
          { key: 'processoCNJ', header: 'CNJ' },
          { key: 'autorNome', header: 'Autor' },
          { key: 'cidade', header: 'Cidade' },
        ]}
        onPageChange={setPage}
        page={page}
        rows={rows}
        total={data.total}
      />
    </div>
  );
};
