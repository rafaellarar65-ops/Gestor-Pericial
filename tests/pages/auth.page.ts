import { expect, Page } from '@playwright/test';

export class AuthPage {
  constructor(private readonly page: Page) {}

  async gotoLogin() {
    await this.page.goto('/login');
    await expect(this.page.getByRole('heading', { name: /entrar/i })).toBeVisible();
  }

  async login(email: string, password: string) {
    await this.page.getByLabel(/email/i).fill(email);
    await this.page.getByLabel(/senha/i).fill(password);
    await this.page.getByRole('button', { name: /entrar/i }).click();
  }

  async logout() {
    await this.page.getByRole('button', { name: /perfil|conta|menu/i }).click();
    await this.page.getByRole('menuitem', { name: /sair/i }).click();
  }
}
