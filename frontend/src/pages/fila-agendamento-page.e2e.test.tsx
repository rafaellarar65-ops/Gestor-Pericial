import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, test, vi } from 'vitest';
import FilaAgendamentoPage from '@/pages/fila-agendamento-page';

const { listMock, updateDatesMock, listBatchesMock, scheduleLotMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  updateDatesMock: vi.fn(),
  listBatchesMock: vi.fn(),
  scheduleLotMock: vi.fn(),
}));

vi.mock('@/services/pericia-service', () => ({
  periciaService: {
    list: listMock,
    updateDates: updateDatesMock,
  },
}));

vi.mock('@/services/agenda-service', () => ({
  agendaService: {
    listSchedulingBatches: listBatchesMock,
    scheduleLot: scheduleLotMock,
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('FilaAgendamentoPage (E2E fluxo 4 etapas)', () => {
  test('executa seleção -> parâmetros -> revisão -> confirmação', async () => {
    listMock.mockResolvedValue({
      items: [
        { id: 'p1', processoCNJ: '0001', autorNome: 'Ana', cidade: 'Recife', status: 'NOVA_NOMEACAO' },
        { id: 'p2', processoCNJ: '0002', autorNome: 'Bia', cidade: 'Recife', status: 'NOVA_NOMEACAO' },
      ],
    });
    listBatchesMock.mockResolvedValue([]);
    scheduleLotMock.mockResolvedValue({});
    updateDatesMock.mockResolvedValue({});

    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <FilaAgendamentoPage />
      </QueryClientProvider>,
    );

    await userEvent.click(await screen.findByRole('button', { name: /Recife/i }));
    await userEvent.click(screen.getByRole('button', { name: /Continuar para etapa 2/i }));

    await screen.findByTestId('step-schedule');
    await userEvent.type(screen.getByLabelText('Data'), '2026-03-10');
    await userEvent.clear(screen.getByLabelText('Horário inicial'));
    await userEvent.type(screen.getByLabelText('Horário inicial'), '08:30');
    await userEvent.click(screen.getByRole('button', { name: /Continuar para etapa 3/i }));

    await screen.findByTestId('step-review');
    await userEvent.click(screen.getByRole('button', { name: /Continuar para etapa 4/i }));

    await screen.findByTestId('step-confirm');
    await userEvent.click(screen.getByRole('button', { name: /Confirmar e persistir lote/i }));

    await waitFor(() => {
      expect(scheduleLotMock).toHaveBeenCalledTimes(1);
      expect(updateDatesMock).toHaveBeenCalledTimes(2);
    });
  });
});
