import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PericiasService } from './pericias.service';
import { ListNomeacoesDto } from './dto/pericias.dto';

@ApiTags('views')
@ApiBearerAuth()
@Controller()
export class ViewsController {
  constructor(private readonly service: PericiasService) {}

  @Get('nomeacoes')
  @ApiOperation({ summary: 'Perícias aguardando agendamento (nomeações)' })
  nomeacoes(@Query() query: ListNomeacoesDto) {
    return this.service.nomeacoes(query);
  }


  @Get('fila-agendamento-cidades')
  @ApiOperation({ summary: 'Fila de agendamento segmentada por cidade' })
  filaAgendamentoPorCidade() {
    return this.service.filaAgendamentoPorCidade();
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
