import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from './common/pipes/validation.pipe';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AppModule } from './app.module';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const BOOTSTRAP_TENANT_ID = '11111111-1111-1111-1111-111111111111';

async function logDatabaseConnectionStatus(): Promise<void> {
  const prisma = new PrismaClient();

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('[Bootstrap] Conexão com banco validada com sucesso.');
  } catch (err) {
    console.error('[Bootstrap] Falha ao conectar no banco de dados durante inicialização:', (err as Error).message);
  } finally {
    await prisma.$disconnect();
  }
}

async function seedAdminIfNeeded(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) return;

  const prisma = new PrismaClient();
  try {
    const tenantName = process.env.TENANT_NAME || 'Gestor Pericial';
    const fullName = process.env.ADMIN_NAME || 'Administrador';

    const tenant = await prisma.tenant.upsert({
      where: { id: BOOTSTRAP_TENANT_ID },
      update: { name: tenantName },
      create: { id: BOOTSTRAP_TENANT_ID, name: tenantName, createdBy: null, updatedBy: null },
    });

    const passwordHash = await bcrypt.hash(password, 10);

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

    console.log(`[Bootstrap] Admin criado/atualizado: ${email} (tenant: ${tenant.id})`);
  } catch (err) {
    console.error('[Bootstrap] Erro ao criar admin:', (err as Error).message);
  } finally {
    await prisma.$disconnect();
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((u) => u.trim())
    : '*';

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Perícias Manager Pro API')
    .setDescription('Backend NestJS para gestão de perícias médicas judiciais')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await logDatabaseConnectionStatus();
  await seedAdminIfNeeded();

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
