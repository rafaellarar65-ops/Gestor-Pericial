import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bullmq';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PericiasModule } from './modules/pericias/pericias.module';
import { ConfigDomainModule } from './modules/config/config.module';
import { FinancialModule } from './modules/financial/financial.module';
import { AgendaModule } from './modules/agenda/agenda.module';
import { LaudoModule } from './modules/laudo/laudo.module';
import { ManeuversModule } from './modules/maneuvers/maneuvers.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { CommunicationsModule } from './modules/communications/communications.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { AiModule } from './modules/ai/ai.module';
import { TelepericiaModule } from './modules/telepericia/telepericia.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DocumentsModule } from './modules/documents/documents.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    JwtModule.register({ global: true, secret: process.env.JWT_SECRET, signOptions: { expiresIn: '15m' } }),
    ThrottlerModule.forRoot([
      { ttl: 60_000, limit: 100 },
    ]),
    BullModule.forRoot({
      connection: { url: process.env.REDIS_URL },
    }),
    BullModule.registerQueue(
      { name: 'pdf-generation' },
      { name: 'datajud-sync' },
      { name: 'charge-dispatch' },
    ),
    AuthModule,
    UsersModule,
    PericiasModule,
    ConfigDomainModule,
    FinancialModule,
    AgendaModule,
    LaudoModule,
    ManeuversModule,
    KnowledgeModule,
    CommunicationsModule,
    IntegrationsModule,
    AiModule,
    TelepericiaModule,
    NotificationsModule,
    DocumentsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: TenantInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
