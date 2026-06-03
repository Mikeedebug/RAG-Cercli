export interface CanonicalCandidate {
  id: string;
  remote_id: string;
  linked_account_id: string;
  customer_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  nationality?: string;
  location?: string;
  remote_data: Record<string, unknown>;
  custom_fields: Record<string, unknown>;
  created_at: Date;
  modified_at: Date;
}
