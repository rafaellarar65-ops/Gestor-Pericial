# Guia Completo de Deploy - Gestor Pericial

## Arquitetura do Sistema

```
Frontend (React/Vite)  -->  Backend (NestJS)  -->  PostgreSQL (Supabase)
   Vercel/Netlify           Railway                Supabase
```

| Componente | Tecnologia | Hospedagem Recomendada |
|-----------|-----------|----------------------|
| Frontend | React 19 + Vite + TailwindCSS | Vercel (gratis) |
| Backend/API | NestJS 10 + Prisma ORM | Railway ($5/mes) |
| Banco de Dados | PostgreSQL 15+ | Supabase (gratis) |
| Cache (opcional) | Redis 7 | Railway ou Upstash |
| Storage (opcional) | S3-compatible | Supabase Storage |

---

## Parte 1 - Configurar o Supabase (Banco de Dados)

### 1.1 Criar conta e projeto

1. Acesse [https://supabase.com](https://supabase.com) e crie uma conta
2. Clique em **New Project**
3. Preencha:
   - **Name**: `gestor-pericial`
   - **Database Password**: gere uma senha forte e **anote-a**
   - **Region**: escolha a mais proxima (ex: `South America (Sao Paulo)`)
4. Clique em **Create new project** e aguarde

### 1.2 Obter as Connection Strings

Voce vai precisar de **2 URLs de conexao** diferentes. No painel do Supabase, va em **Settings** > **Database**.

#### URL 1: Pooler (para a aplicacao)
1. Na secao **Connection string**, selecione **Transaction** (pooler)
2. Copie a string. Formato:
   ```
   postgresql://postgres.[REF]:[SUA-SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
   ```
3. **Adicione no final**: `?pgbouncer=true&sslmode=require`
4. Resultado final para `DATABASE_URL`:
   ```
   postgresql://postgres.[REF]:[SUA-SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
   ```

#### URL 2: Direta (para migrations)
1. Na mesma pagina, selecione **Session** ou copie a **Direct connection**
2. O host sera `db.[REF].supabase.co` na porta `5432`
3. **Adicione no final**: `?sslmode=require`
4. Resultado final para `DIRECT_DATABASE_URL`:
   ```
   postgresql://postgres.[REF]:[SUA-SENHA]@db.[REF].supabase.co:5432/postgres?sslmode=require
   ```

> **Por que 2 URLs?** O pooler (PgBouncer) e otimizado para muitas conexoes simultaneas, mas nao suporta migrations. A conexao direta suporta migrations mas tem limite de conexoes. O Prisma usa cada uma automaticamente no momento certo.

### 1.3 Obter as chaves do Supabase

1. Va em **Settings** > **API**
2. Copie:
   - **Project URL**: sera o `SUPABASE_URL`
   - **anon public key**: sera o `VITE_SUPABASE_ANON_KEY`
   - **service_role key**: sera o `SUPABASE_KEY` (nunca exponha no frontend!)

### 1.4 Criar o bucket de storage (opcional)

1. Va em **Storage** no menu lateral
2. Clique em **New bucket**
3. Nome: `documents`
4. Desmarque "Public bucket" (mantenha privado)
5. Clique em **Create bucket**

---

## Parte 2 - Deploy do Backend no Railway

### 2.1 Criar conta no Railway

1. Acesse [https://railway.app](https://railway.app)
2. Faca login com GitHub
3. No plano gratuito (Trial), voce tem $5 de creditos. Para uso real, assine o plano Hobby ($5/mes)

### 2.2 Criar o projeto

1. Clique em **New Project** > **Deploy from GitHub repo**
2. Selecione o repositorio `Gestor-Pericial`
3. Railway vai detectar o `Dockerfile.backend` automaticamente via `railway.toml`

### 2.3 Configurar variaveis de ambiente

No painel do Railway, va em **Variables** e adicione:

```env
# Obrigatorias — Banco de Dados
DATABASE_URL=postgresql://postgres.[REF]:[SENHA]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require
DIRECT_DATABASE_URL=postgresql://postgres.[REF]:[SENHA]@db.[REF].supabase.co:5432/postgres?sslmode=require

# Obrigatorias — Autenticacao
NODE_ENV=production
PORT=3000
JWT_SECRET=<cole aqui o resultado de: openssl rand -base64 32>
JWT_REFRESH_SECRET=<cole aqui o resultado de: openssl rand -base64 32>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Admin (primeiro usuario - criado automaticamente no startup)
ADMIN_EMAIL=seu-email@exemplo.com
ADMIN_PASSWORD=SuaSenhaSegura123!
ADMIN_NAME=Seu Nome
TENANT_NAME=Seu Consultorio

# CORS - URL do frontend (sera preenchida apos deploy do frontend)
FRONTEND_URL=https://gestor-pericial.vercel.app

# Opcionais — Supabase Storage
SUPABASE_URL=https://[REF].supabase.co
SUPABASE_KEY=eyJ...service-role-key...
SUPABASE_BUCKET=documents
GEMINI_API_KEY=sua-chave-gemini
```

> **ATENCAO — Erros comuns:**
> 1. **JWT_SECRET**: NAO cole o texto `<gere-com: openssl rand -base64 32>` literalmente. Execute o comando `openssl rand -base64 32` no seu terminal e cole o **resultado** (ex: `a8Kp2x...`).
> 2. **DATABASE_URL**: DEVE terminar com `?pgbouncer=true&sslmode=require`. Sem isso, o Supabase rejeita a conexao.
> 3. **DIRECT_DATABASE_URL**: O host e `db.[REF].supabase.co` (nao `pooler.supabase.com`). DEVE terminar com `?sslmode=require`.
> 4. **REDIS_URL**: NAO adicione essa variavel a menos que tenha um Redis configurado (ex: Upstash). Sem Redis, o sistema funciona normalmente — apenas filas em background ficam desabilitadas.
> 5. **VITE_API_URL**: Essa variavel vai na **Vercel** (frontend), NAO no Railway.

**Para gerar os secrets JWT**, execute no terminal:
```bash
openssl rand -base64 32
```
Execute **duas vezes** — uma para `JWT_SECRET` e outra para `JWT_REFRESH_SECRET`.

### 2.4 Gerar o dominio publico

1. No Railway, va em **Settings** > **Networking**
2. Clique em **Generate Domain**
3. Anote a URL gerada (ex: `gestor-pericial-api-production.up.railway.app`)
4. Essa sera a `VITE_API_URL` do frontend

### 2.5 Primeira execucao

O deploy vai:
1. Buildar o Docker image (`Dockerfile.backend`)
2. Rodar as migrations automaticamente (`prisma migrate deploy`)
3. Iniciar o servidor NestJS
4. O bootstrap do `main.ts` vai criar o tenant e usuario admin automaticamente

### 2.6 Verificar o deploy

Acesse no navegador:
```
https://[seu-dominio-railway]/health
```

Deve retornar:
```json
{"status":"ok","service":"pericias-manager-pro-backend","timestamp":"..."}
```

A documentacao Swagger esta disponivel em:
```
https://[seu-dominio-railway]/docs
```

---

## Parte 3 - Deploy do Frontend na Vercel

### 3.1 Criar conta na Vercel

1. Acesse [https://vercel.com](https://vercel.com)
2. Faca login com GitHub

### 3.2 Importar o projeto

1. Clique em **Add New** > **Project**
2. Selecione o repositorio `Gestor-Pericial`
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 3.3 Configurar variaveis de ambiente

Na tela de configuracao, adicione:

```env
VITE_API_URL=https://[seu-dominio-railway]
VITE_SUPABASE_URL=https://[REF].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...anon-key...
```

### 3.4 Fazer o deploy

1. Clique em **Deploy**
2. Aguarde o build completar
3. Anote a URL gerada (ex: `gestor-pericial.vercel.app`)

### 3.5 Atualizar CORS no Railway

Volte ao Railway e atualize a variavel:
```
FRONTEND_URL=https://gestor-pericial.vercel.app
```

Se voce tiver multiplos dominios (preview, custom domain), separe por virgula:
```
FRONTEND_URL=https://gestor-pericial.vercel.app,https://seu-dominio-custom.com
```

---

## Parte 4 - Primeiro Acesso

### 4.1 Login

1. Acesse a URL do frontend (Vercel)
2. Na tela de login, use:
   - **Email**: o valor de `ADMIN_EMAIL` que voce configurou
   - **Senha**: o valor de `ADMIN_PASSWORD` que voce configurou
3. Voce sera redirecionado ao Dashboard

### 4.2 Configuracao inicial recomendada

Apos o login, configure:

1. **Cidades**: Va em Cidades e cadastre as cidades onde voce atua
2. **Status**: Va em Configuracoes e crie os status de pericias (ex: Nova Nomeacao, Agendada, Em Andamento, Laudo Enviado, Finalizada)
3. **Tipos de Pericia**: Cadastre os tipos (Medica, Odontologica, etc.)
4. **Modalidades**: Presencial, Telepresencial, etc.

---

## Parte 5 - Configuracao de Dominio Customizado (Opcional)

### 5.1 Frontend (Vercel)

1. Na Vercel, va em **Settings** > **Domains**
2. Adicione seu dominio (ex: `app.seu-dominio.com`)
3. Configure o DNS:
   - Tipo: `CNAME`
   - Nome: `app`
   - Valor: `cname.vercel-dns.com`

### 5.2 Backend (Railway)

1. No Railway, va em **Settings** > **Networking** > **Custom Domain**
2. Adicione seu dominio (ex: `api.seu-dominio.com`)
3. Configure o DNS:
   - Tipo: `CNAME`
   - Nome: `api`
   - Valor: o valor que o Railway fornecer

4. Atualize `FRONTEND_URL` no Railway para incluir seu dominio custom
5. Atualize `VITE_API_URL` na Vercel para `https://api.seu-dominio.com`

---

## Parte 6 - Resolucao de Problemas

### Erro: "Servico de autenticacao temporariamente indisponivel"

**Causa**: O backend nao consegue conectar ao banco de dados.

**Solucao**:
1. Verifique se `DATABASE_URL` termina com `?pgbouncer=true&sslmode=require`
2. Verifique se `DIRECT_DATABASE_URL` esta configurada com o host `db.[REF].supabase.co` e termina com `?sslmode=require`
3. Confirme que a senha do Supabase esta correta (sem caracteres especiais nao-codificados)
4. Verifique se o projeto Supabase esta ativo (nao pausado)
5. No Supabase, va em **Settings** > **Database** > **Connection Pooling** e confirme que esta habilitado

### Erro: CORS / "Network Error" no frontend

**Causa**: O backend nao aceita requisicoes do dominio do frontend.

**Solucao**:
1. No Railway, verifique que `FRONTEND_URL` contem a URL exata do frontend
2. Incluia tanto `https://` quanto possiveis subdominios de preview

### Erro: "Invalid or expired token"

**Causa**: O token JWT expirou ou o secret mudou.

**Solucao**:
1. Faca logout e login novamente
2. Se mudou o `JWT_SECRET`, todos os tokens antigos serao invalidados

### Erro: Migrations falham no deploy (P1001 / Can't reach database)

**Causa**: O Prisma tenta rodar migrations pela URL do pooler (PgBouncer), que nao suporta DDL. Ou falta SSL.

**Solucao**:
1. Adicione `DIRECT_DATABASE_URL` no Railway com a conexao direta do Supabase:
   ```
   postgresql://postgres.[REF]:[SENHA]@db.[REF].supabase.co:5432/postgres?sslmode=require
   ```
2. Confirme que o schema do Prisma tem `directUrl = env("DIRECT_DATABASE_URL")`
3. Para testar manualmente:
   ```bash
   DATABASE_URL="postgresql://..." npx prisma migrate deploy --schema prisma/schema.prisma
   ```

### Banco pausado no Supabase (plano free)

Projetos inativos por 7 dias sao pausados no plano gratuito.

**Solucao**:
1. Va ao painel do Supabase
2. Clique em **Restore** no projeto pausado
3. Considere o plano Pro ($25/mes) para projetos em producao

---

## Parte 7 - Desenvolvimento Local

### 7.1 Com Docker Compose (recomendado)

```bash
# 1. Copie o arquivo de ambiente
cp .env.example .env

# 2. Edite o .env com suas configuracoes locais
# (os defaults ja funcionam para desenvolvimento local)

# 3. Suba os containers
docker compose up -d

# 4. Rode as migrations
docker compose exec backend npx prisma migrate deploy --schema prisma/schema.prisma

# 5. Acesse:
#    Frontend: http://localhost:5173
#    Backend:  http://localhost:3001
#    Swagger:  http://localhost:3001/docs
#    MailHog:  http://localhost:8025
```

### 7.2 Sem Docker (direto no terminal)

```bash
# 1. Pre-requisitos: Node 20+, PostgreSQL 16, Redis 7

# 2. Backend
cd backend
cp .env.example .env
# Edite .env com sua DATABASE_URL local
npm install
npx prisma migrate deploy --schema prisma/schema.prisma
npx prisma generate --schema prisma/schema.prisma
npm run start:dev
# Backend roda em http://localhost:3000

# 3. Frontend (em outro terminal)
cd frontend
npm install
# Crie um .env com:
#   VITE_API_URL=http://localhost:3000
npm run dev
# Frontend roda em http://localhost:5173
```

---

## Parte 8 - Custos Estimados

| Servico | Plano | Custo Mensal |
|---------|-------|-------------|
| Supabase (DB + Storage) | Free | R$ 0 |
| Supabase (DB + Storage) | Pro | ~R$ 125 ($25) |
| Railway (Backend) | Hobby | ~R$ 25 ($5) |
| Vercel (Frontend) | Hobby | R$ 0 |
| **Total minimo** | | **~R$ 25/mes** |
| **Total recomendado** | | **~R$ 150/mes** |

O plano gratuito do Supabase tem limitacoes:
- Banco pausa apos 7 dias de inatividade
- 500 MB de armazenamento
- 2 GB de transferencia

---

## Parte 9 - Checklist de Deploy

- [ ] Criar projeto no Supabase
- [ ] Anotar: DATABASE_URL, DIRECT_DATABASE_URL, SUPABASE_URL, chaves
- [ ] Criar projeto no Railway, conectar ao GitHub
- [ ] Configurar todas as variaveis de ambiente no Railway (incluindo `DIRECT_DATABASE_URL`)
- [ ] Aguardar primeiro deploy do backend
- [ ] Testar `/health` do backend
- [ ] Criar projeto na Vercel, conectar ao GitHub
- [ ] Configurar `VITE_API_URL` na Vercel
- [ ] Aguardar deploy do frontend
- [ ] Atualizar `FRONTEND_URL` no Railway com URL da Vercel
- [ ] Testar login no frontend
- [ ] Configurar dominio customizado (opcional)
- [ ] Configurar GitHub Secrets para CI/CD (ver abaixo)

### 9.1 GitHub Actions Secrets (obrigatorios para CI/CD)

No repositorio GitHub, va em **Settings** > **Secrets and variables** > **Actions** e adicione:

| Secret | Descricao |
|--------|-----------|
| `DATABASE_URL` | URL do pooler Supabase (porta 6543, com `?pgbouncer=true&sslmode=require`) |
| `DIRECT_DATABASE_URL` | URL direta do Supabase (porta 5432, com `?sslmode=require`) |
| `RAILWAY_TOKEN` | Token de API do Railway |
| `RAILWAY_SERVICE` | ID do servico no Railway |
| `BACKEND_HEALTHCHECK_URL` | URL do health check (ex: `https://[dominio]/health`) |
| `VERCEL_TOKEN` | Token de API da Vercel |
| `VERCEL_ORG_ID` | ID da organizacao na Vercel |
| `VERCEL_PROJECT_ID` | ID do projeto na Vercel |

> **IMPORTANTE**: Sem `DIRECT_DATABASE_URL` nos secrets, as migrations do GitHub Actions vao usar a URL do pooler e podem falhar com erro P1001.

---

## Parte 10 - Manutencao

### Atualizacoes

Sempre que fizer push para a branch principal:
- Railway faz redeploy automatico do backend
- Vercel faz redeploy automatico do frontend

### Backup do banco

O Supabase faz backups automaticos diarios (plano Pro).
Para backup manual:
```bash
pg_dump "DATABASE_URL" > backup_$(date +%Y%m%d).sql
```

### Monitoramento

- **Backend**: Acesse `/health` periodicamente
- **Railway**: Monitore logs no painel
- **Supabase**: Monitore uso no Dashboard

### Rodar migrations em producao

Se voce alterar o schema do Prisma:
```bash
# 1. Gere a migration localmente
cd backend
npx prisma migrate dev --name descricao_da_mudanca

# 2. Commit e push
git add prisma/migrations
git commit -m "add migration: descricao"
git push

# 3. Railway vai rodar 'prisma migrate deploy' automaticamente no proximo deploy
```
