import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, test, vi } from 'vitest';
import AgendarLotePage from '@/pages/agendar-lote-page';

const { postMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: postMock,
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('AgendarLotePage', () => {
  test('dispara batch scheduling na rota correta ao confirmar lote', async () => {
    postMock.mockResolvedValue({ data: {} });

    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <AgendarLotePage />
      </QueryClientProvider>,
    );

    await userEvent.type(screen.getByLabelText('Data'), '2026-01-10');
    await userEvent.type(screen.getByLabelText('Hora'), '14:30');

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar lote' }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith(
        '/agenda/batch-scheduling',
        expect.objectContaining({
          items: expect.arrayContaining([
            expect.objectContaining({
              periciaId: 'p1',
              type: 'PERICIA',
            }),
          ]),
        }),
      );
    });
  });
});
