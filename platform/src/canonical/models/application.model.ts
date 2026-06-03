export type ApplicationStatus =
  | 'applied'
  | 'interview'
  | 'offer'
  | 'offer_accepted'
  | 'hired'
  | 'rejected';

export interface CanonicalApplication {
  id: string;
  remote_id: string;
  linked_account_id: string;
  customer_id: string;
  candidate_id?: string;
  job_title?: string;
  job_id?: string;
  status: ApplicationStatus;
  applied_at?: Date;
  stage?: string;
  work_location?: string;
  remote_data: Record<string, unknown>;
  custom_fields: Record<string, unknown>;
  created_at: Date;
  modified_at: Date;
}
