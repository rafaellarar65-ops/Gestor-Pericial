import { Module } from '@nestjs/common';
import { CommunicationsModule } from '../communications/communications.module';
import { PericiasController } from './pericias.controller';
import { PericiasService } from './pericias.service';
import { ViewsController } from './views.controller';
import { PericiaInteligenteController } from './pericia-inteligente.controller';
import { PericiaInteligenteService } from './pericia-inteligente.service';

@Module({
  imports: [CommunicationsModule],
  controllers: [PericiasController, ViewsController, PericiaInteligenteController],
  providers: [PericiasService, PericiaInteligenteService],
  exports: [PericiasService, PericiaInteligenteService],
})
export class PericiasModule {}
