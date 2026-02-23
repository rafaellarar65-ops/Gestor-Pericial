import { Module } from '@nestjs/common';
import { PericiasController } from './pericias.controller';
import { PericiasService } from './pericias.service';
import { ViewsController } from './views.controller';

@Module({
  controllers: [PericiasController, ViewsController],
  providers: [PericiasService],
  exports: [PericiasService],
})
export class PericiasModule {}
