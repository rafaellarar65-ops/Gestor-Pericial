/**
 * Script de inicialização — cria o primeiro tenant e usuário admin.
 *
 * Uso (via Render Shell ou terminal local):
 *   ADMIN_EMAIL=seu@email.com ADMIN_PASSWORD=SuaSenha123 ADMIN_NAME="Seu Nome" npx ts-node scripts/create-admin.ts
 *
 * Variáveis de ambiente:
 *   ADMIN_EMAIL      (obrigatório) E-mail do administrador
 *   ADMIN_PASSWORD   (obrigatório) Senha (mínimo 8 caracteres)
 *   ADMIN_NAME       Nome completo (padrão: "Administrador")
 *   TENANT_NAME      Nome do consultório/empresa (padrão: "Gestor Pericial")
 *   DATABASE_URL     URL do banco (lida automaticamente do ambiente Render)
 */

import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const TENANT_ID = '11111111-1111-1111-1111-111111111111';

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_NAME || 'Administrador';
  const tenantName = process.env.TENANT_NAME || 'Gestor Pericial';

  if (!email || !password) {
    console.error(
      '\n❌ Informe as variáveis obrigatórias:\n' +
        '   ADMIN_EMAIL=seu@email.com ADMIN_PASSWORD=SuaSenha123 npx ts-node scripts/create-admin.ts\n',
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('\n❌ A senha deve ter pelo menos 8 caracteres.\n');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const tenant = await prisma.tenant.upsert({
    where: { id: TENANT_ID },
    update: { name: tenantName },
    create: {
      id: TENANT_ID,
      name: tenantName,
      createdBy: null,
      updatedBy: null,
    },
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, isActive: true, role: UserRole.ADMIN },
    create: {
      tenantId: tenant.id,
      email,
      passwordHash,
      role: UserRole.ADMIN,
      createdBy: tenant.id,
      updatedBy: tenant.id,
    },
  });

  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: { fullName, updatedBy: user.id },
    create: {
      tenantId: tenant.id,
      userId: user.id,
      fullName,
      createdBy: user.id,
      updatedBy: user.id,
    },
  });

  console.log('\n✅ Admin criado/atualizado com sucesso!');
  console.log(`   E-mail:    ${email}`);
  console.log(`   Nome:      ${fullName}`);
  console.log(`   Tenant ID: ${tenant.id}`);
  console.log(`   Tenant:    ${tenantName}`);
  console.log('\n   Use esses dados para fazer login no sistema.\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Erro:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
