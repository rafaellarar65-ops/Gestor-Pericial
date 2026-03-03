import { expect, Page } from '@playwright/test';

type PericiaData = {
  numeroCNJ: string;
  cidade: string;
  status: string;
  especialidade: string;
  parteAutora: string;
  parteRe: string;
};

export class PericiasPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/pericias');
    await expect(this.page.getByRole('heading', { name: /perícias/i })).toBeVisible();
  }

  private createButton() {
    return this.page.getByTestId('pericia-create').or(this.page.getByRole('button', { name: /nova perícia|criar perícia/i }));
  }

  private saveButton() {
    return this.page.getByTestId('pericia-save').or(this.page.getByRole('button', { name: /^salvar$/i }));
  }

  async create(pericia: PericiaData) {
    await this.createButton().first().click();
    await this.page.getByLabel(/cnj/i).fill(pericia.numeroCNJ);
    await this.page.getByLabel(/cidade/i).fill(pericia.cidade);
    await this.page.getByLabel(/status/i).selectOption({ label: pericia.status });
    await this.page.getByLabel(/especialidade/i).fill(pericia.especialidade);
    await this.page.getByLabel(/parte autora/i).fill(pericia.parteAutora);
    await this.page.getByLabel(/parte ré|parte re/i).fill(pericia.parteRe);
    await this.saveButton().first().click();
    await expect(this.page.getByText(pericia.numeroCNJ)).toBeVisible();
  }
}
