import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Column<T> = {
  key: keyof T;
  header: string;
};

type DataTableProps<T extends Record<string, string | number | boolean | null | undefined>> = {
  rows: T[];
  columns: Column<T>[];
  page: number;
  total: number;
  onPageChange: (next: number) => void;
};

export const DataTable = <T extends Record<string, string | number | boolean | null | undefined>>({
  rows,
  columns,
  page,
  total,
  onPageChange,
}: DataTableProps<T>) => (
  <Card>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            {columns.map((column) => (
              <th className="px-2 py-2 text-left" key={String(column.key)}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr className="border-b" key={index}>
              {columns.map((column) => (
                <td className="px-2 py-2" key={String(column.key)}>
                  {String(row[column.key] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="mt-3 flex items-center justify-between">
      <span>Total: {total}</span>
      <div className="space-x-2">
        <Button onClick={() => onPageChange(Math.max(1, page - 1))} size="sm" variant="outline">
          Anterior
        </Button>
        <Button onClick={() => onPageChange(page + 1)} size="sm" variant="outline">
          Próxima
        </Button>
      </div>
    </div>
  </Card>
);
