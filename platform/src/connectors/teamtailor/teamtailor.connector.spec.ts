import { TeamtailorConnector } from './teamtailor.connector';
import { HttpClientService } from '../../core/http-client/http-client.service';

const mockHttpClientService = {} as HttpClientService;

describe('TeamtailorConnector', () => {
  let connector: TeamtailorConnector;

  beforeEach(() => {
    connector = new TeamtailorConnector(mockHttpClientService);
  });

  const rawCandidate = {
    id: 'tt-cand-1',
    type: 'candidates',
    attributes: {
      'first-name': 'Alice',
      'last-name': 'Smith',
      email: 'alice@example.com',
      phone: '+44700000001',
      'created-at': '2024-01-15T10:00:00Z',
      'updated-at': '2024-01-20T12:00:00Z',
    },
  };

  const rawApplication = {
    id: 'tt-app-1',
    type: 'job-applications',
    attributes: {
      status: 'hired',
      'created-at': '2024-01-15T10:00:00Z',
      'updated-at': '2024-01-20T12:00:00Z',
    },
    relationships: {
      candidate: { data: { id: 'tt-cand-1' } },
      job: { data: { id: 'tt-job-99' } },
      stage: { data: { id: 'hired' } },
    },
  };

  describe('normalize - candidates', () => {
    it('maps basic fields correctly', () => {
      const result = connector.normalizeCandidate(rawCandidate);
      expect(result.remote_id).toBe('tt-cand-1');
      expect(result.first_name).toBe('Alice');
      expect(result.last_name).toBe('Smith');
      expect(result.email).toBe('alice@example.com');
      expect(result.phone).toBe('+44700000001');
    });

    it('parses dates correctly', () => {
      const result = connector.normalizeCandidate(rawCandidate);
      expect(result.created_at).toBeInstanceOf(Date);
      expect(result.modified_at).toBeInstanceOf(Date);
    });

    it('sets empty id, linked_account_id, customer_id (set later)', () => {
      const result = connector.normalizeCandidate(rawCandidate);
      expect(result.id).toBe('');
      expect(result.linked_account_id).toBe('');
      expect(result.customer_id).toBe('');
    });
  });

  describe('normalize - applications', () => {
    it('maps status hired correctly', () => {
      const result = connector.normalizeApplication(rawApplication);
      expect(result.status).toBe('hired');
    });

    it('maps candidate and job relationships', () => {
      const result = connector.normalizeApplication(rawApplication);
      expect(result.candidate_id).toBe('tt-cand-1');
      expect(result.job_id).toBe('tt-job-99');
    });

    it('maps offer_accepted status', () => {
      const offerApp = { ...rawApplication, attributes: { ...rawApplication.attributes, status: 'offer' } };
      const result = connector.normalizeApplication(offerApp);
      expect(result.status).toBe('offer');
    });
  });

  describe('denormalize - candidates', () => {
    it('round-trips basic fields', () => {
      const canonical = connector.normalizeCandidate(rawCandidate);
      const vendor = connector.denormalize('candidates', canonical) as { data: { attributes: { 'first-name': string; 'last-name': string } } };
      expect(vendor.data.attributes['first-name']).toBe('Alice');
      expect(vendor.data.attributes['last-name']).toBe('Smith');
    });
  });

  describe('verifyWebhook', () => {
    it('returns true when no webhook secret is set (dev mode)', () => {
      delete process.env.TEAMTAILOR_WEBHOOK_SECRET;
      const result = connector.verifyWebhook({ headers: {}, body: {} });
      expect(result).toBe(true);
    });
  });

  describe('parseWebhook', () => {
    it('extracts event_type from meta', () => {
      const req = {
        headers: {},
        body: {
          meta: { event_type: 'candidate-hired', delivery_id: 'del-123' },
          data: { id: 'cand-1' },
        },
      };
      const event = connector.parseWebhook(req);
      expect(event.event_type).toBe('candidate-hired');
      expect(event.vendor_event_id).toBe('del-123');
    });
  });
});
