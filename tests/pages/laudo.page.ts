import { expect, Page } from '@playwright/test';

export class LaudoPage {
  constructor(private readonly page: Page) {}

  async gotoEditor() {
    await this.page.goto('/laudo-v2');
    await expect(this.page.getByRole('heading', { name: /laudo/i })).toBeVisible();
  }

  async preencherSecao(nomeSecao: string, texto: string) {
    await this.page.getByRole('button', { name: new RegExp(nomeSecao, 'i') }).click();
    await this.page.getByRole('textbox').first().fill(texto);
  }
}
