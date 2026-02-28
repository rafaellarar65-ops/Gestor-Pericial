import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from './common/pipes/validation.pipe';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AppModule } from './app.module';
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { getPrismaClientOptions, resolveDatabaseUrl } from './prisma/database-url';
import { json, Request, Response } from 'express';

const BOOTSTRAP_TENANT_ID = '11111111-1111-1111-1111-111111111111';

async function logDatabaseConnectionStatus(): Promise<void> {
  const prisma = new PrismaClient(getPrismaClientOptions());

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
  // Fall back to default credentials so the app always has a usable admin on first deploy
  const email = process.env.ADMIN_EMAIL ?? 'admin@gestorpericial.com.br';
  const password = process.env.ADMIN_PASSWORD ?? 'Admin@2025!';

  const prisma = new PrismaClient(getPrismaClientOptions());
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
  resolveDatabaseUrl();
  const app = await NestFactory.create(AppModule);

  // Set global prefix for API routes (required for Kubernetes ingress routing)
  app.setGlobalPrefix('api');

  const configuredOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((u) => u.trim()).filter(Boolean)
    : [];

  const isAllowedOrigin = (origin?: string): boolean => {
    // server-side calls and same-origin requests may not send Origin
    if (!origin) return true;

    // When FRONTEND_URL is not configured we keep CORS permissive to avoid login lockouts.
    if (!configuredOrigins.length) return true;

    if (configuredOrigins.some((allowed) => origin.startsWith(allowed))) {
      return true;
    }

    // Allow common preview/staging hosts used by this project.
    try {
      const { hostname } = new URL(origin);
      if (hostname.endsWith('.railway.app') || hostname.endsWith('.vercel.app')) {
        return true;
      }
    } catch {
      return false;
    }

    return false;
  };

  app.enableCors({
    origin: (origin, cb) => cb(null, isAllowedOrigin(origin)),
    credentials: true,
  });


  app.use(json({
    verify: (req: Request & { rawBody?: string }, _res: Response, buf: Buffer) => {
      req.rawBody = buf.toString('utf8');
    },
  }));

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
