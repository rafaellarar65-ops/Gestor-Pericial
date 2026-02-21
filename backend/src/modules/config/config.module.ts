import { Module } from '@nestjs/common';
import { ConfigDomainController } from './config.controller';
import { ConfigDomainService } from './config.service';

@Module({
  controllers: [ConfigDomainController],
  providers: [ConfigDomainService],
  exports: [ConfigDomainService],
})
export class ConfigDomainModule {}
