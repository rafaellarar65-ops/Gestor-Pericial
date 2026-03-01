# Gestor Pericial - PRD (Product Requirements Document)

## Problema Original
O usuário solicitou montar o frontend do aplicativo "Gestor Pericial" na plataforma Emergent. O backend já estava publicado no Railway.

## Arquitetura

### Backend (Railway)
- **URL**: https://gestor-pericial-production.up.railway.app
- **Tech Stack**: NestJS + Prisma + PostgreSQL
- **Autenticação**: JWT (access token + refresh token)

### Frontend (Emergent)
- **URL**: https://8e73bda0-f74d-4d27-9923-cccb0661776f.preview.emergentagent.com
- **Tech Stack**: React 19 + Vite + TypeScript + TailwindCSS + Zustand
- **Porta**: 3000

### Proxy Local (Emergent)
- **Tech Stack**: FastAPI + httpx
- **Porta**: 8001
- **Função**: Proxy reverso para evitar problemas de CORS com o Railway backend

## User Personas
1. **Administrador**: Gerencia todo o sistema de perícias
2. **Perito**: Acessa agenda, laudos e perícias
3. **Assistente**: Gerencia tarefas operacionais

## Requisitos Core
- [x] Login/Autenticação
- [x] Dashboard com resumo operacional
- [x] Navegação completa no sidebar
- [x] Conexão com backend Railway

## O Que Foi Implementado
**Data**: 01/03/2026

1. **Frontend Setup**
   - Copiado código do repositório GitHub
   - Configurado Vite para ambiente Emergent
   - Instalado dependências via yarn

2. **Proxy Backend**
   - Criado FastAPI proxy em `/app/backend/server.py`
   - Todas requisições `/api/*` são redirecionadas para Railway

3. **Configurações**
   - `.env` com VITE_API_URL
   - `vite.config.ts` com proxy settings
   - `api-client.ts` modificado para usar path relativo

## Módulos do Sistema
- **Geral**: Dashboard, Perícias do Dia, Todas Perícias, Cidades
- **Operacional**: Nomeações, Tarefas, Fila de Agendamento, Teleperícias, Esclarecimentos, Agenda, Google Calendar
- **Central Técnica**: Elaboração de Laudos, Base de Conhecimento, Banco de Manobras
- **Financeiro**: Central de Cobrança, Importações, Análise Financeira, Analytics Calendar, Relatórios, Pagamentos
- **Suporte**: Documentação, Configurações

## Backlog (P0/P1/P2)

### P0 - Crítico (Resolvido)
- [x] Login funcionando
- [x] Conexão com backend
- [x] Navegação básica

### P1 - Importante
- [ ] Corrigir React re-render issue no Dashboard
- [ ] Tornar cards do dashboard clicáveis

### P2 - Nice to Have
- [ ] Melhorar performance geral
- [ ] Implementar cache local

## Credenciais de Teste
- **Email**: admin@gestor-pericial.com
- **Senha**: SenhaSegura123!

## Próximos Passos
1. Monitorar estabilidade do proxy
2. Considerar migração do proxy para Railway se necessário
3. Otimizar re-renders do React
