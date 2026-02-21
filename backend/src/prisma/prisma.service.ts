import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { RequestContextService } from '../common/request-context.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private readonly context: RequestContextService) {
    super();

    this.$use(async (params: any, next: (params: any) => Promise<any>) => {
      const tenantId = this.context.get('tenantId');
      if (!tenantId || !params.model) return next(params);

      params.args ??= {};

      const readActions = ['findMany', 'findFirst', 'count', 'aggregate'];
      const writeManyActions = ['updateMany', 'deleteMany'];
      const writeOneActions = ['create', 'update', 'upsert'];

      if ([...readActions, ...writeManyActions].includes(params.action)) {
        params.args.where = { ...(params.args.where ?? {}), tenantId };
      }

      if (params.action === 'findUnique') {
        params.action = 'findFirst';
        params.args.where = { ...(params.args.where ?? {}), tenantId };
      }

      if (writeOneActions.includes(params.action) && params.args.data) {
        params.args.data = { ...params.args.data, tenantId };
      }

      if (params.action === 'createMany' && Array.isArray(params.args.data)) {
        params.args.data = params.args.data.map((item: Record<string, unknown>) => ({ ...item, tenantId }));
      }

      return next(params);
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }
}
