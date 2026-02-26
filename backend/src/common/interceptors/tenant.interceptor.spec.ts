import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { TenantInterceptor } from './tenant.interceptor';

describe('TenantInterceptor', () => {
  const contextService = {
    run: jest.fn((_store, callback: () => void) => callback()),
  };

  const buildExecutionContext = (request: Record<string, unknown>) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as unknown as ExecutionContext;

  const next: CallHandler = {
    handle: () => of('ok'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prioritizes tenantId from authenticated user over x-tenant-id header', (done) => {
    const interceptor = new TenantInterceptor(contextService as any);
    const request = {
      headers: { 'x-tenant-id': 'tenant-header' },
      user: { tenantId: 'tenant-jwt', sub: 'user-1' },
    };

    interceptor.intercept(buildExecutionContext(request), next).subscribe({
      complete: () => {
        expect(contextService.run).toHaveBeenCalledWith({ tenantId: 'tenant-jwt', userId: 'user-1' }, expect.any(Function));
        done();
      },
    });
  });

  it('uses x-tenant-id header when request has no authenticated user tenant', (done) => {
    const interceptor = new TenantInterceptor(contextService as any);
    const request = {
      headers: { 'x-tenant-id': 'tenant-header' },
      user: undefined,
    };

    interceptor.intercept(buildExecutionContext(request), next).subscribe({
      complete: () => {
        expect(contextService.run).toHaveBeenCalledWith({ tenantId: 'tenant-header', userId: undefined }, expect.any(Function));
        done();
      },
    });
  });
});
