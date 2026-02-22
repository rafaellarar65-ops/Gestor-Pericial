import { Card } from '@/components/ui/card';

export const KpiCard = ({ label, value, trend }: { label: string; value: string; trend?: string }) => (
  <Card>
    <p className="text-sm text-muted-foreground">{label}</p>
    <h3 className="text-2xl font-bold">{value}</h3>
    {trend ? <p className="text-xs text-muted-foreground">{trend}</p> : null}
  </Card>
);
