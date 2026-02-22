import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const mainPages = [
  { name: 'Dashboard', path: '/' },
  { name: 'Lista Perícias', path: '/pericias' },
  { name: 'Detalhe Perícia', path: '/pericias/1' },
  { name: 'Financeiro', path: '/financeiro' },
  { name: 'Laudo', path: '/laudo-v2' },
  { name: 'Configurações', path: '/configuracoes' },
];

test.describe('Acessibilidade com axe-core', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL ?? 'qa.admin@example.test');
    await page.getByLabel(/senha/i).fill(process.env.E2E_USER_PASSWORD ?? 'Str0ng!Pass123');
    await page.getByRole('button', { name: /entrar/i }).click();
  });

  for (const route of mainPages) {
    test(`sem violações graves/críticas em ${route.name}`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page }).analyze();
      const blockerViolations = results.violations.filter((v) => ['critical', 'serious'].includes(v.impact ?? ''));

      expect(blockerViolations, `Violações críticas/graves em ${route.name}`).toEqual([]);
      test.info().annotations.push({
        type: 'axe-warnings',
        description: `Warnings documentáveis: ${results.violations.filter((v) => v.impact === 'moderate').length}`,
      });
    });
  }
});
