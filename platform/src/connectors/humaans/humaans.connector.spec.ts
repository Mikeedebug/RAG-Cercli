import { HumaansConnector } from './humaans.connector';
import { HttpClientService } from '../../core/http-client/http-client.service';

const mockHttpClientService = {} as HttpClientService;

describe('HumaansConnector', () => {
  let connector: HumaansConnector;

  beforeEach(() => {
    connector = new HumaansConnector(mockHttpClientService);
  });

  const rawPerson = {
    id: 'hum-person-1',
    firstName: 'Bob',
    lastName: 'Jones',
    email: 'bob@example.com',
    phoneNumber: '+971500000001',
    nationality: 'British',
    locationId: 'Dubai',
    jobTitle: 'Software Engineer',
    department: 'Engineering',
    startDate: '2024-02-01',
    status: 'active',
  };

  describe('normalize - employees', () => {
    it('maps basic fields correctly', () => {
      const result = connector.normalizePerson(rawPerson);
      expect(result.remote_id).toBe('hum-person-1');
      expect(result.first_name).toBe('Bob');
      expect(result.last_name).toBe('Jones');
      expect(result.email).toBe('bob@example.com');
      expect(result.phone).toBe('+971500000001');
      expect(result.nationality).toBe('British');
      expect(result.work_location).toBe('Dubai');
      expect(result.job_title).toBe('Software Engineer');
      expect(result.department).toBe('Engineering');
    });

    it('parses start_date correctly', () => {
      const result = connector.normalizePerson(rawPerson);
      expect(result.start_date).toBeInstanceOf(Date);
    });

    it('handles missing optional fields', () => {
      const minimal = { id: 'hum-2', firstName: 'Jane', lastName: 'Doe' };
      const result = connector.normalizePerson(minimal);
      expect(result.remote_id).toBe('hum-2');
      expect(result.phone).toBeUndefined();
    });
  });

  describe('denormalize - employees', () => {
    it('maps canonical to Humaans person format', () => {
      const canonical = connector.normalizePerson(rawPerson);
      const vendor = connector.denormalize('employees', canonical) as {
        firstName: string;
        lastName: string;
        email: string;
        jobTitle: string;
        startDate: string;
      };
      expect(vendor.firstName).toBe('Bob');
      expect(vendor.lastName).toBe('Jones');
      expect(vendor.email).toBe('bob@example.com');
      expect(vendor.jobTitle).toBe('Software Engineer');
      expect(vendor.startDate).toBe('2024-02-01');
    });

    it('returns the canonical object unchanged for unknown types (pass-through)', () => {
      const canonical = connector.normalizePerson(rawPerson);
      expect(connector.denormalize('unknown', canonical)).toBe(canonical);
    });
  });
});
