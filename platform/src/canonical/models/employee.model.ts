export type EmployeeStatus = 'pending' | 'active' | 'inactive' | 'terminated';

export interface CanonicalEmployee {
  id: string;
  remote_id?: string;
  linked_account_id: string;
  customer_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  nationality?: string;
  work_location?: string;
  job_title?: string;
  department?: string;
  start_date?: Date;
  status: EmployeeStatus;
  remote_data: Record<string, unknown>;
  custom_fields: Record<string, unknown>;
  created_at: Date;
  modified_at: Date;
}
