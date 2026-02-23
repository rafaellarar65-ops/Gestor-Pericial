import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PericiasService } from './pericias.service';

@ApiTags('views')
@ApiBearerAuth()
@Controller()
export class ViewsController {
  constructor(private readonly service: PericiasService) {}

  @Get('nomeacoes')
  @ApiOperation({ summary: 'Perícias aguardando agendamento (nomeações)' })
  nomeacoes() {
    return this.service.nomeacoes();
  }

  @Get('pericias-hoje')
  @ApiOperation({ summary: 'Perícias agendadas para hoje' })
  periciasHoje() {
    return this.service.pericias_hoje();
  }

  @Get('laudos-pendentes')
  @ApiOperation({ summary: 'Perícias com laudo pendente de envio' })
  laudosPendentes() {
    return this.service.laudosPendentes();
  }
}
