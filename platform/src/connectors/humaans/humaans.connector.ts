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
import { CanonicalEmployee } from '../../canonical/models/employee.model';
import { HttpClientService } from '../../core/http-client/http-client.service';

const HUMAANS_BASE_URL = 'https://app.humaans.io/api';

interface HumaansPerson {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  nationality?: string;
  locationId?: string;
  jobTitle?: string;
  department?: string;
  startDate?: string;
  status?: string;
  [key: string]: unknown;
}

@Injectable()
export class HumaansConnector extends BaseConnector {
  readonly vendor = 'humaans';
  readonly category = 'hris' as const;
  readonly capabilities = ['read:employees', 'write:employees'];

  constructor(private readonly httpClient: HttpClientService) {
    super();
  }

  private getClient(credentials: Credentials) {
    const token = credentials.api_key ?? credentials.access_token;
    return this.httpClient.create(HUMAANS_BASE_URL, {
      Authorization: `Bearer ${token ?? ''}`,
    });
  }

  getAuthUrl(_state: string): string {
    throw new Error('Humaans uses API key authentication.');
  }

  async exchangeCode(_code: string, _redirectUri: string): Promise<Credentials> {
    throw new Error('Humaans uses API key authentication, not OAuth.');
  }

  async refresh(creds: Credentials): Promise<Credentials> {
    return creds;
  }

  async registerWebhooks(_account: LinkedAccount): Promise<string[]> {
    return [];
  }

  verifyWebhook(_req: RawRequest): boolean {
    return true;
  }

  parseWebhook(req: RawRequest): RawEvent {
    return {
      event_type: 'unknown',
      payload: req.body as Record<string, unknown>,
      occurred_at: new Date(),
    };
  }

  async *read(type: string, opts: ReadOpts): AsyncGenerator<unknown> {
    const creds: Credentials = { api_key: opts.filters?.['api_key'] ?? '' };
    const client = this.getClient(creds);

    let offset = 0;
    const limit = opts.limit ?? 50;

    while (true) {
      if (type !== 'employees') throw new Error(`Unknown read type: ${type}`);

      const response = await client.get<{ data: HumaansPerson[]; total: number }>('/people', {
        params: { limit, offset },
      });

      for (const item of response.data.data) {
        yield item;
      }

      offset += limit;
      if (offset >= response.data.total) break;
    }
  }

  async write(
    type: string,
    payload: unknown,
    _idempotencyKey: string,
  ): Promise<WriteResult> {
    if (type !== 'employees') throw new Error(`Unknown write type: ${type}`);

    const creds: Credentials = {
      api_key: (payload as { _api_key?: string })._api_key ?? '',
    };
    const client = this.getClient(creds);

    const body = this.denormalize('employees', payload as CanonicalObject) as HumaansPerson;
    const response = await client.post<HumaansPerson>('/people', body);

    return {
      remote_id: response.data.id ?? '',
      raw: response.data as Record<string, unknown>,
    };
  }

  normalize(type: string, raw: unknown): CanonicalObject {
    if (type === 'employees') {
      return this.normalizePerson(raw as HumaansPerson);
    }
    throw new Error(`Unknown normalize type: ${type}`);
  }

  normalizePerson(raw: HumaansPerson): CanonicalEmployee {
    return {
      id: '',
      remote_id: raw.id,
      linked_account_id: '',
      customer_id: '',
      first_name: raw.firstName,
      last_name: raw.lastName,
      email: raw.email,
      phone: raw.phoneNumber,
      nationality: raw.nationality,
      work_location: raw.locationId,
      job_title: raw.jobTitle,
      department: raw.department,
      start_date: raw.startDate ? new Date(raw.startDate) : undefined,
      status: (raw.status as CanonicalEmployee['status']) ?? 'active',
      remote_data: raw as Record<string, unknown>,
      custom_fields: {},
      created_at: new Date(),
      modified_at: new Date(),
    };
  }

  denormalize(type: string, obj: CanonicalObject): unknown {
    if (type === 'employees') {
      const emp = obj as CanonicalEmployee;
      const person: HumaansPerson = {
        firstName: emp.first_name,
        lastName: emp.last_name,
        email: emp.email,
        phoneNumber: emp.phone,
        nationality: emp.nationality,
        locationId: emp.work_location,
        jobTitle: emp.job_title,
        department: emp.department,
        startDate: emp.start_date?.toISOString().split('T')[0],
      };
      return person;
    }
    return obj;
  }
}
