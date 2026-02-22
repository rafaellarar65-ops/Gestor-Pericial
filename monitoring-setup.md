# Monitoring Setup — Perícias Manager Pro

## 1) Sentry (frontend + backend)

### Frontend (Vercel + Vite)
1. Criar projeto no Sentry (JavaScript / React).
2. Definir `VITE_SENTRY_DSN` no ambiente da Vercel.
3. Inicializar SDK no bootstrap do app com release/tag de commit.
4. Habilitar source maps em produção.

### Backend (Railway + NestJS)
1. Criar projeto Sentry para backend Node/NestJS.
2. Definir `SENTRY_DSN` no Railway secrets.
3. Inicializar Sentry no `main.ts` e capturar exceptions globais.
4. Configurar ambiente (`production`) e `tracesSampleRate` ajustado.

## 2) Uptime Monitoring
- Ferramentas recomendadas: UptimeRobot, BetterStack ou Pingdom.
- Monitores mínimos:
  - `GET https://api.seudominio.com/health` (1 min)
  - `GET https://app.seudominio.com` (1 min)
- Alertas por email + Slack webhook.

## 3) Alertas de erro
- Sentry Alert Rules:
  - Trigger se `error count > threshold` em 5 min.
  - Trigger se nova regressão em ambiente `production`.
- Destinos:
  - Email do time
  - Canal Slack `#incidentes-pericias`

## 4) Métricas-chave (SLI/SLO)
- API p95 response time < 500ms.
- Error rate (5xx) < 1% por janela de 5 min.
- Disponibilidade mensal alvo: 99.9%.
- Taxa de falha de deploy < 5%.

## 5) Dashboard sugerido
Painel único (Grafana/Datadog/New Relic) com:
1. Requests/min e status code breakdown.
2. Latência p50/p95/p99.
3. Error rate e top endpoints com falha.
4. Uso de CPU/memória dos serviços Railway.
5. Eventos de deploy correlacionados com incidentes.

## 6) Compliance e segurança
- Todo tráfego externo com HTTPS/TLS.
- Dados sensíveis mascarados no log.
- Sem secrets em código; apenas variáveis de ambiente/secret manager.

## 7) Runbook de monitoração
1. Alerta acionou -> validar healthcheck.
2. Verificar Sentry para stack trace e impacto.
3. Conferir último deploy; executar rollback se necessário.
4. Abrir incidente se impacto ao cliente > 5 minutos.
