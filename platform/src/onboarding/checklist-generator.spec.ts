import { ChecklistGeneratorService } from './checklist-generator.service';

describe('ChecklistGeneratorService', () => {
  let service: ChecklistGeneratorService;

  beforeEach(() => {
    service = new ChecklistGeneratorService();
  });

  it('generates UK checklist with work permit for non-settled', () => {
    const items = service.generate('Nigerian', 'UK');
    const keys = items.map((i) => i.key);
    expect(keys).toContain('identity_document');
    expect(keys).toContain('national_id');
    expect(keys).toContain('work_permit_or_visa');
    expect(keys).toContain('proof_of_address');
  });

  it('generates UK checklist without work permit for British', () => {
    const items = service.generate('British', 'United Kingdom');
    const keys = items.map((i) => i.key);
    expect(keys).toContain('identity_document');
    expect(keys).toContain('national_id');
    expect(keys).not.toContain('work_permit_or_visa');
  });

  it('generates UAE checklist with EID and visa', () => {
    const items = service.generate('British', 'Dubai, UAE');
    const keys = items.map((i) => i.key);
    expect(keys).toContain('identity_document');
    expect(keys).toContain('work_permit_or_visa');
    expect(keys).toContain('national_id');
  });

  it('always includes identity_document', () => {
    const items = service.generate('American', 'Germany');
    expect(items.some((i) => i.key === 'identity_document')).toBe(true);
  });

  it('all items start with pending status', () => {
    const items = service.generate('British', 'UK');
    items.forEach((item) => expect(item.status).toBe('pending'));
  });
});
