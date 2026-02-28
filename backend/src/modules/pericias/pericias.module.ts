import { Module } from '@nestjs/common';
import { PericiasController } from './pericias.controller';
import { PericiasService } from './pericias.service';
import { ViewsController } from './views.controller';
import { PericiaInteligenteController } from './pericia-inteligente.controller';
import { PericiaInteligenteService } from './pericia-inteligente.service';
import { PericiaStageFilterService } from './pericia-stage-filter.service';

@Module({
  controllers: [PericiasController, ViewsController, PericiaInteligenteController],
  providers: [PericiasService, PericiaInteligenteService, PericiaStageFilterService],
  exports: [PericiasService, PericiaInteligenteService, PericiaStageFilterService],
})
export class PericiasModule {}
