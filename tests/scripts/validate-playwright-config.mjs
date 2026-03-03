import { readFileSync } from 'node:fs';

const filePath = new URL('../playwright.config.ts', import.meta.url);
const configText = readFileSync(filePath, 'utf8');

const checks = [
  ["E2E_BASE_URL env var", /process\.env\.E2E_BASE_URL/],
  ["default localhost:3000", /http:\/\/localhost:3000/],
  ["trace on-first-retry", /trace:\s*'on-first-retry'/],
  ["screenshot only-on-failure", /screenshot:\s*'only-on-failure'/],
  ["Desktop Chrome project", /devices\['Desktop Chrome'\]/],
  ["iPhone 13 project", /devices\['iPhone 13'\]/],
];

const failed = checks.filter(([, pattern]) => !pattern.test(configText));

if (failed.length > 0) {
  console.error('Playwright config validation failed:');
  for (const [name] of failed) {
    console.error(`- Missing requirement: ${name}`);
  }
  process.exit(1);
}

console.log('Playwright config validation passed.');
