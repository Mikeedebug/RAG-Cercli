import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EventEngineService } from './event-engine.service';
import { EventProcessorJob } from './event-processor.job';
import { WebhooksController } from './webhooks.controller';
import { ConnectorsModule } from '../connectors/connectors.module';
import { EVENT_QUEUE } from './event-processor.job';

@Module({
  imports: [
    ConnectorsModule,
    BullModule.registerQueue({ name: EVENT_QUEUE }),
  ],
  controllers: [WebhooksController],
  providers: [EventEngineService, EventProcessorJob],
  exports: [EventEngineService],
})
export class EventEngineModule {}
