-- Ensure insight_cards source columns exist (safe re-run)
alter table insight_cards
  add column if not exists source text,
  add column if not exists source_id text,
  add column if not exists signal_date timestamptz;
