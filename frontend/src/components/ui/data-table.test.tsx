import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { DataTable } from '@/components/ui/data-table';

describe('DataTable', () => {
  test('renderiza tabela e paginação', () => {
    const onPageChange = vi.fn();
    render(
      <DataTable
        columns={[
          { key: 'nome', header: 'Nome' },
          { key: 'cidade', header: 'Cidade' },
        ]}
        onPageChange={onPageChange}
        page={1}
        rows={[{ nome: 'João', cidade: 'Campinas' }]}
        total={1}
      />,
    );

    expect(screen.getByText('João')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Próxima'));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
