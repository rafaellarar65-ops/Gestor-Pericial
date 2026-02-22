import { expect, test } from '@playwright/test';
import { FinanceiroPage } from '../pages/financeiro.page';

test.describe('E2E Financeiro', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL ?? 'qa.admin@example.test');
    await page.getByLabel(/senha/i).fill(process.env.E2E_USER_PASSWORD ?? 'Str0ng!Pass123');
    await page.getByRole('button', { name: /entrar/i }).click();
  });

  test('criar recebimento manual', async ({ page }) => {
    const financeiro = new FinanceiroPage(page);
    await financeiro.goto();
    await financeiro.criarRecebimento('1500,00');
    await expect(page.getByText(/recebimento criado|sucesso/i)).toBeVisible();
  });

  test('import CSV financeiro e verificar saldo', async ({ page }) => {
    await page.goto('/financeiro');
    await page.getByRole('button', { name: /importar csv/i }).click();
    await page.setInputFiles('input[type="file"]', 'tests/fixtures/financeiro-valid.csv');
    await expect(page.getByText(/importação concluída/i)).toBeVisible();
    await expect(page.getByTestId('saldo-total')).toContainText(/R\$/);
  });

  test('conciliar pagamento e validar dashboard financeiro', async ({ page }) => {
    await page.goto('/financeiro');
    await page.getByRole('row', { name: /pendente/i }).first().getByRole('button', { name: /conciliar/i }).click();
    await expect(page.getByText(/conciliado com sucesso/i)).toBeVisible();

    await page.goto('/relatorios-financeiros');
    await expect(page.getByText(/taxa de conciliação|receita total/i)).toBeVisible();
  });
});
