import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const method = req.method as string;
    const mutationMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    return next.handle().pipe(
      tap(async () => {
        if (!mutationMethods.includes(method)) return;

        const tenantId = req.headers['x-tenant-id'] || req.user?.tenantId;
        if (!tenantId) return;

        const periciaId = req.body?.periciaId || req.params?.periciaId;
        const payload = {
          path: req.route?.path ?? req.url,
          method,
          body: req.body,
          query: req.query,
          params: req.params,
        };

        if (periciaId) {
          await this.prisma.logStatus.create({
            data: {
              tenantId,
              periciaId,
              statusNovo: `${method}:${req.route?.path ?? req.url}`,
              motivo: 'audit-interceptor',
              metadata: payload,
              createdBy: req.user?.sub,
            },
          });
          return;
        }

        await this.prisma.activityLog.create({
          data: {
            tenantId,
            entityType: 'HTTP_REQUEST',
            entityId: req.params?.id ?? 'N/A',
            action: `${method}:${req.route?.path ?? req.url}`,
            payloadJson: payload,
            createdBy: req.user?.sub,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
        });
      }),
    );
  }
}
