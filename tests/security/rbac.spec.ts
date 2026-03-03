import { expect, test } from '@playwright/test';
import { authHeader, loginByApi } from '../utils/auth';

test.describe('Security RBAC - BLOCKER', () => {
  test('ASSISTANT não acessa /laudos', async ({ request, page }) => {
    const login = await loginByApi(
      request,
      process.env.E2E_ASSISTANT_EMAIL ?? 'qa.assistant@example.test',
      process.env.E2E_ASSISTANT_PASSWORD ?? 'Str0ng!Pass123',
    );
    await page.context().addCookies([
      { name: 'accessToken', value: login.accessToken, domain: 'localhost', path: '/' },
    ]);
    await page.goto('/laudos-pendentes');
    await expect(page).toHaveURL(/\/403|\/unauthorized|\/$/);
  });

  test('usuário A não acessa perícia do usuário B (404)', async ({ request }) => {
    const loginA = await loginByApi(
      request,
      process.env.E2E_USER_A_EMAIL ?? 'qa.usera@example.test',
      process.env.E2E_USER_A_PASSWORD ?? 'Str0ng!Pass123',
    );
    const periciaIdUserB = process.env.E2E_USER_B_PERICIA_ID ?? 'pericia-user-b-id';
    const response = await request.get(`/api/pericias/${periciaIdUserB}`, {
      headers: authHeader(loginA.accessToken),
    });
    expect(response.status()).toBe(404);
  });

  test('API sem token retorna 401', async ({ request }) => {
    const response = await request.get('/api/pericias');
    expect(response.status()).toBe(401);
  });

  test('token expirado retorna 401', async ({ request }) => {
    const expiredToken = 'expired.jwt.token';
    const response = await request.get('/api/pericias', {
      headers: authHeader(expiredToken),
    });
    expect(response.status()).toBe(401);
  });
});
