import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';
import PericiaDetailPage from '@/pages/pericia-detail-page';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useParams: () => ({ id: 'p1' }),
  };
});

const hooksMock = vi.hoisted(() => ({
  usePericiaDetailQueryMock: vi.fn(),
  usePericiaTimelineQueryMock: vi.fn(),
  usePericiaDocumentsQueryMock: vi.fn(),
  usePericiaRecebimentosQueryMock: vi.fn(),
  usePericiaCnjQueryMock: vi.fn(),
  useUpdatePericiaDatesMutationMock: vi.fn(),
}));

vi.mock('@/hooks/use-pericias', () => ({
  usePericiaDetailQuery: (...args: unknown[]) => hooksMock.usePericiaDetailQueryMock(...args),
  usePericiaTimelineQuery: (...args: unknown[]) => hooksMock.usePericiaTimelineQueryMock(...args),
  usePericiaDocumentsQuery: (...args: unknown[]) => hooksMock.usePericiaDocumentsQueryMock(...args),
  usePericiaRecebimentosQuery: (...args: unknown[]) => hooksMock.usePericiaRecebimentosQueryMock(...args),
  usePericiaCnjQuery: (...args: unknown[]) => hooksMock.usePericiaCnjQueryMock(...args),
  useUpdatePericiaDatesMutation: (...args: unknown[]) => hooksMock.useUpdatePericiaDatesMutationMock(...args),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('PericiaDetailPage', () => {
  test('direciona CTA de esclarecimentos e mantém ações sem fluxo desabilitadas', async () => {
    hooksMock.usePericiaDetailQueryMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        id: 'p1',
        processoCNJ: '0000000-00.2026.8.26.0001',
        autorNome: 'Autor',
        reuNome: 'Réu',
        cidade: { nome: 'São Paulo' },
        vara: { nome: '1ª Vara' },
        status: { nome: 'Laudo enviado', codigo: 'laudo' },
      },
    });
    hooksMock.usePericiaTimelineQueryMock.mockReturnValue({ isLoading: false, data: { items: [] } });
    hooksMock.usePericiaDocumentsQueryMock.mockReturnValue({ isLoading: false, data: [] });
    hooksMock.usePericiaRecebimentosQueryMock.mockReturnValue({ data: [] });
    hooksMock.usePericiaCnjQueryMock.mockReturnValue({ isLoading: false, data: null });
    hooksMock.useUpdatePericiaDatesMutationMock.mockReturnValue({ isPending: false, mutateAsync: vi.fn() });

    const { rerender } = render(
      <MemoryRouter>
        <PericiaDetailPage />
      </MemoryRouter>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Esclarecimentos' }));
    expect(navigateMock).toHaveBeenCalledWith('/comunicacao');

    hooksMock.usePericiaDetailQueryMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        id: 'p1',
        processoCNJ: '0000000-00.2026.8.26.0001',
        autorNome: 'Autor',
        reuNome: 'Réu',
        cidade: { nome: 'São Paulo' },
        vara: { nome: '1ª Vara' },
        status: { nome: 'Teleperícia', codigo: 'tele' },
      },
    });

    rerender(
      <MemoryRouter>
        <PericiaDetailPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: 'Realizada (Em breve)' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ausência (Em breve)' })).toBeDisabled();
  });
});
