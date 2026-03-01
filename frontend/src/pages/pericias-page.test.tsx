import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import PericiasPage from '@/pages/pericias-page';

const refetchMock = vi.fn();
const usePericiasQueryMock = vi.fn();

vi.mock('@/hooks/use-pericias', () => ({
  usePericiasQuery: (...args: unknown[]) => usePericiasQueryMock(...args),
}));

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

describe('PericiasPage', () => {
  test('atualiza lista ao clicar em atualizar e mantém CTAs pendentes desabilitadas', async () => {
    refetchMock.mockResolvedValue({ isError: false });

    usePericiasQueryMock.mockReturnValue({
      data: {
        items: [
          {
            id: 'p1',
            processoCNJ: '0000000-00.2026.8.26.0001',
            autorNome: 'Autor Teste',
            reuNome: 'Réu Teste',
            cidade: { nome: 'São Paulo' },
            status: { nome: 'Agendada' },
            honorariosPrevistosJG: 1000,
          },
        ],
      },
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: refetchMock,
    });

    render(
      <MemoryRouter>
        <PericiasPage />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Atualizar perícias' }));

    await waitFor(() => {
      expect(refetchMock).toHaveBeenCalledTimes(1);
      expect(toastSuccessMock).toHaveBeenCalledWith('Lista de perícias atualizada.');
    });

    expect(screen.getByRole('button', { name: 'IA (Em breve)' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Importar (Em breve)' })).toBeDisabled();
  });
});
