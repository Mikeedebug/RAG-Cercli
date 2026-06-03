import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../core/prisma/prisma.service';
import { EventEmitter2 } from 'eventemitter2';
import { ConnectorRegistry } from '../connectors/connector.registry';
import { v4 as uuidv4 } from 'uuid';
import { RawEvent } from '../connectors/base/connector.types';

export interface ProcessEventPayload {
  traceId: string;
  vendor: string;
  linkedAccountId: string;
  customerId: string;
  rawEvent: RawEvent;
}

@Injectable()
export class EventEngineService {
  private readonly logger = new Logger(EventEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly connectorRegistry: ConnectorRegistry,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async processEvent(payload: ProcessEventPayload): Promise<void> {
    const { traceId, vendor, linkedAccountId, customerId, rawEvent } = payload;

    const idempotencyKey = [
      linkedAccountId,
      rawEvent.vendor_event_id ?? uuidv4(),
      rawEvent.event_type,
    ].join(':');

    const existing = await this.prisma.event.findUnique({
      where: { idempotency_key: idempotencyKey },
    });

    if (existing && existing.status === 'processed') {
      this.logger.log(`[${traceId}] Duplicate event, skipping: ${idempotencyKey}`);
      return;
    }

    const event = await this.prisma.event.upsert({
      where: { idempotency_key: idempotencyKey },
      create: {
        linked_account_id: linkedAccountId,
        customer_id: customerId,
        event_type: rawEvent.event_type,
        vendor_event_id: rawEvent.vendor_event_id,
        payload: rawEvent.payload as object,
        idempotency_key: idempotencyKey,
        trace_id: traceId,
        status: 'processing',
      },
      update: { status: 'processing' },
    });

    try {
      const connector = this.connectorRegistry.get(vendor);

      const rawData = rawEvent.payload['data'];
      if (!rawData) {
        this.logger.warn(`[${traceId}] No data in event payload`);
        await this.prisma.event.update({ where: { id: event.id }, data: { status: 'processed' } });
        return;
      }

      // Normalize candidate from the event
      const candidateRaw = connector.normalize('candidates', rawData);
      const cand = candidateRaw as import('../canonical/models').CanonicalCandidate;

      const dbCandidate = await this.prisma.canonicalCandidate.upsert({
        where: {
          linked_account_id_remote_id: {
            linked_account_id: linkedAccountId,
            remote_id: cand.remote_id,
          },
        },
        create: {
          remote_id: cand.remote_id,
          linked_account_id: linkedAccountId,
          customer_id: customerId,
          first_name: cand.first_name,
          last_name: cand.last_name,
          email: cand.email,
          phone: cand.phone,
          nationality: cand.nationality,
          location: cand.location,
          remote_data: (cand.remote_data ?? {}) as object,
          custom_fields: (cand.custom_fields ?? {}) as object,
        },
        update: {
          first_name: cand.first_name,
          last_name: cand.last_name,
          email: cand.email,
          modified_at: new Date(),
        },
      });

      // Upsert application record when we have enough data
      let dbApplication: import('@prisma/client').CanonicalApplication | null = null;
      const appRemoteId = (rawData as Record<string, unknown>)['applicationId'] as string | undefined
        ?? (rawEvent.payload['meta'] as Record<string, unknown> | undefined)?.['application_id'] as string | undefined;

      if (appRemoteId) {
        const appRaw = connector.normalize('applications', rawData);
        const app = appRaw as import('../canonical/models').CanonicalApplication;
        const unifiedEvent = this.mapToUnifiedEvent(rawEvent.event_type);
        const appStatus = unifiedEvent === 'candidate.offer_accepted' ? 'offer_accepted' : app.status;

        dbApplication = await this.prisma.canonicalApplication.upsert({
          where: {
            linked_account_id_remote_id: {
              linked_account_id: linkedAccountId,
              remote_id: appRemoteId,
            },
          },
          create: {
            remote_id: appRemoteId,
            linked_account_id: linkedAccountId,
            customer_id: customerId,
            candidate_id: dbCandidate.id,
            job_title: app.job_title,
            job_id: app.job_id,
            status: appStatus as import('@prisma/client').ApplicationStatus,
            applied_at: app.applied_at,
            work_location: app.work_location,
            remote_data: (app.remote_data ?? {}) as object,
            custom_fields: (app.custom_fields ?? {}) as object,
          },
          update: {
            status: appStatus as import('@prisma/client').ApplicationStatus,
            modified_at: new Date(),
          },
        });
      }

      const unifiedEventName = this.mapToUnifiedEvent(rawEvent.event_type);
      this.eventEmitter.emit(unifiedEventName, {
        traceId,
        customerId,
        linkedAccountId,
        vendor,
        // Emit DB records (with real IDs) so downstream services can query by ID
        candidateId: dbCandidate.id,
        applicationId: dbApplication?.id ?? null,
        rawEvent,
      });

      await this.prisma.event.update({
        where: { id: event.id },
        data: { status: 'processed', processed_at: new Date() },
      });

      this.logger.log(`[${traceId}] Event processed → ${unifiedEventName}`);
    } catch (err) {
      this.logger.error(`[${traceId}] Failed to process event`, err);
      await this.prisma.event.update({
        where: { id: event.id },
        data: { status: 'failed', retry_count: { increment: 1 } },
      });
      throw err;
    }
  }

  private mapToUnifiedEvent(vendorEventType: string): string {
    const mapping: Record<string, string> = {
      // Teamtailor: 'candidate-hired' fires when offer is accepted / candidate is hired
      'candidate-hired': 'candidate.offer_accepted',
      // 'candidate-moved' fires on stage transitions; treat as a generic move
      'candidate-moved': 'candidate.moved',
      'candidate-offer': 'candidate.offer_accepted',
      'application-updated': 'candidate.moved',
    };
    return mapping[vendorEventType] ?? `vendor.${vendorEventType}`;
  }
}
