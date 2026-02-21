import { Module } from '@nestjs/common';
import { PericiasController } from './pericias.controller';
import { PericiasService } from './pericias.service';

@Module({
  controllers: [PericiasController],
  providers: [PericiasService],
  exports: [PericiasService],
})
export class PericiasModule {}
