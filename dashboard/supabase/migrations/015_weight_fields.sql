-- Add tier to accounts (A / B / C)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS tier text check (tier in ('A', 'B', 'C'));

-- Add importance to signals (high / mid / low), default mid
ALTER TABLE signals ADD COLUMN IF NOT EXISTS importance text not null default 'mid' check (importance in ('high', 'mid', 'low'));
