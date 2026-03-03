import { expect, test } from '@playwright/test';
import { AgendaPage } from '../pages/agenda.page';
import { uid } from '../utils/test-data';

test.describe('E2E Agenda', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL ?? 'qa.admin@example.test');
    await page.getByLabel(/senha/i).fill(process.env.E2E_USER_PASSWORD ?? 'Str0ng!Pass123');
    await page.getByRole('button', { name: /entrar/i }).click();
  });

  test('criar evento e cancelar', async ({ page }) => {
    const agenda = new AgendaPage(page);
    const titulo = uid('evento');
    await agenda.goto();
    await agenda.criarEvento(titulo);
    await expect(page.getByText(titulo)).toBeVisible();

    await page.getByRole('row', { name: titulo }).getByRole('button', { name: /cancelar/i }).click();
    await expect(page.getByText(/evento cancelado/i)).toBeVisible();
  });

  test('agendamento em lote wizard 3 steps e conflito de horário', async ({ page }) => {
    await page.goto('/agendar');
    await page.getByRole('heading', { name: /agendar em lote/i }).isVisible();

    await page.getByRole('button', { name: /próximo|proximo/i }).click();
    await page.getByRole('button', { name: /próximo|proximo/i }).click();
    await page.getByRole('button', { name: /finalizar/i }).click();
    await expect(page.getByText(/agendamento concluído/i)).toBeVisible();

    await page.goto('/agenda');
    await page.getByRole('button', { name: /novo evento/i }).click();
    await page.getByLabel(/início|inicio/i).fill('2026-05-12T09:00');
    await page.getByLabel(/fim/i).fill('2026-05-12T10:00');
    await page.getByRole('button', { name: /salvar/i }).click();
    await expect(page.getByText(/conflito de horário|indisponível/i)).toBeVisible();
  });
});
