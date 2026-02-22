import { expect, Page } from '@playwright/test';

export class AgendaPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/agenda');
    await expect(this.page.getByRole('heading', { name: /agenda/i })).toBeVisible();
  }

  async criarEvento(titulo: string) {
    await this.page.getByRole('button', { name: /novo evento/i }).click();
    await this.page.getByLabel(/título|titulo/i).fill(titulo);
    await this.page.getByRole('button', { name: /salvar/i }).click();
  }
}
