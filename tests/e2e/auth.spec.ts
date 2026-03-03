import { expect, test } from '@playwright/test';
import { AuthPage } from '../pages/auth.page';
import { buildTestUser } from '../utils/test-data';

test.describe('E2E Auth', () => {
  test('login válido', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoLogin();
    await auth.login(process.env.E2E_USER_EMAIL ?? 'qa.admin@example.test', process.env.E2E_USER_PASSWORD ?? 'Str0ng!Pass123');
    await expect(page).toHaveURL(/\/$/);
  });

  test('login inválido bloqueia após 3 tentativas', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoLogin();
    for (let i = 0; i < 3; i += 1) {
      await auth.login('invalid@example.test', 'wrong-pass');
      await expect(page.getByText(/credenciais inválidas|inválido/i)).toBeVisible();
    }
    await expect(page.getByText(/conta bloqueada|muitas tentativas/i)).toBeVisible();
  });

  test('registro de novo usuário', async ({ page }) => {
    const user = buildTestUser();
    await page.goto('/register');
    await page.getByLabel(/nome/i).fill(user.name);
    await page.getByLabel(/email/i).fill(user.email);
    await page.getByLabel(/senha/i).fill(user.password);
    await page.getByRole('button', { name: /criar conta|registrar/i }).click();
    await expect(page).toHaveURL(/\/login|\/$/);
  });

  test('logout encerra sessão', async ({ page }) => {
    const auth = new AuthPage(page);
    await auth.gotoLogin();
    await auth.login(process.env.E2E_USER_EMAIL ?? 'qa.admin@example.test', process.env.E2E_USER_PASSWORD ?? 'Str0ng!Pass123');
    await auth.logout();
    await expect(page).toHaveURL(/\/login/);
  });

  test('refresh token mantém sessão ativa', async ({ page, request }) => {
    const loginResponse = await request.post('/api/auth/login', {
      data: {
        email: process.env.E2E_USER_EMAIL ?? 'qa.admin@example.test',
        password: process.env.E2E_USER_PASSWORD ?? 'Str0ng!Pass123',
      },
    });
    const login = await loginResponse.json();
    const refreshResponse = await request.post('/api/auth/refresh', {
      headers: { Authorization: `Bearer ${login.refreshToken}` },
    });
    expect(refreshResponse.ok()).toBeTruthy();
    const refreshBody = await refreshResponse.json();
    expect(refreshBody.accessToken).toBeTruthy();
  });

  test('rota protegida sem token redireciona para /login', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/pericias');
    await expect(page).toHaveURL(/\/login/);
  });
});
