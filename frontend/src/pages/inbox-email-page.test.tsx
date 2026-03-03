import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import InboxEmailPage from '@/pages/inbox-email-page';

const listInbox = vi.fn();
const getByUid = vi.fn();
const markRead = vi.fn();
const reply = vi.fn();

vi.mock('@/services/lawyers-service', () => ({
  emailImapService: {
    listInbox: (...args: unknown[]) => listInbox(...args),
    getByUid: (...args: unknown[]) => getByUid(...args),
    markRead: (...args: unknown[]) => markRead(...args),
    reply: (...args: unknown[]) => reply(...args),
  },
}));

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <InboxEmailPage />
    </QueryClientProvider>,
  );
}

describe('InboxEmailPage', () => {
  test('render da lista', async () => {
    listInbox.mockResolvedValue([{ uid: 1, subject: 'Assunto 1', from: 'a@test.com', seen: false, snippet: 'Trecho' }]);
    renderPage();
    expect(await screen.findByText('Assunto 1')).toBeInTheDocument();
  });

  test('seleção e preview', async () => {
    listInbox.mockResolvedValue([{ uid: 2, subject: 'Assunto 2', from: 'b@test.com', seen: false, snippet: 'Trecho 2' }]);
    markRead.mockResolvedValue({ uid: 2, read: true });
    getByUid.mockResolvedValue({ uid: 2, subject: 'Assunto 2', from: 'b@test.com', to: 'x@test.com', text: 'Corpo email' });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Assunto 2/i }));

    expect(await screen.findByText('Corpo email')).toBeInTheDocument();
    expect(markRead).toHaveBeenCalledWith(2);
  });

  test('ação de reply', async () => {
    listInbox.mockResolvedValue([{ uid: 3, subject: 'Assunto 3', from: 'c@test.com', seen: false, snippet: 'Trecho 3' }]);
    markRead.mockResolvedValue({ uid: 3, read: true });
    getByUid.mockResolvedValue({ uid: 3, subject: 'Assunto 3', from: 'c@test.com', to: 'x@test.com', text: 'Texto' });
    reply.mockResolvedValue({ sent: true });

    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /Assunto 3/i }));
    fireEvent.change(await screen.findByLabelText('Responder'), { target: { value: 'Minha resposta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));

    await waitFor(() => expect(reply).toHaveBeenCalledWith(3, expect.objectContaining({ text: 'Minha resposta' })));
  });

  test('estados de erro/loading', async () => {
    let release!: () => void;
    listInbox.mockImplementationOnce(() => new Promise((resolve) => { release = () => resolve([]); }));
    renderPage();
    expect(screen.getByText('Carregando dados...')).toBeInTheDocument();
    release();

    listInbox.mockRejectedValueOnce(new Error('erro'));
    renderPage();
    expect(await screen.findByText((content) => content.includes('Erro ao carregar inbox'))).toBeInTheDocument();
  });
});
