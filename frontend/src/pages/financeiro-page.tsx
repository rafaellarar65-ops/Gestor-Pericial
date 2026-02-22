import { Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { useFinancialQuery } from '@/hooks/use-financial';

const FinanceiroPage = () => {
  const { data, isLoading, isError } = useFinancialQuery();

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Erro ao carregar financeiro" />;
  if (!data || data.items.length === 0) return <EmptyState title="Sem lançamentos financeiros" />;

  const chartData = data.items.map((item) => ({ name: item.referencia, value: item.valor }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Financeiro</h1>
      <div className="h-64 rounded border">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={80} fill="hsl(var(--info))" />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <DataTable
        columns={[
          { key: 'referencia', header: 'Referência' },
          { key: 'valor', header: 'Valor' },
          { key: 'status', header: 'Status' },
        ]}
        onPageChange={() => undefined}
        page={1}
        rows={data.items}
        total={data.total}
      />
    </div>
  );
};

export default FinanceiroPage;
