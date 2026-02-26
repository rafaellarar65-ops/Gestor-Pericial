import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { RequestContextService } from '../request-context.service';

const normalizeTenantHeader = (tenantHeader: unknown): string | undefined => {
  if (Array.isArray(tenantHeader)) {
    const value = tenantHeader.find((item) => typeof item === 'string' && item.trim().length > 0);
    return typeof value === 'string' ? value : undefined;
  }

  if (typeof tenantHeader === 'string' && tenantHeader.trim().length > 0) {
    return tenantHeader;
  }

  return undefined;
};

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private readonly context: RequestContextService) {}

  intercept(executionContext: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = executionContext.switchToHttp().getRequest();
    const headerTenantId = normalizeTenantHeader(request.headers['x-tenant-id']);
    const tenantId = request.user?.tenantId ?? headerTenantId;
    const userId = request.user?.sub;

    return new Observable((subscriber) => {
      this.context.run({ tenantId, userId }, () => {
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
