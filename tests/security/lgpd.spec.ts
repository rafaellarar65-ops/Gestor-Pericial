import { expect, test } from '@playwright/test';
import { authHeader, loginByApi } from '../utils/auth';

test.describe('Security LGPD - BLOCKER', () => {
  test('API não vaza dados de outro tenant', async ({ request }) => {
    const login = await loginByApi(
      request,
      process.env.E2E_USER_A_EMAIL ?? 'qa.usera@example.test',
      process.env.E2E_USER_A_PASSWORD ?? 'Str0ng!Pass123',
    );

    const response = await request.get('/api/pericias?tenant=other-tenant', {
      headers: authHeader(login.accessToken),
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect((body.items ?? []).length).toBe(0);
  });

  test('LogStatus não pode ser deletado via API', async ({ request }) => {
    const login = await loginByApi(
      request,
      process.env.E2E_USER_EMAIL ?? 'qa.admin@example.test',
      process.env.E2E_USER_PASSWORD ?? 'Str0ng!Pass123',
    );
    const response = await request.delete('/api/log-status/1', {
      headers: authHeader(login.accessToken),
    });
    expect([403, 405]).toContain(response.status());
  });

  test('upload exige autenticação (exceto mobile upload session)', async ({ request }) => {
    const uploadSemAuth = await request.post('/api/uploads', {
      multipart: { file: { name: 'teste.txt', mimeType: 'text/plain', buffer: Buffer.from('qa') } },
    });
    expect(uploadSemAuth.status()).toBe(401);

    const mobileSession = await request.post('/api/mobile/upload-session', {
      data: { deviceId: 'qa-device-1' },
    });
    expect([200, 201]).toContain(mobileSession.status());
  });
});
