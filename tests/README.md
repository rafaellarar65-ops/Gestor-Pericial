# Estratégia de execução E2E (Playwright)

## Base URL oficial
- O endpoint padrão para E2E é `http://localhost:3000`.
- Para ambientes diferentes (staging/review app), use a variável `E2E_BASE_URL`.

```bash
E2E_BASE_URL=https://<ambiente> npx playwright test --config tests/playwright.config.ts
```

## Políticas de artefatos
- `trace: on-first-retry`
- `screenshot: only-on-failure`
- `video: retain-on-failure`

## Matriz oficial de projetos
- `desktop-chrome` (Desktop Chrome)
- `iphone-13` (emulação iPhone 13)

A matriz acima é mandatória para cobrir o alvo principal desktop e o cenário mobile iOS.

## Execução local
```bash
# 1) subir frontend na porta padrão do Vite deste projeto
cd frontend && npm run dev

# 2) em outro terminal, executar os testes
cd ..
E2E_BASE_URL=http://localhost:3000 npx playwright test --config tests/playwright.config.ts
```
