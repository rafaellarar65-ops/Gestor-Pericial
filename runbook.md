# Runbook Operacional — Perícias Manager Pro

## 1) Deploy manual
1. Garanta que `main` está verde no CI.
2. Faça deploy do frontend:
   - `cd frontend`
   - `vercel pull --yes --environment=production`
   - `vercel build --prod`
   - `vercel deploy --prebuilt --prod`
3. Faça deploy do backend:
   - `railway up --service <service-name> --detach`
4. Rode migrations:
   - `cd backend`
   - `npx prisma migrate deploy --schema prisma/schema.prisma`
5. Valide saúde:
   - `curl -fsSL https://api.seudominio.com/health`

## 2) Rollback
### Frontend (Vercel)
- Use o dashboard da Vercel e promova o deployment anterior saudável.

### Backend (Railway)
- No Railway, selecione o deployment anterior estável e execute rollback/redeploy.
- Alternativa CLI: `railway redeploy --service <service-name> --deployment <previous-deployment-id>`.

## 3) Escalonamento
- **Se indisponibilidade > 10 min**: acionar on-call e líder técnico.
- **Se erro de dados ou LGPD**: acionar segurança/compliance imediatamente.
- **Se erro de pagamentos/financeiro**: priorizar severidade alta.

## 4) Logs e diagnóstico
- Backend: Railway logs por serviço/ambiente.
- Frontend: Vercel function/build logs.
- Erros aplicacionais: Sentry (frontend + backend).

Checklist rápido:
1. Confirmar status do healthcheck.
2. Conferir taxa de erro (5xx) e p95.
3. Correlacionar erro com último deploy.

## 5) Banco de dados
- Conexão (somente por canal TLS):
  - `psql "$DATABASE_URL" "sslmode=require"`
- Verificar migrations aplicadas:
  - `npx prisma migrate status --schema backend/prisma/schema.prisma`

## 6) Rodar migration com segurança
1. Rodar `prisma migrate deploy` em janela controlada.
2. Confirmar locks longos no Postgres.
3. Validar endpoints críticos após migration.

## 7) Backup e restauração (Supabase)
- Backups automáticos já providos no plano gerenciado.
- Para restaurar:
  1. Abrir painel Supabase > Database > Backups.
  2. Selecionar snapshot (RPO requerido).
  3. Restaurar para instância temporária.
  4. Validar integridade.
  5. Promover restauração conforme plano de change.

## 8) Resposta a incidentes
1. Abrir incidente com severidade (SEV1/SEV2/SEV3).
2. Nomear Incident Commander.
3. Estabilizar serviço (rollback ou feature-flag off).
4. Comunicar stakeholders (Slack + status page).
5. Pós-mortem em até 48h com ações preventivas.

## 9) Segurança operacional
- TLS obrigatório em todas as conexões externas.
- Nunca commitar secrets: usar Vercel/Railway/Supabase secrets.
- Rotacionar `JWT_SECRET` e tokens de integração periodicamente.
