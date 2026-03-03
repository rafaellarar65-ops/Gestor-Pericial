import { Global, Module } from '@nestjs/common';
import { RequestContextService } from '../common/request-context.service';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [RequestContextService, PrismaService],
  exports: [RequestContextService, PrismaService],
})
export class PrismaModule {}
