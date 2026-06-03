import { Injectable } from '@nestjs/common';
import { BaseConnector } from '../base/base.connector';
import {
  Credentials,
  LinkedAccount,
  RawRequest,
  RawEvent,
  ReadOpts,
  WriteResult,
  CanonicalObject,
} from '../base/connector.types';
import { CanonicalCandidate } from '../../canonical/models/candidate.model';
import { CanonicalApplication, ApplicationStatus } from '../../canonical/models/application.model';
import { HttpClientService } from '../../core/http-client/http-client.service';
import * as crypto from 'crypto';

const TEAMTAILOR_BASE_URL = 'https://api.teamtailor.com/v1';

interface TeamtailorCandidate {
  id: string;
  type: string;
  attributes: {
    'first-name'?: string;
    'last-name'?: string;
    email?: string;
    phone?: string;
    'created-at'?: string;
    'updated-at'?: string;
    [key: string]: unknown;
  };
}

interface TeamtailorApplication {
  id: string;
  type: string;
  attributes: {
    status?: string;
    'created-at'?: string;
    'updated-at'?: string;
    [key: string]: unknown;
  };
  relationships?: {
    candidate?: { data?: { id: string } };
    job?: { data?: { id: string } };
    stage?: { data?: { id: string } };
  };
}

const STAGE_STATUS_MAP: Record<string, ApplicationStatus> = {
  inbox: 'applied',
  'in-process': 'interview',
  offer: 'offer',
  hired: 'hired',
  rejected: 'rejected',
};

@Injectable()
export class TeamtailorConnector extends BaseConnector {
  readonly vendor = 'teamtailor';
  readonly category = 'ats' as const;
  readonly capabilities = [
    'read:candidates',
    'read:applications',
    'write:candidates',
    'webhook:candidate-hired',
    'webhook:candidate-moved',
  ];

  constructor(private readonly httpClient: HttpClientService) {
    super();
  }

  private getClient(credentials: Credentials) {
    const token = credentials.api_key ?? credentials.access_token;
    return this.httpClient.create(TEAMTAILOR_BASE_URL, {
      Authorization: `Token token=${token ?? ''}`,
      'X-Api-Version': '20210218',
    });
  }

  getAuthUrl(_state: string): string {
    // Teamtailor uses API key auth
    throw new Error('Teamtailor uses API key authentication. Provide api_key directly.');
  }

  async exchangeCode(_code: string, _redirectUri: string): Promise<Credentials> {
    throw new Error('Teamtailor uses API key authentication, not OAuth.');
  }

  async refresh(creds: Credentials): Promise<Credentials> {
    // API keys don't expire
    return creds;
  }

  async registerWebhooks(account: LinkedAccount): Promise<string[]> {
    const client = this.getClient({ api_key: account.credentials_ref });
    const webhookIds: string[] = [];
    // Include linked_account_id in path so incoming webhooks route to the correct tenant
    const webhookUrl = `${process.env.APP_URL ?? 'http://localhost:3000'}/webhooks/teamtailor/${account.id}`;

    const events = ['candidate-hired', 'candidate-moved'];
    for (const event of events) {
      try {
        const response = await client.post<{ data: { id: string } }>('/webhooks', {
          data: {
            type: 'webhooks',
            attributes: { 'subscription-type': event, url: webhookUrl },
          },
        });
        webhookIds.push(response.data.data.id);
      } catch {
        // non-fatal — webhook may already be registered
      }
    }

    return webhookIds;
  }

  verifyWebhook(req: RawRequest): boolean {
    const secret = process.env.TEAMTAILOR_WEBHOOK_SECRET;
    if (!secret) return true; // dev mode

    const signature = req.headers['x-teamtailor-signature'];
    if (!signature || typeof signature !== 'string') return false;

    const body = req.rawBody?.toString() ?? JSON.stringify(req.body);
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }

  parseWebhook(req: RawRequest): RawEvent {
    const body = req.body as {
      meta?: { event_type?: string; delivery_id?: string };
      data?: unknown;
    };
    const eventType = body?.meta?.event_type ?? 'unknown';

    return {
      event_type: eventType,
      vendor_event_id: body?.meta?.delivery_id,
      payload: body as Record<string, unknown>,
      occurred_at: new Date(),
    };
  }

  async *read(type: string, opts: ReadOpts): AsyncGenerator<unknown> {
    const creds: Credentials = { api_key: opts.filters?.['api_key'] ?? '' };
    const client = this.getClient(creds);

    let cursor = opts.cursor;
    const limit = opts.limit ?? 30;

    while (true) {
      const params: Record<string, string | number> = { 'page[size]': limit };
      if (cursor) params['page[number]'] = cursor;

      let response: { data: { data: unknown[]; links?: { next?: string } } };

      if (type === 'candidates') {
        response = await client.get('/candidates', { params });
      } else if (type === 'applications') {
        response = await client.get('/job-applications', { params });
      } else {
        throw new Error(`Unknown read type: ${type}`);
      }

      for (const item of response.data.data) {
        yield item;
      }

      const nextLink = response.data.links?.next;
      if (!nextLink) break;

      const url = new URL(nextLink);
      cursor = url.searchParams.get('page[number]') ?? undefined;
      if (!cursor) break;
    }
  }

  async write(
    _type: string,
    _payload: unknown,
    _idempotencyKey: string,
  ): Promise<WriteResult> {
    throw new Error('write not implemented for Teamtailor');
  }

  normalize(type: string, raw: unknown): CanonicalObject {
    if (type === 'candidates') {
      return this.normalizeCandidate(raw as TeamtailorCandidate);
    }
    if (type === 'applications') {
      return this.normalizeApplication(raw as TeamtailorApplication);
    }
    throw new Error(`Unknown normalize type: ${type}`);
  }

  normalizeCandidate(raw: TeamtailorCandidate): CanonicalCandidate {
    return {
      id: '',
      remote_id: raw.id,
      linked_account_id: '',
      customer_id: '',
      first_name: raw.attributes['first-name'],
      last_name: raw.attributes['last-name'],
      email: raw.attributes.email,
      phone: raw.attributes.phone,
      remote_data: raw.attributes as Record<string, unknown>,
      custom_fields: {},
      created_at: raw.attributes['created-at'] ? new Date(raw.attributes['created-at'] as string) : new Date(),
      modified_at: raw.attributes['updated-at'] ? new Date(raw.attributes['updated-at'] as string) : new Date(),
    };
  }

  normalizeApplication(raw: TeamtailorApplication): CanonicalApplication {
    const stageId = raw.relationships?.stage?.data?.id ?? '';
    const rawStatus = (raw.attributes.status as string) ?? stageId;
    const status: ApplicationStatus = STAGE_STATUS_MAP[rawStatus] ?? 'applied';

    return {
      id: '',
      remote_id: raw.id,
      linked_account_id: '',
      customer_id: '',
      candidate_id: raw.relationships?.candidate?.data?.id,
      job_id: raw.relationships?.job?.data?.id,
      status,
      stage: stageId,
      applied_at: raw.attributes['created-at']
        ? new Date(raw.attributes['created-at'] as string)
        : new Date(),
      remote_data: raw.attributes as Record<string, unknown>,
      custom_fields: {},
      created_at: raw.attributes['created-at'] ? new Date(raw.attributes['created-at'] as string) : new Date(),
      modified_at: raw.attributes['updated-at'] ? new Date(raw.attributes['updated-at'] as string) : new Date(),
    };
  }

  denormalize(type: string, obj: CanonicalObject): unknown {
    if (type === 'candidates') {
      const candidate = obj as CanonicalCandidate;
      return {
        data: {
          type: 'candidates',
          attributes: {
            'first-name': candidate.first_name,
            'last-name': candidate.last_name,
            email: candidate.email,
            phone: candidate.phone,
          },
        },
      };
    }
    // Teamtailor is read-only for applications; denormalize is a no-op
    return obj;
  }
}
