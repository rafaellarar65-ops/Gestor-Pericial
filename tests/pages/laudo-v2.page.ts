import { expect, Locator, Page } from '@playwright/test';

export class LaudoV2Page {
  readonly pdfInput: Locator;
  readonly extractButton: Locator;
  readonly transcriptionStatus: Locator;
  readonly transcriptionMessage: Locator;
  readonly nomePericiadoInput: Locator;

  constructor(private readonly page: Page) {
    this.pdfInput = page.getByTestId('laudo-pdf-input');
    this.extractButton = page.getByRole('button', { name: /extrair processo|transcrevendo/i });
    this.transcriptionStatus = page.getByTestId('transcription-status');
    this.transcriptionMessage = page.getByTestId('transcription-message');
    this.nomePericiadoInput = page.getByPlaceholder(/nome do periciado/i);
  }

  async goto(periciaId = 'pericia-e2e') {
    await this.page.goto(`/laudo-inteligente/${periciaId}`);
    await expect(this.page.getByRole('heading', { name: /laudo inteligente/i })).toBeVisible();
  }

  async uploadPdf(fixturePath: string) {
    await this.pdfInput.setInputFiles(fixturePath);
  }

  async iniciarExtracao() {
    await this.extractButton.click();
  }
}
