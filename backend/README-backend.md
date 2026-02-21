# Perícias Manager Pro — Backend

API NestJS multi-tenant com Prisma/PostgreSQL, BullMQ/Redis, autenticação JWT+RBAC e Swagger.

## Rodando

```bash
npm install
npm run prisma:generate
npm run start:dev
```

## Regras implementadas

- JWT Access/Refresh + RBAC via `JwtAuthGuard` e `RolesGuard`.
- Multi-tenant com `TenantInterceptor` + middleware Prisma.
- Audit trail de mutações com `AuditInterceptor` na tabela `LogStatus` (quando `periciaId` disponível).
- Rate limiting global 100 req/min e estrutura para endpoints de IA.
- Jobs BullMQ registrados: `pdf-generation`, `datajud-sync`, `charge-dispatch`.
