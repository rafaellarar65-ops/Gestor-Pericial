import { expect, test } from '@playwright/test';
import { BatchSchedulingWizardPage } from '../pages/batch-scheduling-wizard.page';

type Pericia = {
  id: string;
  processoCNJ: string;
  cidade: string;
  status: string;
  dataAnterior: string;
  dataNova?: string;
};

const createPericias = (): Pericia[] =>
  Array.from({ length: 5 }, (_, index) => ({
    id: `pericia-${index + 1}`,
    processoCNJ: `500000${index + 1}-12.2026.8.26.0100`,
    cidade: 'São Paulo',
    status: 'AGUARDANDO_AGENDAMENTO',
    dataAnterior: `2026-05-1${index}T08:00:00.000Z`,
  }));

const addHours = (isoDate: string, hours: number): string => {
  const date = new Date(isoDate);
  date.setHours(date.getHours() + hours);
  return date.toISOString();
};

test.describe('E2E Batch Scheduling Wizard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(process.env.E2E_USER_EMAIL ?? 'qa.admin@example.test');
    await page.getByLabel(/senha/i).fill(process.env.E2E_USER_PASSWORD ?? 'Str0ng!Pass123');
    await page.getByRole('button', { name: /entrar/i }).click();
  });

  test('seleciona 5 perícias da mesma cidade, valida preview, confirma e aplica', async ({ page }) => {
    const wizard = new BatchSchedulingWizardPage(page);
    const pericias = createPericias();
    const agendaEventos: Array<{ periciaId: string; startAt: string }> = [];
    const tarefas48h: Array<{ periciaId: string; dueAt: string }> = [];

    await page.route('**/api/agenda/batch-scheduling', async (route) => {
      const payload = route.request().postDataJSON() as { items: Array<{ periciaId: string; startAt: string }> };

      payload.items.forEach((item) => {
        const pericia = pericias.find((p) => p.id === item.periciaId);
        if (!pericia) return;

        pericia.dataNova = item.startAt;
        pericia.status = 'AGENDADA';
        agendaEventos.push({ periciaId: item.periciaId, startAt: item.startAt });
        tarefas48h.push({ periciaId: item.periciaId, dueAt: addHours(item.startAt, -48) });
      });

      await route.fulfill({ status: 200, body: JSON.stringify({ created: payload.items.length }) });
    });

    await wizard.goto();
    await wizard.selectPericiasByCity('São Paulo', 5);
    await wizard.continueToSchedule();
    await wizard.fillSequentialSchedule({
      date: '2026-05-20',
      startTime: '08:00',
      durationMinutes: 60,
      intervalMinutes: 0,
    });
    await wizard.continueToPreview();

    await wizard.validatePreviewItem({
      cnj: pericias[0].processoCNJ,
      oldDate: '19/05/2026',
      newDate: '20/05/2026',
      status: 'Agendada',
    });

    await wizard.continueToConfirmation();
    await wizard.confirmAndApply();

    await expect.poll(() => agendaEventos.length).toBe(5);
    await expect(pericias.every((item) => item.status === 'AGENDADA')).toBeTruthy();
    await expect(tarefas48h).toHaveLength(5);
  });

  test('rollback total quando ocorre conflito/erro no agendamento em lote', async ({ page }) => {
    const wizard = new BatchSchedulingWizardPage(page);
    const pericias = createPericias();
    const agendaEventos: Array<{ periciaId: string; startAt: string }> = [];
    const tarefas48h: Array<{ periciaId: string; dueAt: string }> = [];

    await page.route('**/api/agenda/batch-scheduling', async (route) => {
      await route.fulfill({
        status: 409,
        body: JSON.stringify({ message: 'Conflito de horário identificado para uma das perícias.' }),
      });
    });

    await wizard.goto();
    await wizard.selectPericiasByCity('São Paulo', 5);
    await wizard.continueToSchedule();
    await wizard.fillSequentialSchedule({
      date: '2026-05-20',
      startTime: '08:00',
      durationMinutes: 60,
      intervalMinutes: 0,
    });
    await wizard.continueToPreview();
    await wizard.continueToConfirmation();
    await wizard.confirmAndApply();

    await expect(page.getByText(/conflito|não foi possível|erro/i)).toBeVisible();
    await expect(agendaEventos).toHaveLength(0);
    await expect(tarefas48h).toHaveLength(0);
    await expect(pericias.every((item) => item.status === 'AGUARDANDO_AGENDAMENTO')).toBeTruthy();
  });
});
