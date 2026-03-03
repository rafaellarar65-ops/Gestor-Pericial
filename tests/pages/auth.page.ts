import { expect, Page } from '@playwright/test';

export class AuthPage {
  constructor(private readonly page: Page) {}

  async gotoLogin() {
    await this.page.goto('/login');
    await expect(this.page.getByTestId('email-input')).toBeVisible();
  }

  async login(email: string, password: string) {
    await this.page.getByTestId('email-input').fill(email);
    await this.page.getByTestId('password-input').fill(password);
    await this.page.getByTestId('login-button').click();
  }

  async logout() {
    await this.page.getByRole('button', { name: /perfil|conta|menu/i }).click();
    await this.page.getByRole('menuitem', { name: /sair/i }).click();
  }
}
