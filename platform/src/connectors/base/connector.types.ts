import { CanonicalCandidate } from '../../canonical/models/candidate.model';
import { CanonicalApplication } from '../../canonical/models/application.model';
import { CanonicalEmployee } from '../../canonical/models/employee.model';

export type CanonicalObject = CanonicalCandidate | CanonicalApplication | CanonicalEmployee;

export interface Credentials {
  access_token?: string;
  refresh_token?: string;
  api_key?: string;
  expires_at?: number;
  token_type?: string;
  extra?: Record<string, unknown>;
}

export interface LinkedAccount {
  id: string;
  customer_id: string;
  vendor: string;
  category: string;
  credentials_ref: string;
  scopes: string[];
  status: string;
  webhook_ids: string[];
  created_at: Date;
}

export interface RawRequest {
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
  rawBody?: Buffer;
  query?: Record<string, string>;
}

export interface RawEvent {
  event_type: string;
  vendor_event_id?: string;
  payload: Record<string, unknown>;
  occurred_at?: Date;
}

export interface ReadOpts {
  cursor?: string;
  limit?: number;
  since?: Date;
  filters?: Record<string, string>;
}

export interface WriteResult {
  remote_id: string;
  raw: Record<string, unknown>;
}
