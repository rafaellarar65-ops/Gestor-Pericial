import { expect, Page } from '@playwright/test';

export class AgendaPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/agenda');
    await expect(this.page.getByRole('heading', { name: /agenda/i })).toBeVisible();
  }

  private newEventButton() {
    return this.page.getByTestId('agenda-new-event').or(this.page.getByRole('button', { name: /novo evento/i }));
  }

  private saveButton() {
    return this.page.getByTestId('agenda-save-event').or(this.page.getByRole('button', { name: /^salvar$/i }));
  }

  async criarEvento(titulo: string) {
    await this.newEventButton().first().click();
    await this.page.getByLabel(/título|titulo/i).fill(titulo);
    await this.saveButton().first().click();
  }
}
