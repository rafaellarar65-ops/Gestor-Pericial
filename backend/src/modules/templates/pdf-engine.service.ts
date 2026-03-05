import { Injectable, Logger } from '@nestjs/common';

export interface PdfRenderOptions {
  html: string;
  filename?: string;
  format?: 'A4' | 'Letter';
  margin?: { top?: string; right?: string; bottom?: string; left?: string };
}

export interface PdfResult {
  buffer: Buffer;
  filename: string;
  size: number;
}

@Injectable()
export class PdfEngineService {
  private readonly logger = new Logger(PdfEngineService.name);

  async render(options: PdfRenderOptions): Promise<PdfResult> {
    const filename = options.filename ?? `document-${Date.now()}.pdf`;
    try {
      // Dynamic import to avoid startup cost and allow optional puppeteer-core
      const puppeteer = await import('puppeteer-core').catch(() => null);
      if (!puppeteer) {
        this.logger.warn('puppeteer-core not available, returning placeholder PDF');
        const placeholder = Buffer.from(`%PDF-1.4 placeholder for: ${filename}`);
        return { buffer: placeholder, filename, size: placeholder.length };
      }

      const executablePath =
        process.env.PUPPETEER_EXECUTABLE_PATH ??
        '/usr/bin/chromium-browser';

      const browser = await puppeteer.default.launch({
        executablePath,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        headless: true,
      });

      try {
        const page = await browser.newPage();
        await page.setContent(options.html, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({
          format: options.format ?? 'A4',
          margin: options.margin ?? { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
          printBackground: true,
        });
        const buffer = Buffer.from(pdfBuffer);
        return { buffer, filename, size: buffer.length };
      } finally {
        await browser.close();
      }
    } catch (err) {
      this.logger.error('PDF render error', err);
      throw err;
    }
  }
}
