import {
  Controller,
  Post,
  Param,
  Headers,
  Body,
  RawBodyRequest,
  Req,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Request } from 'express';
import { ConnectorRegistry } from '../connectors/connector.registry';
import { PrismaService } from '../core/prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { EVENT_QUEUE } from './event-processor.job';
import { RawRequest } from '../connectors/base/connector.types';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly connectorRegistry: ConnectorRegistry,
    private readonly prisma: PrismaService,
    @InjectQueue(EVENT_QUEUE) private readonly eventQueue: Queue,
  ) {}

  @Post(':vendor')
  async inbound(
    @Param('vendor') vendor: string,
    @Headers() headers: Record<string, string>,
    @Body() body: unknown,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const traceId = uuidv4();

    const rawReq: RawRequest = {
      headers,
      body,
      rawBody: req.rawBody,
    };

    const connector = this.connectorRegistry.get(vendor);

    if (!connector.verifyWebhook(rawReq)) {
      this.logger.warn(`[${traceId}] Webhook signature verification failed for ${vendor}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    const rawEvent = connector.parseWebhook(rawReq);

    // Find linked account by vendor and customer
    const linkedAccount = await this.prisma.linkedAccount.findFirst({
      where: { vendor, status: 'active' },
    });

    if (!linkedAccount) {
      this.logger.warn(`[${traceId}] No active linked account found for vendor ${vendor}`);
      return { received: true, traceId };
    }

    await this.eventQueue.add(
      'process-event',
      {
        traceId,
        vendor,
        linkedAccountId: linkedAccount.id,
        customerId: linkedAccount.customer_id,
        rawEvent,
      },
      {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    );

    return { received: true, traceId };
  }
}
