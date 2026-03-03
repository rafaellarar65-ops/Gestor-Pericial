import { expect, test } from '@playwright/test';
import { PericiasPage } from '../pages/pericias.page';
import { defaultPericia } from '../utils/test-data';

test.describe('E2E Perícias', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL ?? 'qa.admin@example.test');
    await page.getByLabel(/senha/i).fill(process.env.E2E_USER_PASSWORD ?? 'Str0ng!Pass123');
    await page.getByRole('button', { name: /entrar/i }).click();
  });

  test('criar perícia completa e editar', async ({ page }) => {
    const pericias = new PericiasPage(page);
    const pericia = defaultPericia();
    await pericias.goto();
    await pericias.create(pericia);

    await page.getByRole('row', { name: new RegExp(pericia.numeroCNJ) }).getByRole('button', { name: /editar/i }).click();
    await page.getByLabel(/cidade/i).fill('Campinas');
    await page.getByRole('button', { name: /salvar/i }).click();
    await expect(page.getByRole('row', { name: /campinas/i })).toBeVisible();
  });

  test('mudar status registra log de auditoria', async ({ page }) => {
    await page.goto('/pericias');
    await page.getByRole('button', { name: /detalhes/i }).first().click();
    await page.getByLabel(/status/i).selectOption({ label: 'Concluída' });
    await page.getByRole('button', { name: /salvar/i }).click();
    await expect(page.getByText(/status alterado|log de status/i)).toBeVisible();
  });

  test('filtrar por cidade + status e buscar por CNJ', async ({ page }) => {
    const cnj = (process.env.E2E_SEARCH_CNJ ?? '500') as string;
    await page.goto('/pericias');
    await page.getByLabel(/cidade/i).fill('São Paulo');
    await page.getByLabel(/status/i).selectOption({ label: 'Em andamento' });
    await page.getByRole('button', { name: /aplicar filtros|filtrar/i }).click();
    await page.getByPlaceholder(/buscar cnj/i).fill(cnj);
    await expect(page.getByRole('table')).toContainText(cnj);
  });

  test('import CSV happy path e arquivo inválido', async ({ page }) => {
    await page.goto('/pericias');
    await page.getByRole('button', { name: /importar csv/i }).click();
    await page.setInputFiles('input[type="file"]', 'tests/fixtures/pericias-valid.csv');
    await expect(page.getByText(/importação concluída|sucesso/i)).toBeVisible();

    await page.getByRole('button', { name: /importar csv/i }).click();
    await page.setInputFiles('input[type="file"]', 'tests/fixtures/pericias-invalid.csv');
    await expect(page.getByText(/arquivo inválido|erro de validação/i)).toBeVisible();
  });

  test('batch delete remove múltiplas perícias', async ({ page }) => {
    await page.goto('/pericias');
    await page.getByRole('checkbox', { name: /selecionar perícia/i }).nth(0).check();
    await page.getByRole('checkbox', { name: /selecionar perícia/i }).nth(1).check();
    await page.getByRole('button', { name: /excluir selecionadas|batch delete/i }).click();
    await page.getByRole('button', { name: /confirmar/i }).click();
    await expect(page.getByText(/2 perícias excluídas|itens removidos/i)).toBeVisible();
  });
});
