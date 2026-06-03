import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EventEngineService, ProcessEventPayload } from './event-engine.service';
import { PrismaService } from '../core/prisma/prisma.service';

export const EVENT_QUEUE = 'events';

@Processor(EVENT_QUEUE)
export class EventProcessorJob extends WorkerHost {
  private readonly logger = new Logger(EventProcessorJob.name);

  constructor(
    private readonly eventEngineService: EventEngineService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<ProcessEventPayload>): Promise<void> {
    this.logger.log(`Processing job ${job.id} (attempt ${job.attemptsMade + 1})`);

    try {
      await this.eventEngineService.processEvent(job.data);
    } catch (err) {
      this.logger.error(`Job ${job.id} failed`, err);

      if (job.attemptsMade >= 4) {
        // Move to DLQ by marking as dead_letter
        const idempotencyKey = [
          job.data.linkedAccountId,
          job.data.rawEvent.vendor_event_id ?? 'unknown',
          job.data.rawEvent.event_type,
        ].join(':');

        await this.prisma.event.updateMany({
          where: { idempotency_key: idempotencyKey },
          data: { status: 'dead_letter' },
        });
      }

      throw err; // BullMQ will retry with backoff
    }
  }
}
