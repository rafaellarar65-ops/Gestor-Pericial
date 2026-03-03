# Pipeline de Deploy/Release — Backend

## Ordem recomendada
1. **Migration/Release job**
   - Executar: `npm --prefix backend run prisma:migrate:deploy`
   - Objetivo: aplicar migrations antes de publicar a nova versão web.
2. **Deploy Web job**
   - Runtime: `node dist/main.js`
   - Objetivo: subir apenas a API, sem rodar migration no startup.
3. **Pós-deploy/validação**
   - Verificar healthcheck: `GET /health`.
   - Validar endpoints críticos.

## Render (Blueprint)
- `buildCommand`: build da aplicação
- `preDeployCommand`: migration/release
- `startCommand`: subida da API

## Critérios operacionais
- Em caso de falha no migration job, **não** continuar para deploy web.
- Em caso de falha no deploy web, avaliar rollback para deployment anterior estável.
