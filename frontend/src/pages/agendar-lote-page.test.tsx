import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import { appPaths } from '@/config/sidebar-config';
import AgendarLotePage from '@/pages/agendar-lote-page';

describe('AgendarLotePage', () => {
  test('redireciona para a rota única do wizard de agendamento', async () => {
    render(
      <MemoryRouter initialEntries={['/agendar-lote-legado']}>
        <Routes>
          <Route path="/agendar-lote-legado" element={<AgendarLotePage />} />
          <Route path={appPaths.agendar} element={<div>Wizard</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText('Wizard')).toBeInTheDocument();
  });
});
