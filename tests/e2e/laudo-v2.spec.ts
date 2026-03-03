import { expect, test } from '@playwright/test';
import { LaudoV2Page } from '../pages/laudo-v2.page';

const validPdfFixture = 'tests/fixtures/laudo-transcricao-valid.pdf';
const invalidFixture = 'tests/fixtures/laudo-transcricao-invalid.txt';

test.describe('E2E Laudo V2 - transcrição de PDF', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL ?? 'qa.admin@example.test');
    await page.getByLabel(/senha/i).fill(process.env.E2E_USER_PASSWORD ?? 'Str0ng!Pass123');
    await page.getByRole('button', { name: /entrar/i }).click();
  });

  test('deve iniciar e concluir a transcrição com feedback visual', async ({ page }) => {
    await page.route('**/api/pericia/extract/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 400));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          dadosProcesso: { nomePericiado: 'João da Silva', numeroProcesso: '0001234-56.2026.8.26.0100' },
          manobrasFisicasIniciais: ['Lasegue positivo'],
        }),
      });
    });

    const laudo = new LaudoV2Page(page);
    await laudo.goto();
    await laudo.uploadPdf(validPdfFixture);
    await laudo.iniciarExtracao();

    await expect(laudo.transcriptionStatus).toHaveText(/transcrição em andamento/i);
    await expect(laudo.extractButton).toHaveText(/transcrevendo/i);

    await expect(laudo.transcriptionStatus).toHaveText(/transcrição concluída/i);
    await expect(laudo.transcriptionMessage).toHaveText(/transcrição finalizada com sucesso/i);
    await expect(laudo.nomePericiadoInput).toHaveValue('João da Silva');
  });

  test('deve exibir erro quando a transcrição falhar (arquivo inválido)', async ({ page }) => {
    await page.route('**/api/pericia/extract/**', async (route) => {
      await route.fulfill({
        status: 422,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Arquivo inválido. Envie um PDF válido.' }),
      });
    });

    const laudo = new LaudoV2Page(page);
    await laudo.goto();
    await laudo.uploadPdf(invalidFixture);
    await laudo.iniciarExtracao();

    await expect(laudo.transcriptionStatus).toHaveText(/falha na transcrição/i);
    await expect(laudo.transcriptionMessage).toHaveText(/não foi possível concluir a transcrição/i);
  });
});
