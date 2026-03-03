import { expect, Locator, Page } from '@playwright/test';

export class BatchSchedulingWizardPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/agendar');
    await expect(this.page.getByRole('heading', { name: /agendar em lote|central de agendamento/i })).toBeVisible();
  }

  private stepRoot(step: 'select' | 'schedule' | 'review' | 'confirm'): Locator {
    return this.page
      .getByTestId(`step-${step}`)
      .or(this.page.locator(`[data-testid="step-${step}"]`));
  }

  async selectPericiasByCity(city: string, expectedCount: number) {
    const cityCard = this.page
      .getByRole('button', { name: new RegExp(city, 'i') })
      .or(this.page.locator(`[data-testid="city-group-${city.toLowerCase().replace(/\s+/g, '-')}"]`));
    await cityCard.first().click();

    const selectedCounter = this.page
      .getByText(new RegExp(`${expectedCount} perícia`, 'i'))
      .or(this.page.getByText(new RegExp(`preparação \(${expectedCount}\)`, 'i')));
    await expect(selectedCounter.first()).toBeVisible();
  }

  async continueToSchedule() {
    await this.page
      .getByRole('button', { name: /continuar para etapa 2|adicionar cidades selecionadas|próximo|proximo/i })
      .first()
      .click();
    await expect(this.stepRoot('schedule').or(this.page.getByText(/etapa 2|data\/horário/i)).first()).toBeVisible();
  }

  async fillSequentialSchedule(params: { date: string; startTime: string; durationMinutes?: number; intervalMinutes?: number }) {
    await this.page.getByLabel(/data/i).first().fill(params.date);
    await this.page.getByLabel(/horário inicial|hora|inicio/i).first().fill(params.startTime);

    if (params.durationMinutes !== undefined) {
      await this.page.getByLabel(/duração|duracao/i).first().fill(String(params.durationMinutes));
    }

    if (params.intervalMinutes !== undefined) {
      await this.page.getByLabel(/intervalo/i).first().fill(String(params.intervalMinutes));
    }
  }

  async continueToPreview() {
    await this.page.getByRole('button', { name: /continuar para etapa 3|próximo|proximo/i }).first().click();
    await expect(this.stepRoot('review').or(this.page.getByText(/etapa 3|revisão|preview/i)).first()).toBeVisible();
  }

  async validatePreviewItem(data: { cnj: string; oldDate: string; newDate: string; status: string }) {
    const row = this.page.getByRole('row', { name: new RegExp(data.cnj) }).first();
    await expect(row).toContainText(new RegExp(data.cnj));
    await expect(row.or(this.page.locator('body'))).toContainText(new RegExp(`${data.oldDate}.*${data.newDate}|${data.newDate}`, 'i'));
    await expect(row.or(this.page.locator('body'))).toContainText(new RegExp(data.status, 'i'));
  }

  async continueToConfirmation() {
    await this.page.getByRole('button', { name: /continuar para etapa 4|continuar/i }).first().click();
    await expect(this.stepRoot('confirm').or(this.page.getByText(/etapa 4|confirmação/i)).first()).toBeVisible();
  }

  async confirmAndApply() {
    await this.page.getByRole('button', { name: /confirmar e persistir lote|confirmar lote|finalizar/i }).first().click();
  }
}
