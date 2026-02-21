# Encryption Configuration (LGPD) — Pericias Manager Pro

## 1) Objetivo
Proteger dados de categoria especial (saúde) com criptografia em trânsito, em repouso e em nível de coluna/campo, com rotação e trilha de auditoria.

## 2) Classificação de dados

### Alta sensibilidade (criptografar obrigatoriamente)
- `Pericia.observacoes`, `Pericia.extraObservation`, `Pericia.esclarecimentos`.
- `PreLaudo.sections`, `PreLaudo.aiAnalysis`, `PreLaudo.laudoV2`, `PreLaudo.laudoRealtime`.
- `ExamPerformed.findings`, `ExamPerformed.transcript`.
- `CaseDocument.storagePath` + metadados clínicos que identifiquem condição.

### Sensibilidade média (criptografia recomendada)
- `Pericia.periciadoCpf`, `UserProfile.cpf`, contatos pessoais (`phone`, `email` quando aplicável).
- `PaymentProfile` campos bancários (`pixKey`, `accountNumber`, `branch`).

### Baixa sensibilidade (não precisa cifrar campo a campo)
- Catálogos (`Cidade`, `Status`, `TipoPericia`, `Modalidade`).

## 3) Modelo de criptografia

### 3.1 Em trânsito
- TLS 1.2+ obrigatório entre app (NestJS) e Supabase.
- TLS obrigatório para integrações externas (DataJud, e-mail provider, etc.).

### 3.2 Em repouso
- Confiar no encryption-at-rest do provedor (Supabase/infra).
- Backups cifrados com chave separada da chave da base transacional.

### 3.3 Em nível de aplicação (preferencial para saúde)
- Cifrar payload sensível no serviço (NestJS) antes de persistir.
- Algoritmo recomendado: `AES-256-GCM`.
- Guardar `{ciphertext, iv, tag, key_version}` em JSON.
- Benefício: reduz exposição a DBAs e dumps acidentais.

### 3.4 Em nível de banco (opcional complementar)
- Para casos legados/consulta SQL direta, usar `pgcrypto`.
- Exemplo de funções:
  - `pgp_sym_encrypt(...)`
  - `pgp_sym_decrypt(...)`
- Evitar usar chave hardcoded em SQL/migrations.

## 4) Gestão de chaves
- Chaves no Secret Manager (não no código, não em `.env` versionado).
- Separar chaves por ambiente (`dev`, `stg`, `prod`).
- `KMS master key` + `data encryption keys` por versão.
- Campo `key_version` obrigatório nos blobs criptografados.

## 5) Rotação de chaves
- Rotação programada: a cada 90 dias (ou menor, conforme política interna).
- Fluxo:
  1. Criar nova chave (N+1) no Secret Manager.
  2. Passar escrita para N+1.
  3. Rodar recriptografia assíncrona dos registros em N.
  4. Validar integridade/auditoria.
  5. Revogar N após janela de segurança.

## 6) Operação segura
- Nunca logar plaintext de campos médicos em `ActivityLog`.
- Aplicar mascaramento em observabilidade (APM/log).
- Dumps/exports para suporte devem sair anonimizados.
- Auditar acesso a dados clínicos com `pgaudit` + logs do app.

## 7) Prisma/NestJS (implementação prática)
- Criar `CryptoService` central no NestJS.
- Antes de `prisma.<model>.create/update`, criptografar campos sensíveis.
- Na leitura, decriptar somente quando necessário por role e finalidade.
- Para busca textual em campos cifrados:
  - usar colunas derivadas de busca (hash/token),
  - nunca descriptografar em massa para filtrar.

## 8) LGPD e retenção
- Base legal e finalidade explícitas para uso de dados de saúde.
- Política de retenção alinhada:
  - perícias: 20 anos,
  - financeiro: 5 anos.
- Implementar descarte seguro ao fim do prazo (crypto-shredding quando aplicável).
