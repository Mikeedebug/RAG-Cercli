import {
  Credentials,
  LinkedAccount,
  RawRequest,
  RawEvent,
  ReadOpts,
  WriteResult,
  CanonicalObject,
} from './connector.types';

export abstract class BaseConnector {
  abstract readonly vendor: string;
  abstract readonly category: 'ats' | 'hris' | 'payroll' | 'performance';
  abstract readonly capabilities: string[];

  /**
   * Returns the OAuth authorization URL (or throws if not OAuth-based)
   */
  abstract getAuthUrl(state: string): string;

  /**
   * Exchange an authorization code for credentials
   */
  abstract exchangeCode(code: string, redirectUri: string): Promise<Credentials>;

  /**
   * Refresh expired credentials
   */
  abstract refresh(creds: Credentials): Promise<Credentials>;

  /**
   * Register webhooks with the remote system, return webhook IDs
   */
  abstract registerWebhooks(account: LinkedAccount): Promise<string[]>;

  /**
   * Verify that an inbound webhook request is authentic
   */
  abstract verifyWebhook(req: RawRequest): boolean;

  /**
   * Parse a raw webhook request into a normalized RawEvent
   */
  abstract parseWebhook(req: RawRequest): RawEvent;

  /**
   * Read records of a given type, paginated via AsyncGenerator
   */
  abstract read(type: string, opts: ReadOpts): AsyncGenerator<unknown>;

  /**
   * Write a record of a given type
   */
  abstract write(
    type: string,
    payload: unknown,
    idempotencyKey: string,
  ): Promise<WriteResult>;

  /**
   * Normalize a raw vendor record into a CanonicalObject (pure function)
   */
  abstract normalize(type: string, raw: unknown): CanonicalObject;

  /**
   * Denormalize a CanonicalObject back to vendor format (pure function)
   */
  abstract denormalize(type: string, obj: CanonicalObject): unknown;
}
