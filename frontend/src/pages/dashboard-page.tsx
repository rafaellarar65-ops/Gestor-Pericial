import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { KpiCard } from '@/components/domain/kpi-card';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/state';
import { useDashboardQuery } from '@/hooks/use-pericias';

const DashboardPage = () => {
  const { data, isLoading, isError } = useDashboardQuery();

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState message="Não foi possível carregar o dashboard" />;
  if (!data || data.kpis.length === 0) return <EmptyState title="Sem dados no dashboard" />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-3 md:grid-cols-4">
        {data.kpis.map((kpi) => (
          <KpiCard key={kpi.label} label={kpi.label} trend={kpi.trend} value={kpi.value} />
        ))}
      </div>
      <div className="h-64 rounded border p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.chart}>
            <XAxis dataKey="name" />
            <YAxis />
            <Bar dataKey="value" fill="hsl(var(--primary))" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <DataTable
        columns={[
          { key: 'processoCNJ', header: 'CNJ' },
          { key: 'autorNome', header: 'Autor' },
          { key: 'cidade', header: 'Cidade' },
        ]}
        onPageChange={() => undefined}
        page={1}
        rows={data.critical}
        total={data.critical.length}
      />
    </div>
  );
};

export default DashboardPage;
