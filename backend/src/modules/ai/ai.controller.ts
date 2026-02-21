import { Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
@Throttle({ default: { limit: 10, ttl: 60000 } })
export class AiController {
  constructor(private readonly service: AiService) {}

  @Post('analyze-document')
  analyzeDocument() {
    return { action: 'analyze-document', module: 'ai' };
  }

  @Post('batch-action')
  batchAction() {
    return { action: 'batch-action', module: 'ai' };
  }

  @Post('laudo-assist')
  laudoAssist() {
    return { action: 'laudo-assist', module: 'ai' };
  }
}
