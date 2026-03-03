import { expect, test } from '@playwright/test';
import { LaudoPage } from '../pages/laudo.page';

test.describe('E2E Laudo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL ?? 'qa.admin@example.test');
    await page.getByLabel(/senha/i).fill(process.env.E2E_USER_PASSWORD ?? 'Str0ng!Pass123');
    await page.getByRole('button', { name: /entrar/i }).click();
  });

  test('abrir editor, preencher seção e autosave', async ({ page }) => {
    const laudo = new LaudoPage(page);
    await laudo.gotoEditor();
    await laudo.preencherSecao('História Clínica', 'Paciente refere dor lombar de longa data.');
    await expect(page.getByText(/salvo automaticamente|autosave/i)).toBeVisible();

    await page.reload();
    await expect(page.getByRole('textbox').first()).toContainText('dor lombar de longa data');
  });

  test('registrar exame físico e rodar coherence check', async ({ page }) => {
    const laudo = new LaudoPage(page);
    await laudo.gotoEditor();
    await laudo.preencherSecao('Exame Físico', 'Força muscular preservada e sem déficit sensitivo.');
    await page.getByRole('button', { name: /coherence check|verificar coerência/i }).click();
    await expect(page.getByText(/coerente|inconsistências/i)).toBeVisible();
  });
});
