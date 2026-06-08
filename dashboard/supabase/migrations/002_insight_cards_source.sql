-- Add source tracking columns to insight_cards for approval flow
alter table insight_cards
  add column if not exists source text,
  add column if not exists source_id text,
  add column if not exists signal_date timestamptz;
