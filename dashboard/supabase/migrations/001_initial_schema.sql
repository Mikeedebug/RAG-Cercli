create table if not exists signals (
  id uuid primary key default gen_random_uuid(),
  account_name text not null,
  source text not null check (source in ('pylon', 'demodesk')),
  source_id text not null,
  feature_request text not null,
  verbatim_quote text,
  signal_date timestamptz not null,
  created_at timestamptz default now(),
  unique(source, source_id, feature_request)
);

create table if not exists feature_requests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  rank integer,
  status text default 'under_review' check (status in ('under_review', 'planned', 'in_progress', 'shipped', 'rejected')),
  signal_count integer default 0,
  account_count integer default 0,
  last_signal_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists insight_cards (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('new_signal', 'cluster_forming', 'rank_suggestion', 'status_update')),
  title text not null,
  body text not null,
  related_fr_id uuid references feature_requests(id),
  related_account text,
  signal_ids uuid[],
  action text,
  status text default 'pending' check (status in ('pending', 'approved', 'dismissed', 'snoozed')),
  snoozed_until timestamptz,
  created_at timestamptz default now(),
  acted_at timestamptz
);

create table if not exists refresh_log (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz default now(),
  completed_at timestamptz,
  signals_added integer default 0,
  insight_cards_generated integer default 0,
  status text default 'running' check (status in ('running', 'completed', 'failed')),
  error text
);

-- Seed data
insert into feature_requests (title, description, rank, status, signal_count, account_count) values
  ('Bulk payroll upload via Excel', 'Allow HR admins to upload payroll data via Excel template', 1, 'in_progress', 8, 4),
  ('WPS reconciliation report export', 'Export WPS-ready reconciliation reports for UAE compliance', 2, 'planned', 6, 3),
  ('DEWS/VESS contribution dashboard', 'Dashboard showing DEWS and VESS contribution status per employee', 3, 'under_review', 5, 2),
  ('Employee self-service mobile app', 'Mobile app for employees to view payslips, request leaves, update details', 4, 'under_review', 4, 3),
  ('Multi-entity payroll run consolidation', 'Run payroll across multiple entities in a single consolidated flow', 5, 'under_review', 3, 2)
on conflict do nothing;
