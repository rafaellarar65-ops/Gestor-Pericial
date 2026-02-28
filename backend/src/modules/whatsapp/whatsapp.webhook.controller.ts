import { Body, Controller, Get, Headers, Post, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { WhatsappService } from './whatsapp.service';

@ApiTags('whatsapp')
@Controller('whatsapp/webhook')
export class WhatsappWebhookController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Webhook verify challenge da Meta Cloud API' })
  async verify(
    @Query('hub.mode') mode?: string,
    @Query('hub.verify_token') verifyToken?: string,
    @Query('hub.challenge') challenge?: string,
    @Res() res?: Response,
  ) {
    const payload = await this.whatsappService.verifyChallenge(mode, verifyToken, challenge);
    return res?.status(200).send(payload);
  }

  @Public()
  @Post()
  @ApiOperation({ summary: 'Recebe eventos inbound/status da Meta Cloud API' })
  async receive(
    @Body() body: any,
    @Req() req: Request,
    @Headers('x-hub-signature-256') signature?: string,
  ) {
    const rawBody = (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(body ?? {});
    return this.whatsappService.processWebhook(body, rawBody, signature);
  }
}
