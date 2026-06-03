import { Injectable } from '@nestjs/common';

export interface ChecklistItem {
  key: string;
  label: string;
  required: boolean;
  status: 'pending' | 'verified' | 'rejected' | 'waived';
  document_url?: string;
  notes?: string;
}

@Injectable()
export class ChecklistGeneratorService {
  generate(nationality: string, workLocation: string): ChecklistItem[] {
    const items: ChecklistItem[] = [];
    const loc = workLocation.toLowerCase();
    const nat = nationality.toLowerCase();

    // Identity document — always required
    items.push({
      key: 'identity_document',
      label: 'Passport or Government-Issued Photo ID',
      required: true,
      status: 'pending',
    });

    if (loc.includes('uk') || loc.includes('united kingdom') || loc.includes('gb')) {
      // UK rules
      items.push({
        key: 'proof_of_address',
        label: 'Proof of Address (utility bill or bank statement, <3 months old)',
        required: true,
        status: 'pending',
      });
      items.push({
        key: 'national_id',
        label: 'National Insurance Number',
        required: true,
        status: 'pending',
      });

      const settledStatuses = ['british', 'uk', 'irish', 'eea settled'];
      const isSettled = settledStatuses.some((s) => nat.includes(s));
      if (!isSettled) {
        items.push({
          key: 'work_permit_or_visa',
          label: 'UK Visa or Biometric Residence Permit (BRP)',
          required: true,
          status: 'pending',
        });
        items.push({
          key: 'share_code',
          label: 'Right to Work Share Code (Home Office check)',
          required: true,
          status: 'pending',
        });
      }
    } else if (loc.includes('uae') || loc.includes('dubai') || loc.includes('abu dhabi')) {
      // UAE rules
      items.push({
        key: 'work_permit_or_visa',
        label: 'UAE Residence Visa / Employment Visa',
        required: true,
        status: 'pending',
      });
      items.push({
        key: 'national_id',
        label: 'Emirates ID (EID)',
        required: true,
        status: 'pending',
      });
    } else {
      // Generic rules
      items.push({
        key: 'proof_of_address',
        label: 'Proof of Address',
        required: false,
        status: 'pending',
      });

      // Add visa for non-local nationalities
      if (!nat.includes(loc.split(',')[0]?.trim() ?? '')) {
        items.push({
          key: 'work_permit_or_visa',
          label: 'Work Permit or Visa',
          required: true,
          status: 'pending',
        });
      }
    }

    return items;
  }
}
