import { expect, Page } from '@playwright/test';

export class FinanceiroPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/financeiro');
    await expect(this.page.getByRole('heading', { name: /financeiro/i })).toBeVisible();
  }

  async criarRecebimento(valor: string) {
    await this.page.getByRole('button', { name: /novo recebimento/i }).click();
    await this.page.getByLabel(/valor/i).fill(valor);
    await this.page.getByRole('button', { name: /salvar/i }).click();
  }
}
