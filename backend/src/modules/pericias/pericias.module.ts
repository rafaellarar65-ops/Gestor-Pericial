import { Module } from '@nestjs/common';
import { PericiasController } from './pericias.controller';
import { PericiasService } from './pericias.service';
import { ViewsController } from './views.controller';
import { PericiaInteligenteController } from './pericia-inteligente.controller';
import { PericiaInteligenteService } from './pericia-inteligente.service';

@Module({
  controllers: [PericiasController, ViewsController, PericiaInteligenteController],
  providers: [PericiasService, PericiaInteligenteService],
  exports: [PericiasService, PericiaInteligenteService],
})
export class PericiasModule {}
