-- Allow free-text status on feature_requests (drop the check constraint)
alter table feature_requests drop constraint if exists feature_requests_status_check;
alter table feature_requests alter column status set default 'pending';

-- Add source and related_account to insight_cards if missing
alter table insight_cards add column if not exists source text;
alter table insight_cards add column if not exists source_id text;
alter table insight_cards add column if not exists signal_date timestamptz;

-- Allow 'manual' as a signal source
alter table signals drop constraint if exists signals_source_check;
alter table signals add constraint signals_source_check check (source in ('pylon', 'demodesk', 'manual'));
